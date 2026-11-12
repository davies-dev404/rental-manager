const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const { protect, admin } = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

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
// @route   POST /api/units
// @access  Private (Admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const payload = { ...req.body };
    const tenantIdToAssign = payload.tenantId;
    delete payload.tenantId;

    if (tenantIdToAssign) {
      payload.status = 'occupied';
    }

    const unit = await Unit.create({ ...payload, user: req.user.id });

    // If a tenant was chosen during creation, link them
    if (tenantIdToAssign && mongoose.Types.ObjectId.isValid(tenantIdToAssign)) {
      await Tenant.findByIdAndUpdate(tenantIdToAssign, {
        unitId: unit._id,
        status: 'active'
      });
    }

    await logActivity(req.user, 'Create Unit', `Created unit "${unit.unitNumber}"`, 'unit', 'success');
    res.status(201).json(unit);
  } catch (error) {
    await logActivity(req.user, 'Create Unit Failed', `Failed to create unit: ${error.message}`, 'unit', 'error');
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a unit (supports assigning/reassigning/unassigning tenant)
// @route   PUT /api/units/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, user: req.user.id });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const payload = { ...req.body };
    const tenantId = payload.tenantId;
    delete payload.tenantId;

    // Handle Tenant Assignment / Unassignment
    if (tenantId !== undefined) {
      if (tenantId && tenantId !== 'none' && tenantId !== 'vacant' && mongoose.Types.ObjectId.isValid(tenantId)) {
        // 1. Unassign previous tenant who occupied this unit
        await Tenant.updateMany(
          { unitId: unit._id, _id: { $ne: tenantId } },
          { $unset: { unitId: "" } }
        );

        // 2. Assign the chosen tenant to this unit
        await Tenant.findByIdAndUpdate(tenantId, {
          unitId: unit._id,
          status: 'active'
        });

        // 3. Mark unit as occupied
        payload.status = 'occupied';
      } else if (tenantId === 'none' || tenantId === 'vacant' || tenantId === '' || tenantId === null) {
        // Landlord explicitly chose to vacate or unassign tenant
        await Tenant.updateMany(
          { unitId: unit._id },
          { $unset: { unitId: "" } }
        );
        if (!payload.status || payload.status === 'occupied') {
          payload.status = 'vacant';
        }
      }
    }

    const updatedUnit = await Unit.findByIdAndUpdate(req.params.id, payload, { new: true });
    await logActivity(req.user, 'Update Unit', `Updated unit "${updatedUnit.unitNumber}"`, 'unit', 'success');
    res.json(updatedUnit);
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

    // Unlink any tenant associated with this unit
    await Tenant.updateMany({ unitId: unit._id }, { $unset: { unitId: "" } });

    await unit.deleteOne();
    await logActivity(req.user, 'Delete Unit', `Deleted unit "${uNum}"`, 'unit', 'warning');
    res.json({ message: 'Unit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
