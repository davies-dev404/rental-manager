const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Organization Details
  orgName: { type: String, default: 'MakaziFlow' },
  orgEmail: { type: String, default: 'info@afrinextech.co.ke' },
  orgPhone: { type: String, default: '0790264792' },
  orgAddress: { type: String, default: 'Busia, Kenya' },
  taxId: { type: String, default: '' },
  
  // App Preferences
  currency: { type: String, default: 'KES' },
  timezone: { type: String, default: 'Africa/Nairobi' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  
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
