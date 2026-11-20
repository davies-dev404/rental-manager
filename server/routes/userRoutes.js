const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

const ALLOWED_ROLES = new Set(['superadmin', 'admin', 'landlord', 'caretaker', 'tenant', 'manager']);
const SAFE_USER_PROJECTION = 'name email role phone avatar createdAt';

// @desc    Get organization-scoped users (global only for Super Admin)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const { role } = req.query;
    const isSuper = Boolean(req.user?.isSuperAdmin || req.user?.role === 'superadmin');

    const query = {};
    if (typeof role === 'string' && ALLOWED_ROLES.has(role.trim())) {
      query.role = role.trim();
    }

    if (!isSuper) {
      // Multi-tenant isolation: landlords/admins may only list staff/caretakers belonging to their own organization
      query.$or = [
        { organizationOwner: req.user._id || req.user.id },
        { _id: req.user._id || req.user.id }
      ];
    }

    const users = await User.find(query).select(SAFE_USER_PROJECTION).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

module.exports = router;
