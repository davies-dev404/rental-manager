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
    type: String, // email, sms
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
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'overdue'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);
