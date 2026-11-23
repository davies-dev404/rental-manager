const mongoose = require('mongoose');

/**
 * Append-only immutable ledger capturing verified financial transitions
 * (settlements, manual rent receipts, invoice updates, reversals, refunds).
 */
const financialAuditEntrySchema = new mongoose.Schema({
  entryType: {
    type: String,
    enum: ['rent_payment', 'gateway_settlement', 'subscription_activation', 'reversal', 'refund', 'invoice_created'],
    required: true,
    index: true
  },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KES' },
  direction: { type: String, enum: ['credit', 'debit'], default: 'credit' },
  reference: { type: String, default: '', index: true },
  previousStatus: { type: String, default: '' },
  newStatus: { type: String, default: '' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true, immutable: true }
});

financialAuditEntrySchema.index({ landlordId: 1, createdAt: -1 });
financialAuditEntrySchema.index({ transactionId: 1, entryType: 1 });

module.exports = mongoose.model('FinancialAuditEntry', financialAuditEntrySchema);
