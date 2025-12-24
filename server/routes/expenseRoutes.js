const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');

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
        const expense = await Expense.create({ ...req.body, user: req.user.id });
        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete Expense
router.delete('/:id', protect, async (req, res) => {
    try {
         await Expense.findOneAndDelete({ _id: req.params.id, user: req.user.id });
         res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
