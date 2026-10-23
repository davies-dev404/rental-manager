const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // Added unitId
  amount: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentAmount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  utilityAmount: { type: Number, default: 0 },
  utilities: [{
    name: { type: String },
    amount: { type: Number, default: 0 }
  }],
  date: { type: Date, default: Date.now },
  method: { type: String, default: 'cash' }, // cash, bank, mobile_money, M-Pesa, etc.
  status: { type: String, enum: ['paid', 'partial', 'overdue', 'Completed', 'Pending', 'Failed', 'pending', 'unpaid', 'Unpaid'], default: 'paid' },
  monthCovered: { type: String }, // YYYY-MM
  type: { type: String, default: 'Rent' }, // Rent, Deposit, Utility, Combined
  reference: { type: String }, // M-Pesa Code etc.
  checkoutRequestId: { type: String }, // M-Pesa Checkout Request ID for tracking
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
