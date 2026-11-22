const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireActiveSubscription } = require('../middleware/subscriptionLockMiddleware');
const { validateObjectId, isValidObjectId, escapeRegExp, paymentWebhookLimiter } = require('../middleware/securityMiddleware');
const PaymentService = require('../services/payments/PaymentService');
const PaymentTransaction = require('../models/PaymentTransaction');
const Settings = require('../models/Settings');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const logActivity = require('../utils/logActivity');

function normalizePhoneDigits(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.slice(-9);
}

// @desc    Initiate M-Pesa STK Push routed exclusively through Centralized Payment Gateway
// @route   POST /api/mpesa/stk-push
// @access  Private (requires active subscription)
router.post('/stk-push', protect, requireActiveSubscription, async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, tenantId, unitId } = req.body;
    const numericAmount = Number(amount);

    if (!phoneNumber || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and positive amount are required.'
      });
    }

    const userId = String(req.user._id || req.user.id);
    const isSuper = Boolean(req.user.isSuperAdmin || req.user.role === 'superadmin');

    let tenant = null;
    if (tenantId) {
      if (!isValidObjectId(String(tenantId))) {
        return res.status(400).json({ success: false, message: 'Invalid tenant identifier.' });
      }
      tenant = await Tenant.findById(tenantId).populate('unitId');
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant not found.' });
      }
      const isOwner = String(tenant.user) === userId;
      const isTenantSelf = req.user.role === 'tenant' && (
        String(req.user.tenantId) === String(tenant._id) ||
        (tenant.email && tenant.email.toLowerCase() === (req.user.email || '').toLowerCase())
      );
      if (!isOwner && !isTenantSelf && !isSuper) {
        return res.status(403).json({ success: false, message: 'Unauthorized to initiate payment for this tenant.' });
      }
    }

    let resolvedUnitId = tenant?.unitId?._id || tenant?.unitId || undefined;
    if (!resolvedUnitId && unitId) {
      if (!isValidObjectId(String(unitId))) {
        return res.status(400).json({ success: false, message: 'Invalid unit identifier.' });
      }
      const unitDoc = await Unit.findById(unitId).select('user');
      if (!unitDoc || (!isSuper && String(unitDoc.user) !== userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized unit reference.' });
      }
      resolvedUnitId = unitDoc._id;
    }

    const landlordId = tenant?.user || req.user._id || req.user.id;
    const activeProvider = PaymentService.resolveDefaultProvider();

    const result = await PaymentService.initiateTransaction({
      providerCode: activeProvider,
      paymentChannel: 'mpesa_stk',
      paymentCategory: 'rent',
      landlordId,
      tenantId: tenant?._id || undefined,
      unitId: resolvedUnitId,
      amount: numericAmount,
      currency: 'KES',
      customerName: tenant?.name || req.user.name || 'Tenant',
      customerEmail: tenant?.email || req.user.email || '',
      customerPhone: phoneNumber,
      description: accountReference || `Rental Payment via ${activeProvider === 'intasend' ? 'IntaSend' : 'Pesaflow'}`
    });

    await logActivity(
      req.user,
      `${activeProvider === 'intasend' ? 'IntaSend' : 'Pesaflow'} M-Pesa Payment Initiated`,
      `Initiated KES ${amount} via ${activeProvider} for ${phoneNumber}`,
      'payment',
      'info'
    );

    res.json({
      success: true,
      message: `Payment initiated via ${activeProvider === 'intasend' ? 'IntaSend' : 'Pesaflow'} gateway.`,
      transactionId: result.transaction._id,
      internalTransactionId: result.transaction.internalTransactionId,
      accountReference: result.transaction.accountReference,
      checkoutUrl: result.gateway.checkoutUrl,
      gateway: result.gateway
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'GATEWAY_INIT_ERROR',
      message: error.message || 'Failed to initiate payment via active gateway'
    });
  }
});

// @desc    Legacy M-Pesa callback forwarder -> delegates to active default Gateway Webhook Processor
// @route   POST /api/mpesa/callback
// @access  Public
router.post('/callback', async (req, res) => {
  try {
    const providerCode = PaymentService.resolveDefaultProvider();
    const result = await PaymentService.processWebhook({
      providerCode,
      payload: req.body,
      headers: req.headers,
      sourceIp: req.ip || ''
    });
    res.json({ result: 'success', status: result.status });
  } catch (error) {
    res.status(error.statusCode || 400).json({ result: 'error', message: error.message });
  }
});

// @desc    Safaricom M-Pesa C2B Validation URL
// @route   POST /api/mpesa/c2b-validation
// @access  Public (Safaricom Daraja C2B)
router.post('/c2b-validation', paymentWebhookLimiter, async (req, res) => {
  try {
    const amount = Number(req.body?.TransAmount || 0);
    const shortCode = String(req.body?.BusinessShortCode || '').trim();
    if (!shortCode || !Number.isFinite(amount) || amount <= 0) {
      return res.json({ ResultCode: 'C2B00013', ResultDesc: 'Rejected: Invalid Amount or BusinessShortCode' });
    }
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch {
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// @desc    Safaricom M-Pesa C2B Confirmation URL (records tenant Paybill payments -> appears in MPESA Transactions)
// @route   POST /api/mpesa/c2b-confirmation
// @access  Public (Safaricom Daraja C2B)
router.post('/c2b-confirmation', paymentWebhookLimiter, async (req, res) => {
  try {
    const {
      TransID = '',
      TransAmount = 0,
      BusinessShortCode = '',
      BillRefNumber = '',
      MSISDN = '',
      FirstName = '',
      MiddleName = '',
      LastName = ''
    } = req.body || {};

    const cleanTransId = String(TransID || '').trim().toUpperCase();
    const numericAmount = Number(TransAmount || 0);
    const cleanShortcode = String(BusinessShortCode || '').trim();
    const cleanBillRef = String(BillRefNumber || '').trim();
    const cleanPhone = String(MSISDN || '').trim();
    const payerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || cleanPhone || 'M-Pesa Payer';

    if (!cleanTransId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Idempotency guard: if this TransID is already settled, return Safaricom ACK immediately
    const existing = await PaymentTransaction.findOne({ providerReference: cleanTransId });
    if (existing && existing.status === 'paid') {
      return res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Resolve landlord owning this Paybill/Till shortcode
    let settingsDoc = cleanShortcode
      ? await Settings.findOne({ 'integrations.mpesa.shortcode': cleanShortcode }).lean()
      : null;

    // Fallback: match pending PaymentTransaction by BillRefNumber if shortcode matched nothing
    let matchedTxn = existing || null;
    if (!matchedTxn && cleanBillRef) {
      matchedTxn = await PaymentTransaction.findOne({
        accountReference: cleanBillRef,
        status: { $in: ['pending', 'processing'] }
      });
    }

    if (!settingsDoc && matchedTxn?.landlordId) {
      settingsDoc = await Settings.findOne({ user: matchedTxn.landlordId }).lean();
    }

    const landlordId = matchedTxn?.landlordId || settingsDoc?.user;
    if (!landlordId) {
      // Unmatched Paybill organization — store unallocated record or ACK Safaricom cleanly
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted (No matching Paybill account)' });
    }

    // Resolve tenant under this landlord via existing txn, BillRefNumber (Account #, Unit #), or Phone suffix
    let matchedTenant = null;
    if (matchedTxn?.tenantId) {
      matchedTenant = await Tenant.findById(matchedTxn.tenantId).populate('unitId');
    }

    if (!matchedTenant && cleanBillRef) {
      matchedTenant = await Tenant.findOne({
        user: landlordId,
        status: 'active',
        $or: [
          { accountNumber: new RegExp(`^${escapeRegExp(cleanBillRef)}$`, 'i') },
          { name: new RegExp(`^${escapeRegExp(cleanBillRef)}$`, 'i') }
        ]
      }).populate('unitId');

      if (!matchedTenant) {
        const matchedUnit = await Unit.findOne({
          user: landlordId,
          unitNumber: new RegExp(`^${escapeRegExp(cleanBillRef)}$`, 'i')
        }).select('_id');
        if (matchedUnit) {
          matchedTenant = await Tenant.findOne({
            user: landlordId,
            unitId: matchedUnit._id,
            status: 'active'
          }).populate('unitId');
        }
      }
    }

    if (!matchedTenant && cleanPhone) {
      const suffix = normalizePhoneDigits(cleanPhone);
      if (suffix.length >= 9) {
        matchedTenant = await Tenant.findOne({
          user: landlordId,
          status: 'active',
          phone: new RegExp(`${escapeRegExp(suffix)}$`)
        }).populate('unitId');
      }
    }

    const channelLabel = cleanShortcode ? `M-Pesa Paybill (${cleanShortcode})` : 'M-Pesa Paybill';
    const isProd = process.env.PESAPAL_ENV === 'production';

    if (!matchedTxn) {
      const shortRand = crypto.randomBytes(2).toString('hex').toUpperCase();
      const accountRef = cleanBillRef
        ? `${cleanBillRef.slice(0, 24)}-${cleanTransId.slice(-6)}`
        : `MPC2B-${cleanTransId}`;

      matchedTxn = await PaymentTransaction.create({
        internalTransactionId: PaymentService.generateInternalId('TXN-C2B'),
        landlordId,
        tenantId: matchedTenant?._id || undefined,
        propertyId: matchedTenant?.unitId?.propertyId || undefined,
        unitId: matchedTenant?.unitId?._id || matchedTenant?.unitId || undefined,
        provider: 'mpesa_c2b',
        gatewayEnvironment: isProd ? 'production' : 'sandbox',
        isSandbox: !isProd,
        paymentChannel: 'mpesa_paybill',
        paymentMethodDetail: channelLabel,
        paybillBusinessNumber: cleanShortcode,
        paymentCategory: 'rent',
        amount: numericAmount,
        amountPaid: numericAmount,
        currency: 'KES',
        accountReference: accountRef,
        merchantReference: cleanBillRef || accountRef,
        providerReference: cleanTransId,
        customerName: matchedTenant?.name || payerName,
        customerEmail: matchedTenant?.email || '',
        customerPhone: cleanPhone || matchedTenant?.phone || '',
        status: matchedTenant ? 'processing' : 'unmatched',
        reconciliationStatus: matchedTenant ? 'pending' : 'unmatched',
        paidAt: new Date(),
        metadata: {
          c2bBillRefNumber: cleanBillRef,
          c2bShortCode: cleanShortcode,
          c2bPayerName: payerName
        }
      });
    } else if (!matchedTxn.tenantId && matchedTenant) {
      matchedTxn.tenantId = matchedTenant._id;
      matchedTxn.unitId = matchedTenant.unitId?._id || matchedTenant.unitId;
      matchedTxn.propertyId = matchedTenant.unitId?.propertyId;
      matchedTxn.customerName = matchedTenant.name;
      matchedTxn.customerEmail = matchedTenant.email || matchedTxn.customerEmail;
      if (cleanPhone) matchedTxn.customerPhone = cleanPhone;
      await matchedTxn.save();
    }

    if (matchedTenant) {
      await PaymentService.finalizeVerifiedSettlement({
        transaction: matchedTxn,
        providerReference: cleanTransId,
        amountPaid: numericAmount,
        paymentChannel: 'mpesa_paybill',
        paymentMethodDetail: channelLabel,
        paidAt: new Date()
      });
    } else {
      await logActivity(
        { _id: landlordId },
        'Unmatched M-Pesa Paybill Payment',
        `Received KES ${numericAmount.toLocaleString()} (${cleanTransId}) on Paybill ${cleanShortcode || 'M-Pesa'} A/C "${cleanBillRef || 'N/A'}" from ${payerName}`,
        'payment',
        'warning'
      );
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('C2B Confirmation Error:', error.message);
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// @desc    Check gateway status for a transaction
// @route   GET /api/mpesa/status/:id
// @access  Private (requires active subscription)
router.get('/status/:id', protect, requireActiveSubscription, validateObjectId('id'), async (req, res) => {
  try {
    const txn = await PaymentTransaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    const userId = String(req.user._id || req.user.id);
    const isSuper = Boolean(req.user.isSuperAdmin || req.user.role === 'superadmin');
    const isLandlordOwner = String(txn.landlordId) === userId;
    const isTenantOwner = Boolean(txn.tenantId && req.user.tenantId && String(txn.tenantId) === String(req.user.tenantId));
    if (!isSuper && !isLandlordOwner && !isTenantOwner) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
    }
    const result = await PaymentService.verifyTransactionStatus(txn._id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
