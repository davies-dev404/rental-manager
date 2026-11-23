const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema({
  compositeKey: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true, index: true },
  scope: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  requestHash: { type: String, required: true },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  statusCode: { type: Number, default: 200 },
  responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
});

// Automatic MongoDB TTL cleanup after 24h retention
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
