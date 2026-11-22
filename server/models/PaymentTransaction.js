const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  internalTransactionId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, unique: true, sparse: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordSubscription' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  provider: {
    type: String,
    enum: ['pesapal', 'intasend', 'pesaflow', 'equity_eazzybiz', 'kcb_buni', 'coop_bank', 'manual'],
    default: 'pesapal',
    index: true
  },
  gatewayEnvironment: {
    type: String,
    enum: ['sandbox', 'production'],
    default: 'sandbox',
    index: true
  },
  isSandbox: { type: Boolean, default: true, index: true },
  paymentChannel: {
    type: String,
    enum: ['mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer', 'ussd', 'hosted_checkout', 'manual'],
    default: 'hosted_checkout'
  },
  paymentMethodDetail: { type: String, default: '' },
  paymentCategory: {
    type: String,
    enum: ['subscription', 'unit_upgrade', 'subscription_renewal', 'rent', 'water', 'electricity', 'service_charge', 'penalty', 'deposit', 'combined'],
    required: true,
    index: true
  },
  planCode: { type: String, default: '' },
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual', ''], default: '' },
  amount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0 },
  currency: { type: String, default: 'KES', uppercase: true },
  accountReference: { type: String, required: true, index: true }, // Unique api_ref / billRefNumber
  merchantReference: { type: String, index: true, sparse: true },
  paybillBusinessNumber: { type: String, default: '' },
  providerReference: { type: String, index: true, sparse: true }, // Immutable external confirmation code once paid
  trackingId: { type: String, index: true, sparse: true }, // IntaSend invoice_id / tracking_id
  checkoutId: { type: String, index: true, sparse: true },
  checkoutSignature: { type: String, default: '' },
  gatewayInvoiceNumber: { type: String, index: true, sparse: true }, // Gateway invoice_id / invoice_number
  checkoutUrl: { type: String, default: '' },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'reversed', 'unmatched', 'refunded'],
    default: 'pending',
    index: true
  },
  reconciliationStatus: {
    type: String,
    enum: ['pending', 'reconciled', 'unmatched', 'amount_mismatch', 'reversed'],
    default: 'pending',
    index: true
  },
  failureReason: { type: String, default: '' },
  reversalReason: { type: String, default: '' },
  paidAt: { type: Date },
  verifiedAt: { type: Date },
  reconciledAt: { type: Date },
  reversedAt: { type: Date },
  chargeBreakdown: {
    rent: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    electricity: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

paymentTransactionSchema.index({ provider: 1, providerReference: 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ provider: 1, gatewayEnvironment: 1, accountReference: 1 }, { unique: true });
paymentTransactionSchema.index({ gatewayEnvironment: 1, paymentCategory: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ landlordId: 1, paymentCategory: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
