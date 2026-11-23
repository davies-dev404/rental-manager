const mongoose = require('mongoose');

const cronLockSchema = new mongoose.Schema({
  jobName: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  lockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true }
});

module.exports = mongoose.model('CronLock', cronLockSchema);
