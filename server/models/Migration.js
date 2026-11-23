const mongoose = require('mongoose');

const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  version: { type: Number, required: true, index: true },
  description: { type: String, default: '' },
  checksum: { type: String, default: '' },
  status: {
    type: String,
    enum: ['applied', 'failed', 'rolled_back'],
    default: 'applied',
    index: true
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  appliedAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Migration', migrationSchema);
