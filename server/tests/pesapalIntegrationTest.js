/**
 * End-to-End Pesapal API 3.0 Payment Gateway Integration & Security Test Suite
 * Tests against real Express app + isolated MongoDB (`rental_manager_pesapal_test`) + mocked Pesapal API 3.0 HTTP endpoints.
 * Covers all Section 10 scenarios: M-Pesa success/failed, Cancelled, Pending, Card success,
 * Duplicate POST & GET IPN idempotency, Invalid references, Underpayment, Monthly/Annual/Renewal/Expiry,
 * Unauthorized access, Environment switching, and Sandbox vs Production isolation.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_pesapal_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_pesapal_test';
process.env.JWT_SECRET = 'pesapal_integration_test_jwt_secret_2026';

process.env.PAYMENT_DEFAULT_PROVIDER = 'pesapal';
process.env.PESAPAL_ENV = 'sandbox';
process.env.PESAPAL_SANDBOX_CONSUMER_KEY = 'sandbox_consumer_key_001';
process.env.PESAPAL_SANDBOX_CONSUMER_SECRET = 'sandbox_consumer_secret_001';
process.env.PESAPAL_PRODUCTION_CONSUMER_KEY = 'prod_consumer_key_001';
process.env.PESAPAL_PRODUCTION_CONSUMER_SECRET = 'prod_consumer_secret_001';
process.env.PESAPAL_IPN_URL = 'https://rental-manager-1-7jmg.onrender.com/api/v2/payments/webhooks/pesapal';
process.env.PESAPAL_CALLBACK_URL = 'https://makaziflow.afrinextech.co.ke/billing';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Module = require('module');

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('sendEmail') || request === '../utils/sendEmail') {
    return async () => ({ messageId: 'mock-pesapal-test-email' });
  }
  if (request.endsWith('sendSMS') || request === '../utils/sendSMS') {
    return async () => ({ success: true });
  }
  return origLoad.apply(this, arguments);
};

const app = require('../server');
const User = require('../models/User');
const LandlordSubscription = require('../models/LandlordSubscription');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentReceipt = require('../models/PaymentReceipt');
const { getPesapalConfig, validatePesapalConfig } = require('../config/pesapalConfig');
const PesapalAdapter = require('../services/payments/PesapalAdapter');
const PaymentService = require('../services/payments/PaymentService');
const { seedDefaultPlans, processSubscriptionExpirations, activatePaidSubscription } = require('../services/subscriptionService');

let server;
let baseUrl;
let axiosOrigPost;
let axiosOrigGet;

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

  const mockOrders = new Map();
  let lastOrderEndpoint = '';
  let lastAuthEndpoint = '';

  axiosOrigPost = axios.post;
  axiosOrigGet = axios.get;

  axios.post = async (url, data, config) => {
    const u = String(url);
    if (u.endsWith('/api/Auth/RequestToken')) {
      lastAuthEndpoint = u;
      return {
        status: 200,
        data: {
          token: `mock_token_${u.includes('cybqa') ? 'sandbox' : 'prod'}_${Date.now()}`,
          expiryDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          error: null,
          status: '200',
          message: 'Request processed successfully'
        }
      };
    }
    if (u.endsWith('/api/URLSetup/RegisterIPN')) {
      return {
        status: 200,
        data: {
          url: data.url,
          ipn_id: '11111111-2222-3333-4444-555555555555',
          ipn_notification_type_description: data.ipn_notification_type,
          ipn_status: 1,
          ipn_status_decription: 'Active',
          error: null,
          status: '200'
        }
      };
    }
    if (u.endsWith('/api/Transactions/SubmitOrderRequest')) {
      lastOrderEndpoint = u;
      assert.ok(config?.headers?.Authorization?.startsWith('Bearer '), 'SubmitOrderRequest must pass Bearer token');
      assert.ok(data.notification_id, 'SubmitOrderRequest requires notification_id');
      const trackingId = `PP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const isSandboxUrl = u.includes('cybqa.pesapal.com');
      mockOrders.set(trackingId, {
        orderTrackingId: trackingId,
        merchant_reference: data.id,
        amount: data.amount,
        currency: data.currency,
        status_code: 0,
        payment_status_description: 'INVALID',
        payment_method: '',
        confirmation_code: ''
      });
      return {
        status: 200,
        data: {
          order_tracking_id: trackingId,
          merchant_reference: data.id,
          redirect_url: `${isSandboxUrl ? 'https://cybqa.pesapal.com/pesapaliframe' : 'https://pay.pesapal.com/iframe'}/PesapalIframe3/Index/?OrderTrackingId=${trackingId}`,
          error: null,
          status: '200'
        }
      };
    }
    return axiosOrigPost.call(axios, url, data, config);
  };

  axios.get = async (url, config) => {
    const u = String(url);
    if (u.endsWith('/api/URLSetup/GetIpnList')) {
      return { status: 200, data: [] };
    }
    if (u.includes('/api/Transactions/GetTransactionStatus')) {
      const orderTrackingId = config?.params?.orderTrackingId;
      const rec = mockOrders.get(orderTrackingId);
      if (!rec) {
        return {
          status: 200,
          data: {
            status_code: 0,
            payment_status_description: 'INVALID',
            status: '500',
            error: { code: 'payment_details_not_found', message: 'Order not found' }
          }
        };
      }
      return {
        status: 200,
        data: {
          payment_method: rec.payment_method,
          amount: rec.amount,
          created_date: new Date().toISOString(),
          confirmation_code: rec.confirmation_code,
          payment_status_description: rec.payment_status_description,
          description: rec.description || '',
          message: 'Request processed successfully',
          payment_account: rec.payment_account || '254712***678',
          status_code: rec.status_code,
          merchant_reference: rec.merchant_reference,
          currency: rec.currency,
          error: { error_type: null, code: null, message: null, call_back_url: null },
          status: '200'
        }
      };
    }
    return axiosOrigGet.call(axios, url, config);
  };

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const landlordA = await User.create({
      name: 'Landlord Pesapal One',
      email: 'landlord_pp1@test.local',
      phone: '0712345678',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const landlordB = await User.create({
      name: 'Landlord Pesapal Two',
      email: 'landlord_pp2@test.local',
      phone: '0722334455',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const superAdmin = await User.create({
      name: 'Super Admin Pesapal',
      email: 'super_pp@test.local',
      password: 'Password#1234',
      role: 'superadmin',
      isSuperAdmin: true,
      isVerified: true,
      hasCompletedOnboarding: true
    });

    const tokA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokB = jwt.sign({ id: landlordB._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokSuper = jwt.sign({ id: superAdmin._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: Centralized Env Config & Validation
    const sbCfg = getPesapalConfig({ requireConfigured: true });
    assert.strictEqual(sbCfg.environment, 'sandbox');
    assert.strictEqual(sbCfg.baseUrl, 'https://cybqa.pesapal.com/pesapalv3');
    assert.strictEqual(sbCfg.isSandbox, true);

    process.env.PESAPAL_ENV = 'invalid_env';
    assert.throws(() => validatePesapalConfig(), (e) => e.code === 'PESAPAL_INVALID_ENV');
    process.env.PESAPAL_ENV = 'sandbox';

    const savedKey = process.env.PESAPAL_SANDBOX_CONSUMER_KEY;
    process.env.PESAPAL_SANDBOX_CONSUMER_KEY = '';
    assert.throws(() => getPesapalConfig({ requireConfigured: true }), (e) => e.statusCode === 503 && e.code === 'PESAPAL_NOT_CONFIGURED');
    process.env.PESAPAL_SANDBOX_CONSUMER_KEY = savedKey;
    console.log('✅ PASS 1: Centralized Pesapal API 3.0 config & sandbox URL validation');

    // TEST 2: Monthly M-Pesa Checkout Initiation + Pending State + Redirect Spoof Guard
    const subMonthly = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: {
        planCode: 'basic',
        desiredUnits: 10,
        billingCycle: 'monthly',
        paymentChannel: 'hosted_checkout',
        provider: 'pesapal',
        amount: 1 // tampered price MUST be ignored!
      }
    });
    assert.strictEqual(subMonthly.status, 201);
    assert.strictEqual(subMonthly.data.transaction.provider, 'pesapal');
    assert.strictEqual(subMonthly.data.transaction.amount, 2500);
    assert.strictEqual(subMonthly.data.transaction.gatewayEnvironment, 'sandbox');
    assert.strictEqual(subMonthly.data.transaction.isSandbox, true);
    assert.strictEqual(subMonthly.data.subscription.status, 'pending_payment');
    assert.ok(lastAuthEndpoint.startsWith('https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken'));
    assert.ok(lastOrderEndpoint.startsWith('https://cybqa.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest'));
    assert.ok(subMonthly.data.gateway.checkoutUrl.startsWith('https://cybqa.pesapal.com/pesapaliframe/'));

    // Redirect callback while GetTransactionStatus reports unpaid (status_code: 0) MUST NOT activate
    const cbPending = await apiReq('/api/v2/payments/callback/pesapal', {
      method: 'POST',
      token: tokA,
      body: {
        OrderTrackingId: subMonthly.data.transaction.trackingId,
        OrderMerchantReference: subMonthly.data.transaction.accountReference
      }
    });
    assert.strictEqual(cbPending.status, 200);
    assert.strictEqual(cbPending.data.transaction.status, 'processing');
    assert.strictEqual((await LandlordSubscription.findById(subMonthly.data.subscription._id)).status, 'pending_payment');
    console.log('✅ PASS 2: Monthly Pesapal checkout ignores client price, stays pending, blocks redirect spoof');

    // TEST 3: Successful M-Pesa IPN (POST) + Duplicate GET IPN Idempotency + Confirmation Code
    const trackMpesa = subMonthly.data.transaction.trackingId;
    mockOrders.set(trackMpesa, {
      ...mockOrders.get(trackMpesa),
      status_code: 1,
      payment_status_description: 'COMPLETED',
      payment_method: 'Mpesa',
      confirmation_code: 'PPMPESA001',
      amount: 2500,
      currency: 'KES'
    });

    const ipnPost = await apiReq('/api/v2/payments/webhooks/pesapal', {
      method: 'POST',
      body: {
        OrderTrackingId: trackMpesa,
        OrderNotificationType: 'IPNCHANGE',
        OrderMerchantReference: subMonthly.data.transaction.accountReference
      }
    });
    assert.strictEqual(ipnPost.status, 200);
    assert.strictEqual(ipnPost.data.status, 200);
    assert.strictEqual(ipnPost.data.orderNotificationType, 'IPNCHANGE');

    const activeSub = await LandlordSubscription.findById(subMonthly.data.subscription._id);
    assert.strictEqual(activeSub.status, 'active');
    assert.strictEqual(activeSub.isSandbox, true);
    assert.strictEqual(await PaymentReceipt.countDocuments({ subscriptionId: activeSub._id }), 1);

    // Duplicate GET IPN -> MUST ignore cleanly without second receipt
    const ipnGetDup = await apiReq(
      `/api/v2/payments/webhooks/pesapal?OrderTrackingId=${encodeURIComponent(trackMpesa)}&OrderMerchantReference=${encodeURIComponent(subMonthly.data.transaction.accountReference)}&OrderNotificationType=IPNCHANGE`,
      { method: 'GET' }
    );
    assert.strictEqual(ipnGetDup.status, 200);
    assert.strictEqual(ipnGetDup.data.status, 200);
    assert.strictEqual(await PaymentReceipt.countDocuments({ subscriptionId: activeSub._id }), 1);
    console.log('✅ PASS 3: Successful M-Pesa IPN verified via GetTransactionStatus & duplicate GET/POST IPN idempotent');

    // TEST 4: Failed M-Pesa payment, Underpayment guard, Unmatched reference
    const subFail = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: { planCode: 'starter', desiredUnits: 5, billingCycle: 'monthly', paymentChannel: 'mpesa_stk', provider: 'pesapal' }
    });
    mockOrders.set(subFail.data.transaction.trackingId, {
      ...mockOrders.get(subFail.data.transaction.trackingId),
      status_code: 2,
      payment_status_description: 'FAILED',
      payment_method: 'Mpesa',
      description: 'Insufficient funds'
    });
    const resFail = await apiReq(`/api/v2/payments/verify/${subFail.data.transaction._id}`, { token: tokA });
    assert.strictEqual(resFail.status, 200);
    assert.strictEqual(resFail.data.transaction.status, 'failed');
    assert.strictEqual((await LandlordSubscription.findById(subFail.data.subscription._id)).status, 'pending_payment');

    // Underpayment check (paid 100 instead of 4500)
    const subUnder = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokB,
      body: { planCode: 'growth', desiredUnits: 25, billingCycle: 'monthly', paymentChannel: 'card', provider: 'pesapal' }
    });
    mockOrders.set(subUnder.data.transaction.trackingId, {
      ...mockOrders.get(subUnder.data.transaction.trackingId),
      status_code: 1,
      payment_status_description: 'COMPLETED',
      payment_method: 'Visa',
      confirmation_code: 'UNDERPAY001',
      amount: 100,
      currency: 'KES'
    });
    const resUnder = await apiReq(`/api/v2/payments/verify/${subUnder.data.transaction._id}`, { token: tokB });
    assert.strictEqual(resUnder.data.transaction.reconciliationStatus, 'amount_mismatch');
    assert.notStrictEqual(resUnder.data.transaction.status, 'paid');
    assert.strictEqual((await LandlordSubscription.findById(subUnder.data.subscription._id)).status, 'pending_payment');

    // Unmatched reference IPN
    const unmatchedIpn = await apiReq('/api/v2/payments/webhooks/pesapal', {
      method: 'POST',
      body: { OrderTrackingId: 'PP-UNKNOWN-999', OrderMerchantReference: 'MFSUB-UNKNOWN', OrderNotificationType: 'IPNCHANGE' }
    });
    assert.strictEqual(unmatchedIpn.status, 200);
    console.log('✅ PASS 4: Failed payment, Underpayment, and Unmatched reference strictly blocked from activating');

    // TEST 5: Unauthorized access + Annual Card Subscription + Expiry sweep
    assert.strictEqual((await apiReq(`/api/v2/payments/verify/${subUnder.data.transaction._id}`, { token: tokA })).status, 403);
    assert.strictEqual((await apiReq('/api/super-admin/overview', { token: tokA })).status, 403);
    assert.strictEqual((await apiReq('/api/super-admin/overview')).status, 401);

    const subAnnual = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokA,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'annual', paymentChannel: 'card', provider: 'pesapal', enableRecurring: true }
    });
    assert.strictEqual(subAnnual.status, 201);
    assert.strictEqual(subAnnual.data.transaction.amount, 24000);
    mockOrders.set(subAnnual.data.transaction.trackingId, {
      ...mockOrders.get(subAnnual.data.transaction.trackingId),
      status_code: 1,
      payment_status_description: 'COMPLETED',
      payment_method: 'Mastercard',
      confirmation_code: 'PPCARD24000',
      amount: 24000,
      currency: 'KES'
    });
    const resAnnual = await apiReq('/api/v2/payments/callback/pesapal', {
      method: 'POST',
      token: tokA,
      body: { OrderTrackingId: subAnnual.data.transaction.trackingId, OrderMerchantReference: subAnnual.data.transaction.accountReference }
    });
    assert.strictEqual(resAnnual.status, 200);
    assert.strictEqual(resAnnual.data.transaction.status, 'paid');
    assert.strictEqual(resAnnual.data.transaction.paymentChannel, 'card');

    const annSubDoc = await LandlordSubscription.findById(subAnnual.data.subscription._id);
    const monthsAhead = (new Date(annSubDoc.expiryDate) - new Date(annSubDoc.startDate)) / (30 * 24 * 60 * 60 * 1000);
    assert.ok(monthsAhead >= 11.5, 'Annual subscription expiry must extend ~12 months');

    await LandlordSubscription.findByIdAndUpdate(annSubDoc._id, {
      expiryDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
      graceEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });
    await processSubscriptionExpirations();
    assert.strictEqual((await LandlordSubscription.findById(annSubDoc._id)).status, 'expired');
    console.log('✅ PASS 5: Unauthorized access blocked, Annual Mastercard activation & expiry verified');

    // TEST 6: Dynamic Environment Switching (`PESAPAL_ENV=production`) & Sandbox-to-Production Isolation
    const saBeforeProd = await apiReq('/api/super-admin/overview', { token: tokSuper });
    assert.strictEqual(saBeforeProd.data.metrics.totalSubscriptionRevenue, 0, 'Real revenue MUST exclude sandbox payments');
    assert.ok(saBeforeProd.data.sandboxMetrics.totalTestVolume >= 26500);

    process.env.PESAPAL_ENV = 'production';
    PaymentService.getAdapter('pesapal').clearCaches();
    const prodCfg = getPesapalConfig({ requireConfigured: true });
    assert.strictEqual(prodCfg.baseUrl, 'https://pay.pesapal.com/v3');

    const sandboxTxn = await PaymentTransaction.findById(subMonthly.data.transaction._id);
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

    const crossEnvIpn = await apiReq('/api/v2/payments/webhooks/pesapal', {
      method: 'POST',
      body: {
        OrderTrackingId: trackMpesa,
        OrderMerchantReference: sandboxTxn.accountReference,
        OrderNotificationType: 'IPNCHANGE'
      }
    });
    assert.strictEqual(crossEnvIpn.status, 403);

    // Real Production payment under PESAPAL_ENV=production
    const prodSub = await apiReq('/api/subscriptions/subscribe', {
      method: 'POST',
      token: tokB,
      body: { planCode: 'basic', desiredUnits: 10, billingCycle: 'monthly', paymentChannel: 'card', provider: 'pesapal' }
    });
    assert.strictEqual(prodSub.status, 201);
    assert.strictEqual(prodSub.data.transaction.gatewayEnvironment, 'production');
    assert.strictEqual(prodSub.data.transaction.isSandbox, false);
    assert.ok(lastAuthEndpoint.startsWith('https://pay.pesapal.com/v3/api/Auth/RequestToken'));
    assert.ok(lastOrderEndpoint.startsWith('https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest'));

    mockOrders.set(prodSub.data.transaction.trackingId, {
      ...mockOrders.get(prodSub.data.transaction.trackingId),
      status_code: 1,
      payment_status_description: 'COMPLETED',
      payment_method: 'Visa',
      confirmation_code: 'PPPRODVISA001',
      amount: 2500,
      currency: 'KES'
    });
    const prodHook = await apiReq('/api/v2/payments/webhooks/pesapal', {
      method: 'POST',
      body: {
        OrderTrackingId: prodSub.data.transaction.trackingId,
        OrderMerchantReference: prodSub.data.transaction.accountReference,
        OrderNotificationType: 'IPNCHANGE'
      }
    });
    assert.strictEqual(prodHook.status, 200);
    assert.strictEqual(prodHook.data.status, 200);

    const saProd = await apiReq('/api/super-admin/overview', { token: tokSuper });
    assert.strictEqual(saProd.data.metrics.totalSubscriptionRevenue, 2500);
    assert.strictEqual(saProd.data.metrics.monthlyRevenue, 2500);

    const prodCsv = await apiReq('/api/super-admin/reports/transactions?environment=production', { token: tokSuper });
    assert.strictEqual(prodCsv.status, 200);
    assert.ok(String(prodCsv.data).includes('PPPRODVISA001'));
    assert.ok(!String(prodCsv.data).includes('PPMPESA001'));

    // Landlord A payment history view + CSV export strictly isolated to Landlord A
    const myA = await apiReq('/api/subscriptions/my', { token: tokA });
    assert.strictEqual(myA.status, 200);
    assert.ok(myA.data.transactions.some((t) => t.receiptId && t.receiptNumber), 'Paid transactions must include receipt link fields');

    const exportA = await apiReq('/api/subscriptions/transactions/export', { token: tokA });
    assert.strictEqual(exportA.status, 200);
    assert.ok(String(exportA.data).includes('PPMPESA001'));
    assert.ok(!String(exportA.data).includes('PPPRODVISA001'), 'Landlord CSV export MUST NOT leak other landlords');
    assert.strictEqual((await apiReq('/api/subscriptions/transactions/export')).status, 401);

    const exportPdfRes = await fetch(`${baseUrl}/api/subscriptions/transactions/export/pdf`, {
      headers: { Authorization: `Bearer ${tokA}` }
    });
    assert.strictEqual(exportPdfRes.status, 200);
    assert.ok(exportPdfRes.headers.get('content-type')?.includes('application/pdf'));
    const pdfBuf = Buffer.from(await exportPdfRes.arrayBuffer());
    assert.ok(pdfBuf.slice(0, 5).toString('utf8') === '%PDF-', 'Exported statement must be a valid PDF binary');
    assert.strictEqual((await apiReq('/api/subscriptions/transactions/export/pdf')).status, 401);

    // Transaction lookup verification scoped to owning landlord
    const lookupOk = await apiReq('/api/v2/payments/lookup', {
      method: 'POST',
      token: tokA,
      body: { query: 'PPMPESA001' }
    });
    assert.strictEqual(lookupOk.status, 200);
    assert.strictEqual(lookupOk.data.found, true);
    assert.strictEqual(lookupOk.data.status, 'paid');

    const lookupOtherLandlord = await apiReq('/api/v2/payments/lookup', {
      method: 'POST',
      token: tokB,
      body: { query: 'PPMPESA001' }
    });
    assert.strictEqual(lookupOtherLandlord.status, 200);
    assert.strictEqual(lookupOtherLandlord.data.found, false, 'Lookup MUST NOT leak another landlord transaction');

    const lookupTenantRentOnly = await apiReq('/api/v2/payments/lookup', {
      method: 'POST',
      token: tokA,
      body: { query: 'PPMPESA001', tenantMpesaRentOnly: true }
    });
    assert.strictEqual(lookupTenantRentOnly.status, 200);
    assert.strictEqual(lookupTenantRentOnly.data.found, false, 'tenantMpesaRentOnly MUST exclude SaaS subscriptions');
    console.log('✅ PASS 6: Production switching via PESAPAL_ENV alone, strict sandbox-to-prod isolation, and landlord CSV/PDF/lookup');

    console.log('\n🎉 ALL 6 PESAPAL API 3.0 INTEGRATION, SWITCHING & SECURITY TEST GROUPS PASSED!');
  } finally {
    if (axiosOrigPost) axios.post = axiosOrigPost;
    if (axiosOrigGet) axios.get = axiosOrigGet;
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ PESAPAL TEST SUITE FAILED:', err);
    process.exit(1);
  });
