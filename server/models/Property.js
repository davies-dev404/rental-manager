const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, default: 'Apartment' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional
  image: { type: String },
  status: {
    type: String,
    enum: ['active', 'flagged', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  isFlagged: { type: Boolean, default: false, index: true },
  flagReason: { type: String, default: '' },
  flaggedAt: { type: Date },
  flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

propertySchema.index({ user: 1, createdAt: -1 });
propertySchema.index({ location: 1, type: 1 });

module.exports = mongoose.model('Property', propertySchema);
