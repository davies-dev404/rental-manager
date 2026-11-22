const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../models/SubscriptionPlan');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const Invoice = require('../models/Invoice');
const PaymentReceipt = require('../models/PaymentReceipt');
const PaymentTransaction = require('../models/PaymentTransaction');
const SubscriptionAuditLog = require('../models/SubscriptionAuditLog');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  seedDefaultPlans,
  calculateSubscriptionPrice,
  ensureLandlordEntitlement,
  getSubscriptionLockState,
  logSubscriptionAudit
} = require('../services/subscriptionService');
const { createStructuredInvoice } = require('../services/invoiceService');
const PaymentService = require('../services/payments/PaymentService');
const { paymentCheckoutLimiter } = require('../middleware/securityMiddleware');

// @desc    Get all active subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    let plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
    if (plans.length === 0) {
      plans = await seedDefaultPlans();
    }
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Calculate subscription price for plan, desired units & billing cycle
// @route   POST /api/subscriptions/calculate
// @access  Private
router.post('/calculate', protect, async (req, res) => {
  try {
    const { planCode, desiredUnits, billingCycle = 'monthly', promoCode = '' } = req.body;
    const plan = await SubscriptionPlan.findOne({ code: String(planCode || '').toLowerCase(), isActive: true });
    if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });

    const requestedUnits = Number(desiredUnits || plan.maxUnits);
    if (!plan.isCustomUnlimited && requestedUnits > plan.maxUnits) {
      return res.status(400).json({
        message: `Selected units (${requestedUnits}) exceed the ${plan.name} plan limit of ${plan.maxUnits} units.`
      });
    }

    const quote = calculateSubscriptionPrice(plan, requestedUnits, billingCycle, promoCode);
    res.json({
      plan: {
        code: plan.code,
        name: plan.name,
        maxUnits: plan.maxUnits,
        isCustomUnlimited: plan.isCustomUnlimited
      },
      desiredUnits: plan.isCustomUnlimited ? Math.max(101, requestedUnits) : requestedUnits,
      ...quote
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @desc    Get current landlord subscription, unit entitlement, invoices & receipts
// @route   GET /api/subscriptions/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const landlordId = req.user._id || req.user.id;
    const lockState = await getSubscriptionLockState(landlordId, req.user, { resyncCount: true });
    const entitlement = lockState.entitlement || await ensureLandlordEntitlement(landlordId, { resyncCount: true });
    const activeSubscription = lockState.activeSubscription || (
      entitlement.subscriptionId
        ? await LandlordSubscription.findById(entitlement.subscriptionId).populate('planId')
        : await LandlordSubscription.findOne({ landlordId }).sort({ createdAt: -1 }).populate('planId')
    );

    const history = await LandlordSubscription.find({ landlordId }).sort({ createdAt: -1 }).limit(20);
    const allInvoices = await Invoice.find({ landlordId, invoiceCategory: 'subscription' }).sort({ createdAt: -1 }).limit(30);
    const receipts = await PaymentReceipt.find({ landlordId, receiptCategory: 'subscription' }).sort({ issuedAt: -1 }).limit(30);
    const allTransactions = await PaymentTransaction.find({
      landlordId,
      paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] }
    }).sort({ createdAt: -1 }).limit(30);

    // Exclude legacy/aborted pre-gateway initiation failures so billing history stays clean
    const transactions = allTransactions.filter((t) => {
      const hasGatewaySession = Boolean(t.trackingId || t.checkoutId || t.gatewayInvoiceNumber || t.providerReference);
      if (t.status === 'failed' && (!hasGatewaySession || t.provider === 'pesaflow')) {
        return false;
      }
      return true;
    });

    const activeOrSettledInvoiceIds = new Set(
      transactions
        .filter((t) => t.invoiceId && ['paid', 'pending', 'processing'].includes(t.status))
        .map((t) => String(t.invoiceId))
    );
    const invoices = allInvoices.filter(
      (inv) => inv.status !== 'open' || activeOrSettledInvoiceIds.has(String(inv._id))
    );

    const purchasedUnits = entitlement.purchasedLimit || 0;
    const registeredUnits = entitlement.activeUnitCount || 0;
    const availableSlots = entitlement.isUnlimited ? null : Math.max(0, purchasedUnits - registeredUnits);
    const utilizationPercent = entitlement.isUnlimited || purchasedUnits === 0
      ? 0
      : Math.min(100, Math.round((registeredUnits / purchasedUnits) * 100));

    res.json({
      entitlement: {
        ...entitlement.toObject(),
        purchasedUnits,
        registeredUnits,
        availableSlots,
        utilizationPercent,
        isCompliant: entitlement.isUnlimited || registeredUnits <= purchasedUnits
      },
      activeSubscription,
      isLocked: Boolean(lockState.isLocked),
      lockReason: lockState.lockReason || '',
      daysRemaining: lockState.daysRemaining,
      isTrialExpiringSoon: Boolean(lockState.isTrialExpiringSoon),
      gatewayProvider: PaymentService.getActiveGatewayStatus().provider,
      gatewayEnvironment: PaymentService.getActiveGatewayStatus().environment || 'sandbox',
      history,
      invoices,
      receipts,
      transactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Initiate a subscription purchase, upgrade, downgrade or renewal via configured gateway (IntaSend primary)
// @route   POST /api/subscriptions/subscribe
// @access  Private (Landlord / Admin)
router.post('/subscribe', protect, admin, paymentCheckoutLimiter, async (req, res) => {
  try {
    const {
      planCode,
      desiredUnits,
      billingCycle = 'monthly',
      paymentChannel = 'hosted_checkout',
      provider = '',
      promoCode = '',
      phone = '',
      enableRecurring = false,
      idempotencyKey = ''
    } = req.body;

    const landlordId = req.user._id || req.user.id;
    await ensureLandlordEntitlement(landlordId);

    const plan = await SubscriptionPlan.findOne({ code: String(planCode || '').toLowerCase(), isActive: true });
    if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });

    const requestedUnits = plan.isCustomUnlimited
      ? Math.max(101, Number(desiredUnits || 150))
      : Math.min(plan.maxUnits, Math.max(1, Number(desiredUnits || plan.maxUnits)));

    if (!plan.isCustomUnlimited && Number(desiredUnits) > plan.maxUnits) {
      return res.status(400).json({
        message: `${plan.name} supports a maximum of ${plan.maxUnits} units. Choose a higher tier.`
      });
    }

    const quote = calculateSubscriptionPrice(plan, requestedUnits, billingCycle, promoCode);

    // Determine category: new subscription, upgrade, or renewal
    const currentActive = await LandlordSubscription.findOne({
      landlordId,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).sort({ createdAt: -1 });

    let paymentCategory = 'subscription';
    if (currentActive) {
      if (currentActive.planCode === plan.code && currentActive.purchasedUnits === requestedUnits) {
        paymentCategory = 'subscription_renewal';
      } else if (requestedUnits > currentActive.purchasedUnits) {
        paymentCategory = 'unit_upgrade';
      }
    }

    // Create Pending LandlordSubscription (NEVER activated until verified payment callback!)
    const subscription = await LandlordSubscription.create({
      landlordId,
      planId: plan._id,
      planCode: plan.code,
      planName: plan.name,
      billingCycle: quote.billingCycle,
      purchasedUnits: requestedUnits,
      maxPlanUnits: plan.maxUnits,
      isCustomUnlimited: Boolean(plan.isCustomUnlimited),
      baseAmount: quote.baseAmount,
      discountApplied: quote.discountApplied,
      promoCode,
      priceAmount: quote.finalAmount,
      currency: 'KES',
      status: 'pending_payment',
      autoRenew: plan.autoRenewDefault
    });

    // Create Subscription Invoice (distinct from Rental Invoices) with 16% VAT breakdown option or tax-inclusive SaaS billing
    const vatRate = Number(process.env.ETIMS_DEFAULT_VAT_RATE || 16);
    const netUnitPrice = Number((quote.finalAmount / (1 + vatRate / 100)).toFixed(2));
    const invoice = await createStructuredInvoice({
      invoiceCategory: 'subscription',
      landlordId,
      subscriptionId: subscription._id,
      billingPeriod: `${quote.billingCycle}`,
      vatRate,
      items: [{
        description: `MakaziFlow ${plan.name} Plan (${plan.isCustomUnlimited ? 'Custom' : requestedUnits} Units - ${quote.billingCycle})`,
        category: 'subscription',
        itemCode: `MF-SUB-${plan.code.toUpperCase()}`,
        quantity: 1,
        unitPrice: netUnitPrice,
        taxRate: vatRate
      }],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: phone || req.user.phone || '',
      customerKraPin: req.user.kraPin || '',
      notes: 'MakaziFlow SaaS Platform Subscription Invoice'
    });

    await logSubscriptionAudit({
      landlordId,
      subscriptionId: subscription._id,
      actorId: landlordId,
      actorRole: req.user.role,
      action: 'subscription_initiated',
      newState: {
        planCode: plan.code,
        purchasedUnits: requestedUnits,
        billingCycle: quote.billingCycle,
        amount: quote.finalAmount,
        invoiceNumber: invoice.invoiceNumber
      }
    });

    // Initiate Payment Gateway Checkout (IntaSend primary when configured, never trusting client amounts)
    const chosenProvider = (provider || '').trim().toLowerCase() || PaymentService.resolveDefaultProvider();
    try {
      const paymentResult = await PaymentService.initiateTransaction({
        idempotencyKey: idempotencyKey || undefined,
        providerCode: chosenProvider,
        paymentChannel,
        paymentCategory,
        planCode: plan.code,
        billingCycle: quote.billingCycle,
        landlordId,
        subscriptionId: subscription._id,
        invoiceId: invoice._id,
        amount: quote.finalAmount,
        currency: 'KES',
        customerName: req.user.name,
        customerEmail: req.user.email,
        customerPhone: phone || req.user.phone || '',
        description: `MakaziFlow ${plan.name} (${requestedUnits} Units - ${quote.billingCycle})`,
        metadata: enableRecurring ? {
          enableRecurring: true,
          subscriptionDetails: {
            start_date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB').replace(/\//g, '-'),
            frequency: quote.billingCycle === 'annual' ? 'YEARLY' : 'MONTHLY'
          }
        } : {}
      });

      return res.status(201).json({
        success: true,
        message: 'Subscription pending payment verification. Complete your payment to activate.',
        subscription,
        invoice,
        transaction: paymentResult.transaction,
        gateway: paymentResult.gateway
      });
    } catch (gatewayErr) {
      // Remove orphaned pending subscription, open invoice, and failed-to-init transaction so Billing stays clean
      await PaymentTransaction.deleteMany({
        subscriptionId: subscription._id,
        status: 'failed',
        trackingId: { $in: ['', null] },
        checkoutId: { $in: ['', null] }
      }).catch(() => {});
      await Invoice.deleteOne({ _id: invoice._id, status: 'open' }).catch(() => {});
      await LandlordSubscription.deleteOne({ _id: subscription._id, status: 'pending_payment' }).catch(() => {});

      return res.status(gatewayErr.statusCode || 502).json({
        success: false,
        code: gatewayErr.code || 'GATEWAY_INITIATION_FAILED',
        message: gatewayErr.message,
        retryable: Boolean(gatewayErr.retryable),
        ...(gatewayErr.details ? { details: gatewayErr.details } : {})
      });
    }
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
});

// @desc    Refresh status of all recent pending/processing subscription payments directly with gateway
// @route   POST /api/subscriptions/refresh-status
// @access  Private (Landlord / Admin)
router.post('/refresh-status', protect, admin, async (req, res) => {
  try {
    const landlordId = req.user._id || req.user.id;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const openTxns = await PaymentTransaction.find({
      landlordId,
      paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] },
      status: { $in: ['pending', 'processing'] },
      createdAt: { $gte: cutoff },
      $or: [
        { trackingId: { $nin: ['', null] } },
        { checkoutId: { $nin: ['', null] } },
        { gatewayInvoiceNumber: { $nin: ['', null] } }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    let checkedCount = 0;
    let activatedCount = 0;
    let latestStatus = openTxns.length === 0 ? 'none_pending' : 'pending';

    for (const txn of openTxns) {
      try {
        checkedCount++;
        const result = await PaymentService.verifyTransactionStatus(txn._id);
        const st = result?.transaction?.status || 'pending';
        if (st === 'paid' || result?.alreadySettled) {
          activatedCount++;
          latestStatus = 'paid';
        } else if (latestStatus !== 'paid') {
          latestStatus = st;
        }
      } catch (innerErr) {
        console.warn(`Refresh status check skipped for ${txn.accountReference}:`, innerErr.message);
      }
    }

    res.json({
      success: true,
      checkedCount,
      activatedCount,
      latestStatus,
      message: activatedCount > 0
        ? 'Payment verified and subscription activated.'
        : (checkedCount > 0
          ? `Checked ${checkedCount} pending transaction(s). Current status: ${latestStatus}.`
          : 'No pending transactions require verification.')
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Cancel active subscription auto-renewal (preserves existing properties/units)
// @route   POST /api/subscriptions/cancel
// @access  Private (Landlord / Admin)
router.post('/cancel', protect, admin, async (req, res) => {
  try {
    const landlordId = req.user._id || req.user.id;
    const { reason = 'User requested cancellation' } = req.body;
    const sub = await LandlordSubscription.findOne({
      landlordId,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).sort({ createdAt: -1 });

    if (!sub) {
      return res.status(404).json({ message: 'No active subscription found to cancel.' });
    }

    sub.autoRenew = false;
    sub.cancelledAt = new Date();
    sub.updatedAt = new Date();
    await sub.save();

    await logSubscriptionAudit({
      landlordId,
      subscriptionId: sub._id,
      actorId: landlordId,
      actorRole: req.user.role,
      action: 'subscription_cancelled',
      newState: { autoRenew: false, cancelledAt: sub.cancelledAt },
      reason
    });

    res.json({
      success: true,
      message: 'Auto-renewal cancelled. Your existing properties, units, and tenant records remain preserved until the end of your current billing period.',
      subscription: sub
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Preview or schedule plan downgrade (preserves all existing units cleanly)
// @route   POST /api/subscriptions/downgrade-preview
// @access  Private (Landlord / Admin)
router.post('/downgrade-preview', protect, admin, async (req, res) => {
  try {
    const landlordId = req.user._id || req.user.id;
    const { targetPlanCode, desiredUnits } = req.body;
    const entitlement = await ensureLandlordEntitlement(landlordId);
    const targetPlan = await SubscriptionPlan.findOne({ code: String(targetPlanCode || '').toLowerCase() });
    if (!targetPlan) return res.status(404).json({ message: 'Target plan not found' });

    const newLimit = Number(desiredUnits || targetPlan.maxUnits);
    const currentUnits = entitlement.activeUnitCount || 0;
    const exceedsNewLimit = !targetPlan.isCustomUnlimited && currentUnits > newLimit;

    res.json({
      currentRegisteredUnits: currentUnits,
      newUnitAllowance: newLimit,
      exceedsNewLimit,
      existingRecordsPreserved: true,
      warningMessage: exceedsNewLimit
        ? `You currently have ${currentUnits} registered units, which exceeds the ${targetPlan.name} allowance of ${newLimit}. None of your properties or units will be deleted, but adding new units will be blocked until your unit count is within ${newLimit} or you upgrade.`
        : `Your current ${currentUnits} units fit comfortably within the ${targetPlan.name} allowance of ${newLimit}.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
