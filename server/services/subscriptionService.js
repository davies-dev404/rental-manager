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
      'IntaSend M-Pesa, Visa & Mastercard collection',
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
      { upsert: true, returnDocument: 'after' }
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
  const commMeta = {
    category: 'subscription',
    userId: user._id,
    recipientName: user.name || '',
    recipientType: 'team',
    title: subject
  };
  try {
    if (user.email) {
      await sendEmail({
        email: user.email,
        toName: user.name || undefined,
        subject,
        message: getEmailTemplate(title, bodyHtml, { orgName: BUSINESS_CONFIG.name, orgEmail: BUSINESS_CONFIG.email, orgPhone: BUSINESS_CONFIG.phone }),
        commMeta
      });
    }
  } catch (err) {
    console.warn('Subscription email warning:', err.message);
  }
  try {
    if (user.phone && smsText) {
      await sendSMS({ phone: user.phone, message: smsText, commMeta });
    }
  } catch (err) {
    console.warn('Subscription SMS warning:', err.message);
  }
}

function getTodayDateKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

async function resolvePlanBySelection(unitsCount, subscriptionTier = '') {
  await seedDefaultPlans();
  const count = Number(unitsCount) || 0;
  const tierLower = String(subscriptionTier || '').toLowerCase();

  let targetCode = '';
  if (count > 0) {
    if (count <= 5) targetCode = 'starter';
    else if (count <= 10) targetCode = 'basic';
    else if (count <= 25) targetCode = 'growth';
    else if (count <= 50) targetCode = 'professional';
    else if (count <= 100) targetCode = 'business';
    else targetCode = 'enterprise';
  } else if (tierLower) {
    for (const c of ['enterprise', 'business', 'professional', 'growth', 'basic', 'starter']) {
      if (tierLower.includes(c)) {
        targetCode = c;
        break;
      }
    }
  }

  const plan = await SubscriptionPlan.findOne({ code: targetCode || 'starter', isActive: true })
    || await SubscriptionPlan.findOne({ isActive: true }).sort({ sortOrder: 1 });
  return plan;
}

/**
 * Syncs onboarding plan & unit selection into LandlordSubscription + UnitEntitlement
 * on a 14-day free trial (never overwrites an already paid active subscription).
 */
async function syncTrialFromOnboarding(landlordId, { unitsCount, subscriptionTier, mode } = {}) {
  const existingPaid = await LandlordSubscription.findOne({
    landlordId,
    status: 'active'
  }).sort({ createdAt: -1 });
  if (existingPaid) {
    return await ensureLandlordEntitlement(landlordId, { resyncCount: true });
  }

  const user = await User.findById(landlordId);
  const plan = await resolvePlanBySelection(unitsCount ?? user?.unitsCount, subscriptionTier ?? user?.subscriptionTier);
  if (!plan) return null;

  const chosenCount = Number(unitsCount ?? user?.unitsCount ?? 0);
  const desiredLimit = plan.isCustomUnlimited
    ? Math.max(101, chosenCount || 150)
    : Math.max(1, Math.min(plan.maxUnits, chosenCount > 0 ? chosenCount : plan.maxUnits));

  const actualUnits = await Unit.countDocuments({ user: landlordId });
  const now = new Date();
  const baseStart = user?.createdAt ? new Date(user.createdAt) : now;
  const validStart = isNaN(baseStart.getTime()) ? now : baseStart;
  const trialDays = plan.trialDays || 14;
  const expiryDate = new Date(validStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const isTrialExpired = now >= expiryDate;

  let trialSub = await LandlordSubscription.findOne({
    landlordId,
    status: { $in: ['trial', 'grace_period', 'expired'] }
  }).sort({ createdAt: -1 });

  if (!trialSub) {
    trialSub = await LandlordSubscription.create({
      landlordId,
      planId: plan._id,
      planCode: plan.code,
      planName: plan.name,
      billingCycle: 'monthly',
      purchasedUnits: desiredLimit,
      maxPlanUnits: plan.maxUnits,
      isCustomUnlimited: Boolean(plan.isCustomUnlimited),
      baseAmount: plan.pricing?.monthly || 0,
      priceAmount: 0,
      currency: 'KES',
      status: isTrialExpired ? 'expired' : 'trial',
      startDate: validStart,
      expiryDate,
      renewalDate: expiryDate,
      graceEndDate: expiryDate
    });
  } else if (trialSub.status === 'trial' || !trialSub.lastPaymentTransactionId) {
    trialSub.planId = plan._id;
    trialSub.planCode = plan.code;
    trialSub.planName = plan.name;
    trialSub.purchasedUnits = desiredLimit;
    trialSub.maxPlanUnits = plan.maxUnits;
    trialSub.isCustomUnlimited = Boolean(plan.isCustomUnlimited);
    trialSub.baseAmount = plan.pricing?.monthly || 0;
    trialSub.startDate = trialSub.startDate || validStart;
    trialSub.expiryDate = trialSub.expiryDate || expiryDate;
    trialSub.renewalDate = trialSub.expiryDate;
    trialSub.graceEndDate = trialSub.expiryDate;
    if (now >= new Date(trialSub.expiryDate)) {
      trialSub.status = 'expired';
    }
    trialSub.updatedAt = now;
    await trialSub.save();
  }

  const finalStatus = trialSub.status === 'expired' ? 'expired' : 'trial';
  const entitlement = await UnitEntitlement.findOneAndUpdate(
    { landlordId },
    {
      $set: {
        subscriptionId: trialSub._id,
        planCode: trialSub.planCode,
        planName: trialSub.planName,
        purchasedLimit: trialSub.purchasedUnits,
        isUnlimited: Boolean(trialSub.isCustomUnlimited),
        activeUnitCount: actualUnits,
        status: finalStatus,
        expiresAt: trialSub.expiryDate,
        graceEndsAt: trialSub.expiryDate,
        updatedAt: now
      }
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (user) {
    user.activeSubscriptionId = trialSub._id;
    user.subscriptionTier = trialSub.planCode;
    if (chosenCount > 0) user.unitsCount = chosenCount;
    await user.save();
  }

  return entitlement;
}

/**
 * Ensures a UnitEntitlement and initial trial subscription exist for a landlord.
 * Preserves any existing legacy units without deleting data.
 */
async function ensureLandlordEntitlement(landlordId, { resyncCount = false } = {}) {
  let entitlement = await UnitEntitlement.findOne({ landlordId });

  if (!entitlement) {
    const actualUnits = await Unit.countDocuments({ user: landlordId });
    const user = await User.findById(landlordId);
    const plan = await resolvePlanBySelection(user?.unitsCount, user?.subscriptionTier);
    const now = new Date();
    const startBase = user?.createdAt ? new Date(user.createdAt) : now;
    const validStart = isNaN(startBase.getTime()) ? now : startBase;
    const trialDays = plan?.trialDays || 14;
    const expiryDate = new Date(validStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const chosenUnits = Number(user?.unitsCount || 0);
    const desiredUnits = plan?.isCustomUnlimited
      ? Math.max(101, chosenUnits || 150)
      : Math.min(plan?.maxUnits || 5, chosenUnits > 0 ? chosenUnits : (plan?.maxUnits || 5));

    let subscription = await LandlordSubscription.findOne({
      landlordId,
      status: { $in: ['active', 'trial', 'grace_period', 'expired'] }
    }).sort({ createdAt: -1 });

    if (!subscription && plan) {
      subscription = await LandlordSubscription.create({
        landlordId,
        planId: plan._id,
        planCode: plan.code,
        planName: plan.name,
        billingCycle: 'monthly',
        purchasedUnits: desiredUnits,
        maxPlanUnits: plan.maxUnits,
        isCustomUnlimited: Boolean(plan.isCustomUnlimited),
        baseAmount: plan.pricing?.monthly || 0,
        priceAmount: 0,
        currency: 'KES',
        status: now >= expiryDate ? 'expired' : 'trial',
        startDate: validStart,
        expiryDate,
        renewalDate: expiryDate,
        graceEndDate: expiryDate
      });
      if (user) {
        user.activeSubscriptionId = subscription._id;
        user.subscriptionTier = plan.code;
        await user.save();
      }
    }

    const limit = subscription ? subscription.purchasedUnits : desiredUnits;
    try {
      entitlement = await UnitEntitlement.findOneAndUpdate(
        { landlordId },
        {
          $setOnInsert: {
            landlordId,
            subscriptionId: subscription?._id,
            planCode: subscription?.planCode || plan?.code || 'starter',
            planName: subscription?.planName || plan?.name || 'Starter',
            purchasedLimit: limit,
            isUnlimited: Boolean(subscription?.isCustomUnlimited),
            activeUnitCount: actualUnits,
            status: subscription?.status || (now >= expiryDate ? 'expired' : 'trial'),
            expiresAt: subscription?.expiryDate || expiryDate,
            graceEndsAt: subscription?.graceEndDate || expiryDate
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        entitlement = await UnitEntitlement.findOne({ landlordId });
      } else {
        throw dupErr;
      }
    }
  } else {
    const actualUnits = resyncCount ? await Unit.countDocuments({ user: landlordId }) : entitlement.activeUnitCount;
    const now = new Date();
    const updates = {};

    if (resyncCount && entitlement.activeUnitCount !== actualUnits) {
      updates.activeUnitCount = actualUnits;
    }

    // Lock unpaid trial immediately at the end of its 14-day period
    if (entitlement.status === 'trial' && entitlement.expiresAt && now >= new Date(entitlement.expiresAt)) {
      updates.status = 'expired';
      if (entitlement.subscriptionId) {
        await LandlordSubscription.findOneAndUpdate(
          { _id: entitlement.subscriptionId, status: 'trial' },
          { $set: { status: 'expired', updatedAt: now } }
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      entitlement = await UnitEntitlement.findOneAndUpdate(
        { _id: entitlement._id },
        { $set: updates },
        { returnDocument: 'after' }
      );
    }
  }

  return entitlement;
}

async function getSubscriptionLockState(landlordId, user = null, { resyncCount = false } = {}) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'superadmin' || role === 'tenant' || user?.isSuperAdmin === true) {
    return { isLocked: false, lockReason: '', daysRemaining: null, isTrialExpiringSoon: false };
  }

  const entitlement = await ensureLandlordEntitlement(landlordId, { resyncCount });
  let activeSubscription = entitlement?.subscriptionId
    ? await LandlordSubscription.findById(entitlement.subscriptionId).populate('planId')
    : await LandlordSubscription.findOne({ landlordId }).sort({ createdAt: -1 }).populate('planId');

  const now = new Date();

  if (activeSubscription && activeSubscription.status === 'trial' && (!activeSubscription.startDate || !activeSubscription.expiryDate)) {
    const start = activeSubscription.startDate || activeSubscription.createdAt || user?.createdAt || now;
    const exp = activeSubscription.expiryDate || new Date(new Date(start).getTime() + 14 * 24 * 60 * 60 * 1000);
    activeSubscription.startDate = start;
    activeSubscription.expiryDate = exp;
    activeSubscription.renewalDate = activeSubscription.renewalDate || exp;
    activeSubscription.graceEndDate = activeSubscription.graceEndDate || exp;
    if (now >= exp) {
      activeSubscription.status = 'expired';
    }
    await activeSubscription.save();
    if (now >= exp && entitlement) {
      entitlement.status = 'expired';
      entitlement.expiresAt = exp;
      entitlement.graceEndsAt = exp;
      await entitlement.save();
    }
  }

  if (activeSubscription?.status === 'active' && activeSubscription.expiryDate && new Date(activeSubscription.expiryDate) > now) {
    const daysRemaining = Math.max(1, Math.ceil((new Date(activeSubscription.expiryDate) - now) / (24 * 60 * 60 * 1000)));
    return { isLocked: false, lockReason: '', daysRemaining, isTrialExpiringSoon: false, entitlement, activeSubscription };
  }

  const expDate = activeSubscription?.expiryDate || entitlement?.expiresAt;
  const daysRemaining = expDate
    ? Math.max(0, Math.ceil((new Date(expDate) - now) / (24 * 60 * 60 * 1000)))
    : 0;

  const isTrialExpired = activeSubscription?.status === 'trial' && expDate && now >= new Date(expDate);
  const isLocked = Boolean(
    isTrialExpired ||
    ['expired', 'suspended'].includes(entitlement?.status) ||
    ['expired', 'suspended'].includes(activeSubscription?.status)
  );

  const lockReason = isLocked
    ? activeSubscription?.planCode && !activeSubscription?.lastPaymentTransactionId
      ? 'Your 14-day free trial has ended. Please complete payment in Billing & Plans to unlock your workspace.'
      : 'Your subscription has expired. Please renew your plan in Billing & Plans to continue enjoying MakaziFlow.'
    : '';

  const isTrialExpiringSoon = !isLocked && activeSubscription?.status === 'trial' && daysRemaining <= 4;
  return { isLocked, lockReason, daysRemaining, isTrialExpiringSoon, entitlement, activeSubscription };
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
    { returnDocument: 'after' }
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
      { returnDocument: 'after' }
    );
    if (!ent) return null;
    if (ent.status === 'restricted' && (ent.isUnlimited || ent.activeUnitCount <= ent.purchasedLimit)) {
      return await UnitEntitlement.findOneAndUpdate(
        { _id: ent._id },
        { $set: { status: 'active', updatedAt: new Date() } },
        { returnDocument: 'after' }
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
async function activatePaidSubscription({ subscriptionId, paymentTransaction, actorId = null, session = null }) {
  const sOpt = session ? { session } : {};
  const sub = await LandlordSubscription.findById(subscriptionId, null, sOpt);
  if (!sub) throw new Error('Subscription record not found');

  // Strict Sandbox vs Production isolation guard:
  // Sandbox transactions must NEVER activate real production subscriptions.
  const txnEnv = (paymentTransaction?.gatewayEnvironment || (paymentTransaction?.isSandbox ? 'sandbox' : '') || (process.env.PESAPAL_ENV || process.env.INTASEND_ENV || 'sandbox')).toLowerCase();
  const isTxnSandbox = Boolean(paymentTransaction?.isSandbox) || txnEnv === 'sandbox';
  if (paymentTransaction?.provider === 'intasend' || paymentTransaction?.provider === 'pesapal') {
    const activeGatewayEnv = (
      paymentTransaction.provider === 'pesapal'
        ? (process.env.PESAPAL_ENV || 'sandbox')
        : (process.env.INTASEND_ENV || 'sandbox')
    ).trim().toLowerCase();
    if (activeGatewayEnv === 'production' && isTxnSandbox) {
      const err = new Error('Security Policy Violation: Sandbox transactions cannot activate production subscriptions.');
      err.code = 'SANDBOX_PRODUCTION_ISOLATION';
      err.statusCode = 403;
      throw err;
    }
    if (txnEnv !== activeGatewayEnv) {
      const err = new Error(`Environment mismatch: cannot activate ${activeGatewayEnv} subscription from ${txnEnv} payment.`);
      err.code = 'ENVIRONMENT_MISMATCH';
      err.statusCode = 403;
      throw err;
    }
  }

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
    { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
    sOpt
  );

  const previousState = { status: sub.status, purchasedUnits: sub.purchasedUnits, expiryDate: sub.expiryDate };

  sub.status = 'active';
  if (!sub.startDate || !isRenewalExtension) sub.startDate = now;
  sub.expiryDate = newExpiry;
  sub.renewalDate = newExpiry;
  sub.graceEndDate = newGraceEnd;
  sub.lastPaymentTransactionId = paymentTransaction._id;
  sub.paymentEnvironment = txnEnv === 'production' ? 'production' : 'sandbox';
  sub.isSandbox = isTxnSandbox;
  sub.notificationsSent = {
    preExpiry7d: false,
    preExpiry1d: false,
    expired: false,
    limitNear80: false,
    limitReached100: false
  };
  sub.updatedAt = now;
  await sub.save(sOpt);

  const actualUnits = await Unit.countDocuments({ user: sub.landlordId }).session(session || null);
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
        paymentEnvironment: sub.paymentEnvironment,
        isSandbox: Boolean(isTxnSandbox),
        updatedAt: now
      }
    },
    { upsert: true, returnDocument: 'after', ...sOpt }
  );

  await User.findByIdAndUpdate(
    sub.landlordId,
    {
      activeSubscriptionId: sub._id,
      subscriptionTier: sub.planCode
    },
    sOpt
  );

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
 * Automated Subscription Expiry, Pre-Expiry Warning & Consecutive Daily Reminder Sweep
 * - Approaching end of 14-day trial (1-4 days left): max 1 email/day
 * - At end of 14 days (trial expired): locks account & sends daily reminder email
 * - After expiration (unpaid expired accounts): sends 1 consecutive daily email per day until paid
 */
async function processSubscriptionExpirations() {
  const now = new Date();
  const todayKey = getTodayDateKey();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const subs = await LandlordSubscription.find({
    status: { $in: ['active', 'trial', 'grace_period', 'expired'] }
  }).sort({ createdAt: -1 });

  let warningsSent = 0;
  let movedToGrace = 0;
  let expiredCount = 0;
  const processedLandlords = new Set();

  for (const sub of subs) {
    const landlordKey = String(sub.landlordId);
    if (processedLandlords.has(landlordKey)) continue;

    // If landlord already has a newer active subscription, skip older expired records
    const newerActive = await LandlordSubscription.findOne({
      landlordId: sub.landlordId,
      _id: { $ne: sub._id },
      status: 'active',
      expiryDate: { $gt: now }
    }).lean();
    if (newerActive) continue;
    processedLandlords.add(landlordKey);

    const user = await User.findById(sub.landlordId);
    if (!user || user.role === 'superadmin' || user.isSuperAdmin) continue;

    const exp = sub.expiryDate ? new Date(sub.expiryDate) : null;
    const graceEnd = sub.status === 'trial'
      ? exp
      : (sub.graceEndDate ? new Date(sub.graceEndDate) : exp);

    if (!exp) continue;

    const msLeft = exp.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    const alreadyRemindedToday = sub.lastBillingReminderDate === todayKey;

    // 1. Pre-expiry approaching end of 14 days / renewal window (1 email per day)
    if (sub.status === 'trial' && exp > now && daysLeft >= 1 && daysLeft <= 4 && !alreadyRemindedToday) {
      sub.lastBillingReminderDate = todayKey;
      sub.billingReminderCount = (sub.billingReminderCount || 0) + 1;
      sub.notificationsSent.preExpiry7d = true;
      await sub.save();
      warningsSent++;
      await notifyLandlordSubscriptionEvent({
        user,
        subject: `MakaziFlow: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left on your ${sub.planName} trial — Pay to continue`,
        title: '14-Day Trial Ending Soon',
        bodyHtml: `
          <p>Dear ${user.name || 'Landlord'},</p>
          <p>You have <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> remaining in your 14-day free trial for the <strong>${sub.planName} Plan (${sub.purchasedUnits} units)</strong> (ending <strong>${exp.toLocaleDateString('en-KE')}</strong>).</p>
          <p>Please complete payment in your <strong>Billing &amp; Plans</strong> dashboard before your trial expires to continue enjoying uninterrupted access to your properties, tenants, receipts, and M-Pesa tools.</p>
        `,
        smsText: `MakaziFlow: ${daysLeft} day(s) left on your ${sub.planName} trial. Pay in Billing & Plans before ${exp.toLocaleDateString('en-KE')} to keep your account active.`
      });
      continue;
    }

    if (sub.status === 'active' && exp > now && exp <= in7Days && !sub.notificationsSent?.preExpiry7d && !alreadyRemindedToday) {
      sub.notificationsSent.preExpiry7d = true;
      sub.lastBillingReminderDate = todayKey;
      sub.billingReminderCount = (sub.billingReminderCount || 0) + 1;
      await sub.save();
      warningsSent++;
      await notifyLandlordSubscriptionEvent({
        user,
        subject: `MakaziFlow Renewal Notice: ${sub.planName} expires on ${exp.toLocaleDateString('en-KE')}`,
        title: 'Upcoming Subscription Renewal',
        bodyHtml: `<p>Dear ${user.name || 'Landlord'},</p><p>Your <strong>${sub.planName}</strong> subscription (${sub.purchasedUnits} units) expires on <strong>${exp.toLocaleDateString('en-KE')}</strong>. Please renew early to continue enjoying uninterrupted service.</p>`,
        smsText: `MakaziFlow: Your ${sub.planName} plan expires on ${exp.toLocaleDateString('en-KE')}. Renew in Billing to avoid service lock.`
      });
      continue;
    }

    // 2. Paid plan grace period transition
    if (sub.status === 'active' && now > exp && graceEnd && now <= graceEnd) {
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

    // 3. Expire trial immediately after 14 days (or paid plan after graceEndDate) and lock + send consecutive daily emails
    const isNowExpired = (sub.status === 'trial' && now >= exp) || (graceEnd && now > graceEnd) || sub.status === 'expired';
    if (isNowExpired) {
      const newlyExpired = sub.status !== 'expired';
      if (newlyExpired) {
        sub.status = 'expired';
        if (!sub.notificationsSent?.expired) {
          sub.notificationsSent.expired = true;
        }
        expiredCount++;
        await UnitEntitlement.findOneAndUpdate(
          { landlordId: sub.landlordId },
          { $set: { status: 'expired', updatedAt: now } }
        );
        await logSubscriptionAudit({
          landlordId: sub.landlordId,
          subscriptionId: sub._id,
          action: 'subscription_expired',
          newState: { status: 'expired' }
        });
      }

      if (!alreadyRemindedToday) {
        sub.lastBillingReminderDate = todayKey;
        sub.billingReminderCount = (sub.billingReminderCount || 0) + 1;
        await sub.save();
        warningsSent++;
        await notifyLandlordSubscriptionEvent({
          user,
          subject: `Action Required: Renew ${sub.planName} Plan to Unlock Your MakaziFlow Account`,
          title: 'Account Locked — Payment Required',
          bodyHtml: `
            <p>Dear ${user.name || 'Landlord'},</p>
            <p>Your 14-day ${sub.planName} (${sub.purchasedUnits} units) period ended on <strong>${exp.toLocaleDateString('en-KE')}</strong> and access to your workspace is currently paused until payment is received.</p>
            <p>All of your properties, units, tenants, and payment records remain safely stored. Please sign in and complete your payment in <strong>Billing &amp; Plans</strong> to immediately unlock your account and continue enjoying MakaziFlow services.</p>
          `,
          smsText: `MakaziFlow: Your ${sub.planName} period has expired and your account is locked. Complete payment in Billing & Plans to unlock access immediately.`
        });
      } else if (newlyExpired) {
        await sub.save();
      }
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
  resolvePlanBySelection,
  syncTrialFromOnboarding,
  getSubscriptionLockState,
  ensureLandlordEntitlement,
  reserveUnitSlot,
  releaseUnitSlot,
  activatePaidSubscription,
  processSubscriptionExpirations,
  logSubscriptionAudit,
  notifyLandlordSubscriptionEvent
};
