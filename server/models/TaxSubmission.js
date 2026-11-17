const mongoose = require('mongoose');

const taxSubmissionSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  integrationMode: { type: String, enum: ['oscu', 'vscu'], default: 'oscu' },
  tin: { type: String, required: true },
  bhfId: { type: String, default: '00' },
  trdInvcNo: { type: String, required: true },
  invcNo: { type: Number },
  orgInvcNo: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  vatRate: { type: Number, default: 16 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'validated', 'failed'],
    default: 'pending',
    index: true
  },
  etimsReceiptNo: { type: String, default: '' },
  intrlData: { type: String, default: '' },
  rcptSign: { type: String, default: '' },
  qrCodeData: { type: String, default: '' },
  sdcDateTime: { type: String, default: '' },
  requestPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  responsePayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  retryCount: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  submittedAt: { type: Date },
  validatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaxSubmission', taxSubmissionSchema);
