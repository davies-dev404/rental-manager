const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');

// Paid statuses (all casing variants the system uses)
const PAID_STATUSES = ['paid', 'Paid', 'partial', 'Partial', 'Completed', 'completed'];
const UNPAID_STATUSES = ['pending', 'Pending', 'unpaid', 'Unpaid', 'overdue', 'Overdue', 'Failed', 'failed'];

// Get Dashboard Stats (parallelized & single-pass aggregated for fast cold/warm response)
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjId = req.user._id || new mongoose.Types.ObjectId(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const sixMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    // Performance history starts from the month the account was opened (capped to last 6 months)
    const rawAccountCreated = req.user.createdAt
      ? new Date(req.user.createdAt)
      : (typeof userObjId.getTimestamp === 'function' ? userObjId.getTimestamp() : now);
    const accountCreatedAt = isNaN(rawAccountCreated.getTime()) ? now : rawAccountCreated;
    const accountStartMonth = new Date(accountCreatedAt.getFullYear(), accountCreatedAt.getMonth(), 1, 0, 0, 0, 0);
    const trendStart = accountStartMonth > sixMonthStart ? accountStartMonth : sixMonthStart;

    // Run all independent counts, lookups, and trend aggregations in a single parallel batch
    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      activeTenants,
      unpaidTrendAgg,
      paymentTrendAgg,
      expenseTrendAgg
    ] = await Promise.all([
      Property.countDocuments({ user: userId }),
      Unit.countDocuments({ user: userId }),
      Unit.countDocuments({ status: 'occupied', user: userId }),
      Unit.countDocuments({ status: 'vacant', user: userId }),
      Tenant.find({ status: 'active', user: userId }).populate('unitId', 'rentAmount').lean(),
      Payment.aggregate([
        {
          $match: {
            user: userObjId,
            date: { $gte: trendStart, $lt: endOfMonth },
            status: { $in: UNPAID_STATUSES }
          }
        },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' }
          }
        }
      ]),
      Payment.aggregate([
        {
          $match: {
            user: userObjId,
            date: { $gte: trendStart, $lt: endOfMonth },
            status: { $in: PAID_STATUSES }
          }
        },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            user: userObjId,
            $or: [
              { date: { $gte: trendStart, $lt: endOfMonth } },
              { date: { $exists: false }, createdAt: { $gte: trendStart, $lt: endOfMonth } }
            ]
          }
        },
        {
          $addFields: {
            effectiveDate: { $ifNull: ['$date', '$createdAt'] }
          }
        },
        {
          $group: {
            _id: { year: { $year: '$effectiveDate' }, month: { $month: '$effectiveDate' } },
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const totalTenants = activeTenants.length;

    const getTenantMonthlyTotal = (t) => {
      const rent = t.rentAmount || t.unitId?.rentAmount || 0;
      const utilities = Array.isArray(t.utilities)
        ? t.utilities.filter(u => !u.isIncluded).reduce((s, u) => s + (Number(u.amount) || 0), 0)
        : 0;
      return rent + utilities;
    };

    const getTenantStartMonth = (t) => {
      const rawStart = t.leaseStart ? new Date(t.leaseStart) : (t.createdAt ? new Date(t.createdAt) : accountCreatedAt);
      const validStart = isNaN(rawStart.getTime()) ? accountCreatedAt : rawStart;
      const startMonth = new Date(validStart.getFullYear(), validStart.getMonth(), 1, 0, 0, 0, 0);
      return startMonth < accountStartMonth ? accountStartMonth : startMonth;
    };

    const expectedMonthlyRent = activeTenants.reduce((sum, t) => sum + getTenantMonthlyTotal(t), 0);

    const paymentMap = new Map(
      paymentTrendAgg.map(item => [`${item._id.year}-${item._id.month}`, item.total || 0])
    );
    const unpaidMap = new Map(
      unpaidTrendAgg.map(item => [`${item._id.year}-${item._id.month}`, item.total || 0])
    );
    const expenseMap = new Map(
      expenseTrendAgg.map(item => [`${item._id.year}-${item._id.month}`, item.total || 0])
    );

    const curKey = `${startOfMonth.getFullYear()}-${startOfMonth.getMonth() + 1}`;
    const collectedThisMonth = paymentMap.get(curKey) || 0;
    const totalExpenses = expenseMap.get(curKey) || 0;
    const recordedUnpaidAmount = unpaidMap.get(curKey) || 0;

    const gapFromExpected = Math.max(0, expectedMonthlyRent - collectedThisMonth);
    const outstandingAmount = Math.max(gapFromExpected, recordedUnpaidAmount);

    const sixMonthTrend = [];
    for (
      let d = new Date(trendStart.getFullYear(), trendStart.getMonth(), 1, 0, 0, 0, 0);
      d <= startOfMonth;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
    ) {
      const mName = d.toLocaleString('default', { month: 'short' });
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const mRevenue = paymentMap.get(key) || 0;
      const mUnpaid = unpaidMap.get(key) || 0;
      const mExpenses = expenseMap.get(key) || 0;

      // Only count expected rent in months after both the account opened and each tenant's lease started
      const mExpected = activeTenants.reduce((sum, t) => {
        return d >= getTenantStartMonth(t) ? sum + getTenantMonthlyTotal(t) : sum;
      }, 0);

      sixMonthTrend.push({
        name: mName,
        revenue: mRevenue,
        expenses: mExpenses,
        target: Math.max(mExpected, mRevenue + mUnpaid)
      });
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
