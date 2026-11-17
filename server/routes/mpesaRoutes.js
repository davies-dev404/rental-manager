const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const PaymentService = require('../services/payments/PaymentService');
const PaymentTransaction = require('../models/PaymentTransaction');
const Tenant = require('../models/Tenant');
const logActivity = require('../utils/logActivity');

// @desc    Initiate M-Pesa STK Push routed exclusively through Centralized Pesaflow Gateway
// @route   POST /api/mpesa/stk-push
// @access  Private
router.post('/stk-push', protect, async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, tenantId, unitId } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and amount are required.'
      });
    }

    const tenant = tenantId ? await Tenant.findById(tenantId).populate('unitId') : null;
    const landlordId = tenant?.user || req.user._id || req.user.id;

    const result = await PaymentService.initiateTransaction({
      providerCode: 'pesaflow',
      paymentChannel: 'mpesa_stk',
      paymentCategory: 'rent',
      landlordId,
      tenantId: tenant?._id || undefined,
      unitId: unitId || tenant?.unitId?._id || tenant?.unitId || undefined,
      amount: Number(amount),
      currency: 'KES',
      customerName: tenant?.name || req.user.name || 'Tenant',
      customerEmail: tenant?.email || req.user.email || '',
      customerPhone: phoneNumber,
      description: accountReference || 'Rental Payment via Pesaflow'
    });

    await logActivity(
      req.user,
      'Pesaflow M-Pesa Payment Initiated',
      `Initiated KES ${amount} via Pesaflow for ${phoneNumber}`,
      'payment',
      'info'
    );

    res.json({
      success: true,
      message: 'Payment initiated via Pesaflow gateway.',
      transactionId: result.transaction._id,
      internalTransactionId: result.transaction.internalTransactionId,
      accountReference: result.transaction.accountReference,
      checkoutUrl: result.gateway.checkoutUrl,
      gateway: result.gateway
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'PESAFLOW_INIT_ERROR',
      message: error.message || 'Failed to initiate payment via Pesaflow'
    });
  }
});

// @desc    Legacy M-Pesa callback forwarder -> delegates to Pesaflow Webhook Processor
// @route   POST /api/mpesa/callback
// @access  Public
router.post('/callback', async (req, res) => {
  try {
    const result = await PaymentService.processWebhook({
      providerCode: 'pesaflow',
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
router.get('/status/:id', protect, async (req, res) => {
  try {
    const txn = await PaymentTransaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    const result = await PaymentService.verifyTransactionStatus(txn._id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
