const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/authMiddleware');

// Get Dashboard Stats
router.get('/stats', protect, async (req, res) => {
  try {
    const totalProperties = await Property.countDocuments();
    const totalUnits = await Unit.countDocuments();
    const occupiedUnits = await Unit.countDocuments({ status: 'occupied' });
    const vacantUnits = await Unit.countDocuments({ status: 'vacant' });
    
    // Occupancy Rate
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Financials (This Month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const payments = await Payment.find({
        date: { $gte: startOfMonth, $lt: endOfMonth },
        status: { $in: ['paid', 'partial'] } // Only count actual revenue
    });

    const collectedThisMonth = payments.reduce((sum, p) => sum + p.amount, 0);

    // Outstanding (Overdue or Partial payments total - simplistic view)
    // A better way would be to sum 'rentAmount' of all occupied units vs what was collected.
    // For now, let's sum pending/overdue payments if we have them, or just mock it or calculate simple difference?
    // Let's use simplistic: Expected - Collected.
    
    // Calculate Expected Revenue (Sum of rent of ACTIVE TENANTS only to be accurate)
    const Tenant = require('../models/Tenant'); // Ensure Tenant model is imported
    const activeTenants = await Tenant.find({ status: 'active' }).populate('unitId');
    const expectedMonthlyRent = activeTenants.reduce((sum, t) => sum + (t.unitId?.rentAmount || 0), 0);
    
    // Outstanding = Expected - Collected
    let outstandingAmount = expectedMonthlyRent - collectedThisMonth;
    if (outstandingAmount < 0) outstandingAmount = 0;

    res.json({
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        collectedThisMonth,
        outstandingAmount, // Estimated
        expectedMonthlyRent
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
