const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, enum: ['email', 'sms', 'whatsapp'], default: 'email', index: true },
  category: {
    type: String,
    enum: ['receipt', 'invoice', 'reminder', 'broadcast', 'subscription', 'team', 'security', 'other'],
    default: 'other'
  },
  recipientType: { type: String, enum: ['tenant', 'team'], default: 'tenant', index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
  propertyName: { type: String, default: '' },
  unitNumber: { type: String, default: '' },
  recipientName: { type: String, default: '' },
  recipientEmail: { type: String, default: '' },
  recipientPhone: { type: String, default: '' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'delivered', index: true },
  charge: { type: Number, default: 0 },
  provider: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  reminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder' },
  createdAt: { type: Date, default: Date.now, index: true }
});

communicationLogSchema.index({ user: 1, createdAt: -1 });
communicationLogSchema.index({ user: 1, propertyId: 1, createdAt: -1 });

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);
