const mongoose = require('mongoose');

const utilityReadingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
  propertyName: { type: String, default: '' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  unitNumber: { type: String, required: true, trim: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  item: { type: String, required: true, trim: true, lowercase: true, index: true }, // water, electricity, garbage, sewer, gas, generator
  previous: { type: Number, default: 0 },
  current: { type: Number, default: 0 },
  consumed: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  total: { type: Number, required: true, min: 0 },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: { type: String, default: '' },
  date: { type: Date, default: Date.now, index: true },
  billingPeriod: { type: String, default: '' },
  source: { type: String, enum: ['manual', 'bulk_upload', 'modal'], default: 'manual' },
  createdAt: { type: Date, default: Date.now }
});

utilityReadingSchema.index({ user: 1, propertyId: 1, date: -1 });
utilityReadingSchema.index({ user: 1, item: 1, date: -1 });

module.exports = mongoose.model('UtilityReading', utilityReadingSchema);
