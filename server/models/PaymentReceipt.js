const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true, index: true },
  receiptCategory: { type: String, enum: ['subscription', 'rental'], required: true, index: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordSubscription' },
  recipientName: { type: String, required: true },
  recipientEmail: { type: String, default: '' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KES' },
  paymentMethod: { type: String, default: 'pesaflow' },
  providerReference: { type: String, default: '' },
  description: { type: String, default: '' },
  issuedAt: { type: Date, default: Date.now },
  emailedTo: { type: String, default: '' },
  emailedAt: { type: Date }
});

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
