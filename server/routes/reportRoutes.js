const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Unit = require('../models/Unit');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');

// Get All Reports Data
router.get('/', protect, async (req, res) => {
    try {
        const { range } = req.query; // '30days', '3months', '6months', '1year'
        
        // 1. Revenue Data (Last 6 months by default for specific charts, or filtered)
        const revenueData = await getRevenueData();
        
        // 2. Tenant Data (Status distribution)
        const totalUnits = await Unit.countDocuments();
        const occupied = await Unit.countDocuments({ status: 'occupied' });
        const vacant = await Unit.countDocuments({ status: 'vacant' });
        const maintenance = await Unit.countDocuments({ status: 'maintenance' });
        
        const tenantData = [
            { name: "Occupied", value: occupied, fill: "#10b981" }, // emerald-500
            { name: "Vacant", value: vacant, fill: "#f59e0b" },   // amber-500
            { name: "Maintenance", value: maintenance, fill: "#64748b" } // slate-500
        ].filter(d => d.value > 0);
        
        if (tenantData.length === 0) {
            tenantData.push({ name: "No Data", value: 1, fill: "#eee" });
        }

        // 3. Expenses Data
        const expenseData = await getExpenseData();

        res.json({
            revenueData,
            tenantData,
            expenseData
        });
    } catch (error) {
        console.error('Reports Error:', error);
        res.status(500).json({ message: error.message });
    }
});

async function getRevenueData() {
    const months = 6;
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(d);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const monthName = d.toLocaleString('default', { month: 'short' });
        
        // Collected
        const payments = await Payment.find({
            date: { $gte: d, $lt: nextMonth },
            status: { $in: ['paid', 'partial'] }
        });
        const collected = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Expected (Sum of rent of tenants active during this specific month)
        // We filter currently active tenants to valid dates.
        // NOTE: This misses tenants who were active then but are now 'past'.
        // To be 100% accurate, we would need a snapshot or history table.
        // But this fix handles the "current tenant shown as overlapping past months" issue.
        const Tenant = require('../models/Tenant');
        const activeTenants = await Tenant.find({ status: 'active' }).populate('unitId');
        
        const validTenantsForMonth = activeTenants.filter(t => {
            const startDate = t.leaseStart || t.createdAt;
            // If no date, assume they are new/legacy? 
            // Better to assume they are valid ONLY if we have a date < nextMonth
            // If legacy data has no dates, we might still show error. 
            // Let's rely on createdAt which Mongoose sets by default.
            if (!startDate) return true; 
            return new Date(startDate) < nextMonth;
        });

        const expected = validTenantsForMonth.reduce((sum, t) => sum + (t.unitId?.rentAmount || 0), 0);

        data.push({
            month: monthName,
            collected,
            expected: expected > collected ? expected : collected // simplistic
        });
    }
    return data;
}

async function getExpenseData() {
    // Group expenses by month (last 6 months)
    const months = 6;
    const data = [];
     for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        
        const nextMonth = new Date(d);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const monthName = d.toLocaleString('default', { month: 'short' });
        
        const expenses = await Expense.find({
            date: { $gte: d, $lt: nextMonth }
        });
        
        const amount = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        data.push({
            month: monthName,
            amount
        });
     }
     return data;
}

module.exports = router;
