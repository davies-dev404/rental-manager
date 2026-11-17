const mongoose = require('mongoose');

const paymentAllocationSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  category: {
    type: String,
    enum: ['subscription', 'rent', 'water', 'electricity', 'service_charge', 'penalty', 'deposit', 'other'],
    required: true
  },
  allocatedAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'KES' },
  allocatedAt: { type: Date, default: Date.now }
});

// Prevent duplicate allocation of the same gateway transaction to the same invoice & charge category
paymentAllocationSchema.index({ transactionId: 1, invoiceId: 1, category: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PaymentAllocation', paymentAllocationSchema);
