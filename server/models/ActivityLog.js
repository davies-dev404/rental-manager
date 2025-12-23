const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: String }, // Store User Name or ID
  action: { type: String, required: true },
  description: { type: String },
  type: { type: String }, // e.g., 'settings', 'property', 'auth'
  status: { type: String, default: 'success' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
