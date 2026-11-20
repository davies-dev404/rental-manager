const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectId, pickAllowed, isValidObjectId } = require('../middleware/securityMiddleware');
const { resolveLandlordId } = require('../middleware/subscriptionMiddleware');
const { reserveUnitSlot, releaseUnitSlot } = require('../services/subscriptionService');
const logActivity = require('../utils/logActivity');

const ALLOWED_UNIT_FIELDS = [
  'propertyId',
  'unitNumber',
  'type',
  'rentAmount',
  'bedrooms',
  'bathrooms',
  'size',
  'status',
  'features',
  'notes'
];

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

// @desc    Create a unit (Protected by Atomic Subscription Unit Limit Enforcement)
// @route   POST /api/units
// @access  Private (Admin)
router.post('/', protect, admin, async (req, res) => {
  let slotReserved = false;
  let landlordId = req.user._id || req.user.id;
  try {
    landlordId = await resolveLandlordId(req);

    // 1. Atomic concurrency-safe check & reservation against purchased unit limit
    await reserveUnitSlot(landlordId);
    slotReserved = true;

    const payload = pickAllowed(req.body, ALLOWED_UNIT_FIELDS);
    const tenantIdToAssign = req.body?.tenantId;

    if (payload.propertyId) {
      if (!isValidObjectId(String(payload.propertyId))) {
        throw new Error('Invalid property identifier');
      }
      const ownedProp = await Property.findOne({ _id: payload.propertyId, user: landlordId }).select('_id');
      if (!ownedProp) {
        const err = new Error('Property not found or not owned by your organization');
        err.statusCode = 403;
        throw err;
      }
    }

    let validTenantToAssign = null;
    if (tenantIdToAssign && tenantIdToAssign !== 'none' && tenantIdToAssign !== 'vacant') {
      if (!isValidObjectId(String(tenantIdToAssign))) {
        throw new Error('Invalid tenant identifier');
      }
      validTenantToAssign = await Tenant.findOne({ _id: tenantIdToAssign, user: landlordId }).select('_id');
      if (!validTenantToAssign) {
        const err = new Error('Tenant not found or not owned by your organization');
        err.statusCode = 403;
        throw err;
      }
      payload.status = 'occupied';
    }

    const unit = await Unit.create({ ...payload, user: landlordId });

    // If a verified owned tenant was chosen during creation, link them
    if (validTenantToAssign) {
      await Tenant.findOneAndUpdate(
        { _id: validTenantToAssign._id, user: landlordId },
        { unitId: unit._id, status: 'active' }
      );
    }

    await logActivity(req.user, 'Create Unit', `Created unit "${unit.unitNumber}"`, 'unit', 'success');
    res.status(201).json(unit);
  } catch (error) {
    // Roll back reserved slot if Unit.create failed after reservation
    if (slotReserved) {
      await releaseUnitSlot(landlordId);
    }
    const statusCode = error.statusCode || 400;
    await logActivity(req.user, 'Create Unit Failed', `Failed to create unit: ${error.message}`, 'unit', statusCode === 403 ? 'warning' : 'error');
    res.status(statusCode).json({
      message: error.message,
      code: error.code || undefined,
      limit: error.limit || undefined,
      activeUnitCount: error.activeUnitCount || undefined,
      upgradeRequired: error.code === 'UNIT_LIMIT_REACHED' || error.code === 'SUBSCRIPTION_INACTIVE' || error.code === 'SUBSCRIPTION_EXPIRED'
    });
  }
});

// @desc    Update a unit (supports assigning/reassigning/unassigning tenant)
// @route   PUT /api/units/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, user: req.user.id });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const payload = pickAllowed(req.body, ALLOWED_UNIT_FIELDS);
    const tenantId = req.body?.tenantId;

    if (payload.propertyId) {
      if (!isValidObjectId(String(payload.propertyId))) {
        return res.status(400).json({ message: 'Invalid property identifier' });
      }
      const ownedProp = await Property.findOne({ _id: payload.propertyId, user: req.user.id }).select('_id');
      if (!ownedProp) {
        return res.status(403).json({ message: 'Not authorized to move unit to that property' });
      }
    }

    // Handle Tenant Assignment / Unassignment (strictly scoped to req.user.id)
    if (tenantId !== undefined) {
      if (tenantId && tenantId !== 'none' && tenantId !== 'vacant' && isValidObjectId(String(tenantId))) {
        const ownedTenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).select('_id');
        if (!ownedTenant) {
          return res.status(403).json({ message: 'Not authorized to assign that tenant' });
        }

        // 1. Unassign previous tenant who occupied this unit (owned by this user)
        await Tenant.updateMany(
          { unitId: unit._id, user: req.user.id, _id: { $ne: tenantId } },
          { $unset: { unitId: "" } }
        );

        // 2. Assign the chosen owned tenant to this unit
        await Tenant.findOneAndUpdate(
          { _id: tenantId, user: req.user.id },
          { unitId: unit._id, status: 'active' }
        );

        // 3. Mark unit as occupied
        payload.status = 'occupied';
      } else if (tenantId === 'none' || tenantId === 'vacant' || tenantId === '' || tenantId === null) {
        // Landlord explicitly chose to vacate or unassign tenant
        await Tenant.updateMany(
          { unitId: unit._id, user: req.user.id },
          { $unset: { unitId: "" } }
        );
        if (!payload.status || payload.status === 'occupied') {
          payload.status = 'vacant';
        }
      }
    }

    const updatedUnit = await Unit.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: payload },
      { returnDocument: 'after', runValidators: true }
    );
    await logActivity(req.user, 'Update Unit', `Updated unit "${updatedUnit.unitNumber}"`, 'unit', 'success');
    res.json(updatedUnit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a unit
// @route   DELETE /api/units/:id
// @access  Private (Admin)
router.delete('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.params.id, user: req.user.id });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    const uNum = unit.unitNumber;

    // Unlink any tenant owned by this user associated with this unit
    await Tenant.updateMany({ unitId: unit._id, user: req.user.id }, { $unset: { unitId: "" } });

    await unit.deleteOne();
    await releaseUnitSlot(unit.user || req.user.id);
    await logActivity(req.user, 'Delete Unit', `Deleted unit "${uNum}"`, 'unit', 'warning');
    res.json({ message: 'Unit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
