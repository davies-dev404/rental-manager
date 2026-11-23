const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  enabled: { type: Boolean, default: false, index: true },
  rolloutPercentage: { type: Number, default: 100, min: 0, max: 100 },
  targetLandlordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: { type: String, enum: ['payments', 'notifications', 'analytics', 'realtime', 'experimental'], default: 'experimental' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
