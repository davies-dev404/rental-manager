const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unitNumber: { type: String, required: true },
  type: { type: String, default: '1 Bedroom' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rentAmount: { type: Number, required: true },
  status: { type: String, enum: ['vacant', 'occupied', 'maintenance'], default: 'vacant' },
  bedrooms: { type: Number, default: 1 },
  bathrooms: { type: Number, default: 1 },
  size: { type: Number }, // sqft
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Unit', unitSchema);
