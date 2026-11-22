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
const { getReceiptEmailBody, getInvoiceEmailBody } = require('../utils/emailTemplates');

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

    // TEST 1: Invoice Receipt Email HTML uses SHA MakaziFlow layout + explicitly states what the invoice is for (Rent, Utilities, Maintenance)
    const paybillSettings = { orgName: 'Hacienda Properties Ltd', mpesaType: 'Paybill', paybillAccount: '385410', integrations: { mpesa: { shortcode: '516600' } } };
    const html = getReceiptEmailBody(payment, tenant.name, paybillSettings, 'Hacienda', '2A');
    assert.ok(html.includes('RNT-2026-0099'), 'Receipt email must reference the Invoice number');
    assert.ok(html.includes('Receipt For'), 'Receipt email must explicitly state Receipt For Invoice');
    assert.ok(html.includes('Invoice For:') && html.includes('Rent'), 'Rent receipt email must specify Invoice For: Rent');
    assert.ok(html.includes('TENANT DETAILS') && html.includes('RECEIPT DETAILS') && html.includes('PAYMENT DETAILS') && html.includes('PAYMENT SUMMARY'), 'Email receipt must use SHA 3-column + summary layout');
    assert.ok(html.includes('#0d2240') && html.includes('#00a99d'), 'Email receipt must use MakaziFlow Navy + Teal colors');
    assert.ok(html.includes('516600') && html.includes('385410'), 'Paybill receipt email must show Paybill and Account Number');

    const utilHtml = getReceiptEmailBody({
      _id: payment._id,
      invoiceNumber: 'INV-UTL-002',
      amount: 1500,
      utilityAmount: 1500,
      utilities: [{ name: 'Water', amount: 1500 }],
      type: 'Utilities',
      method: 'M-Pesa',
      status: 'paid'
    }, tenant.name, paybillSettings, 'Hacienda', '2A');
    assert.ok(utilHtml.includes('INV-UTL-002') && utilHtml.includes('Utilities'), 'Utilities receipt email must explicitly state Utilities');

    // Create a Maintenance invoice via POST /api/payments and verify it is NOT mislabeled as Rent
    const maintCreateRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: String(tenant._id),
        unitId: String(unit._id),
        amount: 4500,
        rentAmount: 0,
        method: 'invoice',
        status: 'paid',
        invoiceNumber: 'INV-MNT-003',
        type: 'Maintenance',
        notes: 'Plumbing sink pipe repair'
      })
    });
    assert.strictEqual(maintCreateRes.status, 201);
    const maintPayment = await maintCreateRes.json();
    assert.strictEqual(Number(maintPayment.rentAmount || 0), 0, 'Maintenance invoice must keep rentAmount = 0');
    assert.strictEqual(maintPayment.type, 'Maintenance', 'Maintenance invoice must preserve type = Maintenance');

    const maintEmailHtml = getReceiptEmailBody(maintPayment, tenant.name, { orgName: 'Hacienda Properties Ltd', mpesaType: 'Till', integrations: { mpesa: { shortcode: '778899' } } }, 'Hacienda', '2A');
    assert.ok(maintEmailHtml.includes('INV-MNT-003') && maintEmailHtml.includes('Maintenance'), 'Maintenance receipt email must explicitly state Maintenance');
    assert.ok(maintEmailHtml.includes('Till Number:') && !maintEmailHtml.includes('Account Number:'), 'Till receipt email must omit Account Number');

    const maintPdfRes = await fetch(`${baseUrl}/api/payments/${maintPayment._id}/pdf`, {
      headers: { Authorization: `Bearer ${tok}` }
    });
    assert.strictEqual(maintPdfRes.status, 200);
    const maintPdfText = extractPdfText(Buffer.from(await maintPdfRes.arrayBuffer()));
    assert.ok(maintPdfText.includes('Maintenance') && maintPdfText.includes('INV-MNT-003'), 'Maintenance receipt PDF must explicitly say Maintenance');

    const invEmailHtml = getInvoiceEmailBody({
      invoiceCategory: 'rental',
      invoiceNumber: 'INV-MNT-003',
      customerName: tenant.name,
      propertyName: 'Hacienda',
      unitNumber: '2A',
      totalAmount: 4500,
      items: [{ description: 'Plumbing Repair', category: 'maintenance', totalAmount: 4500 }]
    }, paybillSettings);
    assert.ok(invEmailHtml.includes('RENTAL INVOICE') && invEmailHtml.includes('Maintenance') && invEmailHtml.includes('#0d2240') && invEmailHtml.includes('#00a99d'), 'Invoice email must use SHA MakaziFlow layout and state Maintenance');
    console.log('✅ PASS 1: Email receipt & PDF explicitly identify Rent, Utilities, and Maintenance using SHA MakaziFlow layout');

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
      assert.ok(text.includes('Paybill Number:') && text.includes('516600'), `Paybill Number missing on receipt ${url}`);
      assert.ok(text.includes('Account Number:') && text.includes('385410'), `Account Number 385410 missing on receipt ${url}`);
    }
    console.log('✅ PASS 2: Both /payments/:id/pdf and /v2/payments/receipts/:id/pdf render SHA Rent layout + Invoice + Account # 385410');

    // TEST 3: Both /v2/payments/invoices/:id/pdf and /payments/invoice-pdf use SHA MakaziFlow layout + Paybill & Account # 385410
    const v2InvRes = await fetch(`${baseUrl}/api/v2/payments/invoices/${invoice._id}/pdf`, {
      headers: { Authorization: `Bearer ${tok}` }
    });
    assert.strictEqual(v2InvRes.status, 200);
    const v2InvText = extractPdfText(Buffer.from(await v2InvRes.arrayBuffer()));
    assert.ok(v2InvText.includes('BILL TO') && v2InvText.includes('INVOICE DETAILS') && v2InvText.includes('INVOICE SUMMARY'), 'SHA 3-col layout missing on v2 Invoice PDF');
    assert.ok(v2InvText.includes('PAYMENT DETAILS'), 'Invoice PDF must include Payment Details section');
    assert.ok(v2InvText.includes('Paybill Number:') && v2InvText.includes('516600'), 'Invoice PDF must include Paybill Number 516600');
    assert.ok(v2InvText.includes('Account Number:') && v2InvText.includes('385410'), 'Invoice PDF must include Account Number 385410');

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
    assert.ok(adHocText.includes('516600') && adHocText.includes('385410') && adHocText.includes('0712345678'), 'Ad-hoc Invoice PDF must include Paybill, Account 385410 & Landlord Phone');

    // Switch Landlord M-Pesa config to Till -> Till Number MUST show, Account Number MUST NOT show on Invoice & Receipt
    await Settings.updateOne({ user: landlord._id }, { $set: { mpesaType: 'Till', integrations: { mpesa: { shortcode: '778899' } } } });
    const tillInvRes = await fetch(`${baseUrl}/api/v2/payments/invoices/${invoice._id}/pdf`, {
      headers: { Authorization: `Bearer ${tok}` }
    });
    const tillInvText = extractPdfText(Buffer.from(await tillInvRes.arrayBuffer()));
    assert.ok(tillInvText.includes('Till Number:') && tillInvText.includes('778899'), 'Till Invoice must show Till Number 778899');
    assert.ok(!tillInvText.includes('Account Number:'), 'Till Invoice MUST NOT show Account Number');

    const tillRctRes = await fetch(`${baseUrl}/api/payments/${payment._id}/pdf`, {
      headers: { Authorization: `Bearer ${tok}` }
    });
    const tillRctText = extractPdfText(Buffer.from(await tillRctRes.arrayBuffer()));
    assert.ok(tillRctText.includes('Till Number:') && tillRctText.includes('778899'), 'Till Receipt must show Till Number 778899');
    assert.ok(!tillRctText.includes('Account Number:'), 'Till Receipt MUST NOT show Account Number');
    console.log('✅ PASS 3: Invoices & Receipts render SHA MakaziFlow layout, Paybill+Account # (385410), and Till omits Account #');

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
