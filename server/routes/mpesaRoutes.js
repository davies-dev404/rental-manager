const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId, isValidObjectId } = require('../middleware/securityMiddleware');
const PaymentService = require('../services/payments/PaymentService');
const PaymentTransaction = require('../models/PaymentTransaction');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const logActivity = require('../utils/logActivity');

// @desc    Initiate M-Pesa STK Push routed exclusively through Centralized Pesaflow Gateway
// @route   POST /api/mpesa/stk-push
// @access  Private
router.post('/stk-push', protect, async (req, res) => {
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

// @desc    Check gateway status for a transaction
// @route   GET /api/mpesa/status/:id
// @access  Private
router.get('/status/:id', protect, validateObjectId('id'), async (req, res) => {
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
