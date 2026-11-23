process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_cache_queue_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_cache_queue_test';
process.env.JWT_SECRET = 'cache_queue_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Property = require('../models/Property');
const { buildLandlordCacheKey, getCached, setCached, invalidateLandlordCache } = require('../services/cacheService');
const { withDistributedLock, resetLockIndexCache } = require('../services/cronLockService');
const { registerInlineJobHandler, enqueueBackgroundJob } = require('../queues/jobQueues');
const { getRedisTelemetry } = require('../config/redisClient');

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
  await waitForDbReady();
  await mongoose.connection.dropDatabase();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 1. Redis outage / unconfigured graceful degradation check
  const redisTele = getRedisTelemetry();
  assert.strictEqual(redisTele.healthy, false);

  // 2. Strict landlord cache isolation & invalidation
  const landlordA = await User.create({ name: 'Cache Landlord A', email: 'cachea@makaziflow.test', password: 'Strong#Password123', role: 'landlord', isVerified: true, accountStatus: 'active' });
  const landlordB = await User.create({ name: 'Cache Landlord B', email: 'cacheb@makaziflow.test', password: 'Strong#Password123', role: 'landlord', isVerified: true, accountStatus: 'active' });
  await Property.create({ name: 'Prop A', location: 'Westlands', user: landlordA._id });

  const keyA = buildLandlordCacheKey('dashboard_stats', landlordA._id);
  const keyB = buildLandlordCacheKey('dashboard_stats', landlordB._id);
  assert.notStrictEqual(keyA, keyB);

  await setCached(keyA, { totalProperties: 1 }, 30);
  assert.strictEqual(await getCached(keyB), null, 'Landlord B must never read Landlord A cached payload');

  const tokA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokB = jwt.sign({ id: landlordB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const r1 = await fetch(`${baseUrl}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${tokA}` } });
  assert.strictEqual(r1.status, 200);
  const d1 = await r1.json();
  assert.strictEqual(d1.totalProperties, 1);

  const r2 = await fetch(`${baseUrl}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${tokA}` } });
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.headers.get('x-cache'), 'HIT');

  const rB = await fetch(`${baseUrl}/api/dashboard/stats`, { headers: { Authorization: `Bearer ${tokB}` } });
  const dB = await rB.json();
  assert.strictEqual(dB.totalProperties, 0);

  await invalidateLandlordCache(landlordA._id);
  assert.strictEqual(await getCached(keyA), null);

  // 3. Distributed lock prevents duplicate concurrent sweep
  resetLockIndexCache();
  await require('../models/CronLock').createIndexes();
  let concurrentExecs = 0;
  const [l1, l2] = await Promise.all([
    withDistributedLock('monthly_test_cron', 5000, async () => {
      concurrentExecs += 1;
      await new Promise((r) => setTimeout(r, 80));
      return 'ran';
    }),
    withDistributedLock('monthly_test_cron', 5000, async () => {
      concurrentExecs += 1;
      return 'ran';
    })
  ]);
  const ranCount = [l1, l2].filter((x) => !x.skipped).length;
  assert.strictEqual(ranCount, 1);
  assert.strictEqual(concurrentExecs, 1);

  // 4. Inline queue fallback executes cleanly without Redis
  let handled = false;
  registerInlineJobHandler('notifications', 'test_notice', async () => {
    handled = true;
  });
  const qRes = await enqueueBackgroundJob('notifications', 'test_notice', { ok: true });
  assert.strictEqual(qRes.mode, 'inline_async_fallback');
  await new Promise((r) => setTimeout(r, 40));
  assert.strictEqual(handled, true);

  console.log('✅ PASS: Redis outage fallback, landlord cache isolation/invalidation, distributed locks & queue fallback verified');
}

run()
  .catch((err) => {
    console.error('❌ cacheAndQueueTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
