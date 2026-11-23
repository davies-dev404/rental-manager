process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_foundation_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_foundation_test';
process.env.JWT_SECRET = 'foundation_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const app = require('../server');
const logger = require('../utils/logger');
const { validateEnvironment } = require('../config/envConfig');

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
  // 1. Secret redaction verification
  const redacted = logger.redactValue({
    email: 'landlord@makaziflow.com',
    password: 'SecretPassword123!',
    token: 'jwt_abc',
    nested: { consumerSecret: 'pesapal_sec', safeField: 'KES' },
    authHeader: 'Bearer super_secret_token'
  });
  assert.strictEqual(redacted.email, 'landlord@makaziflow.com');
  assert.strictEqual(redacted.password, '[REDACTED]');
  assert.strictEqual(redacted.token, '[REDACTED]');
  assert.strictEqual(redacted.nested.consumerSecret, '[REDACTED]');
  assert.strictEqual(redacted.nested.safeField, 'KES');
  assert.strictEqual(redacted.authHeader, 'Bearer [REDACTED]');

  // 2. Environment capability inspection
  const caps = validateEnvironment();
  assert.strictEqual(typeof caps.port, 'number');
  assert.strictEqual(typeof caps.redisConfigured, 'boolean');

  await waitForDbReady();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 3. Liveness, Readiness, Health & Correlation ID header verification
  const customCid = 'cid-test-999';
  const liveRes = await fetch(`${baseUrl}/api/live`, { headers: { 'X-Correlation-Id': customCid } });
  assert.strictEqual(liveRes.status, 200);
  assert.strictEqual(liveRes.headers.get('x-correlation-id'), customCid);
  const liveBody = await liveRes.json();
  assert.strictEqual(liveBody.status, 'alive');

  const readyRes = await fetch(`${baseUrl}/api/ready`);
  assert.strictEqual(readyRes.status, 200);
  assert.ok(readyRes.headers.get('x-correlation-id'));
  const readyBody = await readyRes.json();
  assert.strictEqual(readyBody.status, 'ready');
  assert.strictEqual(readyBody.database.readyState, 1);

  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthBody = await healthRes.json();
  assert.strictEqual(healthBody.status, 'ok');
  assert.ok(healthBody.memoryMB && typeof healthBody.memoryMB.rss === 'number');
  assert.ok(healthBody.capabilities && typeof healthBody.capabilities.socketIoEnabled === 'boolean');

  console.log('✅ PASS: Foundation logging redaction, env validation, correlation IDs & health probes verified');
}

run()
  .catch((err) => {
    console.error('❌ foundationTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
