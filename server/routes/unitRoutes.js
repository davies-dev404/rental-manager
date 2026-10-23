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
    const Property = require('../models/Property');
    const userProperties = await Property.find({ 
      $or: [{ user: req.user.id }, { caretakerId: req.user.id }] 
    }).select('_id');
    const propIds = userProperties.map(p => p._id);

    let query = {
      $or: [
        { user: req.user.id },
        { propertyId: { $in: propIds } }
      ]
    };
    if (propertyId && propertyId !== '[object Object]' && propertyId.trim() !== '') {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(propertyId)) {
        query = { propertyId, $or: query.$or };
      }
    }
    const units = await Unit.find(query).populate('propertyId', 'name location');
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a unit
const logActivity = require('../utils/logActivity');

// @desc    Create a unit
// @route   POST /api/units
// @access  Private (Admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.create({ ...req.body, user: req.user.id });
    await logActivity(req.user, 'Create Unit', `Created unit "${unit.unitNumber}"`, 'unit', 'success');
    res.status(201).json(unit);
  } catch (error) {
    await logActivity(req.user, 'Create Unit Failed', `Failed to create unit: ${error.message}`, 'unit', 'error');
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a unit
// @route   PUT /api/units/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { new: true });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    await logActivity(req.user, 'Update Unit', `Updated unit "${unit.unitNumber}" (Rent: ${unit.rentAmount || 0})`, 'unit', 'success');
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
    const unit = await Unit.findOne({ _id: req.params.id, user: req.user.id });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    const uNum = unit.unitNumber;
    await unit.deleteOne();
    await logActivity(req.user, 'Delete Unit', `Deleted unit "${uNum}"`, 'unit', 'warning');
    res.json({ message: 'Unit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

