const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, default: 'General Expense' },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  description: { type: String },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
