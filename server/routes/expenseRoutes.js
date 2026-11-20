const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Get All Expenses
router.get('/', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add Expense
router.post('/', protect, async (req, res) => {
    try {
        const title = req.body.title || req.body.description || 'General Expense';
        const expense = await Expense.create({ 
            ...req.body, 
            title,
            description: req.body.description || title,
            amount: Number(req.body.amount),
            user: req.user.id 
        });
        await logActivity(req.user, 'Record Expense', `Recorded expense "${title}" (KES ${Number(expense.amount || 0).toLocaleString()})`, 'payment', 'success');
        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete Expense
router.delete('/:id', protect, async (req, res) => {
    try {
         const deleted = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user.id });
         if (deleted) {
           await logActivity(req.user, 'Delete Expense', `Deleted expense "${deleted.title || deleted.description || 'Expense'}"`, 'payment', 'warning');
         }
         res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
