const mongoose = require('mongoose');

const unitEntitlementSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordSubscription' },
  planCode: { type: String, default: 'starter' },
  planName: { type: String, default: 'Starter' },
  purchasedLimit: { type: Number, required: true, default: 5 },
  isUnlimited: { type: Boolean, default: false },
  activeUnitCount: { type: Number, required: true, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['active', 'trial', 'grace_period', 'expired', 'suspended', 'restricted'],
    default: 'trial'
  },
  expiresAt: { type: Date },
  graceEndsAt: { type: Date },
  paymentEnvironment: { type: String, enum: ['sandbox', 'production', 'trial', 'none'], default: 'trial' },
  isSandbox: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UnitEntitlement', unitEntitlementSchema);
