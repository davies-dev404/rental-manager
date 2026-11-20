const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // Added unitId
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KES' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentAmount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  utilityAmount: { type: Number, default: 0 },
  serviceChargeAmount: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  utilities: [{
    name: { type: String },
    amount: { type: Number, default: 0 }
  }],
  date: { type: Date, default: Date.now },
  method: { type: String, default: 'cash' }, // cash, bank, mobile_money, M-Pesa, pesaflow, etc.
  status: { type: String, enum: ['paid', 'confirmed', 'partial', 'open', 'draft', 'overdue', 'Completed', 'Pending', 'Failed', 'pending', 'unpaid', 'Unpaid', 'void', 'reversed'], default: 'paid' },
  monthCovered: { type: String }, // YYYY-MM
  type: { type: String, default: 'Rent' }, // Rent, Deposit, Utility, Combined
  category: { type: String, enum: ['rent', 'water', 'electricity', 'service_charge', 'penalty', 'deposit', 'other', 'combined'], default: 'rent' },
  reference: { type: String }, // Pesaflow / M-Pesa / Bank ref
  notes: { type: String },
  paidAt: { type: Date },
  checkoutRequestId: { type: String },
  reconciled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({ user: 1, date: -1 });
paymentSchema.index({ tenantId: 1, monthCovered: 1 });
paymentSchema.index({ reference: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
