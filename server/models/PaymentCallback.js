const mongoose = require('mongoose');

const paymentCallbackSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  internalTransactionId: { type: String, default: '' },
  accountReference: { type: String, default: '', index: true },
  providerReference: { type: String, default: '', index: true },
  gatewayInvoiceNumber: { type: String, default: '' },
  signatureValid: { type: Boolean, default: false },
  isDuplicate: { type: Boolean, default: false },
  amountReceived: { type: Number, default: 0 },
  currencyReceived: { type: String, default: 'KES' },
  processingStatus: {
    type: String,
    enum: ['processed', 'ignored_duplicate', 'rejected_signature', 'unmatched', 'amount_mismatch', 'currency_mismatch', 'failed_status', 'error'],
    default: 'processed'
  },
  processingMessage: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  headers: { type: mongoose.Schema.Types.Mixed, default: {} },
  sourceIp: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('PaymentCallback', paymentCallbackSchema);
