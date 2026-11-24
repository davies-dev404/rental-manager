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
const {
  getDemoExclusionScope,
  purgeSeededDemoRecords,
  purgeTestAccountsExcept
} = require('../../services/adminScopeService');
const { logAdminAction } = require('../../utils/auditLogger');

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
    const scope = await getDemoExclusionScope();
    const settledPaymentMatch = {
      ...scope.paymentExcludeFilter,
      status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] }
    };

    const [
      userCountsAgg,
      activeLandlordsCount,
      totalProperties,
      totalTenants,
      unitCountsAgg,
      txnStatusAgg,
      monthlySubRevAgg,
      totalSubRevAgg,
      landlordRevAgg,
      monthlyLandlordRevAgg,
      sandboxVolAgg,
      subStatusAgg,
      subPlanDistAgg,
      monthlyRevenueSeriesAgg,
      monthlyRentSeriesAgg,
      userGrowthAgg,
      recentAdminLogs,
      recentActivityLogs,
      recentTransactions,
      recentLandlordPayments,
      newRegistrations,
      unmatchedCallbacksCount,
      failedEtimsCount,
      openTicketsCount,
      expiringSubsCount,
      platformSetting
    ] = await Promise.all([
      User.aggregate([
        { $match: scope.userExcludeFilter },
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
        ...scope.userExcludeFilter,
        role: { $in: ['admin', 'landlord'] },
        isSuperAdmin: { $ne: true },
        accountStatus: { $nin: ['suspended', 'deactivated'] }
      }),
      Property.countDocuments(scope.propertyExcludeFilter),
      Tenant.countDocuments(scope.tenantExcludeFilter),
      Unit.aggregate([
        { $match: scope.unitExcludeFilter },
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
      Payment.aggregate([
        { $match: settledPaymentMatch },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...settledPaymentMatch, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      PaymentTransaction.aggregate([
        { $match: { status: 'paid', $or: [{ gatewayEnvironment: 'sandbox' }, { isSandbox: true }] } },
        { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }, count: { $sum: 1 } } }
      ]),
      LandlordSubscription.aggregate([
        ...(scope.demoUserIds.length ? [{ $match: { landlordId: { $nin: scope.demoUserIds } } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      LandlordSubscription.aggregate([
        {
          $match: {
            status: { $in: ['active', 'trial', 'grace_period'] },
            ...(scope.demoUserIds.length ? { landlordId: { $nin: scope.demoUserIds } } : {})
          }
        },
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
        { $match: { ...settledPaymentMatch, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
        { $match: { ...scope.userExcludeFilter, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            users: { $sum: 1 }
          }
        }
      ]),
      AdminLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      ActivityLog.find(scope.demoUserIds.length ? { userId: { $nin: scope.demoUserIds } } : {})
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),
      PaymentTransaction.find(prodMatch)
        .populate('landlordId', 'name email')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Payment.find({ ...scope.paymentExcludeFilter })
        .populate('user', 'name email')
        .populate('unitId', 'unitNumber')
        .sort({ date: -1, createdAt: -1 })
        .limit(8)
        .lean(),
      User.find(scope.userExcludeFilter)
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

    const landlordRevTotal = landlordRevAgg[0]?.total || 0;
    const landlordRevCount = landlordRevAgg[0]?.count || 0;

    // Aggregate settled rental payments per Property (ODPP compliant: no tenant PII, property-level totals)
    const [allNonDemoProps, allNonDemoUnits, allSettledRentalPayments] = await Promise.all([
      Property.find(scope.propertyExcludeFilter)
        .populate('user', 'name email')
        .select('name location user createdAt')
        .lean(),
      Unit.find(scope.unitExcludeFilter).select('_id propertyId').lean(),
      Payment.find(settledPaymentMatch)
        .select('propertyId unitId user amount date createdAt currency')
        .lean()
    ]);

    const unitToPropMap = new Map();
    for (const u of allNonDemoUnits) {
      if (u.propertyId) unitToPropMap.set(String(u._id), String(u.propertyId));
    }

    const propSummaryMap = new Map();
    for (const prop of allNonDemoProps) {
      propSummaryMap.set(String(prop._id), {
        propertyId: String(prop._id),
        propertyName: prop.name,
        location: prop.location || '',
        landlordId: prop.user?._id ? String(prop.user._id) : null,
        landlordName: prop.user?.name || 'Landlord',
        totalPaid: 0,
        paymentCount: 0,
        currency: platformSetting?.defaultCurrency || 'KES',
        lastPaymentAt: null
      });
    }

    for (const pay of allSettledRentalPayments) {
      const resolvedPropId = pay.propertyId
        ? String(pay.propertyId)
        : (pay.unitId ? unitToPropMap.get(String(pay.unitId)) : null);
      if (!resolvedPropId || !propSummaryMap.has(resolvedPropId)) continue;
      const entry = propSummaryMap.get(resolvedPropId);
      entry.totalPaid += Number(pay.amount || 0);
      entry.paymentCount += 1;
      const dt = pay.date || pay.createdAt;
      if (dt && (!entry.lastPaymentAt || new Date(dt) > new Date(entry.lastPaymentAt))) {
        entry.lastPaymentAt = dt;
      }
    }

    const propertyTransactions = Array.from(propSummaryMap.values()).sort((a, b) => {
      if (b.totalPaid !== a.totalPaid) return b.totalPaid - a.totalPaid;
      return String(a.propertyName).localeCompare(String(b.propertyName));
    });

    const formattedRegistrations = newRegistrations.map((u) => {
      const r = String(u.role || '').toLowerCase();
      return {
        ...u,
        roleLabel: r === 'admin' || r === 'landlord' ? 'Landlord' : r === 'superadmin' ? 'Super Admin' : u.role
      };
    });

    // Combine gateway PaymentTransaction + landlord workspace Payment for live Recent Transactions feed (ODPP redacted)
    const mergedRecentTransactions = [
      ...recentTransactions.map((t) => ({
        _id: t._id,
        accountReference: t.accountReference,
        landlordId: t.landlordId || null,
        customerName: ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory)
          ? (t.landlordId?.name || t.customerName || 'Landlord')
          : `${t.landlordId?.name || 'Landlord'} · Protected Tenant Payment`,
        provider: t.provider,
        amount: t.amount,
        amountPaid: t.amountPaid,
        currency: t.currency || 'KES',
        status: t.status,
        paymentCategory: t.paymentCategory,
        source: 'gateway',
        displayTime: t.paidAt || t.createdAt
      })),
      ...recentLandlordPayments.map((p) => ({
        _id: `pay_${p._id}`,
        accountReference: p.reference || p.invoiceNumber || p.type || 'Rent Payment',
        landlordId: p.user || null,
        customerName: p.unitId?.unitNumber
          ? `${p.user?.name || 'Landlord'} · Unit ${p.unitId.unitNumber}`
          : (p.user?.name || 'Landlord Ledger'),
        provider: p.method || 'M-Pesa / Manual',
        amount: p.amount,
        amountPaid: p.amount,
        currency: p.currency || 'KES',
        status: p.status || 'paid',
        source: 'workspace',
        displayTime: p.date || p.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.displayTime) - new Date(a.displayTime))
      .slice(0, 10);

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
        totalPaymentsProcessed: paidTxnCount + landlordRevCount,
        totalProcessedVolume: totalProcessedVolume + landlordRevTotal,
        gatewayPaymentsCount: paidTxnCount,
        gatewayProcessedVolume: totalProcessedVolume,
        pendingPayments: pendingTxnCount,
        failedPayments: failedTxnCount,
        monthlyPlatformRevenue: monthlySubRevAgg[0]?.total || 0,
        totalPlatformRevenue: totalSubRevAgg[0]?.total || 0,
        landlordRentalRevenueTotal: landlordRevTotal,
        landlordRentalRevenueMonth: monthlyLandlordRevAgg[0]?.total || 0,
        landlordPaymentsCount: landlordRevCount,
        activeSubscriptions: (subStatusMap.active || 0) + (subStatusMap.trial || 0),
        expiredSubscriptions: subStatusMap.expired || 0,
        graceSubscriptions: subStatusMap.grace_period || 0,
        suspendedAccounts: userStats.suspendedAccounts || 0,
        pendingVerificationAccounts: userStats.pendingVerificationAccounts || 0,
        openSupportTickets: openTicketsCount || 0,
        unmatchedCallbacksCount: unmatchedCallbacksCount || 0,
        sandboxTestVolume: sandboxVolAgg[0]?.total || 0,
        sandboxTestCount: sandboxVolAgg[0]?.count || 0,
        demoPropertiesRemaining: scope.demoPropertyIds.length,
        demoUsersRemaining: scope.demoUserIds.length,
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
        recentTransactions: mergedRecentTransactions,
        propertyTransactions,
        newRegistrations: formattedRegistrations,
        systemNotifications
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load admin dashboard' });
  }
};

exports.clearDemoData = async (req, res) => {
  try {
    const result = await purgeSeededDemoRecords();
    await logAdminAction({
      req,
      action: 'DEMO_DATA_PURGED',
      category: 'settings',
      targetType: 'Platform',
      details: `Cleared ${result.deletedProperties} demo properties, ${result.deletedUnits} demo units, ${result.deletedTenants} demo tenants, ${result.deletedPayments} demo payments across ${result.resetDemoUsers} demo-mode account(s)`
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to clear demo data' });
  }
};

exports.cleanupTestAccounts = async (req, res) => {
  try {
    const keepEmails = Array.isArray(req.body?.keepEmails) && req.body.keepEmails.length > 0
      ? req.body.keepEmails
      : ['kipsoidavis@gmail.com'];
    const result = await purgeTestAccountsExcept(keepEmails);
    await logAdminAction({
      req,
      action: 'TEST_ACCOUNTS_PURGED',
      category: 'settings',
      targetType: 'Platform',
      details: `Cleaned ${result.deletedUsers} test account(s) & ${result.deletedProperties} test properties; kept: ${keepEmails.join(', ')}`
    });
    res.json({ success: true, kept: keepEmails, ...result });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to clean up test accounts' });
  }
};
