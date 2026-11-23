process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_security_isolation_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_security_isolation_test';
process.env.JWT_SECRET = 'security_isolation_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');

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

  // 1. Create two isolated landlords
  const regA = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Landlord One', email: 'landlord1@sec.test', password: 'Strong#Password123', phone: '+254711111111' })
  });
  assert.strictEqual(regA.status, 201);
  const userA = await User.findOne({ email: 'landlord1@sec.test' });
  userA.isVerified = true;
  await userA.save();

  const regB = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Landlord Two', email: 'landlord2@sec.test', password: 'Strong#Password123', phone: '+254722222222' })
  });
  assert.strictEqual(regB.status, 201);
  const userB = await User.findOne({ email: 'landlord2@sec.test' });
  userB.isVerified = true;
  await userB.save();

  const tokenA = jwt.sign({ id: userA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const propA = await Property.create({ name: 'Private Estate A', location: 'Karen', user: userA._id });
  const unitA = await Unit.create({ propertyId: propA._id, unitNumber: 'U-01', user: userA._id, rentAmount: 30000, status: 'vacant' });
  const tenantA = await Tenant.create({ name: 'Tenant A', phone: '+254733333333', user: userA._id, unitId: unitA._id });
  const paymentA = await Payment.create({ tenantId: tenantA._id, user: userA._id, amount: 30000, status: 'paid' });

  // 2. Cross-landlord isolation attempts by Landlord B MUST return 403/404 and zero records
  const propListB = await (await fetch(`${baseUrl}/api/properties`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert.strictEqual(propListB.length, 0);

  const tenantListB = await (await fetch(`${baseUrl}/api/tenants`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert.strictEqual(tenantListB.length, 0);

  const editTenantA = await fetch(`${baseUrl}/api/tenants/${tenantA._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'Hacked Tenant' })
  });
  assert.strictEqual(editTenantA.status, 404);

  const delPropA = await fetch(`${baseUrl}/api/properties/${propA._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.ok([403, 404].includes(delPropA.status));

  const readPayA = await fetch(`${baseUrl}/api/payments/${paymentA._id}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(readPayA.status, 404);

  // 3. Expired JWT strictly rejected (401)
  const expiredToken = jwt.sign({ id: userA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '-10s' });
  const expRes = await fetch(`${baseUrl}/api/properties`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert.strictEqual(expRes.status, 401);

  // 4. Refresh token rotation & stolen/reused refresh token detection revokes all sessions
  const crypto = require('crypto');
  const testOtp = '654321';
  userA.otp = crypto.createHash('sha256').update(testOtp).digest('hex');
  userA.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await userA.save();

  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'landlord1@sec.test', otp: testOtp })
  });
  assert.strictEqual(verifyRes.status, 200);
  const loginBody = await verifyRes.json();
  const initialRefresh = loginBody.refreshToken;
  assert.ok(initialRefresh);

  const refresh1 = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: initialRefresh })
  });
  assert.strictEqual(refresh1.status, 200);
  const r1Body = await refresh1.json();
  assert.ok(r1Body.refreshToken && r1Body.refreshToken !== initialRefresh);

  // Replaying the rotated (already spent) initialRefresh must fail 401/403 and invalidate active refresh tokens
  const reuseAttempt = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: initialRefresh })
  });
  assert.ok([401, 403].includes(reuseAttempt.status));

  const refreshedUser = await User.findById(userA._id);
  assert.strictEqual((refreshedUser.refreshTokens || []).length, 0, 'Reuse theft detection must wipe active refresh tokens');

  console.log('✅ PASS: Cross-landlord isolation, expired JWT rejection & refresh token rotation/theft detection verified');
}

run()
  .catch((err) => {
    console.error('❌ securityIsolationTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
