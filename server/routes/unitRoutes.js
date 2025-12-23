const express = require('express');
const router = express.Router();
const Unit = require('../models/Unit');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all units (optionally filter by propertyId)
// @route   GET /api/units
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const query = propertyId ? { propertyId } : {};
    const units = await Unit.find(query);
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a unit
// @route   POST /api/units
// @access  Private (Admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a unit
// @route   PUT /api/units/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json(unit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a unit
// @route   DELETE /api/units/:id
// @access  Private (Admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    await unit.deleteOne();
    res.json({ message: 'Unit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
