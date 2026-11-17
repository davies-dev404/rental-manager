const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentCallback = require('../models/PaymentCallback');
const SubscriptionAuditLog = require('../models/SubscriptionAuditLog');
const TaxSubmission = require('../models/TaxSubmission');
const { protect, superAdmin } = require('../middleware/authMiddleware');
const PaymentService = require('../services/payments/PaymentService');
const {
  seedDefaultPlans,
  processSubscriptionExpirations,
  logSubscriptionAudit
} = require('../services/subscriptionService');

router.use(protect, superAdmin);

// @desc    Super Admin Financial & SaaS Platform Overview Dashboard
// @route   GET /api/super-admin/overview
router.get('/overview', async (req, res) => {
  try {
    await seedDefaultPlans();

    const [
      totalLandlords,
      subscriptions,
      entitlements,
      totalRegisteredUnits,
      transactions,
      rentPayments,
      unmatchedCallbacks,
      taxSubmissions
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['admin', 'landlord'] }, isSuperAdmin: { $ne: true } }),
      LandlordSubscription.find().lean(),
      UnitEntitlement.find().lean(),
      Unit.countDocuments(),
      PaymentTransaction.find().sort({ createdAt: -1 }).lean(),
      Payment.find({ status: { $in: ['paid', 'partial', 'Completed'] } }).lean(),
      PaymentCallback.countDocuments({ processingStatus: 'unmatched' }),
      TaxSubmission.find().lean()
    ]);

    const activeSubscriptions = subscriptions.filter(s => ['active', 'trial'].includes(s.status)).length;
    const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired').length;
    const graceSubscriptions = subscriptions.filter(s => s.status === 'grace_period').length;

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = subscriptions.filter(s =>
      ['active', 'trial', 'grace_period'].includes(s.status) &&
      s.expiryDate &&
      new Date(s.expiryDate) >= now &&
      new Date(s.expiryDate) <= in14Days
    );

    const pendingPayments = transactions.filter(t => ['pending', 'processing'].includes(t.status)).length;
    const successfulPayments = transactions.filter(t => t.status === 'paid').length;
    const failedPayments = transactions.filter(t => ['failed', 'cancelled'].includes(t.status)).length;

    const subPaidTxns = transactions.filter(
      t => t.status === 'paid' && ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory)
    );
    const totalSubscriptionRevenue = subPaidTxns.reduce((s, t) => s + Number(t.amountPaid || t.amount || 0), 0);

    // Revenue by Payment Method / Channel
    const revenueByChannel = {};
    subPaidTxns.forEach((t) => {
      const ch = t.paymentChannel || 'pesaflow';
      revenueByChannel[ch] = (revenueByChannel[ch] || 0) + Number(t.amountPaid || t.amount || 0);
    });

    // Revenue by Subscription Plan
    const subMap = new Map(subscriptions.map(s => [String(s._id), s]));
    const revenueByPlan = {};
    subPaidTxns.forEach((t) => {
      const sub = t.subscriptionId ? subMap.get(String(t.subscriptionId)) : null;
      const pName = sub?.planName || 'Subscription';
      revenueByPlan[pName] = (revenueByPlan[pName] || 0) + Number(t.amountPaid || t.amount || 0);
    });

    const totalAllocatedUnits = entitlements.reduce((s, e) => s + (e.isUnlimited ? 0 : Number(e.purchasedLimit || 0)), 0);

    const totalRentCollected = rentPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    res.json({
      metrics: {
        totalLandlords,
        activeSubscriptions,
        expiredSubscriptions,
        graceSubscriptions,
        pendingPayments,
        successfulPayments,
        failedPayments,
        totalSubscriptionRevenue,
        totalAllocatedUnits,
        totalRegisteredUnits,
        upcomingRenewalsCount: upcomingRenewals.length,
        tenantRentCollectedTotal: totalRentCollected,
        tenantRentPaymentsCount: rentPayments.length,
        unmatchedCallbacksCount: unmatchedCallbacks,
        etimsValidatedCount: taxSubmissions.filter(x => x.status === 'validated').length,
        etimsFailedCount: taxSubmissions.filter(x => x.status === 'failed').length
      },
      revenueByChannel: Object.entries(revenueByChannel).map(([channel, amount]) => ({ channel, amount })),
      revenueByPlan: Object.entries(revenueByPlan).map(([plan, amount]) => ({ plan, amount })),
      upcomingRenewals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Manage Subscription Plans (Create / Edit prices, limits, discounts, grace periods)
router.get('/plans', async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find().sort({ sortOrder: 1 });
    if (plans.length === 0) plans = await seedDefaultPlans();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    await logSubscriptionAudit({
      landlordId: req.user._id,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: 'plan_created',
      newState: plan.toObject()
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const existing = await SubscriptionPlan.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Plan not found' });

    const prevState = existing.toObject();
    const updated = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    await logSubscriptionAudit({
      landlordId: req.user._id,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: 'plan_updated',
      previousState: { pricing: prevState.pricing, maxUnits: prevState.maxUnits, discountPercent: prevState.discountPercent },
      newState: { pricing: updated.pricing, maxUnits: updated.maxUnits, discountPercent: updated.discountPercent }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @desc    List all Landlords with Subscription & Unit Utilization Telemetry
router.get('/landlords', async (req, res) => {
  try {
    const landlords = await User.find({ role: { $in: ['admin', 'landlord'] }, isSuperAdmin: { $ne: true } })
      .select('-password -otp -twoFactorSecret -refreshTokens')
      .sort({ createdAt: -1 })
      .lean();

    const entitlements = await UnitEntitlement.find().lean();
    const subs = await LandlordSubscription.find().sort({ createdAt: -1 }).lean();

    const entMap = new Map(entitlements.map(e => [String(e.landlordId), e]));
    const result = landlords.map((l) => {
      const ent = entMap.get(String(l._id));
      const history = subs.filter(s => String(s.landlordId) === String(l._id));
      return {
        ...l,
        entitlement: ent || null,
        activeSubscription: history[0] || null,
        subscriptionHistoryCount: history.length
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Super Admin Subscription Override (Activate / Suspend / Adjust Unit Allowance) with Audit Log
router.post('/landlords/:id/subscription-override', async (req, res) => {
  try {
    const { action, purchasedLimit, reason = 'Super Admin adjustment', expiryDate } = req.body;
    const landlordId = req.params.id;
    const ent = await UnitEntitlement.findOne({ landlordId });
    if (!ent) return res.status(404).json({ message: 'Landlord entitlement not found' });

    const prevState = ent.toObject();
    if (purchasedLimit !== undefined) ent.purchasedLimit = Number(purchasedLimit);
    if (expiryDate) ent.expiresAt = new Date(expiryDate);

    if (action === 'suspend') {
      ent.status = 'suspended';
      if (ent.subscriptionId) await LandlordSubscription.findByIdAndUpdate(ent.subscriptionId, { status: 'suspended', suspensionReason: reason });
    } else if (action === 'activate') {
      ent.status = 'active';
      if (ent.subscriptionId) {
        await LandlordSubscription.findByIdAndUpdate(ent.subscriptionId, {
          status: 'active',
          purchasedUnits: ent.purchasedLimit,
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {})
        });
      }
    }
    ent.updatedAt = new Date();
    await ent.save();

    await logSubscriptionAudit({
      landlordId,
      subscriptionId: ent.subscriptionId,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: action === 'suspend' ? 'subscription_suspended' : (action === 'activate' ? 'subscription_reactivated' : 'unit_limit_adjusted'),
      previousState: { status: prevState.status, purchasedLimit: prevState.purchasedLimit },
      newState: { status: ent.status, purchasedLimit: ent.purchasedLimit },
      reason
    });

    res.json({ success: true, entitlement: ent });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @desc    Filterable Payment Transactions & Unmatched Payment Reconciliation
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, landlordId, provider, status, category, planCode } = req.query;
    const filter = {};
    if (landlordId) filter.landlordId = landlordId;
    if (provider) filter.provider = provider;
    if (status) filter.status = status;
    if (category) filter.paymentCategory = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let txns = await PaymentTransaction.find(filter)
      .populate('landlordId', 'name email phone')
      .populate('tenantId', 'name email phone')
      .populate('subscriptionId', 'planCode planName purchasedUnits')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    if (planCode) {
      txns = txns.filter(t => t.subscriptionId?.planCode === planCode);
    }

    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unmatched', async (req, res) => {
  try {
    const unmatchedCallbacks = await PaymentCallback.find({ processingStatus: 'unmatched' }).sort({ receivedAt: -1 }).limit(100);
    const unmatchedTxns = await PaymentTransaction.find({ reconciliationStatus: { $in: ['unmatched', 'amount_mismatch'] } }).sort({ createdAt: -1 }).limit(100);
    res.json({ unmatchedCallbacks, unmatchedTxns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/transactions/:id/verify', async (req, res) => {
  try {
    const result = await PaymentService.verifyTransactionStatus(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/transactions/:id/reverse', async (req, res) => {
  try {
    const txn = await PaymentService.handleReversal({
      transactionId: req.params.id,
      reason: req.body.reason || 'Authorized Super Admin reversal',
      actorId: req.user._id
    });
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/subscriptions/process-expirations', async (req, res) => {
  try {
    const summary = await processSubscriptionExpirations();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await SubscriptionAuditLog.find()
      .populate('landlordId', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
