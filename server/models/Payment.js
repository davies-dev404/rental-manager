const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // Added unitId
  amount: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentAmount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ['cash', 'bank', 'mobile_money', 'lipa_na_mpesa'] }, // Aligned with frontend
  status: { type: String, enum: ['paid', 'partial', 'overdue', 'Completed', 'Pending', 'Failed'], default: 'paid' }, // Combined enums for safety
  monthCovered: { type: String }, // YYYY-MM
  type: { type: String, default: 'Rent' }, // Rent, Deposit, Utility, Combined
  reference: { type: String }, // M-Pesa Code etc.
  checkoutRequestId: { type: String }, // M-Pesa Checkout Request ID for tracking
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
