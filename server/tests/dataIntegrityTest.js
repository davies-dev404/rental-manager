process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_data_integrity_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_data_integrity_test';
process.env.JWT_SECRET = 'data_integrity_test_jwt_secret_minimum_32_chars';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Invoice = require('../models/Invoice');
const Migration = require('../models/Migration');
const { createStructuredInvoice } = require('../services/invoiceService');
const { runPendingMigrations } = require('../services/migrationService');
const { resolveLandlordId } = require('../middleware/subscriptionMiddleware');

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

  // 1. Seed two isolated landlords + a caretaker assigned only to landlordA
  const landlordA = await User.create({
    name: 'Landlord Alpha',
    email: 'alpha@makaziflow.test',
    password: 'Strong#Password123',
    role: 'landlord',
    isVerified: true,
    accountStatus: 'active'
  });
  const landlordB = await User.create({
    name: 'Landlord Beta',
    email: 'beta@makaziflow.test',
    password: 'Strong#Password123',
    role: 'landlord',
    isVerified: true,
    accountStatus: 'active'
  });
  const caretakerA = await User.create({
    name: 'Caretaker Alpha',
    email: 'caretaker@makaziflow.test',
    password: 'Strong#Password123',
    role: 'caretaker',
    organizationOwner: landlordA._id,
    isVerified: true,
    accountStatus: 'active'
  });

  const propA = await Property.create({ name: 'Alpha Court', location: 'Nairobi', user: landlordA._id, caretakerId: caretakerA._id });
  const propB = await Property.create({ name: 'Beta Court', location: 'Mombasa', user: landlordB._id });
  const unitA = await Unit.create({ propertyId: propA._id, unitNumber: 'A-101', user: landlordA._id, rentAmount: 25000, status: 'vacant' });

  // 2. Caretaker ownership verification test (must reject access to propB)
  const resolvedA = await resolveLandlordId({ user: caretakerA, body: { propertyId: propA._id } });
  assert.strictEqual(String(resolvedA), String(landlordA._id));

  let caretakerRejected = false;
  try {
    await resolveLandlordId({ user: caretakerA, body: { propertyId: propB._id } });
  } catch (err) {
    caretakerRejected = err.statusCode === 403;
  }
  assert.strictEqual(caretakerRejected, true, 'Caretaker must be blocked from acting on another landlord property');

  // 3. Simultaneous unit allocation race condition protection (two parallel tenant allocations for same vacant unit)
  const tokenA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Concurrent Tenant 1', phone: '+254711000111', unitId: unitA._id })
    }),
    fetch(`${baseUrl}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ name: 'Concurrent Tenant 2', phone: '+254711000222', unitId: unitA._id })
    })
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepStrictEqual(statuses, [201, 409], `Expected one 201 and one 409 conflict, got ${statuses}`);
  const activeCountInUnit = await Tenant.countDocuments({ unitId: unitA._id, status: 'active' });
  assert.strictEqual(activeCountInUnit, 1);

  // 4. Parallel invoice number generation produces strictly unique invoice numbers
  const invs = await Promise.all(
    Array.from({ length: 10 }, (_, idx) =>
      createStructuredInvoice({
        invoiceCategory: 'rental',
        landlordId: landlordA._id,
        items: [{ description: `Rent #${idx}`, unitPrice: 15000 }]
      })
    )
  );
  const invNums = new Set(invs.map((i) => i.invoiceNumber));
  assert.strictEqual(invNums.size, 10, 'Concurrent invoices must generate unique sequential numbers');
  const dbInvCount = await Invoice.countDocuments({ landlordId: landlordA._id });
  assert.strictEqual(dbInvCount, 10);

  // 5. Idempotent forward-only migration execution
  const mig1 = await runPendingMigrations();
  assert.ok(mig1.every((m) => m.status === 'applied'));
  const mig2 = await runPendingMigrations();
  assert.ok(mig2.every((m) => m.status === 'skipped_already_applied'));
  const appliedCount = await Migration.countDocuments({ status: 'applied' });
  assert.strictEqual(appliedCount, mig1.length);

  console.log('✅ PASS: Caretaker isolation, concurrent unit allocation (409), atomic invoice numbers & migrations verified');
}

run()
  .catch((err) => {
    console.error('❌ dataIntegrityTest failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.connection.close().catch(() => {});
    }
  });
