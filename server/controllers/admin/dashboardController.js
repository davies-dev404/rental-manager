const User = require('../../models/User');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentCallback = require('../../models/PaymentCallback');
const LandlordSubscription = require('../../models/LandlordSubscription');
const SupportTicket = require('../../models/SupportTicket');
const TaxSubmission = require('../../models/TaxSubmission');
const AdminLog = require('../../models/AdminLog');
const ActivityLog = require('../../models/ActivityLog');
const PlatformSetting = require('../../models/PlatformSetting');
const PaymentService = require('../../services/payments/PaymentService');

function buildLastMonths(count = 6) {
  const result = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    result.push({ key, label });
  }
  return result;
}

exports.getOverviewDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const months = buildLastMonths(6);
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const prodMatch = { gatewayEnvironment: 'production', isSandbox: { $ne: true } };

    const [
      userCountsAgg,
      activeLandlordsCount,
      totalProperties,
      totalTenants,
      unitCountsAgg,
      txnStatusAgg,
      monthlySubRevAgg,
      totalSubRevAgg,
      sandboxVolAgg,
      subStatusAgg,
      subPlanDistAgg,
      monthlyRevenueSeriesAgg,
      monthlyRentSeriesAgg,
      userGrowthAgg,
      recentAdminLogs,
      recentActivityLogs,
      recentTransactions,
      newRegistrations,
      unmatchedCallbacksCount,
      failedEtimsCount,
      openTicketsCount,
      expiringSubsCount,
      platformSetting
    ] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            suspendedAccounts: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'suspended'] }, 1, 0] }
            },
            pendingVerificationAccounts: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'pending_verification'] }, 1, 0] }
            },
            deactivatedAccounts: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'deactivated'] }, 1, 0] }
            }
          }
        }
      ]),
      User.countDocuments({
        role: { $in: ['admin', 'landlord'] },
        isSuperAdmin: { $ne: true },
        accountStatus: { $nin: ['suspended', 'deactivated'] }
      }),
      Property.countDocuments(),
      Tenant.countDocuments(),
      Unit.aggregate([
        {
          $group: {
            _id: null,
            totalUnits: { $sum: 1 },
            occupiedUnits: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
            vacantUnits: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } },
            maintenanceUnits: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        { $match: prodMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: { $ifNull: ['$amountPaid', '$amount'] } }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            ...prodMatch,
            status: 'paid',
            paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] },
            $or: [
              { paidAt: { $gte: startOfMonth } },
              { paidAt: { $exists: false }, createdAt: { $gte: startOfMonth } }
            ]
          }
        },
        { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } } } }
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            ...prodMatch,
            status: 'paid',
            paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] }
          }
        },
        { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } } } }
      ]),
      PaymentTransaction.aggregate([
        { $match: { status: 'paid', $or: [{ gatewayEnvironment: 'sandbox' }, { isSandbox: true }] } },
        { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }, count: { $sum: 1 } } }
      ]),
      LandlordSubscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      LandlordSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trial', 'grace_period'] } } },
        { $group: { _id: '$planName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PaymentTransaction.aggregate([
        { $match: { ...prodMatch, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: { $ifNull: ['$paidAt', '$createdAt'] } } },
            subscriptionRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$paymentCategory', ['subscription', 'unit_upgrade', 'subscription_renewal']] },
                  { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] },
                  0
                ]
              }
            },
            tenantGatewayVolume: {
              $sum: {
                $cond: [
                  { $in: ['$paymentCategory', ['subscription', 'unit_upgrade', 'subscription_renewal']] },
                  0,
                  { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] }
                ]
              }
            }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] }, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            users: { $sum: 1 }
          }
        }
      ]),
      AdminLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      ActivityLog.find().sort({ timestamp: -1 }).limit(8).lean(),
      PaymentTransaction.find()
        .populate('landlordId', 'name email')
        .populate('tenantId', 'name')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      User.find()
        .select('name email phone role accountStatus isVerified createdAt')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      PaymentCallback.countDocuments({ processingStatus: 'unmatched' }),
      TaxSubmission.countDocuments({ status: 'failed' }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress', 'pending'] } }),
      LandlordSubscription.countDocuments({
        status: { $in: ['active', 'trial', 'grace_period'] },
        expiryDate: { $gte: now, $lte: in14Days }
      }),
      PlatformSetting.findOne({ key: 'global' }).select('maintenanceMode platformName defaultCurrency').lean()
    ]);

    const userStats = userCountsAgg[0] || {};
    const unitStats = unitCountsAgg[0] || {};

    let paidTxnCount = 0;
    let totalProcessedVolume = 0;
    let pendingTxnCount = 0;
    let failedTxnCount = 0;
    txnStatusAgg.forEach((row) => {
      if (row._id === 'paid') {
        paidTxnCount += row.count;
        totalProcessedVolume += row.volume || 0;
      } else if (['pending', 'processing'].includes(row._id)) {
        pendingTxnCount += row.count;
      } else if (['failed', 'cancelled'].includes(row._id)) {
        failedTxnCount += row.count;
      }
    });

    const subStatusMap = {};
    subStatusAgg.forEach((s) => { subStatusMap[s._id] = s.count; });

    const subSeriesMap = new Map(monthlyRevenueSeriesAgg.map((r) => [r._id, r]));
    const rentSeriesMap = new Map(monthlyRentSeriesAgg.map((r) => [r._id, r]));
    const growthMap = new Map(userGrowthAgg.map((r) => [r._id, r.users]));

    const revenueChart = months.map((m) => ({
      month: m.label,
      monthKey: m.key,
      subscriptionRevenue: subSeriesMap.get(m.key)?.subscriptionRevenue || 0,
      rentPaymentsVolume: rentSeriesMap.get(m.key)?.total || subSeriesMap.get(m.key)?.tenantGatewayVolume || 0
    }));

    const userGrowthChart = months.map((m) => ({
      month: m.label,
      monthKey: m.key,
      registrations: growthMap.get(m.key) || 0
    }));

    const subscriptionDistribution = subPlanDistAgg.map((d) => ({
      plan: d._id || 'Starter',
      count: d.count
    }));

    const recentActivities = [
      ...recentAdminLogs.map((l) => ({
        _id: `adm_${l._id}`,
        source: 'admin',
        actor: l.adminName || l.adminEmail || 'Super Admin',
        action: l.action,
        description: l.details,
        status: l.status || 'success',
        timestamp: l.createdAt
      })),
      ...recentActivityLogs.map((l) => ({
        _id: `act_${l._id}`,
        source: 'platform',
        actor: l.user || 'User',
        action: l.action,
        description: l.description,
        status: l.status || 'success',
        timestamp: l.timestamp
      }))
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 12);

    const systemNotifications = [];
    if (platformSetting?.maintenanceMode) {
      systemNotifications.push({
        id: 'maintenance-active',
        severity: 'warning',
        title: 'Maintenance Mode Enabled',
        message: 'Non-admin API routes are currently paused for scheduled maintenance.'
      });
    }
    if (unmatchedCallbacksCount > 0) {
      systemNotifications.push({
        id: 'unmatched-callbacks',
        severity: 'warning',
        title: `${unmatchedCallbacksCount} Unmatched Payment Callback(s)`,
        message: 'Incoming gateway webhooks could not automatically match a tenant or subscription invoice.'
      });
    }
    if (openTicketsCount > 0) {
      systemNotifications.push({
        id: 'open-tickets',
        severity: 'info',
        title: `${openTicketsCount} Open Support Ticket(s)`,
        message: 'Review and assign pending customer support requests.'
      });
    }
    if (failedEtimsCount > 0) {
      systemNotifications.push({
        id: 'failed-etims',
        severity: 'error',
        title: `${failedEtimsCount} Failed eTIMS Submission(s)`,
        message: 'Tax compliance retries are awaiting inspection.'
      });
    }
    if (expiringSubsCount > 0) {
      systemNotifications.push({
        id: 'expiring-subs',
        severity: 'info',
        title: `${expiringSubsCount} Subscription(s) Expiring Within 14 Days`,
        message: 'Upcoming renewals scheduled across landlord accounts.'
      });
    }

    const gwStatus = PaymentService.getActiveGatewayStatus();

    res.json({
      metrics: {
        totalUsers: userStats.totalUsers || 0,
        activeLandlords: activeLandlordsCount || 0,
        totalProperties: totalProperties || 0,
        totalTenants: totalTenants || 0,
        totalUnits: unitStats.totalUnits || 0,
        occupiedUnits: unitStats.occupiedUnits || 0,
        vacantUnits: unitStats.vacantUnits || 0,
        maintenanceUnits: unitStats.maintenanceUnits || 0,
        totalPaymentsProcessed: paidTxnCount,
        totalProcessedVolume,
        pendingPayments: pendingTxnCount,
        failedPayments: failedTxnCount,
        monthlyPlatformRevenue: monthlySubRevAgg[0]?.total || 0,
        totalPlatformRevenue: totalSubRevAgg[0]?.total || 0,
        activeSubscriptions: (subStatusMap.active || 0) + (subStatusMap.trial || 0),
        expiredSubscriptions: subStatusMap.expired || 0,
        graceSubscriptions: subStatusMap.grace_period || 0,
        suspendedAccounts: userStats.suspendedAccounts || 0,
        pendingVerificationAccounts: userStats.pendingVerificationAccounts || 0,
        openSupportTickets: openTicketsCount || 0,
        unmatchedCallbacksCount: unmatchedCallbacksCount || 0,
        sandboxTestVolume: sandboxVolAgg[0]?.total || 0,
        sandboxTestCount: sandboxVolAgg[0]?.count || 0,
        gatewayProvider: gwStatus.provider,
        gatewayEnvironment: gwStatus.environment || 'sandbox',
        currency: platformSetting?.defaultCurrency || 'KES'
      },
      charts: {
        revenueAnalytics: revenueChart,
        userRegistrationGrowth: userGrowthChart,
        subscriptionDistribution
      },
      feeds: {
        recentActivities,
        recentTransactions,
        newRegistrations,
        systemNotifications
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load admin dashboard' });
  }
};
