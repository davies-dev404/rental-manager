const mongoose = require('mongoose');

const deadLetterJobSchema = new mongoose.Schema({
  queueName: { type: String, required: true, index: true },
  jobName: { type: String, required: true, index: true },
  jobId: { type: String, default: '', index: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  errorMessage: { type: String, required: true },
  errorCode: { type: String, default: '' },
  attempts: { type: Number, default: 1 },
  retryHistory: [{
    attempt: Number,
    error: String,
    failedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['dead', 'replayed', 'resolved'],
    default: 'dead',
    index: true
  },
  replayedAt: { type: Date },
  replayedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

deadLetterJobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DeadLetterJob', deadLetterJobSchema);
