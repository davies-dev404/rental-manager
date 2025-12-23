const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const properties = await Property.find().populate('caretakerId', 'name email');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a property
// @route   POST /api/properties
// @access  Private (Admin/Caretaker)
router.post('/', protect, async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    await property.deleteOne();
    res.json({ message: 'Property removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
