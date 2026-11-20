const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Property = require('../models/Property');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectId, pickAllowed, isValidObjectId } = require('../middleware/securityMiddleware');
const logActivity = require('../utils/logActivity');

const ALLOWED_EXPENSE_FIELDS = [
    'title', 'description', 'amount', 'category', 'date', 'propertyId', 'unitId', 'vendor', 'notes', 'receiptNumber'
];

// Get All Expenses
router.get('/', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id })
          .populate('propertyId', 'name')
          .sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add Expense
router.post('/', protect, admin, async (req, res) => {
    try {
        const picked = pickAllowed(req.body, ALLOWED_EXPENSE_FIELDS);
        const title = String(picked.title || picked.description || 'General Expense').trim();
        const numericAmount = Number(picked.amount);
        if (!Number.isFinite(numericAmount) || numericAmount < 0) {
            return res.status(400).json({ message: 'Valid non-negative expense amount is required.' });
        }
        const payload = {
            ...picked,
            title,
            description: String(picked.description || title).trim(),
            amount: numericAmount,
            user: req.user.id
        };
        if (!payload.propertyId) {
            delete payload.propertyId;
        } else {
            if (!isValidObjectId(String(payload.propertyId))) {
                return res.status(400).json({ message: 'Invalid property identifier.' });
            }
            const ownedProp = await Property.findOne({ _id: payload.propertyId, user: req.user.id }).select('_id');
            if (!ownedProp) {
                return res.status(403).json({ message: 'Property not found or not owned by your organization.' });
            }
        }
        const expense = await Expense.create(payload);
        const populated = await Expense.findById(expense._id).populate('propertyId', 'name');
        await logActivity(req.user, 'Record Expense', `Recorded expense "${title}" (KES ${Number(expense.amount || 0).toLocaleString()})`, 'payment', 'success');
        res.status(201).json(populated || expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete Expense
router.delete('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
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
