const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const logActivity = require('../utils/logActivity');
const { protect } = require('../middleware/authMiddleware');

// Get all tenants with payment status
router.get('/', protect, async (req, res) => {
  try {
    const tenants = await Tenant.find().populate('unitId', 'unitNumber rentAmount');
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch payments for this month
    const payments = await Payment.find({
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const tenantsWithStatus = tenants.map(tenant => {
        // Sum rent payments for this tenant this month
        const tenantPayments = payments.filter(p => p.tenantId && p.tenantId.toString() === tenant._id.toString());
        
        const totalRentPaid = tenantPayments.reduce((sum, p) => {
            if (p.type === 'Rent' || p.type === 'Combined') {
                return sum + (p.rentAmount || p.amount || 0);
            }
            return sum;
        }, 0);

        const expectedRent = tenant.rentAmount || tenant.unitId?.rentAmount || 0;
        
        let status = 'unpaid';
        if (totalRentPaid >= expectedRent && expectedRent > 0) {
            status = 'paid';
        } else if (totalRentPaid > 0) {
            status = 'partial';
        }

        return { ...tenant.toObject(), paymentStatus: status };
    });

    res.json(tenantsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add tenant
router.post('/', protect, async (req, res) => {
  try {
    if (req.body.unitId === "") delete req.body.unitId;
    
    const tenant = await Tenant.create(req.body);

    // If unit assigned, update unit status to occupied
    if (tenant.unitId) {
        await Unit.findByIdAndUpdate(tenant.unitId, { status: 'occupied' });
    }

    await logActivity(req.user, 'Add Tenant', `Added tenant ${tenant.name}`, 'tenant', 'success');

    res.status(201).json(tenant);
  } catch (error) {
    if (req.user) {
        await logActivity(req.user, 'Add Tenant Failed', `Failed to add tenant: ${error.message}`, 'tenant', 'error');
    }
    res.status(400).json({ message: error.message });
  }
});

// Update tenant
router.put('/:id', protect, async (req, res) => {
  try {
    if (req.body.unitId === "") {
        req.body.unitId = null;
    }
    const originalTenant = await Tenant.findById(req.params.id);
    if (!originalTenant) return res.status(404).json({ message: 'Tenant not found' });

    // Handle unit swap/removal logic
    if (req.body.unitId !== undefined && req.body.unitId !== (originalTenant.unitId?.toString() || null)) {
        // Vacate old unit if it existed
        if (originalTenant.unitId) {
            await Unit.findByIdAndUpdate(originalTenant.unitId, { status: 'vacant' });
        }
        // Occupy new unit if assigned
        if (req.body.unitId) {
            await Unit.findByIdAndUpdate(req.body.unitId, { status: 'occupied' });
        }
    }

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(tenant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete tenant
router.delete('/:id', protect, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Vacate unit if active
    if (tenant.status === 'active' && tenant.unitId) {
        await Unit.findByIdAndUpdate(tenant.unitId, { status: 'vacant' });
    }

    await tenant.deleteOne();
    res.json({ message: 'Tenant removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
