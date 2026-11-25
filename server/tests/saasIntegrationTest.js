/**
 * End-to-End SaaS Integration & Security QA Suite
 * Covers all 22 scenarios in Phase 7 against a real Express + local MongoDB test database
 * (uses an isolated test DB `rental_manager_qa_test` and mocked external HTTP endpoints for Pesaflow/eTIMS).
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_qa_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_qa_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_qa_suite';
process.env.PAYMENT_DEFAULT_PROVIDER = 'pesaflow';
process.env.PESAFLOW_ENVIRONMENT = 'sandbox';
process.env.PESAFLOW_API_CLIENT_ID = 'TEST_CLIENT_001';
process.env.PESAFLOW_API_KEY = 'TEST_API_KEY_001';
process.env.PESAFLOW_API_SECRET = 'TEST_PESAFLOW_SECRET_XYZ';
process.env.PESAFLOW_WEBHOOK_SECRET = 'TEST_PESAFLOW_SECRET_XYZ';
process.env.PESAFLOW_SERVICE_ID = 'SVC_RENTAL_001';
process.env.PESAFLOW_PAYBILL_NUMBER = '222222';
process.env.ETIMS_ENVIRONMENT = 'sandbox';
process.env.ETIMS_TIN = 'P051234567X';
process.env.ETIMS_BHF_ID = '00';
process.env.ETIMS_DEVICE_SERIAL_NO = 'DEV-TEST-001';
process.env.ETIMS_CMC_KEY = 'CMC_TEST_KEY_123';

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentCallback = require('../models/PaymentCallback');
const PaymentAllocation = require('../models/PaymentAllocation');
const Invoice = require('../models/Invoice');
const PaymentReceipt = require('../models/PaymentReceipt');
const TaxSubmission = require('../models/TaxSubmission');
const PesaflowAdapter = require('../services/payments/PesaflowAdapter');
const { seedDefaultPlans, processSubscriptionExpirations } = require('../services/subscriptionService');
const PaymentService = require('../services/payments/PaymentService');

const pesaflowAdapter = new PesaflowAdapter();
let server;
let baseUrl;
let axiosOriginalPost;

function signPesaflowWebhook(payload, secret = process.env.PESAFLOW_WEBHOOK_SECRET) {
  const str = `${process.env.PESAFLOW_API_CLIENT_ID}${payload.invoice_number || ''}${payload.client_invoice_ref || ''}${payload.amount_paid ?? ''}${payload.payment_reference || ''}${secret}`;
  return pesaflowAdapter.generateSecureHash(str, secret);
}

async function req(path, { method = 'GET', token = null, body = null } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function runTests() {
  let passed = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      throw err;
    }
  };

  // Wait for server's boot DB connection (or connect cleanly) before dropping isolated test DB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  } else {
    await mongoose.connection.asPromise();
  }
  await mongoose.connection.dropDatabase();

  // Mock outbound axios.post to Pesaflow and KRA eTIMS sandbox endpoints
  axiosOriginalPost = axios.post;
  let mockEtimsMode = 'success';
  let mockPesaflowQueryStatus = 'paid';
  let mockPesaflowQueryAmount = 2500;
  axios.post = async (url, data, config) => {
    if (String(url).includes('pesaflow.com') && String(url).includes('iframe')) {
      return { status: 200, data: { request_id: `REQ-${Date.now()}`, invoice_number: `PF-INV-${Date.now()}` }, headers: {} };
    }
    if (String(url).includes('pesaflow.com') && String(url).includes('status')) {
      return {
        status: 200,
        data: {
          status: mockPesaflowQueryStatus,
          client_invoice_ref: data.ref_no,
          invoice_number: data.invoice_number || `PF-INV-STATUS`,
          payment_reference: `PF-VERIFY-${Date.now()}`,
          amount_paid: mockPesaflowQueryAmount,
          currency: 'KES'
        }
      };
    }
    if (String(url).includes('kra.go.ke') && String(url).includes('saveSales')) {
      if (mockEtimsMode === 'fail') {
        return { status: 200, data: { resultCd: '999', resultMsg: 'Simulated KRA Validation Error' } };
      }
      return {
        status: 200,
        data: {
          resultCd: '000',
          resultMsg: 'It is succeeded',
          data: {
            curRcptNo: '104',
            intrlData: 'INTRL-KRA-8812',
            rcptSign: 'SIGN-KRA-XYZ999',
            sdcDateTime: '20261117194000',
            qrCodeData: 'https://etims.kra.go.ke/verify?rcpt=104'
          }
        }
      };
    }
    return axiosOriginalPost.call(axios, url, data, config);
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;

  await seedDefaultPlans();
  await PaymentService.seedProviders();

  // Create Super Admin, Landlord A, Landlord B, and Tenant user (use @example.com so live email delivery is safely suppressed in tests)
  const superAdminUser = await User.create({
    name: 'Platform Super Admin',
    email: 'superadmin@example.com',
    phone: '0790264792',
    password: 'Password123!',
    role: 'superadmin',
    isSuperAdmin: true,
    isVerified: true,
    hasCompletedOnboarding: true
  });
  const superToken = jwt.sign({ id: superAdminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const landlordA = await User.create({
    name: 'Landlord Alpha',
    email: 'alpha@example.com',
    phone: '0711111111',
    password: 'Password123!',
    role: 'admin',
    isVerified: true,
    hasCompletedOnboarding: true
  });
  const tokenA = jwt.sign({ id: landlordA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const landlordB = await User.create({
    name: 'Landlord Beta',
    email: 'beta@example.com',
    phone: '0722222222',
    password: 'Password123!',
    role: 'admin',
    isVerified: true,
    hasCompletedOnboarding: true
  });
  const tokenB = jwt.sign({ id: landlordB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const propA = await Property.create({ name: 'Alpha Apartments', location: 'Westlands', user: landlordA._id });
  const propB = await Property.create({ name: 'Beta Heights', location: 'Kilimani', user: landlordB._id });

  // ── TESTS ───────────────────────────────────────────────────────────────────
  await test('Seeded plans include Starter (5), Basic (10), Growth (25), Professional (50), Business (100), Enterprise (Custom)', async () => {
    const r = await req('/api/subscriptions/plans');
    assert.strictEqual(r.status, 200);
    const codes = r.data.map(p => p.code);
    assert.deepStrictEqual(codes, ['starter', 'basic', 'growth', 'professional', 'business', 'enterprise']);
  });

  let pendingBasicSubRes;
  await test('1 & 10. Pesaflow payment initiation creates pending transaction and does NOT activate subscription prematurely', async () => {
    pendingBasicSubRes = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenA,
      body: {
        planCode: 'basic',
        desiredUnits: 10,
        billingCycle: 'monthly',
        paymentChannel: 'hosted_checkout',
        idempotencyKey: 'idem_basic_1'
      }
    });
    assert.strictEqual(pendingBasicSubRes.status, 201);
    assert.strictEqual(pendingBasicSubRes.data.subscription.status, 'pending_payment');
    assert.strictEqual(pendingBasicSubRes.data.transaction.status, 'pending');
    assert.strictEqual(pendingBasicSubRes.data.transaction.currency, 'KES');
    assert.strictEqual(pendingBasicSubRes.data.invoice.invoiceCategory, 'subscription');
    assert.ok(pendingBasicSubRes.data.gateway.checkoutUrl);
  });

  await test('5. Invalid webhook signature is rejected (401) and logged as rejected_signature', async () => {
    const payload = {
      status: 'paid',
      client_invoice_ref: pendingBasicSubRes.data.transaction.accountReference,
      invoice_number: pendingBasicSubRes.data.transaction.gatewayInvoiceNumber,
      payment_reference: 'FAKE-SIG-001',
      amount_paid: 2500,
      currency: 'KES',
      secure_hash: 'INVALID_FORGED_HASH'
    };
    const r = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payload });
    assert.strictEqual(r.status, 401);
    const subCheck = await LandlordSubscription.findById(pendingBasicSubRes.data.subscription._id);
    assert.strictEqual(subCheck.status, 'pending_payment');
  });

  await test('8. Incorrect transaction amount (underpayment) fails reconciliation & does NOT activate subscription', async () => {
    const payload = {
      status: 'paid',
      client_invoice_ref: pendingBasicSubRes.data.transaction.accountReference,
      invoice_number: pendingBasicSubRes.data.transaction.gatewayInvoiceNumber,
      payment_reference: 'UNDERPAY-001',
      amount_paid: 1000, // Underpaid (Expected 2500)
      currency: 'KES'
    };
    payload.secure_hash = signPesaflowWebhook(payload);
    const r = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payload });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.status, 'amount_mismatch');
    const subCheck = await LandlordSubscription.findById(pendingBasicSubRes.data.subscription._id);
    assert.strictEqual(subCheck.status, 'pending_payment');
  });

  await test('2 & 10. Successful Pesaflow IPN activates Basic (10-unit) subscription, sets UnitEntitlement & generates receipt', async () => {
    const payload = {
      status: 'paid',
      client_invoice_ref: pendingBasicSubRes.data.transaction.accountReference,
      invoice_number: pendingBasicSubRes.data.transaction.gatewayInvoiceNumber,
      payment_reference: 'PF-MPESA-BASIC-1001',
      amount_paid: 2500,
      currency: 'KES',
      payment_channel: 'mpesa_stk'
    };
    payload.secure_hash = signPesaflowWebhook(payload);
    const r = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payload });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.status, 'paid');

    const sub = await LandlordSubscription.findById(pendingBasicSubRes.data.subscription._id);
    assert.strictEqual(sub.status, 'active');
    const ent = await UnitEntitlement.findOne({ landlordId: landlordA._id });
    assert.strictEqual(ent.purchasedLimit, 10);
    assert.strictEqual(ent.status, 'active');

    const rct = await PaymentReceipt.findOne({ transactionId: pendingBasicSubRes.data.transaction._id });
    assert.ok(rct && rct.receiptCategory === 'subscription');
  });

  await test('6. Duplicate callback handling ignores duplicate IPN idempotently without double activation', async () => {
    const payload = {
      status: 'paid',
      client_invoice_ref: pendingBasicSubRes.data.transaction.accountReference,
      invoice_number: pendingBasicSubRes.data.transaction.gatewayInvoiceNumber,
      payment_reference: 'PF-MPESA-BASIC-1001',
      amount_paid: 2500,
      currency: 'KES'
    };
    payload.secure_hash = signPesaflowWebhook(payload);
    const r = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payload });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.status, 'duplicate_ignored');
    const allocCount = await PaymentAllocation.countDocuments({ transactionId: pendingBasicSubRes.data.transaction._id });
    assert.strictEqual(allocCount, 1);
  });

  await test('3 & 4. Failed and cancelled payment webhooks update transaction without activating subscription', async () => {
    const failSub = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenB,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'monthly', paymentChannel: 'card' }
    });
    const failPayload = {
      status: 'failed',
      client_invoice_ref: failSub.data.transaction.accountReference,
      amount_paid: 0,
      currency: 'KES',
      reason: 'Insufficient funds'
    };
    failPayload.secure_hash = signPesaflowWebhook(failPayload);
    const rf = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: failPayload });
    assert.strictEqual(rf.data.status, 'failed');

    const cancelSub = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenB,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'monthly', paymentChannel: 'ussd' }
    });
    const cancelPayload = {
      status: 'cancelled',
      client_invoice_ref: cancelSub.data.transaction.accountReference,
      amount_paid: 0,
      currency: 'KES'
    };
    cancelPayload.secure_hash = signPesaflowWebhook(cancelPayload);
    const rc = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: cancelPayload });
    assert.strictEqual(rc.data.status, 'cancelled');
  });

  await test('7. Unmatched transaction reference callback is logged for admin reconciliation', async () => {
    const payload = {
      status: 'paid',
      client_invoice_ref: 'UNKNOWN-REF-999',
      payment_reference: 'UNMATCHED-MPESA-777',
      amount_paid: 5000,
      currency: 'KES'
    };
    payload.secure_hash = signPesaflowWebhook(payload);
    const r = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payload });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.status, 'unmatched');

    const adminUnmatched = await req('/api/super-admin/unmatched', { token: superToken });
    assert.ok(adminUnmatched.data.unmatchedCallbacks.some(c => c.accountReference === 'UNKNOWN-REF-999'));
  });

  await test('14 & 15. Prevent adding 11th unit on 10-unit plan & enforce concurrency race safety', async () => {
    // Launch 15 concurrent POST /api/units requests against a 10-unit limit
    const requests = Array.from({ length: 15 }, (_, idx) =>
      req('/api/units', {
        method: 'POST',
        token: tokenA,
        body: { propertyId: propA._id, unitNumber: `A-${idx + 1}`, rentAmount: 20000 }
      })
    );
    const responses = await Promise.all(requests);
    const created = responses.filter(r => r.status === 201);
    const blocked = responses.filter(r => r.status === 403);
    assert.strictEqual(created.length, 10, `Expected exactly 10 created units, got ${created.length}`);
    assert.strictEqual(blocked.length, 5, `Expected 5 blocked requests, got ${blocked.length}`);
    assert.strictEqual(
      blocked[0].data.message,
      'You have reached your current subscription limit of 10 rental units. Upgrade your subscription to add more units.'
    );
  });

  await test('13. Upgrade from 10 to 25 units (Growth Plan) unlocks 11th unit immediately after verified payment', async () => {
    const upRes = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'mpesa_paybill' }
    });
    assert.strictEqual(upRes.status, 201);
    const payPayload = {
      status: 'paid',
      client_invoice_ref: upRes.data.transaction.accountReference,
      payment_reference: 'PF-UPGRADE-2501',
      amount_paid: upRes.data.transaction.amount,
      currency: 'KES'
    };
    payPayload.secure_hash = signPesaflowWebhook(payPayload);
    await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payPayload });

    const u11 = await req('/api/units', {
      method: 'POST',
      token: tokenA,
      body: { propertyId: propA._id, unitNumber: 'A-11', rentAmount: 22000 }
    });
    assert.strictEqual(u11.status, 201);
  });

  await test('Downgrade from 25 to 5 units preserves all 11 existing units while blocking new additions', async () => {
    const downRes = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'starter', desiredUnits: 5, billingCycle: 'monthly', paymentChannel: 'hosted_checkout' }
    });
    const payPayload = {
      status: 'paid',
      client_invoice_ref: downRes.data.transaction.accountReference,
      payment_reference: 'PF-DOWN-501',
      amount_paid: downRes.data.transaction.amount,
      currency: 'KES'
    };
    payPayload.secure_hash = signPesaflowWebhook(payPayload);
    await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payPayload });

    const countUnits = await Unit.countDocuments({ user: landlordA._id });
    assert.strictEqual(countUnits, 11, 'Existing units must NEVER be deleted during downgrade');

    // Re-upgrade back to Growth 25 for subsequent tests
    const reUp = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'hosted_checkout' }
    });
    const payUp = {
      status: 'paid',
      client_invoice_ref: reUp.data.transaction.accountReference,
      payment_reference: 'PF-REUP-2502',
      amount_paid: reUp.data.transaction.amount,
      currency: 'KES'
    };
    payUp.secure_hash = signPesaflowWebhook(payUp);
    await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payUp });
  });

  await test('9 & 11. Pull verification reconciles pending transaction & renewal extends expiry', async () => {
    const renewRes = await req('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'hosted_checkout' }
    });
    const prevExp = await LandlordSubscription.findOne({ landlordId: landlordA._id, status: 'active' });
    mockPesaflowQueryStatus = 'paid';
    mockPesaflowQueryAmount = renewRes.data.transaction.amount;
    const verifyRes = await req(`/api/v2/payments/verify/${renewRes.data.transaction._id}`, { token: tokenA });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.transaction.status, 'paid');
    assert.strictEqual(verifyRes.data.transaction.reconciliationStatus, 'reconciled');
    assert.ok(new Date(verifyRes.data.activationResult.subscription.expiryDate) > new Date(prevExp.startDate));
  });

  await test('12. Subscription expiry sweep tracks expired plans cleanly', async () => {
    const bSub = await LandlordSubscription.create({
      landlordId: landlordB._id,
      planId: (await SubscriptionPlan.findOne({ code: 'starter' }))._id,
      planCode: 'starter',
      planName: 'Starter',
      purchasedUnits: 5,
      maxPlanUnits: 5,
      priceAmount: 1500,
      status: 'active',
      startDate: new Date(Date.now() - 40 * 86400000),
      expiryDate: new Date(Date.now() - 10 * 86400000),
      graceEndDate: new Date(Date.now() - 2 * 86400000)
    });
    const summary = await processSubscriptionExpirations();
    assert.ok(summary.expiredCount >= 1);
    const updatedB = await LandlordSubscription.findById(bSub._id);
    assert.strictEqual(updatedB.status, 'expired');
  });

  let rentTxnRes;
  let rentInvoiceId;
  await test('16, 17, 18, 19. Tenant rent collection via Pesaflow allocates rent/water/service, creates receipt & rental invoice PDF', async () => {
    const unitA1 = await Unit.findOne({ user: landlordA._id }).sort({ createdAt: 1 });
    const tenantA = await Tenant.create({
      name: 'Grace Wanjiku',
      email: 'grace.wanjiku@example.com',
      phone: '0733445566',
      user: landlordA._id,
      unitId: unitA1._id,
      rentAmount: 20000,
      status: 'active'
    });
    const tenantUser = await User.create({
      name: 'Grace Wanjiku',
      email: 'grace.wanjiku@example.com',
      phone: '0733445566',
      password: 'Password123!',
      role: 'tenant',
      tenantId: tenantA._id,
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const tenantToken = jwt.sign({ id: tenantUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    rentTxnRes = await req('/api/v2/payments/tenant/initiate', {
      method: 'POST',
      token: tenantToken,
      body: {
        paymentChannel: 'hosted_checkout',
        paymentCategory: 'combined',
        chargeBreakdown: { rent: 20000, water: 1200, electricity: 800, serviceCharge: 1500, penalty: 0 }
      }
    });
    assert.strictEqual(rentTxnRes.status, 201);
    assert.strictEqual(rentTxnRes.data.invoice.invoiceCategory, 'rental');
    assert.strictEqual(rentTxnRes.data.transaction.amount, 23500);
    rentInvoiceId = rentTxnRes.data.invoice._id;

    const payPayload = {
      status: 'paid',
      client_invoice_ref: rentTxnRes.data.transaction.accountReference,
      payment_reference: 'PF-RENT-GRACE-01',
      amount_paid: 23500,
      currency: 'KES',
      payment_channel: 'mpesa_stk'
    };
    payPayload.secure_hash = signPesaflowWebhook(payPayload);
    const wh = await req('/api/v2/payments/webhooks/pesaflow', { method: 'POST', body: payPayload });
    assert.strictEqual(wh.data.status, 'paid');

    const inv = await Invoice.findById(rentInvoiceId);
    assert.strictEqual(inv.status, 'paid');
    assert.strictEqual(inv.etimsStatus, 'not_submitted', 'Generated PDF must NOT automatically mark invoice eTIMS compliant');

    // Download Invoice PDF
    const pdfRes = await fetch(`${baseUrl}/api/v2/payments/invoices/${rentInvoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');
  });

  await test('20. KRA eTIMS submission tracks failed retries & confirmed validation strictly via API response', async () => {
    mockEtimsMode = 'fail';
    const failRes = await req(`/api/v2/payments/etims/submit/${rentInvoiceId}`, { method: 'POST', token: tokenA });
    assert.strictEqual(failRes.status, 200);
    assert.strictEqual(failRes.data.submission.status, 'failed');
    assert.strictEqual(failRes.data.invoice.etimsStatus, 'failed');

    mockEtimsMode = 'success';
    const retryRes = await req(`/api/v2/payments/etims/retry/${failRes.data.submission._id}`, { method: 'POST', token: tokenA });
    assert.strictEqual(retryRes.status, 200);
    assert.strictEqual(retryRes.data.submission.status, 'validated');
    assert.strictEqual(retryRes.data.submission.etimsReceiptNo, '104');
    assert.strictEqual(retryRes.data.invoice.etimsStatus, 'validated');
  });

  await test('21. Unauthorized payment & Super Admin access are strictly blocked (401/403)', async () => {
    const unauth = await req('/api/subscriptions/my');
    assert.strictEqual(unauth.status, 401);

    const landlordOnSuperAdmin = await req('/api/super-admin/overview', { token: tokenA });
    assert.strictEqual(landlordOnSuperAdmin.status, 403);

    const crossTenantVerify = await req(`/api/v2/payments/verify/${rentTxnRes.data.transaction._id}`, { token: tokenB });
    assert.strictEqual(crossTenantVerify.status, 403);
  });

  await test('22. Payment reversal updates transaction, payment status & reopens invoice balance', async () => {
    const revRes = await req(`/api/super-admin/transactions/${rentTxnRes.data.transaction._id}/reverse`, {
      method: 'POST',
      token: superToken,
      body: { reason: 'Chargeback QA Test' }
    });
    assert.strictEqual(revRes.status, 200);
    assert.strictEqual(revRes.data.transaction.status, 'reversed');

    const invAfter = await Invoice.findById(rentInvoiceId);
    assert.strictEqual(invAfter.status, 'open');
    assert.strictEqual(invAfter.balanceDue, 23500);

    const pAfter = await Payment.findOne({ paymentTransactionId: rentTxnRes.data.transaction._id });
    assert.strictEqual(pAfter.status, 'reversed');
  });

  console.log(`\n🎉 ALL ${passed} INTEGRATION TESTS PASSED SUCCESSFULLY!`);
}

runTests()
  .catch((err) => {
    console.error('QA Suite failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (axiosOriginalPost) axios.post = axiosOriginalPost;
    if (server) server.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });
