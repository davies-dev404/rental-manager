const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  validateObjectId,
  pickAllowed,
  validateSafeImageInput,
  isValidObjectId
} = require('../middleware/securityMiddleware');

const ALLOWED_PROPERTY_FIELDS = ['name', 'location', 'type', 'image', 'caretakerId'];

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const Unit = require('../models/Unit');
    const properties = await Property.find({ user: req.user.id }).populate('caretakerId', 'name email').lean();
    
    // Attach all units to their respective properties
    const propertyIds = properties.map(p => p._id);
    const allUnits = await Unit.find({ propertyId: { $in: propertyIds } }).lean();

    const propertiesWithUnits = properties.map(prop => {
      const propUnits = allUnits.filter(u => String(u.propertyId) === String(prop._id));
      const vacancies = propUnits.filter(u => u.status === 'vacant').length;
      return {
        ...prop,
        units: propUnits,
        totalUnits: propUnits.length,
        vacancies
      };
    });

    res.json(propertiesWithUnits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const logActivity = require('../utils/logActivity');

// @desc    Create a property
// @route   POST /api/properties
// @access  Private (Admin/Landlord)
router.post('/', protect, admin, async (req, res) => {
  try {
    const updates = pickAllowed(req.body, ALLOWED_PROPERTY_FIELDS);
    if (!updates.name || !String(updates.name).trim()) {
      return res.status(400).json({ message: 'Property name is required' });
    }
    updates.name = String(updates.name).trim();
    if (updates.location !== undefined) updates.location = String(updates.location).trim();
    if (updates.image !== undefined) {
      const imgCheck = validateSafeImageInput(updates.image);
      if (!imgCheck.valid) return res.status(400).json({ message: imgCheck.message });
      updates.image = imgCheck.value;
    }
    if (updates.caretakerId) {
      if (!isValidObjectId(String(updates.caretakerId))) {
        return res.status(400).json({ message: 'Invalid caretaker identifier' });
      }
      const caretaker = await User.findOne({
        _id: updates.caretakerId,
        $or: [{ organizationOwner: req.user.id }, { _id: req.user.id }]
      }).select('_id');
      if (!caretaker) {
        return res.status(403).json({ message: 'Caretaker does not belong to your organization' });
      }
    }

    const property = await Property.create({ ...updates, user: req.user.id });
    await logActivity(req.user, 'Create Property', `Created property "${property.name}" in ${property.location || 'N/A'}`, 'property', 'success');
    res.status(201).json(property);
  } catch (error) {
    await logActivity(req.user, 'Create Property Failed', `Failed to create property: ${error.message}`, 'property', 'error');
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private (Admin/Landlord)
router.put('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const updates = pickAllowed(req.body, ALLOWED_PROPERTY_FIELDS);
    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    if (updates.location !== undefined) updates.location = String(updates.location).trim();
    if (updates.image !== undefined) {
      const imgCheck = validateSafeImageInput(updates.image);
      if (!imgCheck.valid) return res.status(400).json({ message: imgCheck.message });
      updates.image = imgCheck.value;
    }
    if (updates.caretakerId !== undefined && updates.caretakerId !== null && updates.caretakerId !== '') {
      if (!isValidObjectId(String(updates.caretakerId))) {
        return res.status(400).json({ message: 'Invalid caretaker identifier' });
      }
      const caretaker = await User.findOne({
        _id: updates.caretakerId,
        $or: [{ organizationOwner: req.user.id }, { _id: req.user.id }]
      }).select('_id');
      if (!caretaker) {
        return res.status(403).json({ message: 'Caretaker does not belong to your organization' });
      }
    }

    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    await logActivity(req.user, 'Update Property', `Updated property "${property.name}"`, 'property', 'success');
    res.json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a property
// @route   DELETE /api/properties/:id
// @access  Private (Admin only)
router.delete('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, user: req.user.id });
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const propName = property.name;
    await property.deleteOne();
    await logActivity(req.user, 'Delete Property', `Deleted property "${propName}"`, 'property', 'warning');
    res.json({ message: 'Property removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
