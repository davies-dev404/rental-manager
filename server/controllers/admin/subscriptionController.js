const SubscriptionPlan = require('../../models/SubscriptionPlan');
const LandlordSubscription = require('../../models/LandlordSubscription');
const UnitEntitlement = require('../../models/UnitEntitlement');
const PaymentTransaction = require('../../models/PaymentTransaction');
const { pickAllowed } = require('../../middleware/securityMiddleware');
const {
  seedDefaultPlans,
  processSubscriptionExpirations,
  logSubscriptionAudit
} = require('../../services/subscriptionService');
const { logAdminAction } = require('../../utils/auditLogger');

const ALLOWED_PLAN_FIELDS = [
  'code', 'name', 'badge', 'description', 'maxUnits', 'minUnits', 'isCustomUnlimited',
  'currency', 'pricing', 'pricePerAdditionalUnit', 'discountPercent', 'trialDays',
  'gracePeriodDays', 'features', 'isPopular', 'isActive', 'autoRenewDefault', 'sortOrder'
];

exports.listSubscriptions = async (req, res) => {
  try {
    await seedDefaultPlans();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const skip = (page - 1) * limit;
    const { status = 'all', planCode = 'all' } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = String(status);
    if (planCode && planCode !== 'all') filter.planCode = String(planCode).toLowerCase();

    const [plans, total, subscriptions, subRevenueAgg, statusCountsAgg] = await Promise.all([
      SubscriptionPlan.find().sort({ sortOrder: 1 }).lean(),
      LandlordSubscription.countDocuments(filter),
      LandlordSubscription.find(filter)
        .populate('landlordId', 'name email phone companyName accountStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentTransaction.aggregate([
        {
          $match: {
            gatewayEnvironment: 'production',
            isSandbox: { $ne: true },
            status: 'paid',
            paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] }
          }
        },
        { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }, count: { $sum: 1 } } }
      ]),
      LandlordSubscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const landlordIds = subscriptions.map((s) => s.landlordId?._id || s.landlordId).filter(Boolean);
    const entitlements = await UnitEntitlement.find({ landlordId: { $in: landlordIds } }).lean();
    const entMap = new Map(entitlements.map((e) => [String(e.landlordId), e]));

    const statusCounts = {};
    statusCountsAgg.forEach((s) => { statusCounts[s._id] = s.count; });

    const items = subscriptions.map((s) => {
      const lid = String(s.landlordId?._id || s.landlordId || '');
      return {
        ...s,
        entitlement: entMap.get(lid) || null
      };
    });

    res.json({
      plans,
      subscriptions: items,
      summary: {
        active: (statusCounts.active || 0) + (statusCounts.trial || 0),
        expired: statusCounts.expired || 0,
        cancelled: statusCounts.cancelled || 0,
        gracePeriod: statusCounts.grace_period || 0,
        suspended: statusCounts.suspended || 0,
        totalSubscriptionRevenue: subRevenueAgg[0]?.total || 0,
        paidSubscriptionCount: subRevenueAgg[0]?.count || 0
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load subscriptions' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const payload = pickAllowed(req.body, ALLOWED_PLAN_FIELDS);
    if (!payload.code || !payload.name) {
      return res.status(400).json({ message: 'Plan code and name are required' });
    }
    const plan = await SubscriptionPlan.create(payload);

    await logSubscriptionAudit({
      landlordId: req.user._id,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: 'plan_created',
      newState: plan.toObject()
    });
    await logAdminAction({
      req,
      action: 'SUBSCRIPTION_PLAN_CREATED',
      category: 'subscription',
      targetType: 'SubscriptionPlan',
      targetId: String(plan._id),
      details: `Created plan "${plan.name}" (${plan.code})`,
      newState: plan.toObject()
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create subscription plan' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const existing = await SubscriptionPlan.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Subscription plan not found' });

    const prevState = existing.toObject();
    const updates = pickAllowed(req.body, ALLOWED_PLAN_FIELDS);
    const updated = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after', runValidators: true }
    );

    await logSubscriptionAudit({
      landlordId: req.user._id,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: 'plan_updated',
      previousState: { pricing: prevState.pricing, maxUnits: prevState.maxUnits, isActive: prevState.isActive },
      newState: { pricing: updated.pricing, maxUnits: updated.maxUnits, isActive: updated.isActive }
    });
    await logAdminAction({
      req,
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      category: 'subscription',
      targetType: 'SubscriptionPlan',
      targetId: String(updated._id),
      details: `Updated subscription plan "${updated.name}" (${updated.code})`,
      previousState: { pricing: prevState.pricing, maxUnits: prevState.maxUnits, isActive: prevState.isActive },
      newState: { pricing: updated.pricing, maxUnits: updated.maxUnits, isActive: updated.isActive }
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update subscription plan' });
  }
};

exports.overrideLandlordSubscription = async (req, res) => {
  try {
    const { action, purchasedLimit, reason = 'Super Admin adjustment', expiryDate } = req.body || {};
    const landlordId = req.params.id;
    const ent = await UnitEntitlement.findOne({ landlordId });
    if (!ent) return res.status(404).json({ message: 'Landlord entitlement not found' });

    const prevState = ent.toObject();
    if (purchasedLimit !== undefined && purchasedLimit !== '') {
      ent.purchasedLimit = Math.max(1, Number(purchasedLimit));
    }
    if (expiryDate) {
      ent.expiresAt = new Date(expiryDate);
    }

    if (action === 'suspend') {
      ent.status = 'suspended';
      if (ent.subscriptionId) {
        await LandlordSubscription.findByIdAndUpdate(ent.subscriptionId, {
          status: 'suspended',
          suspensionReason: reason
        });
      }
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

    const auditAction = action === 'suspend'
      ? 'subscription_suspended'
      : (action === 'activate' ? 'subscription_reactivated' : 'unit_limit_adjusted');

    await logSubscriptionAudit({
      landlordId,
      subscriptionId: ent.subscriptionId,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: auditAction,
      previousState: { status: prevState.status, purchasedLimit: prevState.purchasedLimit },
      newState: { status: ent.status, purchasedLimit: ent.purchasedLimit },
      reason
    });
    await logAdminAction({
      req,
      action: `SUBSCRIPTION_${auditAction.toUpperCase()}`,
      category: 'subscription',
      targetType: 'User',
      targetId: String(landlordId),
      details: `Landlord subscription override (${action || 'adjust'}): limit=${ent.purchasedLimit}, status=${ent.status}. Reason: ${reason}`,
      previousState: { status: prevState.status, purchasedLimit: prevState.purchasedLimit },
      newState: { status: ent.status, purchasedLimit: ent.purchasedLimit }
    });

    res.json({ success: true, entitlement: ent });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Override failed' });
  }
};

exports.runExpirySweep = async (req, res) => {
  try {
    const summary = await processSubscriptionExpirations();
    await logAdminAction({
      req,
      action: 'SUBSCRIPTION_EXPIRY_SWEEP',
      category: 'subscription',
      details: `Executed subscription expiry sweep: warnings=${summary?.warningsSent || 0}, grace=${summary?.movedToGrace || 0}, expired=${summary?.expiredCount || 0}`,
      newState: summary
    });
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Expiry sweep failed' });
  }
};
