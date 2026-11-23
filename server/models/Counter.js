const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now }
});

counterSchema.statics.nextSequence = async function nextSequence(key, session = null) {
  const opts = { upsert: true, returnDocument: 'after' };
  if (session) opts.session = session;
  const doc = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 }, $set: { updatedAt: new Date() } },
    opts
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
