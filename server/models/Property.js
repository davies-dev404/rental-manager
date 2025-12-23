const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, default: 'Apartment' },
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);
