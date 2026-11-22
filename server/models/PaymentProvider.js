const mongoose = require('mongoose');

const paymentProviderSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    enum: ['pesapal', 'intasend', 'pesaflow', 'equity_eazzybiz', 'kcb_buni', 'coop_bank']
  },
  name: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  enabled: { type: Boolean, default: false },
  environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  supportedChannels: [{
    type: String,
    enum: ['mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer', 'ussd', 'hosted_checkout']
  }],
  paybillBusinessNumber: { type: String, default: '' },
  accountPrefix: { type: String, default: 'MF' },
  requiresMerchantAuthorization: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentProvider', paymentProviderSchema);
