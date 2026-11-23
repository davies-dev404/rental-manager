process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_realtime_health_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_realtime_health_test';
process.env.JWT_SECRET = 'realtime_health_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const { emitToLandlord } = require('../services/socketService');

// Load socket.io-client from client/node_modules cleanly for full end-to-end Socket.IO verification
const { io: ioClient } = require(path.resolve(__dirname, '../../client/node_modules/socket.io-client'));

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
    app.initSocketServer(server);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const superAdmin = await User.create({
    name: 'Super Admin SRE',
    email: 'sre@afrinextech.co.ke',
    password: 'Strong#Password123',
    role: 'superadmin',
    isSuperAdmin: true,
    isVerified: true,
    accountStatus: 'active'
  });

  const landlordA = await User.create({
    name: 'Landlord A',
    email: 'la@makaziflow.test',
    password: 'Strong#Password123',
    role: 'landlord',
    isVerified: true,
    accountStatus: 'active'
  });

  const landlordB = await User.create({
    name: 'Landlord B',
    email: 'lb@makaziflow.test',
    password: 'Strong#Password123',
    role: 'landlord',
    isVerified: true,
    accountStatus: 'active'
  });

  const adminToken = jwt.sign({ id: superAdmin._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: landlordB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Landlord MUST NOT access System Health or Feature Flags (403)
  const deniedHealth = await fetch(`${baseUrl}/api/admin/system-health`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.strictEqual(deniedHealth.status, 403);

  const deniedFlags = await fetch(`${baseUrl}/api/admin/feature-flags`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.strictEqual(deniedFlags.status, 403);

  // 2. Super Admin accesses real System Health telemetry & toggles Feature Flags
  const healthRes = await fetch(`${baseUrl}/api/admin/system-health`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(healthRes.status, 200);
  const health = await healthRes.json();
  assert.strictEqual(health.database.healthy, true);
  assert.ok(typeof health.database.pingLatencyMs === 'number');
  assert.ok(health.reliability.latencyMs && typeof health.reliability.latencyMs.p95 === 'number');

  const flagsRes = await fetch(`${baseUrl}/api/admin/feature-flags`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(flagsRes.status, 200);
  const flagsBody = await flagsRes.json();
  assert.ok(flagsBody.flags.length >= 4);

  const toggleRes = await fetch(`${baseUrl}/api/admin/feature-flags/automated_sms_dunning`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ enabled: true, rolloutPercentage: 50 })
  });
  assert.strictEqual(toggleRes.status, 200);
  const toggleBody = await toggleRes.json();
  assert.strictEqual(toggleBody.flag.enabled, true);

  // 3. Unauthenticated Socket.IO connection MUST be rejected
  const unauthFailed = await new Promise((resolve) => {
    const s = ioClient(baseUrl, { transports: ['websocket'], reconnection: false });
    s.on('connect_error', (err) => {
      s.close();
      resolve(Boolean(err?.message));
    });
    s.on('connect', () => {
      s.close();
      resolve(false);
    });
  });
  assert.strictEqual(unauthFailed, true, 'Unauthenticated Socket.IO client must be rejected');

  // 4. Authenticated Socket.IO connection + cross-landlord room isolation
  const socketA = ioClient(baseUrl, { auth: { token: tokenA }, transports: ['websocket'], reconnection: false });
  const socketB = ioClient(baseUrl, { auth: { token: tokenB }, transports: ['websocket'], reconnection: false });

  await Promise.all([
    new Promise((res) => socketA.on('connect', res)),
    new Promise((res) => socketB.on('connect', res))
  ]);

  // Socket B tries subscribing to Landlord A room -> MUST reject!
  const crossSubAck = await new Promise((resolve) => {
    socketB.emit('subscribe:landlord', String(landlordA._id), resolve);
  });
  assert.strictEqual(crossSubAck.ok, false);

  let receivedByA = null;
  let receivedByB = null;
  socketA.on('payment:settled', (msg) => {
    receivedByA = msg;
  });
  socketB.on('payment:settled', (msg) => {
    receivedByB = msg;
  });

  emitToLandlord(landlordA._id, 'payment:settled', { amountPaid: 25000, currency: 'KES' });
  await new Promise((r) => setTimeout(r, 80));

  assert.ok(receivedByA && receivedByA.amountPaid === 25000);
  assert.strictEqual(receivedByB, null, 'Landlord B socket MUST NOT receive Landlord A events');

  socketA.close();
  socketB.close();

  console.log('✅ PASS: System Health telemetry, Feature Flags RBAC & Authenticated Socket.IO isolation verified');
}

run()
  .catch((err) => {
    console.error('❌ realtimeAndHealthTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
