const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sentByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentByAdminName: { type: String, default: 'MakaziFlow Admin' },
  channel: { type: String, enum: ['in_app', 'email', 'both'], default: 'in_app' },
  category: {
    type: String,
    enum: ['verification_reminder', 'subscription_expiry', 'payment_reminder', 'announcement', 'security', 'general'],
    default: 'general',
    index: true
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  emailStatus: { type: String, enum: ['not_applicable', 'sent', 'failed'], default: 'not_applicable' },
  emailError: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

userNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('UserNotification', userNotificationSchema);
