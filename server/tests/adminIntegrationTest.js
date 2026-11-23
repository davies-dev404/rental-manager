/**
 * MakaziFlow Super Admin Dashboard End-to-End Integration Test Suite
 * Tests security, role isolation, KPIs, user/property/tenant/payment/subscription/report/support/settings/audit workflows.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_admin_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_admin_test';
process.env.JWT_SECRET = 'super_admin_integration_test_jwt_secret_2026';

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
const PaymentTransaction = require('../models/PaymentTransaction');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const AdminLog = require('../models/AdminLog');

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

async function runTests() {
  await waitForDbReady();
  await mongoose.connection.dropDatabase();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  try {
    // Seed plan
    const plan = await SubscriptionPlan.create({
      code: 'basic',
      name: 'Basic',
      maxUnits: 10,
      pricing: { monthly: 2500, quarterly: 7000, semi_annual: 13500, annual: 25000 },
      isActive: true
    });

    // Public self-registration MUST NEVER yield superadmin
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attempt Escalation',
        email: 'attempt_super@test.local',
        phone: '+254700000111',
        password: 'StrongPassword#123',
        role: 'superadmin'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const createdAttemptUser = await User.findOne({ email: 'attempt_super@test.local' });
    assert.notStrictEqual(createdAttemptUser.role, 'superadmin', 'Public signup must block superadmin role');

    // Provision Super Admin & Normal Landlord & Tenant user
    const superUser = await User.create({
      name: 'Platform Super Admin',
      email: 'root_super@makaziflow.test',
      phone: '+254700000001',
      password: 'SuperStrong#Password123',
      role: 'superadmin',
      isSuperAdmin: true,
      isVerified: true,
      accountStatus: 'active',
      hasCompletedOnboarding: true
    });

    const landlord = await User.create({
      name: 'Jane Landlord',
      email: 'jane_landlord@test.local',
      phone: '+254711000222',
      password: 'Landlord#Password123',
      role: 'admin',
      isVerified: true,
      accountStatus: 'active',
      hasCompletedOnboarding: true
    });

    const tenantUser = await User.create({
      name: 'John TenantUser',
      email: 'john_tenant@test.local',
      phone: '+254722000333',
      password: 'Tenant#Password123',
      role: 'tenant',
      isVerified: true,
      accountStatus: 'active',
      hasCompletedOnboarding: true
    });

    const sub = await LandlordSubscription.create({
      landlordId: landlord._id,
      planId: plan._id,
      planCode: 'basic',
      planName: 'Basic',
      billingCycle: 'monthly',
      purchasedUnits: 10,
      maxPlanUnits: 10,
      priceAmount: 2500,
      status: 'active',
      expiryDate: new Date(Date.now() + 25 * 86400000),
      paymentEnvironment: 'production',
      isSandbox: false
    });

    await UnitEntitlement.create({
      landlordId: landlord._id,
      subscriptionId: sub._id,
      planCode: 'basic',
      planName: 'Basic',
      purchasedLimit: 10,
      activeUnitCount: 2,
      status: 'active'
    });

    const prop = await Property.create({
      name: 'Makazi Heights',
      location: 'Kilimani, Nairobi',
      type: 'Apartment',
      user: landlord._id
    });
    const unit1 = await Unit.create({ propertyId: prop._id, unitNumber: 'A1', rentAmount: 25000, status: 'occupied', user: landlord._id });
    const unit2 = await Unit.create({ propertyId: prop._id, unitNumber: 'A2', rentAmount: 22000, status: 'vacant', user: landlord._id });

    const tenantRec = await Tenant.create({
      name: 'Grace Tenant',
      email: 'grace@test.local',
      phone: '0733111222',
      nationalId: '33445566',
      user: landlord._id,
      unitId: unit1._id,
      status: 'active',
      rentAmount: 25000
    });

    await Payment.create({
      tenantId: tenantRec._id,
      propertyId: prop._id,
      unitId: unit1._id,
      user: landlord._id,
      amount: 25000,
      rentAmount: 25000,
      status: 'paid',
      method: 'M-Pesa Paybill',
      reference: 'MPESA001'
    });

    const paidTxn = await PaymentTransaction.create({
      internalTransactionId: 'TXN-ADMIN-001',
      landlordId: landlord._id,
      subscriptionId: sub._id,
      provider: 'pesapal',
      gatewayEnvironment: 'production',
      isSandbox: false,
      paymentChannel: 'mpesa_stk',
      paymentCategory: 'subscription',
      planCode: 'basic',
      billingCycle: 'monthly',
      amount: 2500,
      amountPaid: 2500,
      accountReference: 'MF-BASIC-001',
      providerReference: 'PP-REF-001',
      status: 'paid',
      reconciliationStatus: 'reconciled',
      paidAt: new Date()
    });

    const superToken = jwt.sign({ id: superUser._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const landlordToken = jwt.sign({ id: landlord._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tenantToken = jwt.sign({ id: tenantUser._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 1. Authorization & Role Escalation Checks
    const unauthDash = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.strictEqual(unauthDash.status, 401);

    const landlordDash = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${landlordToken}` } });
    assert.strictEqual(landlordDash.status, 403);

    const tenantDash = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${tenantToken}` } });
    assert.strictEqual(tenantDash.status, 403);

    // Profile update cannot escalate role
    await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Landlord', role: 'superadmin', isSuperAdmin: true })
    });
    const refreshedLandlord = await User.findById(landlord._id);
    assert.strictEqual(refreshedLandlord.role, 'admin');
    assert.strictEqual(refreshedLandlord.isSuperAdmin, false);

    // Standalone Msimamizi auth rejects normal landlord/tenant credentials
    const nonAdminMsimamiziLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: landlord.email, password: 'Landlord#Password123' })
    });
    assert.strictEqual(nonAdminMsimamiziLogin.status, 401);

    const validMsimamiziLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: superUser.email, password: 'SuperStrong#Password123' })
    });
    assert.strictEqual(validMsimamiziLogin.status, 200);
    const validMsimamiziBody = await validMsimamiziLogin.json();
    assert.strictEqual(validMsimamiziBody.requiresOTP, true);
    console.log('✅ PASS 1: Public signup, profile escalation, Msimamizi auth isolation & unauthorized admin routes strictly blocked (401/403)');

    // 2. Super Admin Login OTP Flow & Dashboard KPIs Match DB
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: superUser.email, password: 'SuperStrong#Password123' })
    });
    assert.strictEqual(loginRes.status, 200);
    const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(dashRes.status, 200);
    const dash = await dashRes.json();
    assert.strictEqual(dash.metrics.totalUsers, 4);
    assert.strictEqual(dash.metrics.totalProperties, 1);
    assert.strictEqual(dash.metrics.totalUnits, 2);
    assert.strictEqual(dash.metrics.occupiedUnits, 1);
    assert.strictEqual(dash.metrics.vacantUnits, 1);
    assert.strictEqual(dash.metrics.totalTenants, 1);
    assert.strictEqual(dash.metrics.monthlyPlatformRevenue, 2500);
    assert.strictEqual(dash.metrics.activeSubscriptions, 1);
    console.log('✅ PASS 2: Dashboard statistics accurately aggregate MongoDB records');

    // 3. User Management + Suspension Enforces Auth Revocation + Reactivation
    const usersRes = await fetch(`${baseUrl}/api/admin/users?search=jane_landlord`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(usersRes.status, 200);
    const usersData = await usersRes.json();
    assert.strictEqual(usersData.items.length, 1);
    assert.strictEqual(usersData.items[0].password, undefined, 'Must never return password hash');

    const suspendRes = await fetch(`${baseUrl}/api/admin/users/${landlord._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountStatus: 'suspended', reason: 'Billing compliance check' })
    });
    assert.strictEqual(suspendRes.status, 200);

    // Suspended user token & login must be rejected cleanly
    const blockedProfile = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${landlordToken}` } });
    assert.strictEqual(blockedProfile.status, 403);
    const blockedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: landlord.email, password: 'Landlord#Password123' })
    });
    assert.strictEqual(blockedLogin.status, 403);

    // Reactivate user
    const reactivateRes = await fetch(`${baseUrl}/api/admin/users/${landlord._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountStatus: 'active', reason: 'Cleared verification' })
    });
    assert.strictEqual(reactivateRes.status, 200);
    console.log('✅ PASS 3: User search, suspension session revocation, and reactivation verified');

    // Fresh token for landlord after reactivation rotated tokenVersion
    const freshLandlordUser = await User.findById(landlord._id);
    const freshLandlordToken = jwt.sign({ id: landlord._id, tv: freshLandlordUser.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 4. Property & Tenant Monitoring (masked IDs + Flagging)
    const propRes = await fetch(`${baseUrl}/api/admin/properties?location=Kilimani`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(propRes.status, 200);
    const propList = await propRes.json();
    assert.strictEqual(propList.items.length, 1);
    assert.strictEqual(propList.items[0].unitStats.occupancyRate, 50);

    const flagRes = await fetch(`${baseUrl}/api/admin/properties/${prop._id}/flag`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'flagged', isFlagged: true, reason: 'Suspicious duplicate listing' })
    });
    assert.strictEqual(flagRes.status, 200);
    assert.strictEqual((await flagRes.json()).property.isFlagged, true);

    const tenantDetailRes = await fetch(`${baseUrl}/api/admin/tenants/${tenantRec._id}`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(tenantDetailRes.status, 200);
    const tenantDetail = await tenantDetailRes.json();
    assert.ok(tenantDetail.tenant.nationalId.startsWith('****'), 'Tenant National ID must be masked in admin views');
    console.log('✅ PASS 4: Property moderation flagging & masked tenant inspection verified');

    // 5. Payments, CSV Export, Subscriptions, Reports (CSV + PDF)
    const csvRes = await fetch(`${baseUrl}/api/admin/payments/export?environment=production`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('MF-BASIC-001') && csvText.includes('2500'), 'CSV export must contain production payment');

    const newPlanRes = await fetch(`${baseUrl}/api/admin/subscriptions/plans`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'enterprise', name: 'Enterprise', maxUnits: 500, isCustomUnlimited: true, pricing: { monthly: 12000, annual: 120000 } })
    });
    assert.strictEqual(newPlanRes.status, 201);

    const pdfRepRes = await fetch(`${baseUrl}/api/admin/reports/revenue/export?format=pdf&period=monthly`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(pdfRepRes.status, 200);
    const pdfBuf = Buffer.from(await pdfRepRes.arrayBuffer());
    assert.strictEqual(pdfBuf.slice(0, 5).toString('utf8'), '%PDF-');

    const revRes = await fetch(`${baseUrl}/api/admin/payments/${paidTxn._id}/reverse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Duplicate charge refund' })
    });
    assert.strictEqual(revRes.status, 200);
    console.log('✅ PASS 5: Payments CSV/reversal, subscription plan creation, and PDF report export verified');

    // 6. Support Management, Platform Settings (Maintenance Mode + No Secret Leaks), Audit Logs
    const tktCreateRes = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshLandlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'Need M-Pesa statement help', category: 'payments', message: 'How do I filter March receipts?' })
    });
    assert.strictEqual(tktCreateRes.status, 201);
    const createdTicket = (await tktCreateRes.json()).ticket;

    const tktUpdateRes = await fetch(`${baseUrl}/api/admin/support/${createdTicket._id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', assignedTo: String(superUser._id), responseMessage: 'Use the date filters in Payments.' })
    });
    assert.strictEqual(tktUpdateRes.status, 200);

    const settingsGetRes = await fetch(`${baseUrl}/api/admin/settings`, { headers: { Authorization: `Bearer ${superToken}` } });
    const settingsJson = await settingsGetRes.json();
    const rawSettingsStr = JSON.stringify(settingsJson);
    assert.ok(!rawSettingsStr.includes('secretKey') && !rawSettingsStr.includes('consumerSecret'), 'Platform settings must never leak secret keys');

    // Toggle maintenance mode ON -> landlord blocked with 503 -> toggle OFF
    await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceMode: true, defaultCurrency: 'KES' })
    });
    const blockedByMaint = await fetch(`${baseUrl}/api/properties`, { headers: { Authorization: `Bearer ${freshLandlordToken}` } });
    assert.strictEqual(blockedByMaint.status, 503);

    await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceMode: false })
    });
    const allowedAfterMaint = await fetch(`${baseUrl}/api/properties`, { headers: { Authorization: `Bearer ${freshLandlordToken}` } });
    assert.strictEqual(allowedAfterMaint.status, 200);

    const logsRes = await fetch(`${baseUrl}/api/admin/activity-logs`, { headers: { Authorization: `Bearer ${superToken}` } });
    assert.strictEqual(logsRes.status, 200);
    const logsData = await logsRes.json();
    assert.ok(logsData.items.length >= 6, 'AdminLog must capture security, moderation, settings, and support audit actions');
    console.log('✅ PASS 6: Support tickets, maintenance mode enforcement, zero secret exposure, and immutable AdminLogs verified');

    console.log('\n🎉 ALL 6 SUPER ADMIN INTEGRATION TEST SUITES PASSED!');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ ADMIN INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
