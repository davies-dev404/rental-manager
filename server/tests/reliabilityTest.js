process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_reliability_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_reliability_test';
process.env.JWT_SECRET = 'reliability_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const DeadLetterJob = require('../models/DeadLetterJob');
const { withRetry, CircuitBreaker } = require('../utils/resilience');
const { registerDeadLetterHandler, recordDeadLetter, replayDeadLetter } = require('../services/dlqService');

let server;
let baseUrl = '';

async function waitForDbReady() {
  if (mongoose.connection.readyState === 1) return;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('MongoDB connection timeout')), 15000);
    mongoose.connection.once('connected', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

async function run() {
  // 1. Retry + non-retryable classification
  let transientCalls = 0;
  const val = await withRetry(
    async () => {
      transientCalls += 1;
      if (transientCalls < 3) {
        const e = new Error('upstream timeout');
        e.code = 'ETIMEDOUT';
        throw e;
      }
      return 'ok';
    },
    { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 30, jitter: true, label: 'test_transient' }
  );
  assert.strictEqual(val, 'ok');
  assert.strictEqual(transientCalls, 3);

  let permanentCalls = 0;
  let caughtPermanent = false;
  try {
    await withRetry(
      async () => {
        permanentCalls += 1;
        const e = new Error('Bad input');
        e.statusCode = 400;
        e.retryable = false;
        throw e;
      },
      { maxRetries: 3, baseDelayMs: 10, label: 'test_permanent' }
    );
  } catch {
    caughtPermanent = true;
  }
  assert.strictEqual(caughtPermanent, true);
  assert.strictEqual(permanentCalls, 1, 'Permanent 4xx errors must NOT be retried');

  // 2. CircuitBreaker state transitions (CLOSED -> OPEN -> HALF-OPEN -> CLOSED)
  const breaker = new CircuitBreaker('test_breaker_unit', { failureThreshold: 2, cooldownMs: 5000 });
  for (let i = 0; i < 2; i++) {
    await breaker.exec(async () => {
      const e = new Error('503 outage');
      e.statusCode = 503;
      throw e;
    }).catch(() => {});
  }
  assert.strictEqual(breaker.snapshot().state, 'OPEN');

  let blockedOpen = false;
  await breaker.exec(async () => 'never').catch((err) => {
    blockedOpen = err.code === 'CIRCUIT_OPEN';
  });
  assert.strictEqual(blockedOpen, true);

  breaker.openedAt = Date.now() - 6000;
  const recovered = await breaker.exec(async () => 'recovered');
  assert.strictEqual(recovered, 'recovered');
  assert.strictEqual(breaker.snapshot().state, 'CLOSED');

  await waitForDbReady();
  await mongoose.connection.dropDatabase();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 3. Idempotency-Key persistence across HTTP POST /api/tenants & mismatch detection
  const landlord = await User.create({
    name: 'Idempotent Landlord',
    email: 'idem@makaziflow.test',
    password: 'Strong#Password123',
    role: 'landlord',
    isVerified: true,
    accountStatus: 'active'
  });
  const token = jwt.sign({ id: landlord._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const payload = { name: 'Idem Tenant', phone: '+254712345678' };
  const firstRes = await fetch(`${baseUrl}/api/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': 'tenant-reg-abc-001'
    },
    body: JSON.stringify(payload)
  });
  assert.strictEqual(firstRes.status, 201);

  const replayRes = await fetch(`${baseUrl}/api/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': 'tenant-reg-abc-001'
    },
    body: JSON.stringify(payload)
  });
  assert.strictEqual(replayRes.status, 201);
  assert.strictEqual(replayRes.headers.get('x-idempotent-replay'), 'true');
  assert.strictEqual(await Tenant.countDocuments({ user: landlord._id }), 1, 'Duplicate idempotent POST must not create duplicate DB rows');

  const mismatchRes = await fetch(`${baseUrl}/api/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': 'tenant-reg-abc-001'
    },
    body: JSON.stringify({ name: 'Different Tenant', phone: '+254799999999' })
  });
  assert.strictEqual(mismatchRes.status, 409);

  // 4. Stale webhook timestamp replay protection
  const staleRes = await fetch(`${baseUrl}/api/v2/payments/webhooks/intasend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': String(Date.now() - 30 * 60 * 1000)
    },
    body: JSON.stringify({ invoice_id: 'INV-STALE' })
  });
  assert.strictEqual(staleRes.status, 401);

  // 5. Dead Letter Queue enqueue & replay
  let replayedPayload = null;
  registerDeadLetterHandler('notifications:email_receipt', async (p) => {
    replayedPayload = p;
    return { delivered: true };
  });
  const dlq = await recordDeadLetter({
    queueName: 'notifications',
    jobName: 'email_receipt',
    landlordId: landlord._id,
    payload: { paymentId: 'pay_123' },
    error: new Error('SMTP timeout')
  });
  const replayOut = await replayDeadLetter(dlq._id, landlord._id);
  assert.strictEqual(replayOut.job.status, 'replayed');
  assert.strictEqual(replayedPayload.paymentId, 'pay_123');
  assert.strictEqual(await DeadLetterJob.countDocuments({ _id: dlq._id, status: 'replayed' }), 1);

  console.log('✅ PASS: Retries, circuit breakers, idempotency replay, stale webhook rejection & DLQ replay verified');
}

run()
  .catch((err) => {
    console.error('❌ reliabilityTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
