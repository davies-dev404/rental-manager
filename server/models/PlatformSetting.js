const mongoose = require('mongoose');
const BUSINESS_CONFIG = require('../config/businessConfig');

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true, index: true },
  platformName: { type: String, default: BUSINESS_CONFIG.name || 'MakaziFlow' },
  platformLogo: { type: String, default: '' },
  supportEmail: { type: String, default: BUSINESS_CONFIG.email || 'info@afrinextech.co.ke' },
  supportPhone: { type: String, default: BUSINESS_CONFIG.phone || '0790264792' },
  supportAddress: { type: String, default: BUSINESS_CONFIG.address || 'Busia, Kenya' },
  defaultCurrency: { type: String, default: BUSINESS_CONFIG.defaultCurrency || 'KES' },
  timezone: { type: String, default: BUSINESS_CONFIG.defaultTimezone || 'Africa/Nairobi' },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceScheduled: { type: Boolean, default: false },
  maintenanceStartAt: { type: Date, default: null },
  maintenanceEndAt: { type: Date, default: null },
  maintenanceNotifyEmails: { type: Boolean, default: true },
  maintenanceLastNotifiedAt: { type: Date, default: null },
  maintenanceLastNotifiedCount: { type: Number, default: 0 },
  maintenanceMessage: {
    type: String,
    default: 'MakaziFlow is currently undergoing scheduled maintenance. Please check back shortly.'
  },
  subscriptionConfig: {
    trialDays: { type: Number, default: 14, min: 0, max: 90 },
    gracePeriodDays: { type: Number, default: 7, min: 0, max: 60 },
    allowPublicSignup: { type: Boolean, default: true },
    autoExpirySweepEnabled: { type: Boolean, default: true }
  },
  notifications: {
    emailOnNewUser: { type: Boolean, default: true },
    emailOnLargePayment: { type: Boolean, default: true },
    emailOnSupportTicket: { type: Boolean, default: true },
    adminAlertEmail: { type: String, default: BUSINESS_CONFIG.email || 'info@afrinextech.co.ke' }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
