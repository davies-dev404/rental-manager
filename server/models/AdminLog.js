const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  adminEmail: { type: String, default: '' },
  adminName: { type: String, default: '' },
  adminRole: { type: String, default: 'superadmin' },
  action: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['auth', 'user', 'property', 'tenant', 'payment', 'subscription', 'support', 'settings', 'report', 'security'],
    default: 'security',
    index: true
  },
  targetType: { type: String, default: '' }, // e.g., 'User', 'Property', 'PaymentTransaction', 'SubscriptionPlan', 'SupportTicket', 'PlatformSetting'
  targetId: { type: String, default: '', index: true },
  details: { type: String, default: '' },
  previousState: { type: mongoose.Schema.Types.Mixed, default: null },
  newState: { type: mongoose.Schema.Types.Mixed, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  status: { type: String, enum: ['success', 'warning', 'error'], default: 'success' },
  createdAt: { type: Date, default: Date.now, index: true }
});

adminLogSchema.index({ category: 1, createdAt: -1 });
adminLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
