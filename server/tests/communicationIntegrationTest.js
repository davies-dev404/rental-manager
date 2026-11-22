/**
 * Communication Sync & Broadcast Integration Test Suite
 * Verifies unified logging via logCommunication, GET /api/reminders merging
 * (Reminders + CommunicationLog + legacy PaymentReceipt), OTP masking & security resend guard,
 * CommunicationLog resend, and tenant/team broadcast scoping.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_comm_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_comm_test';
process.env.JWT_SECRET = 'communication_integration_test_jwt_secret_2026';

const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Module = require('module');

const capturedEmails = [];
const capturedSms = [];

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('sendEmail') || request === '../utils/sendEmail') {
    return async (opts) => {
      capturedEmails.push(opts);
      return { messageId: `mock-email-${capturedEmails.length}` };
    };
  }
  if (request.endsWith('sendSMS') || request === '../utils/sendSMS') {
    return async (opts) => {
      capturedSms.push(opts);
      return { success: true };
    };
  }
  return origLoad.apply(this, arguments);
};

const app = require('../server');
const User = require('../models/User');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Reminder = require('../models/Reminder');
const PaymentReceipt = require('../models/PaymentReceipt');
const CommunicationLog = require('../models/CommunicationLog');
const { logCommunication } = require('../utils/logCommunication');

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
    // Seed 2 isolated landlords with properties, units, and tenants
    const landlordA = await User.create({
      name: 'Landlord Alpha',
      email: 'alpha_comm@test.local',
      phone: '+254700111001',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });
    const landlordB = await User.create({
      name: 'Landlord Beta',
      email: 'beta_comm@test.local',
      phone: '+254700222002',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });

    const propA = await Property.create({ name: 'Hacienda Heights', location: 'Westlands', user: landlordA._id });
    const propB = await Property.create({ name: 'Other Villa', location: 'Kilimani', user: landlordB._id });

    const unitA1 = await Unit.create({ propertyId: propA._id, unitNumber: 'A1', user: landlordA._id, rentAmount: 25000, status: 'occupied' });
    const unitB1 = await Unit.create({ propertyId: propB._id, unitNumber: 'B1', user: landlordB._id, rentAmount: 30000, status: 'occupied' });

    const tenantA1 = await Tenant.create({
      name: 'Abigael Jones',
      email: 'abigael_comm@test.local',
      phone: '254711000111',
      user: landlordA._id,
      unitId: unitA1._id,
      status: 'active'
    });
    const tenantB1 = await Tenant.create({
      name: 'Other Tenant',
      email: 'other_comm@test.local',
      phone: '254722000222',
      user: landlordB._id,
      unitId: unitB1._id,
      status: 'active'
    });

    const tokA = jwt.sign({ id: landlordA._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: logCommunication auto-resolves tenant/property/unit context & masks sensitive OTP subjects
    const autoResolved = await logCommunication({
      type: 'email',
      email: 'abigael_comm@test.local',
      subject: 'Your Rent Payment Receipt #REC-101',
      message: '<html><body><style>.x{color:red}</style><p>Thank you <b>Abigael</b>, KES 25,000 received.</p></body></html>',
      status: 'delivered',
      provider: 'brevo-api',
      commMeta: { category: 'receipt' },
      forceLog: true
    });
    assert.ok(autoResolved, 'CommunicationLog should be created');
    assert.strictEqual(String(autoResolved.user), String(landlordA._id));
    assert.strictEqual(String(autoResolved.tenantId), String(tenantA1._id));
    assert.strictEqual(String(autoResolved.propertyId), String(propA._id));
    assert.strictEqual(autoResolved.propertyName, 'Hacienda Heights');
    assert.strictEqual(autoResolved.unitNumber, 'A1');
    assert.strictEqual(autoResolved.recipientType, 'tenant');
    assert.ok(!autoResolved.message.includes('<html>') && !autoResolved.message.includes('color:red'), 'HTML and CSS tags must be stripped');
    assert.ok(autoResolved.message.includes('KES 25,000 received'), 'Readable plain text must remain');

    const maskedOtp = await logCommunication({
      type: 'email',
      email: 'alpha_comm@test.local',
      subject: 'Your MakaziFlow Verification Code (OTP)',
      message: '<p>Your secret OTP code is 994421. Do not share.</p>',
      status: 'delivered',
      provider: 'brevo-api',
      commMeta: { category: 'security', userId: landlordA._id, recipientType: 'team' },
      forceLog: true
    });
    assert.ok(maskedOtp);
    assert.ok(!maskedOtp.message.includes('994421'), 'Sensitive OTP code MUST be masked');

    // Noise/foreign landlord log should NEVER leak to Landlord A
    const foreignLog = await logCommunication({
      type: 'email',
      email: 'other_comm@test.local',
      subject: 'Other Landlord Notice',
      message: 'Private landlord B message',
      status: 'delivered',
      commMeta: { category: 'other', userId: landlordB._id },
      forceLog: true
    });
    assert.ok(foreignLog, 'Foreign landlord CommunicationLog should be created');
    console.log('✅ PASS 1: logCommunication auto-resolves Tenant/Property/Unit, strips HTML, and masks OTP codes');

    // TEST 2: Unified GET /api/reminders merges Reminders + CommunicationLogs + legacy PaymentReceipts
    await Reminder.create({
      user: landlordA._id,
      tenantId: tenantA1._id,
      title: 'Rent Due Notice',
      type: 'rent_due',
      frequency: 'immediate',
      description: 'Please clear rent before 5th.',
      method: 'sms',
      status: 'sent',
      dueDate: new Date()
    });
    await PaymentReceipt.create({
      receiptNumber: 'REC-LEGACY-001',
      receiptCategory: 'rental',
      landlordId: landlordA._id,
      tenantId: tenantA1._id,
      recipientName: 'Abigael Jones',
      recipientEmail: 'abigael_comm@test.local',
      amount: 12000,
      description: 'Legacy October Rent Receipt',
      emailedTo: 'abigael_comm@test.local',
      emailedAt: new Date(Date.now() - 5 * 86400000)
    });

    const listRes = await apiReq('/api/reminders', { token: tokA });
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data));
    assert.ok(listRes.data.some((x) => x.source === 'reminder' && x.title === 'Rent Due Notice'));
    assert.ok(listRes.data.some((x) => x.source === 'communication_log' && x.title.includes('#REC-101') && x.canResend === true));
    const secEntry = listRes.data.find((x) => x.source === 'communication_log' && x.recipientType === 'team');
    assert.ok(secEntry && secEntry.canResend === false, 'Security log must set canResend: false');
    assert.ok(listRes.data.some((x) => x.source === 'receipt' && x.title.includes('REC-LEGACY-001') && x.canResend === false));
    assert.ok(!listRes.data.some((x) => String(x.description || '').includes('Private landlord B')), 'Tenant isolation violated');
    console.log('✅ PASS 2: GET /api/reminders unifies Reminders, CommunicationLog, and historical receipts with isolation');

    // TEST 3: Resend guard on security CommunicationLog + successful CommunicationLog resend
    const resendSec = await apiReq(`/api/reminders/logs/${maskedOtp._id}/resend`, {
      method: 'POST',
      token: tokA
    });
    assert.strictEqual(resendSec.status, 400, 'Security verification logs MUST reject resend');

    const beforeEmails = capturedEmails.length;
    const resendReceipt = await apiReq(`/api/reminders/logs/${autoResolved._id}/resend`, {
      method: 'POST',
      token: tokA
    });
    assert.strictEqual(resendReceipt.status, 200);
    assert.strictEqual(capturedEmails.length, beforeEmails + 1);
    assert.strictEqual(capturedEmails[capturedEmails.length - 1].email, 'abigael_comm@test.local');
    console.log('✅ PASS 3: CommunicationLog resend guards security codes (400) and dispatches non-security logs');

    // TEST 4: Broadcast scoping (all_tenants + team)
    const emailsBeforeBroadcast = capturedEmails.length;
    const bcTenants = await apiReq('/api/reminders/broadcast', {
      method: 'POST',
      token: tokA,
      body: {
        audience: 'all_tenants',
        propertyId: String(propA._id),
        method: 'email',
        subject: 'Water Maintenance Notice',
        message: 'Water will be off for 2 hours tomorrow morning.'
      }
    });
    assert.strictEqual(bcTenants.status, 201);
    assert.strictEqual(bcTenants.data.sentCount, 1);
    assert.strictEqual(capturedEmails.length, emailsBeforeBroadcast + 1);
    assert.strictEqual(capturedEmails[capturedEmails.length - 1].email, 'abigael_comm@test.local');
    assert.ok(!capturedEmails.some((e) => e.email === 'other_comm@test.local'), 'Broadcast leaked to another landlord tenant!');

    const smsBeforeTeam = capturedSms.length;
    const bcTeam = await apiReq('/api/reminders/broadcast', {
      method: 'POST',
      token: tokA,
      body: {
        audience: 'team',
        method: 'sms',
        subject: 'Team Alert',
        message: 'Monthly audit starts Friday.'
      }
    });
    assert.strictEqual(bcTeam.status, 201);
    assert.strictEqual(bcTeam.data.sentCount, 1);
    assert.strictEqual(capturedSms.length, smsBeforeTeam + 1);
    assert.strictEqual(capturedSms[capturedSms.length - 1].phone, '+254700111001');
    console.log('✅ PASS 4: Broadcast scoped cleanly to landlord active tenants & team');

    console.log('\n🎉 ALL 4 COMMUNICATION SYNC & BROADCAST INTEGRATION TESTS PASSED!');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ COMMUNICATION INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
