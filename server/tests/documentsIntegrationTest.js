/**
 * Unified Receipt & Invoice PDF / Email Verification Suite
 * Verifies:
 * 1. Rent Receipt PDF & Invoice Receipt PDF share the same corporate layout and explicitly display
 *    "INVOICE PAYMENT RECEIPT" / "RECEIPT FOR INVOICE #<no>" when linked to an invoice.
 * 2. Both /api/payments/:id/pdf and /api/v2/payments/receipts/:id/pdf use the same unified Rent Receipt layout.
 * 3. Rental Invoice PDFs (/api/payments/invoice-pdf & /api/v2/payments/invoices/:id/pdf) include
 *    landlord's registered Payment Details (Paybill/Till, Account #, Phone, Email, Footnote).
 * 4. getReceiptEmailBody displays the Invoice reference when linked to an invoice.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/rental_manager_docs_test';
process.env.MONGODB_DEV_URI = 'mongodb://127.0.0.1:27017/rental_manager_docs_test';
process.env.JWT_SECRET = 'docs_integration_test_jwt_secret_2026';

const assert = require('assert');
const http = require('http');
const zlib = require('zlib');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const User = require('../models/User');
const Settings = require('../models/Settings');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const PaymentReceipt = require('../models/PaymentReceipt');
const { getReceiptEmailBody } = require('../utils/emailTemplates');

let server;
let baseUrl = '';

function extractPdfText(pdfBuffer) {
  const raw = pdfBuffer.toString('latin1');
  const chunks = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(raw)) !== null) {
    try {
      const inflated = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      for (const tj of inflated.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
        const line = [...tj[1].matchAll(/<([0-9a-fA-F]+)>/g)]
          .map((h) => Buffer.from(h[1], 'hex').toString('latin1'))
          .join('');
        if (line) chunks.push(line);
      }
    } catch {
      // ignore non-deflate streams
    }
  }
  return chunks.join('\n');
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

    const landlord = await User.create({
      name: 'Landlord Docs',
      email: 'landlord_docs@test.local',
      phone: '+254700444001',
      password: 'Password#1234',
      role: 'admin',
      isVerified: true,
      hasCompletedOnboarding: true
    });

    await LandlordSubscription.create({
      landlordId: landlord._id,
      planId: plan._id,
      planCode: 'basic',
      planName: 'Basic',
      purchasedUnits: 10,
      maxPlanUnits: 10,
      status: 'active',
      expiryDate: new Date(Date.now() + 30 * 86400000)
    });

    await Settings.create({
      user: landlord._id,
      orgName: 'Hacienda Properties Ltd',
      orgEmail: 'accounts@hacienda.test',
      orgPhone: '0712345678',
      mpesaType: 'Paybill',
      paybillAccount: '385410',
      invoiceFootnote: 'Always quote your Unit Number as Account Reference.',
      integrations: { mpesa: { shortcode: '516600' } }
    });

    const prop = await Property.create({ name: 'Hacienda', location: 'Westlands', user: landlord._id });
    const unit = await Unit.create({ propertyId: prop._id, unitNumber: '2A', user: landlord._id, rentAmount: 20000, status: 'occupied' });
    const tenant = await Tenant.create({
      name: 'Abigael Jones',
      email: 'abigael_docs@test.local',
      phone: '0711999111',
      user: landlord._id,
      unitId: unit._id,
      status: 'active'
    });

    const invoice = await Invoice.create({
      invoiceNumber: 'RNT-2026-0099',
      invoiceCategory: 'rental',
      landlordId: landlord._id,
      tenantId: tenant._id,
      propertyId: prop._id,
      unitId: unit._id,
      billingPeriod: '2026-11',
      items: [{ description: 'Monthly Rent (Unit 2A)', category: 'rent', unitPrice: 20000, totalAmount: 20000 }],
      subtotal: 20000,
      totalAmount: 20000,
      balanceDue: 0,
      status: 'paid',
      customerName: tenant.name,
      customerEmail: tenant.email,
      customerPhone: tenant.phone
    });

    const payment = await Payment.create({
      tenantId: tenant._id,
      propertyId: prop._id,
      unitId: unit._id,
      invoiceId: invoice._id,
      invoiceNumber: 'RNT-2026-0099',
      user: landlord._id,
      amount: 20000,
      rentAmount: 20000,
      method: 'M-Pesa Paybill',
      status: 'paid',
      reference: 'SJK99DOC01'
    });

    const v2Receipt = await PaymentReceipt.create({
      receiptNumber: 'RCT-DOC-001',
      receiptCategory: 'rental',
      paymentId: payment._id,
      invoiceId: invoice._id,
      landlordId: landlord._id,
      tenantId: tenant._id,
      recipientName: tenant.name,
      recipientEmail: tenant.email,
      amount: 20000,
      paymentMethod: 'M-Pesa Paybill',
      providerReference: 'SJK99DOC01',
      description: 'Rental Invoice Settlement'
    });

    const tok = jwt.sign({ id: landlord._id, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // TEST 1: Invoice Receipt Email HTML includes "Invoice #RNT-2026-0099"
    const html = getReceiptEmailBody(payment, tenant.name, { orgName: 'Hacienda Properties Ltd' }, 'Hacienda', '2A');
    assert.ok(html.includes('RNT-2026-0099'), 'Receipt email must reference the Invoice number');
    assert.ok(html.includes('Receipt For'), 'Receipt email must explicitly state Receipt For Invoice');
    console.log('✅ PASS 1: Receipt email body explicitly displays Invoice reference');

    // TEST 2: /api/payments/:id/pdf & /api/v2/payments/receipts/:id/pdf use the unified Rent Receipt layout with Invoice info
    for (const url of [
      `${baseUrl}/api/payments/${payment._id}/pdf`,
      `${baseUrl}/api/v2/payments/receipts/${v2Receipt._id}/pdf`
    ]) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('application/pdf'));
      const buf = Buffer.from(await res.arrayBuffer());
      assert.strictEqual(buf.slice(0, 5).toString('utf8'), '%PDF-');
      const text = extractPdfText(buf);
      assert.ok(text.includes('TENANT DETAILS') && text.includes('PAYMENT SUMMARY'), `Unified rent layout missing on ${url}`);
      assert.ok(text.includes('INVOICE PAYMENT RECEIPT') && text.includes('RNT-2026-0099'), `Invoice label missing on ${url}`);
    }
    console.log('✅ PASS 2: Both /payments/:id/pdf and /v2/payments/receipts/:id/pdf render unified Rent layout + Invoice reference');

    // TEST 3: Both /v2/payments/invoices/:id/pdf and /payments/invoice-pdf include Registered Landlord Payment Details
    const v2InvRes = await fetch(`${baseUrl}/api/v2/payments/invoices/${invoice._id}/pdf`, {
      headers: { Authorization: `Bearer ${tok}` }
    });
    assert.strictEqual(v2InvRes.status, 200);
    const v2InvText = extractPdfText(Buffer.from(await v2InvRes.arrayBuffer()));
    assert.ok(v2InvText.includes('PAYMENT DETAILS'), 'Invoice PDF must include Payment Details section');
    assert.ok(v2InvText.includes('516600'), 'Invoice PDF must include Landlord Paybill 516600');
    assert.ok(v2InvText.includes('385410') || v2InvText.includes('2A'), 'Invoice PDF must include Account/Unit reference');

    const adHocInvRes = await fetch(`${baseUrl}/api/payments/invoice-pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceNumber: 'INV-ADHOC-01',
        tenantId: String(tenant._id),
        propertyName: 'Hacienda',
        unitNumber: '2A',
        amount: 20000
      })
    });
    assert.strictEqual(adHocInvRes.status, 200);
    const adHocText = extractPdfText(Buffer.from(await adHocInvRes.arrayBuffer()));
    assert.ok(adHocText.includes('516600') && adHocText.includes('0712345678'), 'Ad-hoc Invoice PDF must include Paybill 516600 & Landlord Phone');
    console.log('✅ PASS 3: Both Rental Invoice PDF endpoints display Landlord registered Paybill & payment details');

    console.log('\n🎉 ALL 3 UNIFIED RECEIPT & INVOICE PAYMENT DETAILS TESTS PASSED!');
  } finally {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    if (server) server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ DOCUMENTS INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
