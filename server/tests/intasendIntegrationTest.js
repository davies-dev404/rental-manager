/**
 * End-to-End IntaSend Payment Gateway Integration & Security Test Suite
 * Tests against real Express app + isolated MongoDB (`rental_manager_intasend_test`) + mocked IntaSend endpoints.
 * Covers all Section 10 scenarios: M-Pesa, Card, Pending/Failed/Cancelled, Redirect spoof guard,
 * Duplicate IPN idempotency, Invalid challenge/reference, Underpayment, Monthly/Annual/Renewal/Expiry,
 * Unauthorized access, Environment switching, and Sandbox vs Production isolation.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_intasend_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_intasend_test';
process.env.JWT_SECRET = 'intasend_integration_test_jwt_secret_2026';

// Initial Sandbox Configuration
process.env.INTASEND_ENV = 'sandbox';
process.env.INTASEND_SANDBOX_PUBLISHABLE_KEY = 'ISPubKey_test_sandbox_suite_001';
process.env.INTASEND_SANDBOX_SECRET_KEY = 'ISSecretKey_test_sandbox_suite_001';
process.env.INTASEND_SANDBOX_WEBHOOK_CHALLENGE = 'sandbox_challenge_secret_999';
process.env.INTASEND_PRODUCTION_PUBLISHABLE_KEY = 'ISPubKey_live_prod_suite_001';
process.env.INTASEND_PRODUCTION_SECRET_KEY = 'ISSecretKey_live_prod_suite_001';
process.env.INTASEND_PRODUCTION_WEBHOOK_CHALLENGE = 'prod_challenge_secret_999';
process.env.PAYMENT_DEFAULT_PROVIDER = 'intasend';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Module = require('module');

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('sendEmail') || request === '../utils/sendEmail') {
    return async () => ({ messageId: 'mock-intasend-test-email' });
  }
  if (request.endsWith('sendSMS') || request === '../utils/sendSMS') {
    return async () => ({ success: true });
  }
  return origLoad.apply(this, arguments);
};

const app = require('../server');
const User = require('../models/User');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentCallback = require('../models/PaymentCallback');
const PaymentReceipt = require('../models/PaymentReceipt');
const { getIntaSendConfig, validateIntaSendConfig } = require('../config/intasendConfig');
const { seedDefaultPlans, processSubscriptionExpirations, activatePaidSubscription } = require('../services/subscriptionService');
const PaymentService = require('../services/payments/PaymentService');

let server;
let baseUrl;
let axiosOrigPost;

async function apiReq(urlPath, { method = 'GET', token = null, body = null } = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
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
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  } else {
    await mongoose.connection.asPromise();
  }
  await mongoose.connection.dropDatabase();
  await seedDefaultPlans();

  // Dynamic mocked IntaSend server responses keyed by invoice_id
  const mockGatewayState = new Map();
  let lastIntaSendEndpointCalled = '';

  axiosOrigPost = axios.post;
  axios.post = async (url, data, config) => {
    const u = String(url);
    if (u.includes('intasend.com/api/v1/checkout/')) {
      lastIntaSendEndpointCalled = u;
      const cid = `CHK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const iid = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      mockGatewayState.set(iid, {
        invoice_id: iid,
        checkout_id: cid,
        state: 'PENDING',
        provider: data.method === 'CARD-PAYMENT' ? 'CARD-PAYMENT' : 'M-PESA',
        value: String(data.amount),
        currency: data.currency || 'KES',
        api_ref: data.api_ref,
        account: data.phone_number || '254712345678'
      });
      return {
        status: 200,
        data: {
          id: cid,
          invoice_id: iid,
          url: `${u.includes('sandbox.') ? 'https://sandbox.intasend.com' : 'https://payment.intasend.com'}/checkout/${cid}/`,
          signature: `sig_${cid}`
        }
      };
    }
    if (u.includes('intasend.com/api/v1/payment/mpesa-stk-push/')) {
      lastIntaSendEndpointCalled = u;
      const iid = `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rec = {
        invoice_id: iid,
        state: 'PENDING',
        provider: 'M-PESA',
        value: String(data.amount),
        currency: 'KES',
        api_ref: data.api_ref,
        account: data.phone_number
      };
      mockGatewayState.set(iid, rec);
      return { status: 200, data: { invoice: rec } };
    }
    if (u.includes('intasend.com/api/v1/payment/status/')) {
      lastIntaSendEndpointCalled = u;
      const lookupId = data.invoice_id || data.checkout_id;
      let match = mockGatewayState.get(lookupId);
      if (!match) {
        for (const v of mockGatewayState.values()) {
          if (v.checkout_id === lookupId || v.invoice_id === lookupId) {
            match = v;
            break;
          }
        }
      }
      if (!match) {
        const err = new Error('Not found');
        err.response = { status: 404, data: { detail: 'Invoice not found' } };
        throw err;
      }
      return { status: 200, data: { invoice: match } };
    }
    return axiosOrigPost.call(axios, url, data, config);
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Seed Landlord A, Landlord B, and Super Admin
    const landlordA = await User.create({
      name: 'Landlord One',
      email: 'landlord_is1@test.local',
      phone: '0712345678',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const landlordB = await User.create({
      name: 'Landlord Two',
      email: 'landlord_is2@test.local',
      phone: '0722334455',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const superAdmin = await User.create({
      name: 'Platform Super Admin',
      email: 'super_is@test.local',
      password: 'Password#1234',
      role: 'superadmin',
      isSuperAdmin: true,
      isVerified: true,
      hasCompletedOnboarding: true
    });

    const tokA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokB = jwt.sign({ id: landlordB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokSuper = jwt.sign({ id: superAdmin._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: Config validation & Environment URL selection (Sandbox vs Production switching)
    const sbCfg = getIntaSendConfig({ requireConfigured: true });
    assert.strictEqual(sbCfg.environment, 'sandbox');
    assert.strictEqual(sbCfg.baseUrl, 'https://sandbox.intasend.com/api/v1');
    assert.strictEqual(sbCfg.isSandbox, true);

    process.env.INTASEND_ENV = 'invalid_env';
    assert.throws(() => validateIntaSendConfig(), /INTASEND_INVALID_ENV|Invalid INTASEND_ENV/);
    process.env.INTASEND_ENV = 'sandbox';
    // Cross-env key rejection: live key in sandbox mode MUST throw!
    const savedPub = process.env.INTASEND_SANDBOX_PUBLISHABLE_KEY;
    process.env.INTASEND_SANDBOX_PUBLISHABLE_KEY = 'ISPubKey_live_wrong_key';
    assert.throws(() => validateIntaSendConfig(), /Production IntaSend live keys cannot be used/);
    process.env.INTASEND_SANDBOX_PUBLISHABLE_KEY = savedPub;
    console.log('✅ PASS 1: Centralized IntaSend env switching & key-environment mismatch validation');

    // TEST 2: Monthly Subscription initiation via M-Pesa STK Push + Pending State + Redirect Spoof Guard
    const subMpesa = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: {
        planCode: 'basic',
        desiredUnits: 10,
        billingCycle: 'monthly',
        paymentChannel: 'mpesa_stk',
        provider: 'intasend',
        phone: '0712345678',
        amount: 1 // tampered client amount MUST be ignored by backend!
      }
    });
    assert.strictEqual(subMpesa.status, 201);
    assert.strictEqual(subMpesa.data.transaction.amount, 2500);
    assert.strictEqual(subMpesa.data.transaction.gatewayEnvironment, 'sandbox');
    assert.strictEqual(subMpesa.data.transaction.isSandbox, true);
    assert.strictEqual(subMpesa.data.subscription.status, 'pending_payment');
    assert.ok(lastIntaSendEndpointCalled.startsWith('https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/'));

    // Redirect callback while IntaSend still reports PENDING MUST NOT activate
    const cbPending = await apiReq('/api/v2/payments/callback/intasend', {
      method: 'POST',
      token: tokA,
      body: { txnId: subMpesa.data.transaction._id }
    });
    assert.strictEqual(cbPending.status, 200);
    assert.strictEqual(cbPending.data.transaction.status, 'processing');
    assert.strictEqual((await LandlordSubscription.findById(subMpesa.data.subscription._id)).status, 'pending_payment');
    console.log('✅ PASS 2: Monthly M-Pesa STK initiation ignores client amount, stays pending, blocks redirect spoof');

    // TEST 3: Invalid webhook challenge + Successful M-Pesa IPN + Duplicate IPN Idempotency
    const trackingMpesa = subMpesa.data.transaction.trackingId;
    mockGatewayState.set(trackingMpesa, {
      ...mockGatewayState.get(trackingMpesa),
      state: 'COMPLETE',
      provider: 'M-PESA',
      mpesa_reference: 'QWE123MPESA',
      value: '2500.00',
      currency: 'KES'
    });

    const badChallenge = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: trackingMpesa,
        state: 'COMPLETE',
        api_ref: subMpesa.data.transaction.accountReference,
        value: '2500.00',
        currency: 'KES',
        challenge: 'wrong_challenge'
      }
    });
    assert.strictEqual(badChallenge.status, 401);

    const goodWebhook = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: trackingMpesa,
        state: 'COMPLETE',
        provider: 'M-PESA',
        api_ref: subMpesa.data.transaction.accountReference,
        mpesa_reference: 'QWE123MPESA',
        value: '2500.00',
        currency: 'KES',
        challenge: process.env.INTASEND_SANDBOX_WEBHOOK_CHALLENGE
      }
    });
    assert.strictEqual(goodWebhook.status, 200);
    assert.strictEqual(goodWebhook.data.status, 'paid');

    const activatedSub = await LandlordSubscription.findById(subMpesa.data.subscription._id);
    assert.strictEqual(activatedSub.status, 'active');
    assert.strictEqual(activatedSub.isSandbox, true);
    assert.strictEqual(activatedSub.paymentEnvironment, 'sandbox');
    assert.strictEqual(await PaymentReceipt.countDocuments({ subscriptionId: activatedSub._id }), 1);

    // Duplicate IPN -> MUST ignore cleanly without second receipt
    const dupWebhook = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: trackingMpesa,
        state: 'COMPLETE',
        api_ref: subMpesa.data.transaction.accountReference,
        value: '2500.00',
        currency: 'KES',
        challenge: process.env.INTASEND_SANDBOX_WEBHOOK_CHALLENGE
      }
    });
    assert.strictEqual(dupWebhook.status, 200);
    assert.strictEqual(dupWebhook.data.status, 'duplicate_ignored');
    assert.strictEqual(await PaymentReceipt.countDocuments({ subscriptionId: activatedSub._id }), 1);
    console.log('✅ PASS 3: Bad challenge rejected (401), M-Pesa verified & activated, duplicate IPN idempotent');

    // TEST 4: Failed M-Pesa payment, Cancelled Card payment & Underpayment guard
    const subFail = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: { planCode: 'starter', desiredUnits: 5, billingCycle: 'monthly', paymentChannel: 'mpesa_stk', provider: 'intasend', phone: '0712345678' }
    });
    mockGatewayState.set(subFail.data.transaction.trackingId, {
      ...mockGatewayState.get(subFail.data.transaction.trackingId),
      state: 'FAILED',
      failed_reason: 'DS timeout - user did not enter M-Pesa PIN'
    });
    const resFail = await apiReq(`/api/v2/payments/verify/${subFail.data.transaction._id}`, { token: tokA });
    assert.strictEqual(resFail.status, 200);
    assert.strictEqual(resFail.data.transaction.status, 'failed');
    assert.strictEqual((await LandlordSubscription.findById(subFail.data.subscription._id)).status, 'pending_payment');

    const subCancel = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'hosted_checkout', provider: 'intasend' }
    });
    assert.ok(subCancel.data.gateway.checkoutUrl.startsWith('https://sandbox.intasend.com/checkout/'));
    mockGatewayState.set(subCancel.data.transaction.trackingId, {
      ...mockGatewayState.get(subCancel.data.transaction.trackingId),
      state: 'CANCELLED',
      failed_reason: 'User cancelled hosted checkout'
    });
    const resCancel = await apiReq(`/api/v2/payments/verify/${subCancel.data.transaction._id}`, { token: tokA });
    assert.strictEqual(resCancel.data.transaction.status, 'cancelled');
    assert.strictEqual((await LandlordSubscription.findById(subCancel.data.subscription._id)).status, 'pending_payment');

    // Underpayment protection
    const subUnder = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokB,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'card', provider: 'intasend' }
    });
    mockGatewayState.set(subUnder.data.transaction.trackingId, {
      ...mockGatewayState.get(subUnder.data.transaction.trackingId),
      state: 'COMPLETE',
      provider: 'CARD-PAYMENT',
      value: '100.00', // expected 4500!
      currency: 'KES'
    });
    const resUnder = await apiReq(`/api/v2/payments/verify/${subUnder.data.transaction._id}`, { token: tokB });
    assert.strictEqual(resUnder.data.transaction.reconciliationStatus, 'amount_mismatch');
    assert.notStrictEqual(resUnder.data.transaction.status, 'paid');
    assert.strictEqual((await LandlordSubscription.findById(subUnder.data.subscription._id)).status, 'pending_payment');
    console.log('✅ PASS 4: Failed M-Pesa, Cancelled checkout, and Underpayment strictly prevented from activating');

    // TEST 5: Unauthorized access & Invalid / Unmatched references
    assert.strictEqual((await apiReq(`/api/v2/payments/verify/${subUnder.data.transaction._id}`, { token: tokA })).status, 403);
    assert.strictEqual((await apiReq('/api/super-admin/overview', { token: tokA })).status, 403);
    assert.strictEqual((await apiReq('/api/super-admin/overview')).status, 401);
    const unmatched = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: 'UNKNOWN-INV-999',
        api_ref: 'UNKNOWN-REF-999',
        state: 'COMPLETE',
        value: '2500',
        currency: 'KES',
        challenge: process.env.INTASEND_SANDBOX_WEBHOOK_CHALLENGE
      }
    });
    assert.strictEqual(unmatched.status, 200);
    assert.strictEqual(unmatched.data.status, 'unmatched');
    console.log('✅ PASS 5: Unauthorized cross-landlord/admin access (401/403) & unmatched references handled');

    // TEST 6: Annual Card Subscription + Renewal Extension + Expiry Lock
    const subAnnual = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'annual', paymentChannel: 'card', provider: 'intasend' }
    });
    assert.strictEqual(subAnnual.status, 201);
    assert.strictEqual(subAnnual.data.transaction.amount, 24000);
    mockGatewayState.set(subAnnual.data.transaction.trackingId, {
      ...mockGatewayState.get(subAnnual.data.transaction.trackingId),
      state: 'COMPLETE',
      provider: 'CARD-PAYMENT',
      value: '24000.00',
      currency: 'KES'
    });
    const resAnnual = await apiReq('/api/v2/payments/callback/intasend', {
      method: 'POST',
      token: tokA,
      body: { tracking_id: subAnnual.data.transaction.trackingId }
    });
    assert.strictEqual(resAnnual.status, 200);
    assert.strictEqual(resAnnual.data.transaction.status, 'paid');
    assert.strictEqual(resAnnual.data.transaction.paymentChannel, 'card');
    const annSubDoc = await LandlordSubscription.findById(subAnnual.data.subscription._id);
    const monthsAhead = (new Date(annSubDoc.expiryDate) - new Date(annSubDoc.startDate)) / (30 * 24 * 60 * 60 * 1000);
    assert.ok(monthsAhead >= 11.5, 'Annual subscription expiry must extend ~12 months');

    // Subscription expiry check
    await LandlordSubscription.findByIdAndUpdate(annSubDoc._id, {
      expiryDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
      graceEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });
    await processSubscriptionExpirations();
    const expiredCheck = await LandlordSubscription.findById(annSubDoc._id);
    assert.strictEqual(expiredCheck.status, 'expired');
    console.log('✅ PASS 6: Annual Visa/Mastercard activation, renewal expiry math, and expiry sweep verified');

    // TEST 7: Super Admin strictly excludes Sandbox test payments from Production revenue & separates ledgers
    const saOverviewBeforeProd = await apiReq('/api/super-admin/overview', { token: tokSuper });
    assert.strictEqual(saOverviewBeforeProd.status, 200);
    assert.strictEqual(saOverviewBeforeProd.data.metrics.totalSubscriptionRevenue, 0, 'Real revenue MUST exclude sandbox payments!');
    assert.ok(saOverviewBeforeProd.data.sandboxMetrics.totalTestVolume >= 26500, 'Sandbox ledger captures sandbox volume separately');

    // Switch dynamically to PRODUCTION via env var ONLY (no code change, no rebuild!)
    process.env.INTASEND_ENV = 'production';
    const prodCfg = getIntaSendConfig({ requireConfigured: true });
    assert.strictEqual(prodCfg.baseUrl, 'https://payment.intasend.com/api/v1');

    // Verify sandbox transaction CANNOT activate a production subscription when INTASEND_ENV=production!
    const sandboxTxn = await PaymentTransaction.findById(subMpesa.data.transaction._id);
    const prodPendingSub = await LandlordSubscription.create({
      landlordId: landlordB._id,
      planId: annSubDoc.planId,
      planCode: 'basic',
      planName: 'Basic',
      billingCycle: 'monthly',
      purchasedUnits: 10,
      maxPlanUnits: 10,
      priceAmount: 2500,
      currency: 'KES',
      status: 'pending_payment'
    });
    await assert.rejects(
      () => activatePaidSubscription({ subscriptionId: prodPendingSub._id, paymentTransaction: sandboxTxn }),
      /Sandbox transactions cannot activate production subscriptions/
    );

    // Also verify cross-environment webhook for sandbox transaction under INTASEND_ENV=production fails with 403!
    const crossEnvHook = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: trackingMpesa,
        state: 'COMPLETE',
        api_ref: sandboxTxn.accountReference,
        value: '2500.00',
        currency: 'KES',
        challenge: process.env.INTASEND_PRODUCTION_WEBHOOK_CHALLENGE
      }
    });
    assert.strictEqual(crossEnvHook.status, 403);

    // Initiate & verify a REAL Production Annual + Monthly payment under INTASEND_ENV=production
    const prodSubRes = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokB,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'monthly', paymentChannel: 'hosted_checkout', provider: 'intasend' }
    });
    assert.strictEqual(prodSubRes.status, 201);
    assert.strictEqual(prodSubRes.data.transaction.gatewayEnvironment, 'production');
    assert.strictEqual(prodSubRes.data.transaction.isSandbox, false);
    assert.ok(lastIntaSendEndpointCalled.startsWith('https://payment.intasend.com/api/v1/checkout/'));

    mockGatewayState.set(prodSubRes.data.transaction.trackingId, {
      ...mockGatewayState.get(prodSubRes.data.transaction.trackingId),
      state: 'COMPLETE',
      provider: 'M-PESA',
      mpesa_reference: 'PRODMPESA001',
      value: '2500.00',
      currency: 'KES'
    });
    const prodHook = await apiReq('/api/v2/payments/webhooks/intasend', {
      method: 'POST',
      body: {
        invoice_id: prodSubRes.data.transaction.trackingId,
        state: 'COMPLETE',
        api_ref: prodSubRes.data.transaction.accountReference,
        value: '2500.00',
        currency: 'KES',
        challenge: process.env.INTASEND_PRODUCTION_WEBHOOK_CHALLENGE
      }
    });
    assert.strictEqual(prodHook.status, 200);
    assert.strictEqual(prodHook.data.status, 'paid');

    // Production revenue now reflects ONLY KES 2,500 (excluding the KES 26,500 sandbox tests!)
    const saOverviewProd = await apiReq('/api/super-admin/overview', { token: tokSuper });
    assert.strictEqual(saOverviewProd.data.metrics.totalSubscriptionRevenue, 2500);
    assert.strictEqual(saOverviewProd.data.metrics.monthlyRevenue, 2500);
    assert.strictEqual(saOverviewProd.data.metrics.annualRevenue, 0);

    const prodCsv = await apiReq('/api/super-admin/reports/transactions?environment=production', { token: tokSuper });
    assert.strictEqual(prodCsv.status, 200);
    assert.ok(String(prodCsv.data).includes('PRODMPESA001'));
    assert.ok(!String(prodCsv.data).includes('QWE123MPESA'), 'Production CSV report must NOT contain sandbox transactions');
    console.log('✅ PASS 7: Production env switching via config alone, sandbox-to-prod isolation, and clean CSV reporting');

    console.log('\n🎉 ALL 7 INTASEND INTEGRATION, SWITCHING & SECURITY TEST GROUPS PASSED!');
  } finally {
    if (axiosOrigPost) axios.post = axiosOrigPost;
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ INTASEND TEST SUITE FAILED:', err);
    process.exit(1);
  });
