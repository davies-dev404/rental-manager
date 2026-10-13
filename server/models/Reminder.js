const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String, // rent_due, overdue, maintenance, inspection
    required: true
  },
  method: {
    type: String, // email, sms, whatsapp
    required: true
  },
  frequency: {
    type: String, // immediate, 1day, 3days, 1week
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  recipientName: { type: String },
  recipientEmail: { type: String },
  recipientPhone: { type: String },
  amountDue: { type: Number, default: 0 },
  breakdown: {
    rent: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    utilities: [{
      name: { type: String },
      amount: { type: Number, default: 0 }
    }]
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'overdue'],
    default: 'pending'
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);
