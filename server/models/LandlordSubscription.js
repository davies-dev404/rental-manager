const mongoose = require('mongoose');

const landlordSubscriptionSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  planCode: { type: String, required: true, index: true },
  planName: { type: String, required: true },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
    default: 'monthly'
  },
  purchasedUnits: { type: Number, required: true, min: 1 },
  maxPlanUnits: { type: Number, required: true },
  isCustomUnlimited: { type: Boolean, default: false },
  baseAmount: { type: Number, required: true, default: 0 },
  discountApplied: { type: Number, default: 0 },
  promoCode: { type: String, default: '' },
  priceAmount: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'KES' },
  status: {
    type: String,
    enum: ['trial', 'pending_payment', 'active', 'grace_period', 'expired', 'cancelled', 'suspended'],
    default: 'pending_payment',
    index: true
  },
  startDate: { type: Date },
  expiryDate: { type: Date, index: true },
  renewalDate: { type: Date },
  graceEndDate: { type: Date },
  cancelledAt: { type: Date },
  suspensionReason: { type: String, default: '' },
  autoRenew: { type: Boolean, default: true },
  lastPaymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  notificationsSent: {
    preExpiry7d: { type: Boolean, default: false },
    preExpiry1d: { type: Boolean, default: false },
    expired: { type: Boolean, default: false },
    limitNear80: { type: Boolean, default: false },
    limitReached100: { type: Boolean, default: false }
  },
  lastBillingReminderDate: { type: String, default: '' },
  billingReminderCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

landlordSubscriptionSchema.index({ landlordId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LandlordSubscription', landlordSubscriptionSchema);
