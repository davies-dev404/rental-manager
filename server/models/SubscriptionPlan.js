const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, lowercase: true, trim: true }, // starter, basic, growth, professional, business, enterprise
  name: { type: String, required: true },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  maxUnits: { type: Number, default: 5 }, // For enterprise with isCustomUnlimited: true, treated as custom / high cap
  minUnits: { type: Number, default: 1 },
  isCustomUnlimited: { type: Boolean, default: false },
  currency: { type: String, default: 'KES' },
  pricing: {
    monthly: { type: Number, required: true, default: 0 },
    quarterly: { type: Number, required: true, default: 0 },
    semi_annual: { type: Number, required: true, default: 0 },
    annual: { type: Number, required: true, default: 0 }
  },
  pricePerAdditionalUnit: { type: Number, default: 0 }, // Optional per-unit pricing for flexible/enterprise scaling
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  promoCode: { type: String, default: '' },
  promoValidUntil: { type: Date },
  trialDays: { type: Number, default: 14 },
  gracePeriodDays: { type: Number, default: 7 },
  autoRenewDefault: { type: Boolean, default: true },
  features: [{ type: String }],
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
