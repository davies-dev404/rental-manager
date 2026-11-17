const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const SubscriptionAuditLog = require('../models/SubscriptionAuditLog');
const Unit = require('../models/Unit');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const { getEmailTemplate } = require('../utils/emailTemplates');
const BUSINESS_CONFIG = require('../config/businessConfig');

const INITIAL_PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    badge: 'Solo Landlords',
    description: 'Essential tools for individual landlords managing small residential plots.',
    maxUnits: 5,
    minUnits: 1,
    isCustomUnlimited: false,
    currency: 'KES',
    pricing: { monthly: 1500, quarterly: 4200, semi_annual: 8000, annual: 14400 },
    pricePerAdditionalUnit: 300,
    trialDays: 14,
    gracePeriodDays: 7,
    features: [
      'Up to 5 rental units',
      'Pesaflow M-Pesa, Paybill & Card collection',
      'Automated tenant email & SMS notifications',
      'Official PDF payment receipts & invoices',
      'KRA tax compliance exports'
    ],
    isPopular: false,
    sortOrder: 1
  },
  {
    code: 'basic',
    name: 'Basic',
    badge: 'Small Plots',
    description: 'Built for landlords growing into multi-unit residential apartments.',
    maxUnits: 10,
    minUnits: 1,
    isCustomUnlimited: false,
    currency: 'KES',
    pricing: { monthly: 2500, quarterly: 7000, semi_annual: 13500, annual: 24000 },
    pricePerAdditionalUnit: 250,
    trialDays: 14,
    gracePeriodDays: 7,
    features: [
      'Up to 10 rental units',
      'Everything in Starter',
      'Water & electricity sub-meter billing',
      'Automated late payment penalties',
      'Statement reconciliation & arrears tracking'
    ],
    isPopular: false,
    sortOrder: 2
  },
  {
    code: 'growth',
    name: 'Growth',
    badge: 'Most Popular',
    description: 'Ideal for growing property managers scaling across multiple residential blocks.',
    maxUnits: 25,
    minUnits: 1,
    isCustomUnlimited: false,
    currency: 'KES',
    pricing: { monthly: 4500, quarterly: 12500, semi_annual: 24000, annual: 43200 },
    pricePerAdditionalUnit: 200,
    trialDays: 14,
    gracePeriodDays: 7,
    features: [
      'Up to 25 rental units',
      'Everything in Basic',
      'Bulk invoicing & automated reminders',
      'Bank transfer & USSD reconciliation',
      'Priority Kenyan support desk'
    ],
    isPopular: true,
    sortOrder: 3
  },
  {
    code: 'professional',
    name: 'Professional',
    badge: 'Property Agencies',
    description: 'Advanced real estate operations for busy agencies and estates.',
    maxUnits: 50,
    minUnits: 1,
    isCustomUnlimited: false,
    currency: 'KES',
    pricing: { monthly: 7000, quarterly: 19500, semi_annual: 37500, annual: 67200 },
    pricePerAdditionalUnit: 175,
    trialDays: 14,
    gracePeriodDays: 7,
    features: [
      'Up to 50 rental units',
      'Everything in Growth',
      'KRA eTIMS OSCU/VSCU tax submission tracking',
      'Caretaker & accountant multi-user access',
      'Owner statements & P&L analytics'
    ],
    isPopular: false,
    sortOrder: 4
  },
  {
    code: 'business',
    name: 'Business',
    badge: 'Large Portfolios',
    description: 'High-volume automation for established property management firms.',
    maxUnits: 100,
    minUnits: 1,
    isCustomUnlimited: false,
    currency: 'KES',
    pricing: { monthly: 12000, quarterly: 33500, semi_annual: 64500, annual: 115200 },
    pricePerAdditionalUnit: 150,
    trialDays: 14,
    gracePeriodDays: 10,
    features: [
      'Up to 100 rental units',
      'Everything in Professional',
      'Multi-bank reconciliation adapters',
      'Dedicated onboarding specialist',
      'Full financial audit logs'
    ],
    isPopular: false,
    sortOrder: 5
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    badge: 'Custom Scale',
    description: 'Custom-licensed infrastructure for institutional landlords, SACCOs, and REITs.',
    maxUnits: 100000,
    minUnits: 101,
    isCustomUnlimited: true,
    currency: 'KES',
    pricing: { monthly: 20000, quarterly: 56000, semi_annual: 108000, annual: 192000 },
    pricePerAdditionalUnit: 120,
    trialDays: 14,
    gracePeriodDays: 14,
    features: [
      'Custom / Unlimited rental units',
      'Dedicated eTIMS VSCU/OSCU advisory',
      'Custom bank & ERP webhooks',
      'SLA & 99.9% uptime guarantee',
      '24/7 Account Manager'
    ],
    isPopular: false,
    sortOrder: 6
  }
];

async function seedDefaultPlans() {
  for (const plan of INITIAL_PLANS) {
    await SubscriptionPlan.findOneAndUpdate(
      { code: plan.code },
      { $setOnInsert: plan },
      { upsert: true, new: true }
    );
  }
  return await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
}

function getBillingMonths(billingCycle) {
  switch (billingCycle) {
    case 'quarterly': return 3;
    case 'semi_annual': return 6;
    case 'annual': return 12;
    case 'monthly':
    default: return 1;
  }
}

function addBillingDuration(startDate, billingCycle) {
  const date = new Date(startDate);
  const months = getBillingMonths(billingCycle);
  date.setMonth(date.getMonth() + months);
  return date;
}

function calculateSubscriptionPrice(plan, desiredUnits, billingCycle = 'monthly', promoCode = '') {
  const cycleKey = ['monthly', 'quarterly', 'semi_annual', 'annual'].includes(billingCycle) ? billingCycle : 'monthly';
  const baseAmount = Number(plan.pricing?.[cycleKey] || plan.pricing?.monthly || 0);
  const months = getBillingMonths(cycleKey);

  // If enterprise/custom plan and desiredUnits exceeds 100 and pricePerAdditionalUnit > 0
  let calculatedBase = baseAmount;
  const requestedUnits = Number(desiredUnits || plan.maxUnits || 5);
  if (plan.isCustomUnlimited && requestedUnits > 100 && Number(plan.pricePerAdditionalUnit) > 0) {
    calculatedBase = baseAmount + ((requestedUnits - 100) * Number(plan.pricePerAdditionalUnit) * months);
  }

  let discountApplied = 0;
  const now = new Date();
  const isPromoValid = (!plan.promoValidUntil || new Date(plan.promoValidUntil) >= now);
  if (plan.discountPercent > 0 && isPromoValid) {
    if (!plan.promoCode || !promoCode || plan.promoCode.toLowerCase() === promoCode.toLowerCase()) {
      discountApplied = Math.round((calculatedBase * plan.discountPercent) / 100);
    }
  }

  const finalAmount = Math.max(0, calculatedBase - discountApplied);
  return {
    baseAmount: calculatedBase,
    discountApplied,
    finalAmount,
    currency: plan.currency || 'KES',
    billingCycle: cycleKey,
    months
  };
}

async function logSubscriptionAudit({ landlordId, subscriptionId, actorId, actorRole = 'system', action, previousState = {}, newState = {}, reason = '' }) {
  try {
    await SubscriptionAuditLog.create({
      landlordId,
      subscriptionId,
      actorId,
      actorRole,
      action,
      previousState,
      newState,
      reason
    });
  } catch (err) {
    console.error('SubscriptionAuditLog error:', err.message);
  }
}

async function notifyLandlordSubscriptionEvent({ user, subject, title, bodyHtml, smsText }) {
  if (!user) return;
  try {
    if (user.email) {
      await sendEmail({
        email: user.email,
        subject,
        message: getEmailTemplate(title, bodyHtml, { orgName: BUSINESS_CONFIG.name, orgEmail: BUSINESS_CONFIG.email, orgPhone: BUSINESS_CONFIG.phone })
      });
    }
  } catch (err) {
    console.warn('Subscription email warning:', err.message);
  }
  try {
    if (user.phone && smsText) {
      await sendSMS({ phone: user.phone, message: smsText });
    }
  } catch (err) {
    console.warn('Subscription SMS warning:', err.message);
  }
}

/**
 * Ensures a UnitEntitlement and initial trial subscription exist for a landlord.
 * Preserves any existing legacy units without deleting data.
 */
async function ensureLandlordEntitlement(landlordId, { resyncCount = false } = {}) {
  let entitlement = await UnitEntitlement.findOne({ landlordId });

  if (!entitlement) {
    const actualUnits = await Unit.countDocuments({ user: landlordId });
    await seedDefaultPlans();
    const starterPlan = await SubscriptionPlan.findOne({ code: 'starter' });
    const user = await User.findById(landlordId);
    const now = new Date();
    const trialDays = starterPlan?.trialDays || 14;
    const expiryDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const graceDays = starterPlan?.gracePeriodDays || 7;
    const graceEndDate = new Date(expiryDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

    let subscription = await LandlordSubscription.findOne({
      landlordId,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).sort({ createdAt: -1 });

    if (!subscription && starterPlan) {
      subscription = await LandlordSubscription.create({
        landlordId,
        planId: starterPlan._id,
        planCode: starterPlan.code,
        planName: starterPlan.name,
        billingCycle: 'monthly',
        purchasedUnits: starterPlan.maxUnits,
        maxPlanUnits: starterPlan.maxUnits,
        isCustomUnlimited: false,
        baseAmount: 0,
        priceAmount: 0,
        currency: 'KES',
        status: 'trial',
        startDate: now,
        expiryDate,
        renewalDate: expiryDate,
        graceEndDate
      });
      if (user) {
        user.activeSubscriptionId = subscription._id;
        user.subscriptionTier = starterPlan.code;
        await user.save();
      }
    }

    const limit = subscription ? subscription.purchasedUnits : 5;
    try {
      entitlement = await UnitEntitlement.findOneAndUpdate(
        { landlordId },
        {
          $setOnInsert: {
            landlordId,
            subscriptionId: subscription?._id,
            planCode: subscription?.planCode || 'starter',
            planName: subscription?.planName || 'Starter Trial',
            purchasedLimit: limit,
            isUnlimited: Boolean(subscription?.isCustomUnlimited),
            activeUnitCount: actualUnits,
            status: subscription?.status || 'trial',
            expiresAt: subscription?.expiryDate || expiryDate,
            graceEndsAt: subscription?.graceEndDate || graceEndDate
          }
        },
        { upsert: true, new: true }
      );
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        entitlement = await UnitEntitlement.findOne({ landlordId });
      } else {
        throw dupErr;
      }
    }
  } else if (resyncCount) {
    const actualUnits = await Unit.countDocuments({ user: landlordId });
    if (entitlement.activeUnitCount !== actualUnits) {
      entitlement = await UnitEntitlement.findOneAndUpdate(
        { _id: entitlement._id },
        { $set: { activeUnitCount: actualUnits, updatedAt: new Date() } },
        { new: true }
      );
    }
  }

  return entitlement;
}

/**
 * Atomic, concurrency-safe unit slot reservation before Unit.create().
 * Throws structured error with HTTP 403 and exact limit message when exceeded.
 */
async function reserveUnitSlot(landlordId) {
  const entitlement = await ensureLandlordEntitlement(landlordId);

  if (['expired', 'suspended'].includes(entitlement.status)) {
    const err = new Error(
      `Your subscription is currently ${entitlement.status}. Please renew or reactivate your subscription to add rental units.`
    );
    err.statusCode = 403;
    err.code = 'SUBSCRIPTION_INACTIVE';
    throw err;
  }

  // Check expiry against current clock cleanly
  const now = new Date();
  if (entitlement.graceEndsAt && now > new Date(entitlement.graceEndsAt)) {
    await UnitEntitlement.findByIdAndUpdate(entitlement._id, { status: 'expired', updatedAt: now });
    if (entitlement.subscriptionId) {
      await LandlordSubscription.findByIdAndUpdate(entitlement.subscriptionId, { status: 'expired', updatedAt: now });
    }
    const err = new Error(
      'Your subscription and grace period have expired. Renew your subscription to add more rental units.'
    );
    err.statusCode = 403;
    err.code = 'SUBSCRIPTION_EXPIRED';
    throw err;
  }

  // Atomic check-and-increment: guarantees concurrent requests cannot create an (N+1)th unit!
  const filter = entitlement.isUnlimited
    ? { landlordId, status: { $in: ['active', 'trial', 'grace_period'] } }
    : {
        landlordId,
        status: { $in: ['active', 'trial', 'grace_period'] },
        $expr: { $lt: ['$activeUnitCount', '$purchasedLimit'] }
      };

  const updated = await UnitEntitlement.findOneAndUpdate(
    filter,
    { $inc: { activeUnitCount: 1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );

  if (!updated) {
    const latest = await UnitEntitlement.findOne({ landlordId });
    const limit = latest?.purchasedLimit || 5;
    await logSubscriptionAudit({
      landlordId,
      subscriptionId: latest?.subscriptionId,
      actorId: landlordId,
      actorRole: 'landlord',
      action: 'unit_limit_blocked',
      previousState: { activeUnitCount: latest?.activeUnitCount, purchasedLimit: limit },
      newState: { attemptedUnits: (latest?.activeUnitCount || 0) + 1 },
      reason: `Blocked attempt to exceed limit of ${limit} rental units.`
    });

    const err = new Error(
      `You have reached your current subscription limit of ${limit} rental units. Upgrade your subscription to add more units.`
    );
    err.statusCode = 403;
    err.code = 'UNIT_LIMIT_REACHED';
    err.limit = limit;
    err.activeUnitCount = latest?.activeUnitCount || limit;
    throw err;
  }

  // Fire limit-warning / limit-reached notifications asynchronously if crossing thresholds
  if (!updated.isUnlimited && updated.subscriptionId) {
    checkAndSendUnitThresholdAlerts(landlordId, updated).catch(() => {});
  }

  return updated;
}

async function releaseUnitSlot(landlordId) {
  try {
    const ent = await UnitEntitlement.findOneAndUpdate(
      { landlordId, activeUnitCount: { $gt: 0 } },
      { $inc: { activeUnitCount: -1 }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!ent) return null;
    if (ent.status === 'restricted' && (ent.isUnlimited || ent.activeUnitCount <= ent.purchasedLimit)) {
      return await UnitEntitlement.findOneAndUpdate(
        { _id: ent._id },
        { $set: { status: 'active', updatedAt: new Date() } },
        { new: true }
      );
    }
    return ent;
  } catch (err) {
    console.warn('releaseUnitSlot warning:', err.message);
    return null;
  }
}

async function checkAndSendUnitThresholdAlerts(landlordId, entitlement) {
  const sub = await LandlordSubscription.findById(entitlement.subscriptionId);
  if (!sub || entitlement.isUnlimited || entitlement.purchasedLimit <= 0) return;

  const ratio = entitlement.activeUnitCount / entitlement.purchasedLimit;
  const user = await User.findById(landlordId);
  if (!user) return;

  if (ratio >= 1 && !sub.notificationsSent?.limitReached100) {
    sub.notificationsSent.limitReached100 = true;
    await sub.save();
    await logSubscriptionAudit({
      landlordId,
      subscriptionId: sub._id,
      action: 'unit_limit_reached',
      newState: { activeUnitCount: entitlement.activeUnitCount, purchasedLimit: entitlement.purchasedLimit }
    });
    await notifyLandlordSubscriptionEvent({
      user,
      subject: `MakaziFlow: Unit Limit Reached (${entitlement.purchasedLimit} Units)`,
      title: 'Rental Unit Limit Reached',
      bodyHtml: `<p>Dear ${user.name},</p><p>You have registered <strong>${entitlement.activeUnitCount}</strong> out of your purchased allowance of <strong>${entitlement.purchasedLimit} units</strong> on the <strong>${sub.planName} Plan</strong>.</p><p>Upgrade your subscription from your Billing Dashboard to unlock additional unit capacity.</p>`,
      smsText: `MakaziFlow: You have reached your subscription limit of ${entitlement.purchasedLimit} rental units (${sub.planName}). Upgrade via Billing to add more units.`
    });
  } else if (ratio >= 0.8 && ratio < 1 && !sub.notificationsSent?.limitNear80) {
    sub.notificationsSent.limitNear80 = true;
    await sub.save();
    await notifyLandlordSubscriptionEvent({
      user,
      subject: `MakaziFlow: Approaching Unit Limit (${entitlement.activeUnitCount}/${entitlement.purchasedLimit})`,
      title: 'Unit Allowance Nearly Full',
      bodyHtml: `<p>Dear ${user.name},</p><p>You are currently using <strong>${entitlement.activeUnitCount} of ${entitlement.purchasedLimit}</strong> unit slots (${Math.round(ratio * 100)}%). Consider upgrading before adding your next property block.</p>`,
      smsText: `MakaziFlow Notice: You have used ${entitlement.activeUnitCount}/${entitlement.purchasedLimit} rental unit slots. Upgrade anytime in Billing.`
    });
  }
}

/**
 * Activate or Upgrade/Renew a LandlordSubscription ONLY after backend payment verification.
 */
async function activatePaidSubscription({ subscriptionId, paymentTransaction, actorId = null }) {
  const sub = await LandlordSubscription.findById(subscriptionId);
  if (!sub) throw new Error('Subscription record not found');

  const plan = await SubscriptionPlan.findById(sub.planId) || await SubscriptionPlan.findOne({ code: sub.planCode });
  const graceDays = plan?.gracePeriodDays ?? 7;

  // Idempotency guard: if this exact transaction already activated this subscription, return without double-extending!
  if (
    sub.status === 'active' &&
    sub.lastPaymentTransactionId &&
    String(sub.lastPaymentTransactionId) === String(paymentTransaction._id)
  ) {
    const ent = await UnitEntitlement.findOne({ landlordId: sub.landlordId });
    return { subscription: sub, entitlement: ent, alreadyActivated: true };
  }

  const now = new Date();
  // Check if renewing an active future-dated subscription vs fresh activation/upgrade
  const isRenewalExtension =
    paymentTransaction.paymentCategory === 'subscription_renewal' &&
    sub.expiryDate &&
    new Date(sub.expiryDate) > now;

  const baseDate = isRenewalExtension ? new Date(sub.expiryDate) : now;
  const newExpiry = addBillingDuration(baseDate, sub.billingCycle);
  const newGraceEnd = new Date(newExpiry.getTime() + graceDays * 24 * 60 * 60 * 1000);

  // Deactivate prior active/trial subscriptions for this landlord so only 1 active subscription exists
  await LandlordSubscription.updateMany(
    {
      landlordId: sub.landlordId,
      _id: { $ne: sub._id },
      status: { $in: ['active', 'trial', 'grace_period'] }
    },
    { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } }
  );

  const previousState = { status: sub.status, purchasedUnits: sub.purchasedUnits, expiryDate: sub.expiryDate };

  sub.status = 'active';
  if (!sub.startDate || !isRenewalExtension) sub.startDate = now;
  sub.expiryDate = newExpiry;
  sub.renewalDate = newExpiry;
  sub.graceEndDate = newGraceEnd;
  sub.lastPaymentTransactionId = paymentTransaction._id;
  sub.notificationsSent = {
    preExpiry7d: false,
    preExpiry1d: false,
    expired: false,
    limitNear80: false,
    limitReached100: false
  };
  sub.updatedAt = now;
  await sub.save();

  const actualUnits = await Unit.countDocuments({ user: sub.landlordId });
  const entitlementStatus = (!sub.isCustomUnlimited && actualUnits > sub.purchasedUnits)
    ? 'restricted' // Downgrade / smaller limit preserves all existing units cleanly while preventing new ones
    : 'active';

  const entitlement = await UnitEntitlement.findOneAndUpdate(
    { landlordId: sub.landlordId },
    {
      $set: {
        subscriptionId: sub._id,
        planCode: sub.planCode,
        planName: sub.planName,
        purchasedLimit: sub.purchasedUnits,
        isUnlimited: Boolean(sub.isCustomUnlimited),
        activeUnitCount: actualUnits,
        status: entitlementStatus,
        expiresAt: newExpiry,
        graceEndsAt: newGraceEnd,
        updatedAt: now
      }
    },
    { upsert: true, new: true }
  );

  await User.findByIdAndUpdate(sub.landlordId, {
    activeSubscriptionId: sub._id,
    subscriptionTier: sub.planCode
  });

  await logSubscriptionAudit({
    landlordId: sub.landlordId,
    subscriptionId: sub._id,
    actorId: actorId || sub.landlordId,
    actorRole: actorId ? 'admin' : 'system',
    action: isRenewalExtension ? 'subscription_renewed' : 'subscription_activated',
    previousState,
    newState: {
      status: sub.status,
      planCode: sub.planCode,
      purchasedUnits: sub.purchasedUnits,
      expiryDate: newExpiry,
      transactionRef: paymentTransaction.providerReference || paymentTransaction.internalTransactionId
    }
  });

  const user = await User.findById(sub.landlordId);
  await notifyLandlordSubscriptionEvent({
    user,
    subject: `MakaziFlow Subscription Activated — ${sub.planName} (${sub.purchasedUnits} Units)`,
    title: 'Subscription Activated',
    bodyHtml: `
      <p>Dear ${user?.name || 'Landlord'},</p>
      <p>Your payment of <strong>KES ${Number(paymentTransaction.amountPaid || paymentTransaction.amount).toLocaleString()}</strong> (Ref: <strong>${paymentTransaction.providerReference || paymentTransaction.internalTransactionId}</strong>) has been verified.</p>
      <p>Your <strong>${sub.planName}</strong> subscription covering <strong>${sub.isCustomUnlimited ? 'Custom / Unlimited' : sub.purchasedUnits} rental units</strong> is now <strong>ACTIVE</strong> until <strong>${newExpiry.toLocaleDateString('en-KE')}</strong>.</p>
    `,
    smsText: `MakaziFlow: Your ${sub.planName} subscription (${sub.purchasedUnits} units) is active until ${newExpiry.toLocaleDateString('en-KE')}. Ref: ${paymentTransaction.providerReference || paymentTransaction.internalTransactionId}.`
  });

  return { subscription: sub, entitlement, alreadyActivated: false };
}

/**
 * Automated Subscription Expiry, Pre-Expiry Warning & Grace Period Sweep
 */
async function processSubscriptionExpirations() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const subs = await LandlordSubscription.find({
    status: { $in: ['active', 'trial', 'grace_period'] }
  });

  let warningsSent = 0;
  let movedToGrace = 0;
  let expiredCount = 0;

  for (const sub of subs) {
    const user = await User.findById(sub.landlordId);
    const exp = sub.expiryDate ? new Date(sub.expiryDate) : null;
    const graceEnd = sub.graceEndDate ? new Date(sub.graceEndDate) : exp;

    if (!exp) continue;

    // 1. Pre-expiry 7-day notification
    if (sub.status !== 'grace_period' && exp > now && exp <= in7Days && !sub.notificationsSent?.preExpiry7d) {
      sub.notificationsSent.preExpiry7d = true;
      await sub.save();
      warningsSent++;
      await notifyLandlordSubscriptionEvent({
        user,
        subject: `MakaziFlow Renewal Notice: ${sub.planName} expires on ${exp.toLocaleDateString('en-KE')}`,
        title: 'Upcoming Subscription Renewal',
        bodyHtml: `<p>Dear ${user?.name || 'Landlord'},</p><p>Your <strong>${sub.planName}</strong> subscription (${sub.purchasedUnits} units) expires on <strong>${exp.toLocaleDateString('en-KE')}</strong>. Please renew early to avoid disruption.</p>`,
        smsText: `MakaziFlow: Your ${sub.planName} plan expires on ${exp.toLocaleDateString('en-KE')}. Renew in Billing to keep adding units.`
      });
    }

    // 2. Move expired active/trial into grace_period
    if (['active', 'trial'].includes(sub.status) && now > exp && graceEnd && now <= graceEnd) {
      sub.status = 'grace_period';
      await sub.save();
      await UnitEntitlement.findOneAndUpdate(
        { landlordId: sub.landlordId },
        { $set: { status: 'grace_period', updatedAt: now } }
      );
      movedToGrace++;
      await logSubscriptionAudit({
        landlordId: sub.landlordId,
        subscriptionId: sub._id,
        action: 'grace_period_entered',
        newState: { status: 'grace_period', graceEndDate: graceEnd }
      });
    }

    // 3. Expire after graceEndDate
    if (graceEnd && now > graceEnd) {
      sub.status = 'expired';
      if (!sub.notificationsSent?.expired) {
        sub.notificationsSent.expired = true;
      }
      await sub.save();
      await UnitEntitlement.findOneAndUpdate(
        { landlordId: sub.landlordId },
        { $set: { status: 'expired', updatedAt: now } }
      );
      expiredCount++;
      await logSubscriptionAudit({
        landlordId: sub.landlordId,
        subscriptionId: sub._id,
        action: 'subscription_expired',
        newState: { status: 'expired' }
      });
      await notifyLandlordSubscriptionEvent({
        user,
        subject: `MakaziFlow Subscription Expired — Renew ${sub.planName}`,
        title: 'Subscription Expired',
        bodyHtml: `<p>Dear ${user?.name || 'Landlord'},</p><p>Your <strong>${sub.planName}</strong> subscription has expired. Existing property & tenant records remain safe, but adding new rental units is paused until renewal.</p>`,
        smsText: `MakaziFlow: Your ${sub.planName} subscription has expired. Existing records remain preserved; renew in Billing to resume adding units.`
      });
    }
  }

  return { warningsSent, movedToGrace, expiredCount };
}

module.exports = {
  INITIAL_PLANS,
  seedDefaultPlans,
  getBillingMonths,
  addBillingDuration,
  calculateSubscriptionPrice,
  ensureLandlordEntitlement,
  reserveUnitSlot,
  releaseUnitSlot,
  activatePaidSubscription,
  processSubscriptionExpirations,
  logSubscriptionAudit,
  notifyLandlordSubscriptionEvent
};
