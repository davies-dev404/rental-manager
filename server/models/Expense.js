const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // e.g., 'Maintenance', 'Utilities', 'Taxes'
  date: { type: Date, default: Date.now },
  description: { type: String },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
