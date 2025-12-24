const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Organization Details
  orgName: { type: String, default: 'My Rental Company' },
  orgEmail: { type: String, default: 'admin@rental.com' },
  orgPhone: { type: String, default: '' },
  orgAddress: { type: String, default: '' },
  taxId: { type: String, default: '' },
  
  // App Preferences
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
  
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
          provider: { type: String, default: 'smtp' }, // smtp, sendgrid, gmail
          smtp: {
              host: { type: String, default: '' },
              port: { type: Number, default: 587 },
              user: { type: String, default: '' },
              pass: { type: String, default: '' },
              fromEmail: { type: String, default: 'noreply@rental.com' }
          },
          sendgrid: {
              apiKey: { type: String, default: '' }
          },
          gmail: {
              clientId: { type: String, default: '' },
              clientSecret: { type: String, default: '' }
          }
      },
      sms: {
          enabled: { type: Boolean, default: false },
          provider: { type: String, default: 'twilio' },
          twilio: {
              accountSid: { type: String, default: '' },
              authToken: { type: String, default: '' },
              phoneNumber: { type: String, default: '' }
          },
          africastalking: {
              username: { type: String, default: '' },
              apiKey: { type: String, default: '' }
          }
      },
      whatsapp: {
          enabled: { type: Boolean, default: false },
          provider: { type: String, default: 'twilio' },
          twilio: {
              accountSid: { type: String, default: '' },
              authToken: { type: String, default: '' },
              fromNumber: { type: String, default: '' } // e.g., whatsapp:+14155238886
          }
      },
      mpesa: {
          enabled: { type: Boolean, default: false },
          environment: { type: String, default: 'sandbox' },
          paybill: { type: String, default: '' },
          consumerKey: { type: String, default: '' },
          consumerSecret: { type: String, default: '' },
          passkey: { type: String, default: '' }
      }
  },

  updatedAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow flexibility if needed

module.exports = mongoose.model('Settings', settingsSchema);
