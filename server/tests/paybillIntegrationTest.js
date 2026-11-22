/**
 * M-Pesa Paybill & C2B Integration Test Suite
 * Verifies:
 * 1. Landlord Paybill settings (516600 / 385410) surface in tenant-portal & paybill-config.
 * 2. Tenant Paybill initiation creates a pending mpesa_paybill transaction & returns paybillInstructions.
 * 3. Tenant M-Pesa confirmation code submission sets status='processing' (cannot self-mark paid)
 *    and Landlord confirm endpoint settles transaction, creates Payment + PaymentReceipt, and shows in MPESA lookup/transactions.
 * 4. Public Safaricom C2B Validation & Confirmation webhooks (no user token needed):
 *    - Matched BillRefNumber settles automatically & is idempotent on duplicate TransID.
 *    - Unmatched default BillRefNumber records status='unmatched' under the Paybill owner so landlord can assign & confirm.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_paybill_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_paybill_test';
process.env.JWT_SECRET = 'paybill_integration_test_jwt_secret_2026';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Module = require('module');

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('sendEmail') || request === '../utils/sendEmail') {
    return async () => ({ messageId: 'mock-paybill-email' });
  }
  if (request.endsWith('sendSMS') || request === '../utils/sendSMS') {
    return async () => ({ success: true });
  }
  return origLoad.apply(this, arguments);
};

const app = require('../server');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentReceipt = require('../models/PaymentReceipt');

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
    const landlord = await User.create({
      name: 'Landlord Paybill',
      email: 'landlord_pb@test.local',
      phone: '+254700333001',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });

    await Settings.create({
      user: landlord._id,
      orgName: 'Hacienda Estates',
      mpesaType: 'Paybill',
      paybillAccount: '385410',
      integrations: { mpesa: { shortcode: '516600' } }
    });

    const prop = await Property.create({ name: 'Hacienda', location: 'Westlands', user: landlord._id });
    const unit = await Unit.create({ propertyId: prop._id, unitNumber: '1B', user: landlord._id, rentAmount: 15000, status: 'occupied' });

    const tenant = await Tenant.create({
      name: 'Abigael Jones',
      email: 'abigael_pb@test.local',
      phone: '0711999888',
      user: landlord._id,
      unitId: unit._id,
      status: 'active',
      rentAmount: 15000
    });

    const tenantUser = await User.create({
      name: 'Abigael Jones',
      email: 'abigael_pb@test.local',
      password: 'Password#1234',
      role: 'tenant',
      tenantId: tenant._id,
      isVerified: true,
      hasCompletedOnboarding: true
    });

    const tokLandlord = jwt.sign({ id: landlord._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokTenant = jwt.sign({ id: tenantUser._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: Tenant Portal Summary & Paybill Config expose configured Paybill 516600 / 385410
    const summaryRes = await apiReq('/api/v2/payments/tenant-portal/summary', { token: tokTenant });
    assert.strictEqual(summaryRes.status, 200);
    assert.strictEqual(summaryRes.data.paybillConfig.enabled, true);
    assert.strictEqual(summaryRes.data.paybillConfig.businessNumber, '516600');
    assert.strictEqual(summaryRes.data.paybillConfig.defaultAccount, '385410');

    const cfgRes = await apiReq(`/api/v2/payments/paybill-config?tenantId=${tenant._id}`, { token: tokLandlord });
    assert.strictEqual(cfgRes.status, 200);
    assert.strictEqual(cfgRes.data.businessNumber, '516600');
    console.log('✅ PASS 1: Configured Paybill 516600 & default account 385410 exposed cleanly');

    // TEST 2: Initiate Paybill + Tenant submits code (remains processing) + Landlord confirms -> settled & appears in MPESA Transactions
    const initRes = await apiReq('/api/v2/payments/tenant/initiate', {
      method: 'POST',
      token: tokTenant,
      body: {
        tenantId: String(tenant._id),
        paymentChannel: 'mpesa_paybill',
        paymentCategory: 'rent',
        amount: 15000
      }
    });
    assert.strictEqual(initRes.status, 201);
    assert.strictEqual(initRes.data.transaction.provider, 'mpesa_c2b');
    assert.strictEqual(initRes.data.transaction.paymentChannel, 'mpesa_paybill');
    assert.strictEqual(initRes.data.gateway.paybillInstructions.businessNumber, '516600');

    const subRes = await apiReq('/api/v2/payments/tenant/paybill-submit', {
      method: 'POST',
      token: tokTenant,
      body: {
        transactionId: initRes.data.transaction._id,
        receiptCode: 'SJK99PB001',
        phone: '0711999888'
      }
    });
    assert.strictEqual(subRes.status, 201);
    assert.strictEqual(subRes.data.reconciled, false, 'Tenant submission must NOT self-mark transaction as paid');
    assert.strictEqual(subRes.data.transaction.status, 'processing');
    assert.strictEqual(subRes.data.transaction.providerReference, 'SJK99PB001');

    // Tenant cannot call landlord confirm endpoint (403)
    const tenantConfirmForbidden = await apiReq(`/api/v2/payments/paybill/${initRes.data.transaction._id}/confirm`, {
      method: 'POST',
      token: tokTenant
    });
    assert.strictEqual(tenantConfirmForbidden.status, 403);

    const confirmRes = await apiReq(`/api/v2/payments/paybill/${initRes.data.transaction._id}/confirm`, {
      method: 'POST',
      token: tokLandlord,
      body: { receiptCode: 'SJK99PB001' }
    });
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.data.reconciled, true);
    assert.strictEqual(confirmRes.data.transaction.status, 'paid');

    const lookupRes = await apiReq('/api/v2/payments/lookup', {
      method: 'POST',
      token: tokLandlord,
      body: { query: 'SJK99PB001', tenantMpesaRentOnly: true }
    });
    assert.strictEqual(lookupRes.status, 200);
    assert.strictEqual(lookupRes.data.found, true);
    assert.strictEqual(lookupRes.data.amount, 15000);
    console.log('✅ PASS 2: Tenant Paybill submit -> Landlord confirm -> settled & searchable in MPESA Transactions');

    // TEST 3: Public Safaricom C2B Validation & Confirmation (Unit match + Idempotency + Unmatched default account -> Assign & Confirm)
    const valRes = await apiReq('/api/mpesa/c2b-validation', {
      method: 'POST',
      body: { BusinessShortCode: '516600', BillRefNumber: '1B', TransAmount: '5300' }
    });
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.data.ResultCode, 0);

    const c2bMatched = await apiReq('/api/mpesa/c2b-confirmation', {
      method: 'POST',
      body: {
        TransID: 'C2BMATCH001',
        TransAmount: '5300',
        BusinessShortCode: '516600',
        BillRefNumber: '1B',
        MSISDN: '254711999888',
        FirstName: 'Abigael'
      }
    });
    assert.strictEqual(c2bMatched.status, 200);
    assert.strictEqual(c2bMatched.data.ResultCode, 0);

    const matchedTxn = await PaymentTransaction.findOne({ providerReference: 'C2BMATCH001' });
    assert.ok(matchedTxn && matchedTxn.status === 'paid');
    assert.strictEqual(matchedTxn.paymentChannel, 'mpesa_paybill');
    assert.strictEqual(await Payment.countDocuments({ paymentTransactionId: matchedTxn._id }), 1);

    // Duplicate C2B webhook MUST be idempotent
    await apiReq('/api/mpesa/c2b-confirmation', {
      method: 'POST',
      body: {
        TransID: 'C2BMATCH001',
        TransAmount: '5300',
        BusinessShortCode: '516600',
        BillRefNumber: '1B',
        MSISDN: '254711999888'
      }
    });
    assert.strictEqual(await PaymentReceipt.countDocuments({ providerReference: 'C2BMATCH001' }), 1);

    // Unmatched default account (385410) from unknown phone -> stored as unmatched for landlord assignment
    await apiReq('/api/mpesa/c2b-confirmation', {
      method: 'POST',
      body: {
        TransID: 'C2BUNMATCH01',
        TransAmount: '4000',
        BusinessShortCode: '516600',
        BillRefNumber: '385410',
        MSISDN: '254799000123',
        FirstName: 'ProxyPayer'
      }
    });
    const unmatchedTxn = await PaymentTransaction.findOne({ providerReference: 'C2BUNMATCH01' });
    assert.ok(unmatchedTxn && unmatchedTxn.status === 'unmatched');
    assert.strictEqual(String(unmatchedTxn.landlordId), String(landlord._id));

    const assignRes = await apiReq(`/api/v2/payments/paybill/${unmatchedTxn._id}/confirm`, {
      method: 'POST',
      token: tokLandlord,
      body: { tenantId: String(tenant._id) }
    });
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.data.transaction.status, 'paid');
    console.log('✅ PASS 3: Public Safaricom C2B Validation & Confirmation (matched, idempotent, & unmatched assign-confirm)');

    console.log('\n🎉 ALL 3 PAYBILL & C2B INTEGRATION TEST GROUPS PASSED!');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ PAYBILL INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
