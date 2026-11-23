const mongoose = require('mongoose');

const ticketResponseSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: 'Support Team' },
  authorRole: { type: String, default: 'user' },
  message: { type: String, required: true },
  isInternalNote: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['general', 'billing', 'payments', 'technical', 'account', 'complaint', 'bug', 'feature_request', 'demo_request', 'landing_inquiry'],
    default: 'general',
    index: true
  },
  source: {
    type: String,
    enum: ['app_support', 'landing_page'],
    default: 'app_support',
    index: true
  },
  organizationRole: { type: String, default: '' },
  unitsEstimate: { type: String, default: '' },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'pending', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  message: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  responses: [ticketResponseSchema],
  firstRespondedAt: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
