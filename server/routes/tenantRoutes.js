const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const logActivity = require('../utils/logActivity');
const { protect } = require('../middleware/authMiddleware');

// Get all tenants with payment status
router.get('/', protect, async (req, res) => {
  try {
    const tenants = await Tenant.find({ user: req.user.id }).populate('unitId', 'unitNumber rentAmount propertyId');
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch payments for this month
    const payments = await Payment.find({
        user: req.user.id,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const tenantsWithStatus = tenants.map(tenant => {
        // Sum completed/paid payments for this tenant this month
        const tenantPayments = payments.filter(p => 
            p.tenantId && p.tenantId.toString() === tenant._id.toString() &&
            ['paid', 'partial', 'Completed'].includes(p.status)
        );
        
        const totalRentPaid = tenantPayments.reduce((sum, p) => sum + (p.rentAmount || 0), 0);
        const totalUtilityPaid = tenantPayments.reduce((sum, p) => sum + (p.utilityAmount || 0), 0);
        const totalPaid = tenantPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const expectedRent = tenant.rentAmount || tenant.unitId?.rentAmount || 0;
        
        // Sum active utilities configured for tenant
        const activeUtilities = Array.isArray(tenant.utilities) ? tenant.utilities : [];
        const expectedUtilities = activeUtilities
            .filter(u => !u.isIncluded)
            .reduce((sum, u) => sum + (Number(u.amount) || 0), 0);

        const totalExpected = expectedRent + expectedUtilities;
        const totalDue = Math.max(0, totalExpected - totalPaid);
        const rentDue = Math.max(0, expectedRent - totalRentPaid);
        const utilityDue = Math.max(0, expectedUtilities - totalUtilityPaid);

        let status = 'unpaid';
        if (totalDue === 0 && totalExpected > 0) {
            status = 'paid';
        } else if (totalPaid > 0) {
            status = 'partial';
        }

        return { 
            ...tenant.toObject(), 
            paymentStatus: status,
            totalExpected,
            totalPaid,
            totalDue,
            rentDue,
            utilityDue,
            expectedRent,
            expectedUtilities,
            utilitiesBreakdown: activeUtilities
        };
    });

    res.json(tenantsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add tenant
router.post('/', protect, async (req, res) => {
  try {
    const payload = { ...req.body };

    // Sanitize unitId: remove if empty, "none", "undefined", or invalid ObjectId
    if (!payload.unitId || payload.unitId === "" || payload.unitId === "none" || payload.unitId === "undefined" || payload.unitId === "null") {
      delete payload.unitId;
    } else if (!mongoose.Types.ObjectId.isValid(payload.unitId)) {
      delete payload.unitId;
    }

    // Default name validation
    if (!payload.name || payload.name.trim() === '') {
      return res.status(400).json({ message: 'Tenant Name is required.' });
    }

    // Default phone validation
    if (!payload.phone || payload.phone.trim() === '') {
      return res.status(400).json({ message: 'Tenant Phone Number is required.' });
    }

    // Default nationalId if missing or empty
    if (!payload.nationalId || payload.nationalId.trim() === '') {
      payload.nationalId = `ID-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Default email if missing or empty
    if (!payload.email || payload.email.trim() === '') {
      const cleanName = payload.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'tenant';
      payload.email = `${cleanName}_${Date.now()}@makaziflow.com`;
    }

    // Deposit computation: if deposits array has items, sum them; otherwise use deposit field
    let totalDeposit = Number(payload.deposit) || 0;
    if (Array.isArray(payload.deposits) && payload.deposits.length > 0) {
      const sumDeposits = payload.deposits.reduce((acc, d) => acc + (Number(d.paid) || 0), 0);
      if (sumDeposits > 0) {
        totalDeposit = sumDeposits;
      }
    }
    payload.deposit = totalDeposit;

    if (!payload.depositType) {
      payload.depositType = payload.deposits?.[0]?.type || 'Rent Deposit';
    }

    const tenant = await Tenant.create({ ...payload, user: req.user.id });

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
    res.status(400).json({ message: error.message || 'Failed to add tenant.' });
  }
});

// Update tenant
router.put('/:id', protect, async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.unitId === "" || payload.unitId === "none" || payload.unitId === "undefined" || payload.unitId === "null") {
      payload.unitId = null;
    } else if (payload.unitId && !mongoose.Types.ObjectId.isValid(payload.unitId)) {
      payload.unitId = null;
    }

    const originalTenant = await Tenant.findOne({ _id: req.params.id, user: req.user.id });
    if (!originalTenant) return res.status(404).json({ message: 'Tenant not found' });

    // Handle unit swap/removal logic
    if (payload.unitId !== undefined && payload.unitId !== (originalTenant.unitId?.toString() || null)) {
      // Vacate old unit if it existed
      if (originalTenant.unitId) {
        await Unit.findByIdAndUpdate(originalTenant.unitId, { status: 'vacant' });
      }
      // Occupy new unit if assigned
      if (payload.unitId) {
        await Unit.findByIdAndUpdate(payload.unitId, { status: 'occupied' });
      }
    }

    // Deposit recalculation if updated
    if (Array.isArray(payload.deposits) && payload.deposits.length > 0) {
      const sumDeposits = payload.deposits.reduce((acc, d) => acc + (Number(d.paid) || 0), 0);
      if (sumDeposits > 0) {
        payload.deposit = sumDeposits;
      }
    }

    const tenant = await Tenant.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, payload, { new: true });
    res.json(tenant);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update tenant.' });
  }
});

// Delete tenant
router.delete('/:id', protect, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ _id: req.params.id, user: req.user.id });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    // Vacate unit if active
    if (tenant.status === 'active' && tenant.unitId) {
      await Unit.findByIdAndUpdate(tenant.unitId, { status: 'vacant' });
    }

    await tenant.deleteOne();
    res.json({ message: 'Tenant removed' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete tenant.' });
  }
});

module.exports = router;
