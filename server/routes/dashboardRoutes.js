const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/authMiddleware');

// Paid statuses (all casing variants the system uses)
const PAID_STATUSES = ['paid', 'Paid', 'partial', 'Partial', 'Completed', 'completed'];
const UNPAID_STATUSES = ['pending', 'Pending', 'unpaid', 'Unpaid', 'overdue', 'Overdue', 'Failed', 'failed'];

// Get Dashboard Stats
router.get('/stats', protect, async (req, res) => {
  try {
    const Tenant = require('../models/Tenant');
    const Expense = require('../models/Expense');

    const totalProperties = await Property.countDocuments({ user: req.user.id });
    const totalUnits = await Unit.countDocuments({ user: req.user.id });
    const occupiedUnits = await Unit.countDocuments({ status: 'occupied', user: req.user.id });
    const vacantUnits = await Unit.countDocuments({ status: 'vacant', user: req.user.id });

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // ── This month window ──────────────────────────────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // ── Collected (paid) payments this month ──────────────────────────────
    const paidPayments = await Payment.find({
      user: req.user.id,
      date: { $gte: startOfMonth, $lt: endOfMonth },
      status: { $in: PAID_STATUSES }
    });
    const collectedThisMonth = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // ── Recorded-but-unpaid payments this month ───────────────────────────
    const unpaidPayments = await Payment.find({
      user: req.user.id,
      date: { $gte: startOfMonth, $lt: endOfMonth },
      status: { $in: UNPAID_STATUSES }
    });
    const recordedUnpaidAmount = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // ── Expected revenue from active tenants ──────────────────────────────
    const activeTenants = await Tenant.find({ status: 'active', user: req.user.id }).populate('unitId');
    const expectedMonthlyRent = activeTenants.reduce((sum, t) => {
      const rent = t.rentAmount || t.unitId?.rentAmount || 0;
      const utilities = Array.isArray(t.utilities)
        ? t.utilities.filter(u => !u.isIncluded).reduce((s, u) => s + (Number(u.amount) || 0), 0)
        : 0;
      return sum + rent + utilities;
    }, 0);

    // ── Outstanding: whichever is larger — the gap from expected OR recorded unpaid ──
    const gapFromExpected = Math.max(0, expectedMonthlyRent - collectedThisMonth);
    const outstandingAmount = Math.max(gapFromExpected, recordedUnpaidAmount);

    const totalTenants = await Tenant.countDocuments({ user: req.user.id, status: 'active' });

    // ── Expenses this month (aggregate handles both date and createdAt) ────
    const expAgg = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          $or: [
            { date: { $gte: startOfMonth, $lt: endOfMonth } },
            { createdAt: { $gte: startOfMonth, $lt: endOfMonth } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expAgg.length > 0 ? expAgg[0].total : 0;

    // ── 6-Month trend ──────────────────────────────────────────────────────
    const sixMonthTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const mName = d.toLocaleString('default', { month: 'short' });

      const mPaid = await Payment.find({
        user: req.user.id,
        date: { $gte: d, $lt: nextMonth },
        status: { $in: PAID_STATUSES }
      });
      const mCollected = mPaid.reduce((s, p) => s + (p.amount || 0), 0);

      const mExpAgg = await Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: d, $lt: nextMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const mExpenses = mExpAgg.length > 0 ? mExpAgg[0].total : 0;

      sixMonthTrend.push({ name: mName, revenue: mCollected, expenses: mExpenses, target: expectedMonthlyRent });
    }

    res.json({
      totalProperties,
      totalUnits,
      totalTenants,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      collectedThisMonth,
      outstandingAmount,
      recordedUnpaidAmount,
      expectedMonthlyRent,
      expensesThisMonth: totalExpenses,
      netIncomeThisMonth: collectedThisMonth - totalExpenses,
      sixMonthTrend
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
