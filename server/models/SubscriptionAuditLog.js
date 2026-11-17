const mongoose = require('mongoose');

const subscriptionAuditLogSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordSubscription' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String, default: 'system' },
  action: {
    type: String,
    enum: [
      'plan_created',
      'plan_updated',
      'subscription_initiated',
      'subscription_activated',
      'subscription_upgraded',
      'subscription_downgraded',
      'subscription_renewed',
      'subscription_cancelled',
      'subscription_expired',
      'subscription_suspended',
      'subscription_reactivated',
      'grace_period_entered',
      'unit_limit_reached',
      'unit_limit_blocked',
      'unit_limit_adjusted',
      'notification_sent'
    ],
    required: true,
    index: true
  },
  previousState: { type: mongoose.Schema.Types.Mixed, default: {} },
  newState: { type: mongoose.Schema.Types.Mixed, default: {} },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('SubscriptionAuditLog', subscriptionAuditLogSchema);
