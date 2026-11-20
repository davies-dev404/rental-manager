const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  // Organization & Landlord Details (populated per registered user/company)
  orgName: { type: String, default: '' },
  landlordName: { type: String, default: '' },
  abbreviatedName: { type: String, default: '' },
  orgLogo: { type: String, default: '' },
  orgEmail: { type: String, default: '' },
  orgPhone: { type: String, default: '' },
  orgAddress: { type: String, default: '' },
  taxId: { type: String, default: '' },
  invoiceTitle: { type: String, default: 'Invoice' },
  invoiceFootnote: { type: String, default: '' },
  
  // App Preferences
  currency: { type: String, default: 'KES' },
  timezone: { type: String, default: 'Africa/Nairobi' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  mpesaType: { type: String, default: 'Paybill' },
  paybillAccount: { type: String, default: 'Unit Number (e.g. 1B)' },
  accountType: { type: String, default: 'Property Management' },
  preferences: {
    autoRentInvoices: { type: Boolean, default: false },
    autoRecurringInvoices: { type: Boolean, default: false },
    alertLandlordNewTenant: { type: Boolean, default: true },
    autoSendPaymentAck: { type: Boolean, default: true },
    reminderDates: { type: [String], default: ['5th'] },
    leaseExpiryRange: { type: String, default: '30' },
    commSMS: { type: Boolean, default: true },
    commWhatsApp: { type: Boolean, default: false },
    commEmail: { type: Boolean, default: false }
  },
  alerts: {
    smsDueReminder: { type: Boolean, default: true },
    smsReceiptOnPayment: { type: Boolean, default: true },
    smsOverdueAlert: { type: Boolean, default: true },
    emailMonthlyStatement: { type: Boolean, default: true }
  },
  messageTemplates: {
    reminder: { type: String, default: '' },
    receipt: { type: String, default: '' },
    overdue: { type: String, default: '' }
  },
  customFields: { type: [mongoose.Schema.Types.Mixed], default: [] },
  teamMembers: { type: [mongoose.Schema.Types.Mixed], default: [] },
  
  // Notification Settings (toggles)
  notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      rentReminders: { type: Boolean, default: true }
  },

  // Integrations
  integrations: {
      email: {
          provider: { type: String, default: 'brevo' }, // brevo, smtp
          smtp: {
              host: { type: String, default: 'smtp-relay.brevo.com' },
              port: { type: Number, default: 587 },
              user: { type: String, default: '' },
              pass: { type: String, default: '' },
              fromEmail: { type: String, default: 'info@afrinextech.co.ke' }
          },
          brevo: {
              apiKey: { type: String, default: '' },
              smtpUser: { type: String, default: '' },
              smtpKey: { type: String, default: '' },
              senderEmail: { type: String, default: 'info@afrinextech.co.ke' }
          }
      },
      sms: {
          enabled: { type: Boolean, default: true },
          provider: { type: String, default: 'brevo' },
          senderName: { type: String, default: 'MakaziFlow' }
      },
      whatsapp: {
          enabled: { type: Boolean, default: false },
          provider: { type: String, default: 'brevo' },
          senderNumber: { type: String, default: '' }
      },
      pesaflow: {
          enabled: { type: Boolean, default: true },
          environment: { type: String, default: 'sandbox' }
      },
      cloudflare: {
          turnstileSiteKey: { type: String, default: '' },
          turnstileSecretKey: { type: String, default: '' },
          analyticsToken: { type: String, default: '' }
      },
      metaPixel: {
          pixelId: { type: String, default: '' },
          enabled: { type: Boolean, default: true }
      },
      googleReviews: {
          enabled: { type: Boolean, default: true },
          placeId: { type: String, default: '' },
          writeReviewUrl: { type: String, default: '' }
      }
  },

  updatedAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow flexibility if needed

module.exports = mongoose.model('Settings', settingsSchema);
