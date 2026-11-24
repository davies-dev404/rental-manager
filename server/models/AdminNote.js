const mongoose = require('mongoose');

const adminNoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, default: 'Super Admin' },
  adminEmail: { type: String, default: '' },
  content: { type: String, required: true, trim: true },
  relatedIssue: { type: String, default: 'General', trim: true },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  createdAt: { type: Date, default: Date.now, index: true }
});

adminNoteSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNote', adminNoteSchema);
