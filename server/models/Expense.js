const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, default: 'General Expense' },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  description: { type: String },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyName: { type: String, default: '' },
  unit: { type: String, default: '' },
  paymentMethod: { type: String, default: 'other' },
  status: { type: String, default: 'confirmed' }
}, { timestamps: true });

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ propertyId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
