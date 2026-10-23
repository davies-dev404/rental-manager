const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: String }, // User Name
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  action: { type: String, required: true },
  description: { type: String },
  type: { type: String, default: 'general' }, // e.g., 'settings', 'property', 'auth', 'payment', 'tenant', 'unit'
  status: { type: String, default: 'success' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
