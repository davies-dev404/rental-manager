const express = require('express');
const router = express.Router();
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentReceipt = require('../models/PaymentReceipt');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const Settings = require('../models/Settings');
const TaxSubmission = require('../models/TaxSubmission');
const Payment = require('../models/Payment');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');
const { validateObjectId, isValidObjectId, escapeRegExp, paymentCheckoutLimiter, paymentWebhookLimiter } = require('../middleware/securityMiddleware');
const PaymentService = require('../services/payments/PaymentService');
const EtimsService = require('../services/tax/EtimsService');
const { createStructuredInvoice } = require('../services/invoiceService');
const { generateInvoicePDF } = require('../utils/generateInvoicePDF');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');
const { getUserBusinessProfile } = require('../utils/getUserBusinessProfile');

// @desc    Get available payment providers (Pesaflow primary + optional bank adapters)
// @route   GET /api/v2/payments/providers
// @access  Private
router.get('/providers', protect, async (req, res) => {
  try {
    const providers = await PaymentService.seedProviders();
    res.json(providers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Payment Gateway Webhook / IPN Listener (Pesapal / IntaSend / Pesaflow - Verified & Idempotent)
// @route   POST|GET /api/v2/payments/webhooks/:provider
// @access  Public (Verified cryptographically / via Server Status Verification)
async function handleGatewayWebhook(req, res) {
  const providerCode = String(req.params.provider || 'pesapal').toLowerCase();
  const payload = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  try {
    const result = await PaymentService.processWebhook({
      providerCode,
      payload,
      headers: req.headers,
      sourceIp: req.ip || req.headers['x-forwarded-for'] || ''
    });

    if (providerCode === 'pesapal') {
      return res.status(200).json({
        orderNotificationType: payload.OrderNotificationType || payload.orderNotificationType || 'IPNCHANGE',
        orderTrackingId: payload.OrderTrackingId || payload.orderTrackingId || '',
        orderMerchantReference: payload.OrderMerchantReference || payload.orderMerchantReference || '',
        status: 200
      });
    }

    return res.status(200).json({
      success: true,
      status: result.status,
      message: result.callback?.processingMessage || 'Callback processed'
    });
  } catch (err) {
    const code = err.statusCode || 400;
    if (providerCode === 'pesapal') {
      return res.status(code === 403 ? 403 : 200).json({
        orderNotificationType: payload.OrderNotificationType || payload.orderNotificationType || 'IPNCHANGE',
        orderTrackingId: payload.OrderTrackingId || payload.orderTrackingId || '',
        orderMerchantReference: payload.OrderMerchantReference || payload.orderMerchantReference || '',
        status: 500,
        message: err.message
      });
    }
    return res.status(code).json({
      success: false,
      message: err.message
    });
  }
}

router.post('/webhooks/:provider', paymentWebhookLimiter, handleGatewayWebhook);
router.get('/webhooks/:provider', paymentWebhookLimiter, handleGatewayWebhook);

// @desc    Gateway Redirect Callback Verification (Never trusts redirect flags alone; queries Gateway Status API directly)
// @route   POST /api/v2/payments/callback/:provider
// @access  Private
router.post('/callback/:provider', protect, paymentCheckoutLimiter, async (req, res) => {
  try {
    const {
      txnId,
      ref,
      OrderMerchantReference,
      orderMerchantReference,
      OrderTrackingId,
      orderTrackingId,
      tracking_id,
      trackingId,
      invoice_id,
      checkout_id,
      checkoutId,
      signature
    } = req.body;

    const cleanRef = String(ref || OrderMerchantReference || orderMerchantReference || '').trim();
    const cleanTracking = String(OrderTrackingId || orderTrackingId || tracking_id || trackingId || invoice_id || '').trim();
    const cleanCheckout = String(checkout_id || checkoutId || '').trim();

    const orClauses = [];
    if (txnId && isValidObjectId(String(txnId))) orClauses.push({ _id: txnId });
    if (cleanRef) orClauses.push({ accountReference: cleanRef });
    if (cleanTracking) {
      orClauses.push({ trackingId: cleanTracking }, { gatewayInvoiceNumber: cleanTracking });
    }
    if (cleanCheckout) {
      orClauses.push({ checkoutId: cleanCheckout });
    }

    if (orClauses.length === 0) {
      return res.status(400).json({ message: 'Transaction reference or tracking ID is required.' });
    }

    const txn = await PaymentTransaction.findOne({ $or: orClauses });
    if (!txn) {
      return res.status(404).json({ message: 'Matching transaction not found.' });
    }

    const userId = String(req.user._id || req.user.id);
    const isLandlordOwner = String(txn.landlordId) === userId;
    const isTenantOwner = Boolean(txn.tenantId && req.user.tenantId && String(txn.tenantId) === String(req.user.tenantId));
    if (
      !isLandlordOwner &&
      !isTenantOwner &&
      !req.user.isSuperAdmin &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({ message: 'Not authorized to verify this transaction.' });
    }

    const result = await PaymentService.verifyTransactionStatus(txn._id, {
      trackingId: cleanTracking,
      checkoutId: cleanCheckout,
      signature: signature || ''
    });

    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

// @desc    Super Admin: List or Register Pesapal IPN URLs for current environment
router.get('/pesapal/ipns', protect, superAdmin, async (req, res) => {
  try {
    const adapter = PaymentService.getAdapter('pesapal');
    const cfg = adapter.getConfig({ requireConfigured: true });
    const list = await adapter.listRegisteredIpns(cfg);
    res.json({ environment: cfg.environment, ipnUrl: cfg.ipnUrl, configuredIpnId: cfg.ipnId, ipns: list });
  } catch (err) {
    res.status(err.statusCode || 502).json({ message: err.message });
  }
});

router.post('/pesapal/register-ipn', protect, superAdmin, async (req, res) => {
  try {
    const adapter = PaymentService.getAdapter('pesapal');
    const cfg = adapter.getConfig({ requireConfigured: true });
    const url = req.body?.url || cfg.ipnUrl;
    const type = req.body?.notificationType || 'POST';
    const registered = await adapter.registerIpn(cfg, url, type);
    res.json({ success: true, environment: cfg.environment, registered });
  } catch (err) {
    res.status(err.statusCode || 502).json({ message: err.message });
  }
});

// @desc    Initiate Tenant Rent / Utility / Penalty Payment via Active Gateway (IntaSend / Pesaflow)
// @route   POST /api/v2/payments/tenant/initiate
// @access  Private (Tenant or Landlord collecting on behalf of tenant)
router.post('/tenant/initiate', protect, paymentCheckoutLimiter, async (req, res) => {
  try {
    const {
      tenantId,
      invoiceId,
      paymentChannel = 'hosted_checkout',
      provider = '',
      paymentCategory = 'rent',
      amount,
      phone,
      email,
      chargeBreakdown = {},
      idempotencyKey = ''
    } = req.body;

    // Resolve tenant cleanly (support logged-in tenant portal or landlord initiating)
    let tenant = null;
    if (tenantId) {
      if (!isValidObjectId(String(tenantId))) {
        return res.status(400).json({ message: 'Invalid tenant identifier' });
      }
      tenant = await Tenant.findById(tenantId).populate('unitId');
    } else if (req.user.tenantId) {
      tenant = await Tenant.findById(req.user.tenantId).populate('unitId');
    } else if (req.user.role === 'tenant') {
      tenant = await Tenant.findOne({ email: new RegExp(`^${escapeRegExp(req.user.email)}$`, 'i') }).populate('unitId');
    }

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found for payment initiation' });
    }

    const landlordId = tenant.user;
    const unitId = tenant.unitId?._id || tenant.unitId;
    const propertyId = tenant.unitId?.propertyId;

    // Security check: allow only owning landlord, caretaker, superadmin, or the tenant themselves
    const isOwner = String(landlordId) === String(req.user._id || req.user.id);
    const isTenantSelf = req.user.role === 'tenant' && (
      String(req.user.tenantId) === String(tenant._id) ||
      (tenant.email && tenant.email.toLowerCase() === req.user.email.toLowerCase())
    );
    if (!isOwner && !isTenantSelf && !req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized to initiate payment for this tenant' });
    }

    const totalExpected = Number(amount || 0) > 0
      ? Number(amount)
      : (
          Number(chargeBreakdown.rent || 0) +
          Number(chargeBreakdown.water || 0) +
          Number(chargeBreakdown.electricity || 0) +
          Number(chargeBreakdown.serviceCharge || 0) +
          Number(chargeBreakdown.penalty || 0) +
          Number(chargeBreakdown.deposit || 0)
        );

    if (!totalExpected || totalExpected <= 0) {
      return res.status(400).json({ message: 'Valid payment amount in KES is required.' });
    }

    // Verify invoice ownership if invoiceId was passed
    let invoice = null;
    if (invoiceId) {
      if (!isValidObjectId(String(invoiceId))) {
        return res.status(400).json({ message: 'Invalid invoice identifier' });
      }
      invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      if (
        String(invoice.landlordId) !== String(landlordId) ||
        (invoice.tenantId && String(invoice.tenantId) !== String(tenant._id))
      ) {
        return res.status(403).json({ message: 'Unauthorized access to invoice' });
      }
    }
    if (!invoice) {
      const items = [];
      if (Number(chargeBreakdown.rent) > 0) items.push({ description: `Monthly Rent (Unit ${tenant.unitId?.unitNumber || ''})`, category: 'rent', unitPrice: Number(chargeBreakdown.rent) });
      if (Number(chargeBreakdown.water) > 0) items.push({ description: 'Water Charges', category: 'water', unitPrice: Number(chargeBreakdown.water) });
      if (Number(chargeBreakdown.electricity) > 0) items.push({ description: 'Electricity Charges', category: 'electricity', unitPrice: Number(chargeBreakdown.electricity) });
      if (Number(chargeBreakdown.serviceCharge) > 0) items.push({ description: 'Service Charge', category: 'service_charge', unitPrice: Number(chargeBreakdown.serviceCharge) });
      if (Number(chargeBreakdown.penalty) > 0) items.push({ description: 'Late Payment Penalty', category: 'penalty', unitPrice: Number(chargeBreakdown.penalty) });
      if (items.length === 0) {
        items.push({ description: `Rental Payment (${paymentCategory})`, category: paymentCategory === 'combined' ? 'rent' : paymentCategory, unitPrice: totalExpected });
      }

      invoice = await createStructuredInvoice({
        invoiceCategory: 'rental',
        landlordId,
        tenantId: tenant._id,
        propertyId,
        unitId,
        billingPeriod: new Date().toISOString().slice(0, 7),
        items,
        vatRate: 0, // Residential rent exempt by default unless configured
        customerName: tenant.name,
        customerEmail: email || tenant.email,
        customerPhone: phone || tenant.phone,
        customerKraPin: tenant.kraPin || ''
      });
    }

    const chosenProvider = (provider || '').trim().toLowerCase() || PaymentService.resolveDefaultProvider();
    const result = await PaymentService.initiateTransaction({
      idempotencyKey: idempotencyKey || undefined,
      providerCode: chosenProvider,
      paymentChannel,
      paymentCategory,
      landlordId,
      tenantId: tenant._id,
      propertyId,
      unitId,
      invoiceId: invoice._id,
      amount: totalExpected,
      currency: 'KES',
      customerName: tenant.name,
      customerEmail: email || tenant.email,
      customerPhone: phone || tenant.phone,
      description: `Rent Payment - Unit ${tenant.unitId?.unitNumber || ''} (${invoice.invoiceNumber})`,
      chargeBreakdown
    });

    res.status(201).json({
      success: true,
      invoice,
      transaction: result.transaction,
      gateway: result.gateway
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      code: err.code || 'TENANT_PAYMENT_ERROR',
      message: err.message
    });
  }
});

// @desc    Lookup & Live-Verify Transaction by Reference, Confirmation Code, or Tracking ID
// @route   POST /api/v2/payments/lookup
// @access  Private
router.post('/lookup', protect, async (req, res) => {
  try {
    const cleanQuery = String(req.body?.query || '').trim();
    const tenantMpesaRentOnly = Boolean(req.body?.tenantMpesaRentOnly);
    if (!cleanQuery) {
      return res.status(400).json({ success: false, message: 'Transaction code or reference is required.' });
    }

    const userId = String(req.user._id || req.user.id);
    const isSuper = Boolean(req.user.isSuperAdmin || req.user.role === 'superadmin');

    const orClauses = [
      { accountReference: cleanQuery },
      { trackingId: cleanQuery },
      { checkoutId: cleanQuery },
      { providerReference: cleanQuery },
      { gatewayInvoiceNumber: cleanQuery },
      { internalTransactionId: cleanQuery }
    ];
    if (isValidObjectId(cleanQuery)) {
      orClauses.push({ _id: cleanQuery });
    }

    const baseScope = isSuper
      ? { $or: orClauses }
      : (req.user.role === 'tenant' && req.user.tenantId
        ? { tenantId: req.user.tenantId, $or: orClauses }
        : { landlordId: req.user._id || req.user.id, $or: orClauses });

    const scopeFilter = tenantMpesaRentOnly
      ? {
          $and: [
            baseScope,
            { tenantId: { $ne: null } },
            { paymentCategory: { $in: ['rent', 'combined'] } },
            {
              $or: [
                { paymentChannel: { $in: ['mpesa_stk', 'mpesa_paybill'] } },
                { paymentMethodDetail: /m-?pesa/i }
              ]
            }
          ]
        }
      : baseScope;

    let txn = await PaymentTransaction.findOne(scopeFilter)
      .populate('tenantId', 'name email phone')
      .lean();

    if (txn) {
      if (['pending', 'processing'].includes(txn.status) && (txn.trackingId || txn.checkoutId)) {
        try {
          const verified = await PaymentService.verifyTransactionStatus(txn._id);
          if (verified?.transaction) {
            txn = {
              ...txn,
              status: verified.transaction.status,
              providerReference: verified.transaction.providerReference || txn.providerReference,
              paymentMethodDetail: verified.transaction.paymentMethodDetail || txn.paymentMethodDetail,
              paidAt: verified.transaction.paidAt || txn.paidAt
            };
          }
        } catch (verifyErr) {
          console.warn(`Lookup live verify warning for ${txn.accountReference}:`, verifyErr.message);
        }
      }

      return res.json({
        success: true,
        found: true,
        receipt: txn.providerReference || txn.accountReference || txn.trackingId,
        trackingId: txn.trackingId || '',
        reference: txn.accountReference || '',
        tenant: txn.tenantId?.name || txn.customerName || 'Customer',
        amount: Number(txn.amountPaid || txn.amount || 0),
        method: txn.paymentMethodDetail || txn.paymentChannel || txn.provider,
        provider: txn.provider,
        status: txn.status,
        date: txn.paidAt || txn.createdAt
      });
    }

    // Fallback: search tenant collection Payment records owned by this user
    const paymentClauses = [{ reference: cleanQuery }];
    if (isValidObjectId(cleanQuery)) paymentClauses.push({ _id: cleanQuery });
    const basePayFilter = isSuper
      ? { $or: paymentClauses }
      : { user: req.user._id || req.user.id, $or: paymentClauses };

    const paymentFilter = tenantMpesaRentOnly
      ? {
          $and: [
            basePayFilter,
            { tenantId: { $ne: null } },
            { method: /m-?pesa|daraja|stk|paybill/i },
            { $or: [{ category: { $in: ['rent', 'combined'] } }, { rentAmount: { $gt: 0 } }, { type: /^rent$/i }] }
          ]
        }
      : basePayFilter;

    const pay = await Payment.findOne(paymentFilter).populate('tenantId', 'name').lean();
    if (pay) {
      return res.json({
        success: true,
        found: true,
        receipt: pay.reference || String(pay._id),
        reference: pay.reference || '',
        tenant: pay.tenantId?.name || 'Tenant',
        amount: Number(pay.amount || 0),
        method: pay.method || 'M-Pesa',
        provider: 'pesapal',
        status: pay.status || 'paid',
        date: pay.date || pay.createdAt
      });
    }

    return res.json({
      success: false,
      found: false,
      receipt: cleanQuery,
      message: 'No matching transaction found yet in gateway logs.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// @desc    Pull-verify transaction status with gateway
// @route   GET /api/v2/payments/verify/:transactionId
// @access  Private
router.get('/verify/:transactionId', protect, validateObjectId('transactionId'), async (req, res) => {
  try {
    const txn = await PaymentTransaction.findById(req.params.transactionId);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });

    const userId = String(req.user._id || req.user.id);
    const isLandlordOwner = String(txn.landlordId) === userId;
    const isTenantOwner = Boolean(txn.tenantId && req.user.tenantId && String(txn.tenantId) === String(req.user.tenantId));
    if (!isLandlordOwner && !isTenantOwner && !req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to access this transaction' });
    }

    const result = await PaymentService.verifyTransactionStatus(txn._id, {
      trackingId: req.query.tracking_id || req.query.trackingId || '',
      checkoutId: req.query.checkout_id || req.query.checkoutId || '',
      signature: req.query.signature || ''
    });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

// @desc    Get payment transactions for current user (landlord or tenant)
// @route   GET /api/v2/payments/transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({
        $or: [
          ...(req.user.tenantId ? [{ _id: req.user.tenantId }] : []),
          { email: new RegExp(`^${escapeRegExp(req.user.email)}$`, 'i') }
        ]
      });
      if (!tenant) return res.json([]);
      filter.tenantId = tenant._id;
    } else if (!req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      filter.landlordId = req.user._id || req.user.id;
    }

    if (req.query.category) filter.paymentCategory = req.query.category;
    if (req.query.status) filter.status = req.query.status;

    const txns = await PaymentTransaction.find(filter)
      .populate('tenantId', 'name email phone')
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Structured Invoices List & Creation (persisted in MongoDB, separates subscription vs rental)
// @route   GET /api/v2/payments/invoices
// @access  Private
router.get('/invoices', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({
        $or: [
          ...(req.user.tenantId ? [{ _id: req.user.tenantId }] : []),
          { email: new RegExp(`^${escapeRegExp(req.user.email)}$`, 'i') }
        ]
      });
      if (!tenant) return res.json([]);
      filter.tenantId = tenant._id;
      filter.invoiceCategory = 'rental';
    } else {
      filter.landlordId = req.user._id || req.user.id;
      if (req.query.category) filter.invoiceCategory = req.query.category;
    }

    const invoices = await Invoice.find(filter)
      .populate('tenantId', 'name email phone')
      .populate('unitId', 'unitNumber')
      .populate('propertyId', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/invoices', protect, admin, async (req, res) => {
  try {
    const {
      invoiceCategory = 'rental',
      tenantId,
      propertyId,
      unitId,
      items = [],
      vatRate = 0,
      dueDate,
      notes = '',
      billingPeriod = ''
    } = req.body;

    const landlordId = req.user._id || req.user.id;
    let tenant = null;
    if (tenantId) {
      if (!isValidObjectId(String(tenantId))) {
        return res.status(400).json({ message: 'Invalid tenant identifier' });
      }
      tenant = await Tenant.findOne({ _id: tenantId, user: landlordId }).populate('unitId');
      if (!tenant) {
        return res.status(403).json({ message: 'Tenant not found or not owned by your organization' });
      }
    }
    if (propertyId) {
      if (!isValidObjectId(String(propertyId))) {
        return res.status(400).json({ message: 'Invalid property identifier' });
      }
      const ownedProp = await Property.findOne({ _id: propertyId, user: landlordId }).select('_id');
      if (!ownedProp) {
        return res.status(403).json({ message: 'Property not found or not owned by your organization' });
      }
    }
    if (unitId) {
      if (!isValidObjectId(String(unitId))) {
        return res.status(400).json({ message: 'Invalid unit identifier' });
      }
      const ownedUnit = await Unit.findOne({ _id: unitId, user: landlordId }).select('_id');
      if (!ownedUnit) {
        return res.status(403).json({ message: 'Unit not found or not owned by your organization' });
      }
    }

    const invoice = await createStructuredInvoice({
      invoiceCategory,
      landlordId,
      tenantId: tenant?._id,
      propertyId: propertyId || tenant?.unitId?.propertyId,
      unitId: unitId || tenant?.unitId?._id || tenant?.unitId,
      billingPeriod: billingPeriod || new Date().toISOString().slice(0, 7),
      items,
      vatRate: Number(vatRate || 0),
      dueDate: dueDate || new Date(),
      notes,
      customerName: tenant?.name || req.body.customerName || req.user.name,
      customerEmail: tenant?.email || req.body.customerEmail || '',
      customerPhone: tenant?.phone || req.body.customerPhone || '',
      customerKraPin: tenant?.kraPin || req.body.customerKraPin || ''
    });

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @desc    Download Official Invoice PDF
// @route   GET /api/v2/payments/invoices/:id/pdf
// @access  Private
router.get('/invoices/:id/pdf', protect, validateObjectId('id'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const userId = String(req.user._id || req.user.id);
    const isLandlordOwner = String(invoice.landlordId) === userId;
    const isTenantOwner = Boolean(invoice.tenantId && req.user.tenantId && String(invoice.tenantId) === String(req.user.tenantId));
    if (!isLandlordOwner && !isTenantOwner && !req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to download this invoice' });
    }

    const settings = await getUserBusinessProfile(invoice.landlordId || req.user);
    const pdfBuffer = await generateInvoicePDF(invoice, settings);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Download Official Receipt PDF
// @route   GET /api/v2/payments/receipts/:id/pdf
// @access  Private
router.get('/receipts/:id/pdf', protect, validateObjectId('id'), async (req, res) => {
  try {
    const receipt = await PaymentReceipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

    const userId = String(req.user._id || req.user.id);
    const isLandlordOwner = String(receipt.landlordId) === userId;
    const isTenantOwner = Boolean(receipt.tenantId && req.user.tenantId && String(receipt.tenantId) === String(req.user.tenantId));
    if (!isLandlordOwner && !isTenantOwner && !req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to download this receipt' });
    }

    const settings = await getUserBusinessProfile(receipt.landlordId || req.user);
    const pseudoPayment = {
      _id: receipt.receiptNumber,
      amount: receipt.amount,
      date: receipt.issuedAt,
      method: receipt.paymentMethod,
      reference: receipt.providerReference || receipt.receiptNumber,
      status: 'paid',
      type: receipt.description,
      tenantId: { name: receipt.recipientName, email: receipt.recipientEmail }
    };
    const pdfBuffer = await generateReceiptPDF(pseudoPayment, settings, settings?.orgName || 'Property Management');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${receipt.receiptNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    KRA eTIMS Compliance Routes
// @route   POST /api/v2/payments/etims/submit/:invoiceId
router.post('/etims/submit/:invoiceId', protect, admin, validateObjectId('invoiceId'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (String(invoice.landlordId) !== String(req.user._id || req.user.id) && !req.user.isSuperAdmin && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await EtimsService.submitInvoiceToEtims({
      invoiceId: invoice._id,
      actorUser: req.user,
      overrideConfig: req.body || {}
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/etims/retry/:submissionId', protect, admin, validateObjectId('submissionId'), async (req, res) => {
  try {
    const result = await EtimsService.retrySubmission({
      submissionId: req.params.submissionId,
      actorUser: req.user
    });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

router.get('/etims/submissions', protect, admin, async (req, res) => {
  try {
    const filter = (req.user.isSuperAdmin || req.user.role === 'superadmin')
      ? {}
      : { landlordId: req.user._id || req.user.id };
    const list = await TaxSubmission.find(filter)
      .populate('invoiceId', 'invoiceNumber invoiceCategory totalAmount status etimsStatus')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/etims/init-device', protect, superAdmin, async (req, res) => {
  try {
    const data = await EtimsService.initializeDevice(req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Tenant Self-Service Portal Summary (Unit, Balances, Invoices, Receipts)
// @route   GET /api/v2/payments/tenant-portal/summary
// @access  Private (Tenant or Landlord testing)
router.get('/tenant-portal/summary', protect, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      $or: [
        ...(req.user.tenantId ? [{ _id: req.user.tenantId }] : []),
        { email: new RegExp(`^${escapeRegExp((req.user.email || '').trim())}$`, 'i') }
      ]
    }).populate({
      path: 'unitId',
      select: 'unitNumber rentAmount propertyId type',
      populate: { path: 'propertyId', select: 'name location' }
    });

    if (!tenant) {
      return res.json({ linked: false, message: 'No active tenant lease matched to your email.' });
    }

    const invoices = await Invoice.find({ tenantId: tenant._id, invoiceCategory: 'rental' }).sort({ createdAt: -1 });
    const payments = await Payment.find({ tenantId: tenant._id }).sort({ date: -1 });
    const receipts = await PaymentReceipt.find({ tenantId: tenant._id, receiptCategory: 'rental' }).sort({ issuedAt: -1 });
    const transactions = await PaymentTransaction.find({ tenantId: tenant._id }).sort({ createdAt: -1 });

    const expectedRent = Number(tenant.rentAmount || tenant.unitId?.rentAmount || 0);
    const utilities = Array.isArray(tenant.utilities)
      ? tenant.utilities.filter(u => !u.isIncluded)
      : [];
    const expectedUtilities = utilities.reduce((s, u) => s + (Number(u.amount) || 0), 0);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const paidThisMonth = payments
      .filter(p => new Date(p.date) >= startOfMonth && ['paid', 'partial', 'Completed'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const currentObligation = expectedRent + expectedUtilities;
    const balanceDue = Math.max(0, currentObligation - paidThisMonth);

    res.json({
      linked: true,
      tenant,
      unit: tenant.unitId,
      property: tenant.unitId?.propertyId,
      obligations: {
        expectedRent,
        utilities,
        expectedUtilities,
        totalMonthlyObligation: currentObligation,
        paidThisMonth,
        balanceDue
      },
      invoices,
      payments,
      receipts,
      transactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
