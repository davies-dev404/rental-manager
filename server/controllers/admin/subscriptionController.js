const SubscriptionPlan = require('../../models/SubscriptionPlan');
const LandlordSubscription = require('../../models/LandlordSubscription');
const UnitEntitlement = require('../../models/UnitEntitlement');
const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const User = require('../../models/User');
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

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [
      plans,
      total,
      subscriptions,
      subRevenueAgg,
      statusCountsAgg,
      activePaidSubs,
      expiring14Days,
      unpaidInvoices,
      failedRenewals,
      billingInvoices,
      allSubsLandlords,
      paidSubsLandlords
    ] = await Promise.all([
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
      ]),
      LandlordSubscription.find({
        status: 'active',
        isSandbox: { $ne: true },
        priceAmount: { $gt: 0 }
      })
        .select('billingCycle priceAmount')
        .lean(),
      LandlordSubscription.find({
        status: { $in: ['active', 'trial', 'grace_period'] },
        expiryDate: { $gte: now, $lte: in14Days }
      })
        .populate('landlordId', 'name email phone companyName')
        .sort({ expiryDate: 1 })
        .limit(20)
        .lean(),
      Invoice.find({
        invoiceCategory: 'subscription',
        status: { $in: ['open', 'partial'] }
      })
        .populate('landlordId', 'name email phone')
        .sort({ dueDate: 1 })
        .limit(20)
        .lean(),
      PaymentTransaction.find({
        paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] },
        status: 'failed',
        gatewayEnvironment: 'production',
        isSandbox: { $ne: true }
      })
        .populate('landlordId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Invoice.find({ invoiceCategory: 'subscription' })
        .populate('landlordId', 'name email companyName')
        .sort({ issuedAt: -1, createdAt: -1 })
        .limit(40)
        .lean(),
      LandlordSubscription.distinct('landlordId'),
      LandlordSubscription.distinct('landlordId', { status: 'active', priceAmount: { $gt: 0 }, isSandbox: { $ne: true } })
    ]);

    const cycleDivisor = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 };
    const mrr = Math.round(
      activePaidSubs.reduce((sum, s) => {
        const div = cycleDivisor[s.billingCycle] || 1;
        return sum + Number(s.priceAmount || 0) / div;
      }, 0)
    );
    const arr = mrr * 12;

    const landlordIds = subscriptions.map((s) => s.landlordId?._id || s.landlordId).filter(Boolean);
    const entitlements = await UnitEntitlement.find({ landlordId: { $in: landlordIds } }).lean();
    const entMap = new Map(entitlements.map((e) => [String(e.landlordId), e]));

    const statusCounts = {};
    statusCountsAgg.forEach((s) => { statusCounts[s._id] = s.count; });

    const totalSubsAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const churnedCount = (statusCounts.expired || 0) + (statusCounts.cancelled || 0) + (statusCounts.suspended || 0);
    const churnRate = totalSubsAll > 0 ? Number(((churnedCount / totalSubsAll) * 100).toFixed(1)) : 0;
    const trialConversionRate = allSubsLandlords.length > 0
      ? Number(((paidSubsLandlords.length / allSubsLandlords.length) * 100).toFixed(1))
      : 0;

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
        active: statusCounts.active || 0,
        trial: statusCounts.trial || 0,
        activeAndTrial: (statusCounts.active || 0) + (statusCounts.trial || 0),
        expired: statusCounts.expired || 0,
        cancelled: statusCounts.cancelled || 0,
        gracePeriod: statusCounts.grace_period || 0,
        suspended: statusCounts.suspended || 0,
        expiringSoonCount: expiring14Days.length,
        mrr,
        arr,
        trialConversionRate,
        churnRate,
        totalSubscriptionRevenue: subRevenueAgg[0]?.total || 0,
        paidSubscriptionCount: subRevenueAgg[0]?.count || 0
      },
      alerts: {
        expiring14Days,
        unpaidInvoices,
        failedRenewals
      },
      billingInvoices,
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

exports.extendTrial = async (req, res) => {
  try {
    const landlordId = req.params.id;
    const extraDays = Math.min(90, Math.max(1, Number(req.body?.extraDays || 7)));
    const reason = String(req.body?.reason || `Super Admin extended trial by ${extraDays} days`).trim();

    const [ent, latestSub] = await Promise.all([
      UnitEntitlement.findOne({ landlordId }),
      LandlordSubscription.findOne({ landlordId }).sort({ createdAt: -1 })
    ]);

    if (!ent && !latestSub) {
      return res.status(404).json({ message: 'Landlord subscription or entitlement not found' });
    }

    const baseDate = new Date(
      Math.max(
        Date.now(),
        latestSub?.expiryDate ? new Date(latestSub.expiryDate).getTime() : 0,
        ent?.expiresAt ? new Date(ent.expiresAt).getTime() : 0
      )
    );
    const newExpiry = new Date(baseDate.getTime() + extraDays * 24 * 60 * 60 * 1000);

    if (latestSub) {
      latestSub.status = 'trial';
      latestSub.expiryDate = newExpiry;
      latestSub.updatedAt = new Date();
      await latestSub.save();
    }
    if (ent) {
      ent.status = 'trial';
      ent.expiresAt = newExpiry;
      ent.updatedAt = new Date();
      await ent.save();
    }

    await logSubscriptionAudit({
      landlordId,
      subscriptionId: latestSub?._id || ent?.subscriptionId,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: 'trial_extended',
      newState: { status: 'trial', expiryDate: newExpiry, extraDays },
      reason
    });
    await logAdminAction({
      req,
      action: 'SUBSCRIPTION_TRIAL_EXTENDED',
      category: 'subscription',
      targetType: 'User',
      targetId: String(landlordId),
      details: `Extended landlord trial by ${extraDays} day(s) until ${newExpiry.toISOString().slice(0, 10)}: ${reason}`,
      newState: { extraDays, expiryDate: newExpiry }
    });

    res.json({ success: true, expiryDate: newExpiry, extraDays, subscription: latestSub, entitlement: ent });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to extend trial' });
  }
};

exports.manageSubscriptionLifecycle = async (req, res) => {
  try {
    const sub = await LandlordSubscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Subscription record not found' });

    const { action = 'activate', reason = 'Super Admin lifecycle action', planCode, billingCycle, purchasedUnits, expiryDate } = req.body || {};
    const prevState = { status: sub.status, planCode: sub.planCode, purchasedUnits: sub.purchasedUnits, expiryDate: sub.expiryDate };

    const ent = await UnitEntitlement.findOne({ landlordId: sub.landlordId });

    if (action === 'suspend') {
      sub.status = 'suspended';
      sub.suspensionReason = reason;
      if (ent) ent.status = 'suspended';
    } else if (action === 'cancel') {
      sub.status = 'cancelled';
      sub.cancelledAt = new Date();
      sub.autoRenew = false;
      if (ent) ent.status = 'cancelled';
    } else if (action === 'reactivate' || action === 'activate') {
      sub.status = 'active';
      sub.suspensionReason = '';
      if (expiryDate) {
        sub.expiryDate = new Date(expiryDate);
      } else if (!sub.expiryDate || new Date(sub.expiryDate) < new Date()) {
        sub.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      if (ent) {
        ent.status = 'active';
        ent.expiresAt = sub.expiryDate;
      }
    }

    if (planCode) {
      const targetPlan = await SubscriptionPlan.findOne({ code: String(planCode).toLowerCase() }).lean();
      if (!targetPlan) return res.status(404).json({ message: 'Target subscription plan not found' });
      sub.planId = targetPlan._id;
      sub.planCode = targetPlan.code;
      sub.planName = targetPlan.name;
      sub.maxPlanUnits = targetPlan.maxUnits || sub.maxPlanUnits;
      sub.isCustomUnlimited = Boolean(targetPlan.isCustomUnlimited);
      if (ent) {
        ent.planCode = targetPlan.code;
        ent.planName = targetPlan.name;
        ent.isUnlimited = Boolean(targetPlan.isCustomUnlimited);
        if (!targetPlan.isCustomUnlimited) {
          ent.purchasedLimit = Number(purchasedUnits || targetPlan.maxUnits || ent.purchasedLimit);
        }
      }
      await User.findByIdAndUpdate(sub.landlordId, { subscriptionTier: targetPlan.code });
    }

    if (billingCycle && ['monthly', 'quarterly', 'semi_annual', 'annual'].includes(billingCycle)) {
      sub.billingCycle = billingCycle;
    }
    if (purchasedUnits !== undefined && purchasedUnits !== '') {
      const unitsNum = Math.max(1, Number(purchasedUnits));
      sub.purchasedUnits = unitsNum;
      if (ent) ent.purchasedLimit = unitsNum;
    }

    sub.updatedAt = new Date();
    await sub.save();
    if (ent) {
      ent.subscriptionId = sub._id;
      ent.updatedAt = new Date();
      await ent.save();
    }

    const lifecycleActionMap = {
      activate: 'subscription_activated',
      reactivate: 'subscription_reactivated',
      suspend: 'subscription_suspended',
      cancel: 'subscription_cancelled',
      change_plan: 'subscription_upgraded'
    };

    await logSubscriptionAudit({
      landlordId: sub.landlordId,
      subscriptionId: sub._id,
      actorId: req.user._id,
      actorRole: 'superadmin',
      action: lifecycleActionMap[action] || 'subscription_activated',
      previousState: prevState,
      newState: { status: sub.status, planCode: sub.planCode, purchasedUnits: sub.purchasedUnits, expiryDate: sub.expiryDate },
      reason
    });
    await logAdminAction({
      req,
      action: `SUBSCRIPTION_LIFECYCLE_${String(action).toUpperCase()}`,
      category: 'subscription',
      targetType: 'LandlordSubscription',
      targetId: String(sub._id),
      details: `Subscription lifecycle (${action}) for landlord ${sub.landlordId}: plan=${sub.planCode}, status=${sub.status}. Reason: ${reason}`,
      previousState: prevState,
      newState: { status: sub.status, planCode: sub.planCode, expiryDate: sub.expiryDate }
    });

    res.json({ success: true, subscription: sub, entitlement: ent });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Lifecycle update failed' });
  }
};
