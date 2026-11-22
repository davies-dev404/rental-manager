const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['subscription', 'rent', 'water', 'electricity', 'utilities', 'maintenance', 'service_charge', 'penalty', 'deposit', 'other'],
    default: 'rent'
  },
  itemCode: { type: String, default: 'SRV-RENT-001' },
  itemClassCode: { type: String, default: '80131500' }, // UNSPC Real estate rental/service code placeholder for KRA eTIMS
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, // e.g., 16 for commercial VAT, 0 for residential exempt
  taxableAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  invoiceCategory: {
    type: String,
    enum: ['subscription', 'rental'],
    required: true,
    index: true
  },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LandlordSubscription' },
  billingPeriod: { type: String, default: '' }, // e.g. 2026-11
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  vatRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  currency: { type: String, default: 'KES' },
  status: {
    type: String,
    enum: ['draft', 'open', 'partial', 'paid', 'void', 'uncollectible', 'credit_note'],
    default: 'open',
    index: true
  },
  issuedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: Date.now },
  paidAt: { type: Date },
  notes: { type: String, default: '' },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerKraPin: { type: String, default: '' },
  // KRA eTIMS Tracking (Never auto-marked compliant from PDF generation)
  etimsStatus: {
    type: String,
    enum: ['not_submitted', 'pending', 'submitted', 'validated', 'failed'],
    default: 'not_submitted',
    index: true
  },
  etimsSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxSubmission' },
  etimsReceiptNo: { type: String, default: '' },
  etimsSignature: { type: String, default: '' },
  etimsQrData: { type: String, default: '' },
  etimsSubmittedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.index({ landlordId: 1, invoiceCategory: 1, createdAt: -1 });
invoiceSchema.index({ tenantId: 1, billingPeriod: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
