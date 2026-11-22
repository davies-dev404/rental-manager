/**
 * Utilities Persistence, Bulk Upload & Reset Integration Test Suite
 * Verifies POST /api/utilities/batch, GET /api/utilities (with landlord isolation),
 * POST /api/utilities/bulk, and POST /api/utilities/reset + Invoice creation.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_utility_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_utility_test';
process.env.JWT_SECRET = 'utility_integration_test_jwt_secret_2026';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const LandlordSubscription = require('../models/LandlordSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const UtilityReading = require('../models/UtilityReading');
const Invoice = require('../models/Invoice');

let server;
let baseUrl = '';

async function apiReq(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

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

async function runTests() {
  await waitForDbReady();
  await mongoose.connection.dropDatabase();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  try {
    const plan = await SubscriptionPlan.create({
      code: 'basic',
      name: 'Basic',
      maxUnits: 10,
      pricing: { monthly: 2500, quarterly: 7000, semi_annual: 13500, annual: 25000 },
      isActive: true
    });

    const landlordA = await User.create({
      name: 'Landlord Util A',
      email: 'util_a@test.local',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const landlordB = await User.create({
      name: 'Landlord Util B',
      email: 'util_b@test.local',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });

    await Promise.all([
      LandlordSubscription.create({
        landlordId: landlordA._id,
        planId: plan._id,
        planCode: 'basic',
        planName: 'Basic',
        purchasedUnits: 10,
        maxPlanUnits: 10,
        status: 'active',
        expiryDate: new Date(Date.now() + 30 * 86400000)
      }),
      LandlordSubscription.create({
        landlordId: landlordB._id,
        planId: plan._id,
        planCode: 'basic',
        planName: 'Basic',
        purchasedUnits: 10,
        maxPlanUnits: 10,
        status: 'active',
        expiryDate: new Date(Date.now() + 30 * 86400000)
      })
    ]);

    const propA = await Property.create({ name: 'Hacienda', location: 'Westlands', user: landlordA._id });
    const propB = await Property.create({ name: 'Villa B', location: 'Kilimani', user: landlordB._id });

    const unitA1 = await Unit.create({ propertyId: propA._id, unitNumber: '1A', user: landlordA._id, rentAmount: 20000, status: 'occupied' });
    const unitA2 = await Unit.create({ propertyId: propA._id, unitNumber: '1B', user: landlordA._id, rentAmount: 20000, status: 'occupied' });
    const unitB1 = await Unit.create({ propertyId: propB._id, unitNumber: 'B1', user: landlordB._id, rentAmount: 25000, status: 'occupied' });

    await Tenant.create({
      name: 'Abigael Jones',
      email: 'abigael_util@test.local',
      phone: '0711000111',
      user: landlordA._id,
      unitId: unitA1._id,
      status: 'active'
    });
    await Tenant.create({
      name: 'Other Tenant',
      email: 'other_util@test.local',
      phone: '0722000222',
      user: landlordB._id,
      unitId: unitB1._id,
      status: 'active'
    });

    const tokA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokB = jwt.sign({ id: landlordB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: POST /api/utilities/batch records readings & creates invoice + returns in GET /api/utilities
    const batchRes = await apiReq('/api/utilities/batch', {
      method: 'POST',
      token: tokA,
      body: {
        propertyId: String(propA._id),
        item: 'water',
        entries: [
          { unitId: String(unitA1._id), unitNumber: '1A', previous: 120, current: 135, rate: 150 },
          { unitId: String(unitA2._id), unitNumber: '1B', previous: 50, current: 60, rate: 150 }
        ]
      }
    });
    assert.strictEqual(batchRes.status, 201);
    assert.strictEqual(batchRes.data.count, 2);
    assert.strictEqual(batchRes.data.invoicesCreated, 1, 'Unit 1A has active tenant so 1 rental invoice must be created');

    const listA = await apiReq('/api/utilities', { token: tokA });
    assert.strictEqual(listA.status, 200);
    assert.strictEqual(listA.data.length, 2);
    assert.strictEqual(listA.data[0].propertyName, 'Hacienda');
    const row1A = listA.data.find((r) => r.unit === '1A');
    assert.strictEqual(row1A.consumed, 15);
    assert.strictEqual(row1A.total, 2250);

    // Tenant isolation check
    const listB = await apiReq('/api/utilities', { token: tokB });
    assert.strictEqual(listB.status, 200);
    assert.strictEqual(listB.data.length, 0, 'Landlord B must not see Landlord A utilities');
    console.log('✅ PASS 1: POST /api/utilities/batch persists readings, computes consumed/total, generates invoice & enforces isolation');

    // TEST 2: POST /api/utilities/bulk imports CSV-parsed rows
    const bulkRes = await apiReq('/api/utilities/bulk', {
      method: 'POST',
      token: tokA,
      body: {
        propertyId: String(propA._id),
        item: 'electricity',
        rows: [
          { unitNumber: '1A', previous: 300, current: 350, rate: 28 },
          { unitNumber: '1B', previous: 100, current: 120, rate: 28 }
        ]
      }
    });
    assert.strictEqual(bulkRes.status, 201);
    assert.strictEqual(bulkRes.data.count, 2);
    assert.strictEqual(await UtilityReading.countDocuments({ user: landlordA._id }), 4);
    assert.strictEqual(await Invoice.countDocuments({ landlordId: landlordA._id }), 2);
    console.log('✅ PASS 2: POST /api/utilities/bulk imports CSV rows & persists readings + invoices');

    // TEST 3: POST /api/utilities/reset clears targeted readings cleanly + unauthenticated blocked (401)
    assert.strictEqual((await apiReq('/api/utilities')).status, 401);

    const resetRes = await apiReq('/api/utilities/reset', {
      method: 'POST',
      token: tokA,
      body: { propertyId: String(propA._id), unitSelection: '1B', item: 'water' }
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.deletedCount, 1);
    assert.strictEqual(await UtilityReading.countDocuments({ user: landlordA._id }), 3);
    console.log('✅ PASS 3: POST /api/utilities/reset clears targeted unit utility cleanly & blocks unauthenticated (401)');

    console.log('\n🎉 ALL 3 UTILITIES PERSISTENCE & BULK UPLOAD TESTS PASSED!');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ UTILITY INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
