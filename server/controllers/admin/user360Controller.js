const crypto = require('crypto');
const User = require('../../models/User');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const Settings = require('../../models/Settings');
const LandlordSubscription = require('../../models/LandlordSubscription');
const SubscriptionPlan = require('../../models/SubscriptionPlan');
const SubscriptionAuditLog = require('../../models/SubscriptionAuditLog');
const UnitEntitlement = require('../../models/UnitEntitlement');
const ActivityLog = require('../../models/ActivityLog');
const AdminLog = require('../../models/AdminLog');
const SupportTicket = require('../../models/SupportTicket');
const CommunicationLog = require('../../models/CommunicationLog');
const AdminNote = require('../../models/AdminNote');
const UserNotification = require('../../models/UserNotification');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');
const { getDemoExclusionScope } = require('../../services/adminScopeService');
const { seedDefaultPlans, logSubscriptionAudit } = require('../../services/subscriptionService');
const sendEmail = require('../../utils/sendEmail');

const SAFE_USER_EXCLUDE =
  '-password -otp -otpExpires -twoFactorSecret -resetPasswordToken -resetPasswordExpires -refreshToken';

const PAID_STATUSES = new Set(['paid', 'confirmed', 'Completed', 'partial']);
const FAILED_STATUSES = new Set(['failed', 'Failed', 'cancelled']);
const PENDING_STATUSES = new Set(['pending', 'Pending', 'processing', 'open', 'draft', 'unpaid', 'Unpaid']);
const REVERSED_STATUSES = new Set(['reversed', 'refunded', 'void']);

function csvEscape(val) {
  const str = String(val === undefined || val === null ? '' : val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers, rows) {
  const head = headers.map((h) => csvEscape(h.label)).join(',');
  const body = rows
    .map((r) => headers.map((h) => csvEscape(typeof h.value === 'function' ? h.value(r) : r[h.key])).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

function parseUserAgent(ua = '') {
  const str = String(ua || '');
  if (!str) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  let browser = 'Other';
  if (/Edg\//i.test(str)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(str)) browser = 'Opera';
  else if (/Chrome\//i.test(str)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(str)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(str)) browser = 'Safari';

  let os = 'Other';
  if (/Windows NT/i.test(str)) os = 'Windows';
  else if (/Mac OS X/i.test(str) && !/iPhone|iPad/i.test(str)) os = 'macOS';
  else if (/Android/i.test(str)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(str)) os = 'iOS';
  else if (/Linux/i.test(str)) os = 'Linux';

  let device = 'Desktop';
  if (/Mobile|iPhone|Android/i.test(str) && !/iPad|Tablet/i.test(str)) device = 'Mobile';
  else if (/iPad|Tablet/i.test(str)) device = 'Tablet';

  return { browser, os, device };
}

function resolveDateRange(range = 'all', startDate = '', endDate = '') {
  const now = new Date();
  let start = null;
  let end = null;

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (range === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end = now;
  } else if (range === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = now;
  } else if (range === '3m') {
    start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    end = now;
  } else if (range === '12m') {
    start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    end = now;
  } else if (range === 'custom' || startDate || endDate) {
    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) start = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        end = d;
      }
    }
  }
  return { start, end };
}

async function loadLandlordContext(userId) {
  const rawUser = await User.findById(userId).select(SAFE_USER_EXCLUDE).lean();
  if (!rawUser) return null;

  const refreshTokens = Array.isArray(rawUser.refreshTokens) ? rawUser.refreshTokens : [];
  const user = { ...rawUser };
  delete user.refreshTokens;

  const scope = await getDemoExclusionScope();

  const properties = await Property.find({ user: user._id, ...scope.propertyExcludeFilter })
    .sort({ createdAt: -1 })
    .lean();
  const propIds = properties.map((p) => p._id);

  const units = await Unit.find({
    ...scope.unitExcludeFilter,
    $or: [
      { user: user._id },
      ...(propIds.length ? [{ propertyId: { $in: propIds } }] : [])
    ]
  })
    .sort({ unitNumber: 1 })
    .lean();
  const unitIds = units.map((u) => u._id);

  const [tenants, bizSettings] = await Promise.all([
    Tenant.find({
      ...scope.tenantExcludeFilter,
      $or: [
        { user: user._id },
        ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])
      ]
    })
      .sort({ createdAt: -1 })
      .lean(),
    Settings.findOne({ user: user._id })
      .select('orgName landlordName abbreviatedName orgEmail orgPhone orgAddress taxId mpesaType paybillAccount accountType invoiceTitle')
      .lean()
  ]);

  const mergedUser = {
    ...user,
    companyName: user.companyName || bizSettings?.orgName || '',
    address: user.address || bizSettings?.orgAddress || '',
    phone: user.phone || bizSettings?.orgPhone || '',
    kraPin: user.kraPin || bizSettings?.taxId || '',
    accountStatus: user.accountStatus || (user.isVerified ? 'active' : 'pending_verification')
  };

  return {
    user: mergedUser,
    refreshTokens,
    scope,
    properties,
    propIds,
    units,
    unitIds,
    tenants,
    bizSettings
  };
}

function buildGrowthSeries({ properties, units, tenants, payments, monthsCount = 12 }) {
  const now = new Date();
  const buckets = [];
  const bucketMap = new Map();

  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const entry = {
      key,
      month: label,
      monthEnd,
      propertiesAdded: 0,
      cumulativeProperties: 0,
      unitsAdded: 0,
      cumulativeUnits: 0,
      tenantsAdded: 0,
      cumulativeTenants: 0,
      revenue: 0,
      paymentsCount: 0,
      occupancyRate: 0
    };
    buckets.push(entry);
    bucketMap.set(key, entry);
  }

  const monthKey = (dt) => {
    if (!dt) return null;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  properties.forEach((p) => {
    const k = monthKey(p.createdAt);
    if (k && bucketMap.has(k)) bucketMap.get(k).propertiesAdded += 1;
  });

  units.forEach((u) => {
    const k = monthKey(u.createdAt);
    if (k && bucketMap.has(k)) bucketMap.get(k).unitsAdded += 1;
  });

  tenants.forEach((t) => {
    const k = monthKey(t.createdAt);
    if (k && bucketMap.has(k)) bucketMap.get(k).tenantsAdded += 1;
  });

  payments.forEach((p) => {
    if (!PAID_STATUSES.has(p.status)) return;
    const k = monthKey(p.paidAt || p.date || p.createdAt);
    if (k && bucketMap.has(k)) {
      bucketMap.get(k).revenue += Number(p.amount || 0);
      bucketMap.get(k).paymentsCount += 1;
    }
  });

  buckets.forEach((b) => {
    const endTs = b.monthEnd.getTime();
    b.cumulativeProperties = properties.filter((p) => p.createdAt && new Date(p.createdAt).getTime() <= endTs).length;
    b.cumulativeUnits = units.filter((u) => u.createdAt && new Date(u.createdAt).getTime() <= endTs).length;
    b.cumulativeTenants = tenants.filter((t) => t.createdAt && new Date(t.createdAt).getTime() <= endTs).length;

    const activeAtMonthEnd = tenants.filter((t) => {
      const startRef = t.moveInDate || t.leaseStart || t.createdAt;
      if (!startRef || new Date(startRef).getTime() > endTs) return false;
      if (t.moveOutDate && new Date(t.moveOutDate).getTime() < endTs) return false;
      if (t.status === 'past' && !t.moveOutDate && t.leaseEnd && new Date(t.leaseEnd).getTime() < endTs) return false;
      return true;
    }).length;

    b.occupancyRate = b.cumulativeUnits > 0
      ? Math.min(100, Math.round((activeAtMonthEnd / b.cumulativeUnits) * 100))
      : 0;
  });

  return buckets.map(({ monthEnd, ...rest }) => rest);
}

function calculateAccountHealth({
  user,
  properties,
  units,
  tenants,
  paidPayments,
  recentActivity30d,
  lastActiveAt
}) {
  const missingProfileFields = [];
  const incompleteTasks = [];

  // 1. Profile completeness (20 pts)
  let profilePts = 0;
  if (user.name) profilePts += 4; else missingProfileFields.push('Full Name');
  if (user.email) profilePts += 4; else missingProfileFields.push('Email Address');
  if (user.phone) profilePts += 4; else missingProfileFields.push('Phone Number');
  if (user.companyName) profilePts += 4; else missingProfileFields.push('Company / Agency Name');
  if (user.address) profilePts += 2; else missingProfileFields.push('Physical Address');
  if (user.kraPin) profilePts += 2; else missingProfileFields.push('KRA PIN');

  // 2. Verification (20 pts)
  let verificationPts = 0;
  if (user.isVerified) {
    verificationPts += 15;
  } else {
    incompleteTasks.push('Verify email address');
  }
  if (user.phone) {
    verificationPts += 5;
  } else {
    incompleteTasks.push('Add verified contact phone number');
  }

  // 3. Property registration (20 pts)
  let propertyPts = 0;
  if (properties.length > 0) {
    propertyPts += 10;
  } else {
    incompleteTasks.push('Register first property');
  }
  if (units.length > 0) {
    propertyPts += 10;
  } else {
    incompleteTasks.push('Add rental units to properties');
  }

  // 4. Tenant onboarding (15 pts)
  let tenantPts = 0;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  if (activeTenants > 0) {
    tenantPts += 10;
  } else {
    incompleteTasks.push('Onboard first active tenant');
  }
  if (units.length > 0 && occupiedUnits / units.length >= 0.5) {
    tenantPts += 5;
  } else if (units.length > 0) {
    incompleteTasks.push('Reach at least 50% unit occupancy');
  }

  // 5. Payment activity (15 pts)
  let paymentPts = 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (paidPayments.length > 0) {
    paymentPts += 10;
  } else {
    incompleteTasks.push('Record first rent collection');
  }
  const hasRecentPayment = paidPayments.some((p) => {
    const dt = p.paidAt || p.date || p.createdAt;
    return dt && new Date(dt).getTime() >= thirtyDaysAgo;
  });
  if (hasRecentPayment) {
    paymentPts += 5;
  } else if (paidPayments.length > 0) {
    incompleteTasks.push('No payment logged in the last 30 days');
  }

  // 6. Recent engagement (10 pts)
  let engagementPts = 0;
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const lastActiveTs = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
  if (recentActivity30d > 0 || lastActiveTs >= thirtyDaysAgo) {
    engagementPts = 10;
  } else if (lastActiveTs >= ninetyDaysAgo) {
    engagementPts = 5;
  } else {
    incompleteTasks.push('Account inactive for over 90 days');
  }

  const score = Math.min(100, profilePts + verificationPts + propertyPts + tenantPts + paymentPts + engagementPts);
  let category = 'At Risk';
  if (score >= 80) category = 'Excellent';
  else if (score >= 60) category = 'Good';
  else if (score >= 40) category = 'Needs Attention';

  let activityLevel = 'Inactive';
  if (recentActivity30d >= 20) activityLevel = 'High';
  else if (recentActivity30d >= 5) activityLevel = 'Moderate';
  else if (recentActivity30d >= 1 || lastActiveTs >= thirtyDaysAgo) activityLevel = 'Low';

  return {
    score,
    category,
    activityLevel,
    missingProfileFields,
    incompleteTasks,
    breakdown: [
      { label: 'Profile Completeness', score: profilePts, max: 20 },
      { label: 'Account Verification', score: verificationPts, max: 20 },
      { label: 'Property & Unit Setup', score: propertyPts, max: 20 },
      { label: 'Tenant Onboarding', score: tenantPts, max: 15 },
      { label: 'Payment Recording', score: paymentPts, max: 15 },
      { label: 'Recent Engagement', score: engagementPts, max: 10 }
    ]
  };
}

function computeRentBalances({ invoices, payments, now = new Date() }) {
  let outstandingRent = 0;
  let overdueRent = 0;
  const tenantBalanceMap = new Map();
  const propertyBalanceMap = new Map();

  const openInvoices = invoices.filter((inv) => ['open', 'partial'].includes(inv.status) && Number(inv.balanceDue || 0) > 0);

  if (openInvoices.length > 0) {
    openInvoices.forEach((inv) => {
      const bal = Number(inv.balanceDue || 0);
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < now.getTime();
      outstandingRent += bal;
      if (isOverdue) overdueRent += bal;

      if (inv.tenantId) {
        const tid = String(inv.tenantId);
        const cur = tenantBalanceMap.get(tid) || { outstanding: 0, overdue: 0 };
        cur.outstanding += bal;
        if (isOverdue) cur.overdue += bal;
        tenantBalanceMap.set(tid, cur);
      }
      if (inv.propertyId) {
        const pid = String(inv.propertyId);
        const cur = propertyBalanceMap.get(pid) || { outstanding: 0, overdue: 0 };
        cur.outstanding += bal;
        if (isOverdue) cur.overdue += bal;
        propertyBalanceMap.set(pid, cur);
      }
    });
  } else {
    // Fallback to unpaid/overdue payment records when formal invoices aren't used
    payments.forEach((p) => {
      if (['overdue', 'unpaid', 'Unpaid', 'open'].includes(p.status)) {
        const amt = Number(p.amount || 0);
        outstandingRent += amt;
        const isOverdue = p.status === 'overdue';
        if (isOverdue) overdueRent += amt;
        if (p.tenantId) {
          const tid = String(p.tenantId);
          const cur = tenantBalanceMap.get(tid) || { outstanding: 0, overdue: 0 };
          cur.outstanding += amt;
          if (isOverdue) cur.overdue += amt;
          tenantBalanceMap.set(tid, cur);
        }
        if (p.propertyId) {
          const pid = String(p.propertyId);
          const cur = propertyBalanceMap.get(pid) || { outstanding: 0, overdue: 0 };
          cur.outstanding += amt;
          if (isOverdue) cur.overdue += amt;
          propertyBalanceMap.set(pid, cur);
        }
      }
    });
  }

  return { outstandingRent, overdueRent, tenantBalanceMap, propertyBalanceMap };
}

/**
 * 1. GET /api/admin/users/:id
 * Comprehensive User 360° Overview payload (backwards-compatible with previous response fields).
 */
exports.getUser360Overview = async (req, res) => {
  try {
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, scope, properties, units, unitIds, tenants, bizSettings } = ctx;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      allPayments,
      rentalInvoices,
      subscriptions,
      entitlement,
      subscriptionAudits,
      activityLogs,
      recentActivity30d,
      loginActivityCount,
      adminLogs,
      supportTicketCount,
      saasTransactions
    ] = await Promise.all([
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [
          { user: user._id },
          ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])
        ]
      })
        .populate('unitId', 'unitNumber propertyId')
        .populate('tenantId', 'name phone email')
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      Invoice.find({ landlordId: user._id, invoiceCategory: 'rental' })
        .select('tenantId propertyId unitId totalAmount amountPaid balanceDue status dueDate issuedAt')
        .lean(),
      LandlordSubscription.find({ landlordId: user._id }).sort({ createdAt: -1 }).limit(15).lean(),
      UnitEntitlement.findOne({ landlordId: user._id }).lean(),
      SubscriptionAuditLog.find({ landlordId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      ActivityLog.find({ userId: user._id }).sort({ timestamp: -1 }).limit(25).lean(),
      ActivityLog.countDocuments({ userId: user._id, timestamp: { $gte: thirtyDaysAgo } }),
      ActivityLog.countDocuments({ userId: user._id, action: /login/i }),
      AdminLog.find({ targetType: 'User', targetId: String(user._id) }).sort({ createdAt: -1 }).limit(15).lean(),
      SupportTicket.countDocuments({ $or: [{ userId: user._id }, { email: String(user.email || '').toLowerCase() }] }),
      PaymentTransaction.find({
        landlordId: user._id,
        paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] },
        status: 'paid',
        isSandbox: { $ne: true }
      })
        .select('amount amountPaid currency paidAt createdAt')
        .lean()
    ]);

    const saasSubscriptionPaidTotal = (Array.isArray(saasTransactions) ? saasTransactions : []).reduce(
      (sum, t) => sum + Number(t.amountPaid || t.amount || 0),
      0
    );
    const saasSubscriptionPaymentsCount = Array.isArray(saasTransactions) ? saasTransactions.length : 0;

    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const propNameMap = new Map(properties.map((p) => [String(p._id), p.name]));
    const propUnitCounts = new Map();
    const propOccupiedCounts = new Map();
    const propVacantCounts = new Map();
    const propTenantCounts = new Map();
    const propExpectedRent = new Map();
    const propRevTotals = new Map();

    let expectedMonthlyRent = 0;
    let totalRentPotential = 0;

    units.forEach((u) => {
      const pId = String(u.propertyId);
      const rent = Number(u.rentAmount || 0);
      totalRentPotential += rent;
      propUnitCounts.set(pId, (propUnitCounts.get(pId) || 0) + 1);
      if (u.status === 'occupied') {
        propOccupiedCounts.set(pId, (propOccupiedCounts.get(pId) || 0) + 1);
        expectedMonthlyRent += rent;
        propExpectedRent.set(pId, (propExpectedRent.get(pId) || 0) + rent);
      } else if (u.status === 'vacant') {
        propVacantCounts.set(pId, (propVacantCounts.get(pId) || 0) + 1);
      }
    });

    tenants.forEach((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (pId) propTenantCounts.set(pId, (propTenantCounts.get(pId) || 0) + 1);
    });

    const paidPayments = allPayments.filter((p) => PAID_STATUSES.has(p.status));
    let totalRevenueGenerated = 0;
    paidPayments.forEach((p) => {
      const amt = Number(p.amount || 0);
      totalRevenueGenerated += amt;
      const pId = p.propertyId ? String(p.propertyId) : (p.unitId?._id ? unitToProp.get(String(p.unitId._id)) : null);
      if (pId) propRevTotals.set(pId, (propRevTotals.get(pId) || 0) + amt);
    });

    const { outstandingRent, overdueRent, propertyBalanceMap } = computeRentBalances({
      invoices: rentalInvoices,
      payments: allPayments,
      now
    });

    const enrichedProperties = properties.map((p) => {
      const pId = String(p._id);
      const uCount = propUnitCounts.get(pId) || 0;
      const occ = propOccupiedCounts.get(pId) || 0;
      const vac = propVacantCounts.get(pId) || Math.max(0, uCount - occ);
      const bal = propertyBalanceMap.get(pId) || { outstanding: 0, overdue: 0 };
      return {
        ...p,
        unitCount: uCount,
        occupiedUnits: occ,
        vacantUnits: vac,
        occupancyRate: uCount > 0 ? Math.round((occ / uCount) * 100) : 0,
        tenantCount: propTenantCounts.get(pId) || 0,
        expectedMonthlyRent: propExpectedRent.get(pId) || 0,
        outstandingRent: bal.outstanding,
        revenueGenerated: propRevTotals.get(pId) || 0,
        verificationStatus: p.verificationStatus || 'pending'
      };
    });

    const growthSeries = buildGrowthSeries({ properties, units, tenants, payments: allPayments, monthsCount: 12 });
    const latestMonth = growthSeries[growthSeries.length - 1];
    const prevMonth = growthSeries[growthSeries.length - 2];
    const revenueGrowthPct =
      prevMonth && prevMonth.revenue > 0
        ? Math.round(((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
        : null;

    const lastActiveAt =
      user.lastActiveAt ||
      activityLogs[0]?.timestamp ||
      user.lastLoginAt ||
      user.createdAt;

    const health = calculateAccountHealth({
      user,
      properties,
      units,
      tenants,
      paidPayments,
      recentActivity30d,
      lastActiveAt
    });

    const accountAgeDays = user.createdAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    const engagement = {
      totalLogins: Math.max(Number(user.loginCount || 0), loginActivityCount),
      lastLoginAt: user.lastLoginAt || null,
      lastActiveAt: lastActiveAt || null,
      accountAgeDays,
      recentActivity30d,
      activityFrequency:
        recentActivity30d >= 20
          ? 'Daily / Very Active'
          : recentActivity30d >= 5
            ? 'Weekly'
            : recentActivity30d >= 1
              ? 'Occasional'
              : 'Dormant',
      lastPropertyRegisteredAt: properties[0]?.createdAt || null,
      lastPaymentRecordedAt: paidPayments[0]?.paidAt || paidPayments[0]?.date || paidPayments[0]?.createdAt || null
    };

    const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
    const vacantUnits = units.filter((u) => u.status === 'vacant').length;
    const maintenanceUnits = units.filter((u) => u.status === 'maintenance').length;
    const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

    const activeSub = subscriptions[0] || null;
    const subscriptionStatus = entitlement?.status || activeSub?.status || 'trial';
    const subExpiry = entitlement?.expiresAt || activeSub?.expiryDate || null;
    const daysRemaining = subExpiry
      ? Math.ceil((new Date(subExpiry).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    // Security Alerts derived from real account state
    const securityAlerts = [];
    if (!user.isVerified) {
      securityAlerts.push({ severity: 'warning', title: 'Email Unverified', description: 'Account email has not been verified yet.' });
    }
    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      securityAlerts.push({
        severity: 'danger',
        title: `Account ${user.accountStatus}`,
        description: user.suspendedReason || 'Access restricted by Super Admin.'
      });
    }
    if (Number(user.failedLoginAttempts || 0) >= 3) {
      securityAlerts.push({
        severity: 'danger',
        title: 'Multiple Failed Login Attempts',
        description: `${user.failedLoginAttempts} consecutive failed logins detected.`
      });
    }
    if (user.lockUntil && new Date(user.lockUntil).getTime() > now.getTime()) {
      securityAlerts.push({
        severity: 'danger',
        title: 'Account Temporarily Locked',
        description: `Locked until ${new Date(user.lockUntil).toLocaleString('en-KE')}.`
      });
    }
    if (daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0) {
      securityAlerts.push({
        severity: 'warning',
        title: 'Subscription Expiring Soon',
        description: `${daysRemaining} day(s) remaining on ${entitlement?.planName || activeSub?.planName || 'current plan'}.`
      });
    } else if (daysRemaining !== null && daysRemaining < 0) {
      securityAlerts.push({
        severity: 'danger',
        title: 'Subscription Expired',
        description: `Expired ${Math.abs(daysRemaining)} day(s) ago.`
      });
    }

    const unitNumMap = new Map(units.map((u) => [String(u._id), u.unitNumber]));
    const recentTenants = tenants.slice(0, 8).map((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      return {
        _id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        status: t.status,
        unitNumber: t.unitId ? unitNumMap.get(String(t.unitId)) || '—' : '—',
        propertyName: pId ? propNameMap.get(pId) || '—' : '—',
        rentAmount: t.rentAmount || 0,
        createdAt: t.createdAt
      };
    });

    const recentPayments = allPayments.slice(0, 25).map((p) => {
      const pId = p.propertyId ? String(p.propertyId) : (p.unitId?.propertyId ? String(p.unitId.propertyId) : null);
      return {
        ...p,
        propertyName: pId ? propNameMap.get(pId) || '—' : '—',
        tenantName: p.tenantId?.name || '—'
      };
    });

    res.json({
      user,
      businessSettings: bizSettings || null,
      summary: {
        propertyCount: properties.length,
        unitCount: units.length,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate,
        declaredInitialUnits: user.unitsCount || 0,
        tenantCount: tenants.length,
        activeTenantsCount: tenants.filter((t) => t.status === 'active').length,
        revenueGenerated: totalRevenueGenerated,
        paymentsCount: paidPayments.length,
        totalPaymentRecords: allPayments.length,
        expectedMonthlyRent,
        totalRentPotential,
        outstandingRent,
        overdueRent,
        subscriptionStatus,
        planName: entitlement?.planName || activeSub?.planName || user.subscriptionTier || 'Starter',
        daysRemaining,
        revenueGrowthPct,
        supportTicketCount,
        saasSubscriptionPaidTotal,
        saasSubscriptionPaymentsCount,
        accountActivityCount: recentActivity30d
      },
      health,
      engagement,
      growthSeries,
      securityAlerts,
      properties: enrichedProperties,
      units,
      payments: recentPayments,
      recentTenants,
      subscriptions,
      entitlement,
      subscriptionAudits,
      activityLogs,
      adminLogs
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load user 360 profile' });
  }
};

/**
 * 2. PATCH /api/admin/users/:id
 * Edit user profile metadata with audit trail.
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const allowed = ['name', 'phone', 'companyName', 'address', 'kraPin', 'onboardingRole', 'unitsCount'];
    const prevState = {};
    const newState = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        prevState[field] = target[field];
        target[field] = field === 'unitsCount' ? Math.max(0, Number(req.body[field] || 0)) : String(req.body[field]).trim();
        newState[field] = target[field];
      }
    });

    await target.save();

    await logAdminAction({
      req,
      action: 'USER_PROFILE_UPDATED',
      category: 'user',
      targetType: 'User',
      targetId: String(target._id),
      details: `Updated profile details for ${target.email}`,
      previousState: prevState,
      newState
    });

    const safe = target.toObject();
    delete safe.password;
    delete safe.otp;
    delete safe.refreshTokens;
    delete safe.refreshToken;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update user profile' });
  }
};

/**
 * 3. POST /api/admin/users/:id/actions
 * Sensitive account controls: verify, reset_access, force_password_reset, resend_verification, soft_delete
 */
exports.performAccountAction = async (req, res) => {
  try {
    const { action, reason = '' } = req.body || {};
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (String(target._id) === String(req.user._id) && ['soft_delete', 'reset_access'].includes(action)) {
      return res.status(400).json({ message: 'You cannot run this action on your own administrator account.' });
    }
    if ((target.role === 'superadmin' || target.isSuperAdmin) && action === 'soft_delete') {
      return res.status(403).json({ message: 'Super Admin accounts cannot be deleted through this control.' });
    }

    let message = 'Action completed';
    let auditAction = 'USER_ADMIN_ACTION';
    const prevState = {
      isVerified: target.isVerified,
      accountStatus: target.accountStatus,
      tokenVersion: target.tokenVersion,
      failedLoginAttempts: target.failedLoginAttempts
    };

    if (action === 'verify') {
      target.isVerified = true;
      if (target.accountStatus === 'pending_verification') target.accountStatus = 'active';
      target.otp = undefined;
      target.otpExpires = undefined;
      await target.save();
      auditAction = 'USER_MANUALLY_VERIFIED';
      message = `${target.email} has been marked as verified.`;
    } else if (action === 'reset_access') {
      target.tokenVersion = (target.tokenVersion || 0) + 1;
      target.refreshTokens = [];
      target.refreshToken = undefined;
      target.failedLoginAttempts = 0;
      target.lockUntil = undefined;
      await target.save();
      auditAction = 'USER_ACCESS_RESET';
      message = `All active sessions revoked and login lock cleared for ${target.email}.`;
    } else if (action === 'force_password_reset') {
      const resetToken = crypto.randomBytes(24).toString('hex');
      target.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      target.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      target.tokenVersion = (target.tokenVersion || 0) + 1;
      target.refreshTokens = [];
      target.refreshToken = undefined;
      await target.save();

      let emailDelivered = false;
      try {
        const appUrl = process.env.CLIENT_URL || 'https://makaziflow.afrinextech.co.ke';
        await sendEmail({
          email: target.email,
          toName: target.name,
          subject: 'MakaziFlow — Password Reset Requested by Administrator',
          html: `<p>Hello ${target.name},</p><p>A platform administrator has initiated a security password reset for your MakaziFlow account. All existing sessions have been signed out.</p><p>Please visit <a href="${appUrl}/login">MakaziFlow Login</a> and use "Forgot Password" to set a new password.</p>`
        });
        emailDelivered = true;
      } catch {
        emailDelivered = false;
      }
      auditAction = 'USER_FORCE_PASSWORD_RESET';
      message = emailDelivered
        ? `Sessions revoked and password reset instructions emailed to ${target.email}.`
        : `Sessions revoked and reset token generated (email delivery unavailable — check Brevo config).`;
    } else if (action === 'resend_verification') {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      target.otp = otpCode;
      target.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      await target.save();

      let emailDelivered = false;
      try {
        await sendEmail({
          email: target.email,
          toName: target.name,
          subject: 'MakaziFlow — Account Verification Code',
          html: `<p>Hello ${target.name},</p><p>Your MakaziFlow verification code is: <strong style="font-size:18px;letter-spacing:2px;">${otpCode}</strong></p><p>This code expires in 15 minutes.</p>`
        });
        emailDelivered = true;
      } catch {
        emailDelivered = false;
      }
      auditAction = 'USER_VERIFICATION_RESENT';
      message = emailDelivered
        ? `Fresh verification OTP sent to ${target.email}.`
        : `New OTP generated, but email dispatch failed (verify Brevo/SMTP configuration).`;
    } else if (action === 'soft_delete') {
      if (!reason || String(reason).trim().length < 3) {
        return res.status(400).json({ message: 'An audit reason is required to soft-delete an account.' });
      }
      target.accountStatus = 'deactivated';
      target.deletedAt = new Date();
      target.deletedBy = req.user._id;
      target.suspendedAt = new Date();
      target.suspendedReason = `Soft-deleted: ${String(reason).trim()}`;
      target.suspendedBy = req.user._id;
      target.tokenVersion = (target.tokenVersion || 0) + 1;
      target.refreshTokens = [];
      target.refreshToken = undefined;
      await target.save();
      auditAction = 'USER_SOFT_DELETED';
      message = `Account ${target.email} soft-deleted (deactivated; financial records preserved).`;
    } else {
      return res.status(400).json({ message: `Unsupported account action: ${action}` });
    }

    await logAdminAction({
      req,
      action: auditAction,
      category: 'security',
      targetType: 'User',
      targetId: String(target._id),
      details: `${message}${reason ? ` | Reason: ${reason}` : ''}`,
      previousState: prevState,
      newState: {
        isVerified: target.isVerified,
        accountStatus: target.accountStatus,
        deletedAt: target.deletedAt || null
      }
    });

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Account action failed' });
  }
};

/**
 * 4. GET /api/admin/users/:id/export
 * Export complete User 360° dataset as JSON or CSV.
 */
exports.exportUserData = async (req, res) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, scope, properties, units, unitIds, tenants } = ctx;
    const [payments, subscriptions] = await Promise.all([
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [{ user: user._id }, ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])]
      })
        .sort({ date: -1 })
        .lean(),
      LandlordSubscription.find({ landlordId: user._id }).sort({ createdAt: -1 }).lean()
    ]);

    await logAdminAction({
      req,
      action: 'USER_DATA_EXPORTED',
      category: 'report',
      targetType: 'User',
      targetId: String(user._id),
      details: `Exported User 360 data for ${user.email} in ${format.toUpperCase()} format`
    });

    const slug = (user.email || String(user._id)).replace(/[^a-z0-9]/gi, '_').slice(0, 32);

    if (format === 'csv') {
      const headers = [
        { label: 'Section', key: 'section' },
        { label: 'ID', key: 'id' },
        { label: 'Title / Name', key: 'title' },
        { label: 'Status', key: 'status' },
        { label: 'Amount (KES)', key: 'amount' },
        { label: 'Date', key: 'date' },
        { label: 'Notes', key: 'notes' }
      ];
      const rows = [
        { section: 'Profile', id: user._id, title: user.name, status: user.accountStatus, amount: '', date: user.createdAt, notes: `${user.email} | ${user.phone || ''}` },
        ...properties.map((p) => ({ section: 'Property', id: p._id, title: p.name, status: p.status, amount: '', date: p.createdAt, notes: `${p.location} (${p.type})` })),
        ...tenants.map((t) => ({ section: 'Tenant', id: t._id, title: t.name, status: t.status, amount: t.rentAmount || 0, date: t.createdAt, notes: `${t.phone || ''} | ${t.email || ''}` })),
        ...payments.map((p) => ({ section: 'Payment', id: p._id, title: p.invoiceNumber || p.reference || p.type, status: p.status, amount: p.amount, date: p.date || p.createdAt, notes: p.method })),
        ...subscriptions.map((s) => ({ section: 'Subscription', id: s._id, title: s.planName, status: s.status, amount: s.priceAmount, date: s.startDate || s.createdAt, notes: s.billingCycle }))
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="user360-${slug}.csv"`);
      return res.send(buildCsv(headers, rows));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="user360-${slug}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user,
      properties,
      units,
      tenants,
      payments,
      subscriptions
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Export failed' });
  }
};

/**
 * 5. GET /api/admin/users/:id/properties
 * Portfolio analytics, occupancy breakdown, searchable/filterable/sortable/paginated properties list + CSV export.
 */
exports.getUserProperties = async (req, res) => {
  try {
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, scope, properties, units, unitIds, tenants } = ctx;
    const {
      search = '',
      status = 'all',
      verification = 'all',
      type = 'all',
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = 10,
      export: exportFmt = ''
    } = req.query;

    const [payments, invoices] = await Promise.all([
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [{ user: user._id }, ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])]
      }).lean(),
      Invoice.find({ landlordId: user._id, invoiceCategory: 'rental' })
        .select('propertyId unitId balanceDue status dueDate')
        .lean()
    ]);

    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const { propertyBalanceMap, outstandingRent } = computeRentBalances({ invoices, payments });

    const propAgg = new Map();
    units.forEach((u) => {
      const pId = String(u.propertyId);
      const entry = propAgg.get(pId) || { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, maintenanceUnits: 0, expectedMonthlyRent: 0, potentialRent: 0, tenantCount: 0, revenueGenerated: 0 };
      entry.totalUnits += 1;
      const rent = Number(u.rentAmount || 0);
      entry.potentialRent += rent;
      if (u.status === 'occupied') {
        entry.occupiedUnits += 1;
        entry.expectedMonthlyRent += rent;
      } else if (u.status === 'maintenance') {
        entry.maintenanceUnits += 1;
      } else {
        entry.vacantUnits += 1;
      }
      propAgg.set(pId, entry);
    });

    tenants.forEach((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (pId && propAgg.has(pId)) propAgg.get(pId).tenantCount += 1;
    });

    payments.forEach((p) => {
      if (!PAID_STATUSES.has(p.status)) return;
      const pId = p.propertyId ? String(p.propertyId) : (p.unitId ? unitToProp.get(String(p.unitId)) : null);
      if (pId && propAgg.has(pId)) propAgg.get(pId).revenueGenerated += Number(p.amount || 0);
    });

    const allEnriched = properties.map((p) => {
      const pId = String(p._id);
      const stats = propAgg.get(pId) || { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, maintenanceUnits: 0, expectedMonthlyRent: 0, potentialRent: 0, tenantCount: 0, revenueGenerated: 0 };
      const bal = propertyBalanceMap.get(pId) || { outstanding: 0, overdue: 0 };
      const effectiveStatus = p.isFlagged ? 'flagged' : (p.status || 'active');
      const verificationStatus = p.verificationStatus || 'pending';
      return {
        ...p,
        status: effectiveStatus,
        verificationStatus,
        totalUnits: stats.totalUnits,
        occupiedUnits: stats.occupiedUnits,
        vacantUnits: stats.vacantUnits,
        maintenanceUnits: stats.maintenanceUnits,
        occupancyRate: stats.totalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0,
        expectedMonthlyRent: stats.expectedMonthlyRent,
        potentialRent: stats.potentialRent,
        tenantCount: stats.tenantCount,
        revenueGenerated: stats.revenueGenerated,
        outstandingRent: bal.outstanding
      };
    });

    // Portfolio-level stats (always computed on full portfolio, not filtered page)
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
    const vacantUnits = units.filter((u) => u.status === 'vacant').length;
    const maintenanceUnits = units.filter((u) => u.status === 'maintenance').length;
    const expectedMonthlyRent = allEnriched.reduce((acc, p) => acc + p.expectedMonthlyRent, 0);
    const pendingVerification = allEnriched.filter((p) => p.verificationStatus === 'pending').length;

    // Filtering
    let filtered = allEnriched;
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          (p.type || '').toLowerCase().includes(q)
      );
    }
    if (status && status !== 'all') filtered = filtered.filter((p) => p.status === status);
    if (verification && verification !== 'all') filtered = filtered.filter((p) => p.verificationStatus === verification);
    if (type && type !== 'all') filtered = filtered.filter((p) => (p.type || '').toLowerCase() === String(type).toLowerCase());

    // Sorting
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (['totalUnits', 'occupiedUnits', 'vacantUnits', 'expectedMonthlyRent', 'occupancyRate', 'revenueGenerated'].includes(sortBy)) {
        return ((a[sortBy] || 0) - (b[sortBy] || 0)) * dir;
      }
      if (sortBy === 'name' || sortBy === 'location' || sortBy === 'type') {
        return String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')) * dir;
      }
      return (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * dir;
    });

    if (exportFmt === 'csv') {
      const headers = [
        { label: 'Property Name', key: 'name' },
        { label: 'Location', key: 'location' },
        { label: 'Type', key: 'type' },
        { label: 'Total Units', key: 'totalUnits' },
        { label: 'Occupied', key: 'occupiedUnits' },
        { label: 'Vacant', key: 'vacantUnits' },
        { label: 'Occupancy %', key: 'occupancyRate' },
        { label: 'Expected Monthly Rent (KES)', key: 'expectedMonthlyRent' },
        { label: 'Revenue Collected (KES)', key: 'revenueGenerated' },
        { label: 'Status', key: 'status' },
        { label: 'Verification', key: 'verificationStatus' },
        { label: 'Date Registered', value: (r) => (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '') }
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="landlord-properties-${user._id}.csv"`);
      return res.send(buildCsv(headers, filtered));
    }

    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(limit || 10)));
    const total = filtered.length;
    const items = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const occupancyTrend = buildGrowthSeries({ properties, units, tenants, payments, monthsCount: 12 }).map((b) => ({
      month: b.month,
      occupancyRate: b.occupancyRate,
      units: b.cumulativeUnits,
      tenants: b.cumulativeTenants
    }));

    const distinctTypes = [...new Set(allEnriched.map((p) => p.type).filter(Boolean))].sort();

    res.json({
      stats: {
        totalProperties: properties.length,
        declaredUnitCapacity: user.unitsCount || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        expectedMonthlyRent,
        outstandingRent,
        pendingVerification
      },
      occupancyBreakdown: [
        { name: 'Occupied', value: occupiedUnits, color: '#00B8B0' },
        { name: 'Vacant', value: vacantUnits, color: '#E9A23B' },
        ...(maintenanceUnits > 0 ? [{ name: 'Maintenance', value: maintenanceUnits, color: '#738197' }] : [])
      ],
      occupancyTrend,
      filters: { types: distinctTypes },
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load landlord properties' });
  }
};

/**
 * 6. PATCH /api/admin/users/:id/properties/:propertyId
 * Verify, edit, suspend, or restore a landlord property.
 */
exports.manageUserProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (!isValidObjectId(propertyId)) return res.status(400).json({ message: 'Invalid property ID' });

    const prop = await Property.findOne({ _id: propertyId, user: req.params.id });
    if (!prop) return res.status(404).json({ message: 'Property not found for this landlord' });

    const { action, name, location, type, reason = '' } = req.body || {};
    const prevState = {
      name: prop.name,
      location: prop.location,
      type: prop.type,
      status: prop.status,
      verificationStatus: prop.verificationStatus
    };

    if (action === 'verify') {
      prop.verificationStatus = 'verified';
      prop.verifiedAt = new Date();
      prop.verifiedBy = req.user._id;
    } else if (action === 'reject_verification') {
      prop.verificationStatus = 'rejected';
    } else if (action === 'suspend') {
      prop.status = 'suspended';
      prop.isFlagged = true;
      prop.flagReason = String(reason || 'Suspended by Super Admin').trim();
      prop.flaggedAt = new Date();
      prop.flaggedBy = req.user._id;
    } else if (action === 'activate') {
      prop.status = 'active';
      prop.isFlagged = false;
      prop.flagReason = '';
      prop.flaggedAt = undefined;
      prop.flaggedBy = undefined;
    }

    if (name !== undefined && String(name).trim()) prop.name = String(name).trim();
    if (location !== undefined && String(location).trim()) prop.location = String(location).trim();
    if (type !== undefined && String(type).trim()) prop.type = String(type).trim();

    await prop.save();

    await logAdminAction({
      req,
      action: action ? `PROPERTY_${String(action).toUpperCase()}` : 'PROPERTY_UPDATED',
      category: 'property',
      targetType: 'Property',
      targetId: String(prop._id),
      details: `Updated property "${prop.name}" (${action || 'edit'})${reason ? `: ${reason}` : ''}`,
      previousState: prevState,
      newState: {
        name: prop.name,
        location: prop.location,
        type: prop.type,
        status: prop.status,
        verificationStatus: prop.verificationStatus
      }
    });

    res.json({ success: true, property: prop });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update property' });
  }
};

/**
 * 7. GET /api/admin/users/:id/tenants
 * Tenant statistics + filterable/searchable/paginated tenant directory with lease & payment status.
 */
exports.getUserTenants = async (req, res) => {
  try {
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, scope, properties, units, unitIds, tenants } = ctx;
    const {
      search = '',
      propertyId = 'all',
      tenantStatus = 'all',
      paymentStatus = 'all',
      page = 1,
      limit = 15
    } = req.query;

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [payments, invoices, tickets] = await Promise.all([
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [{ user: user._id }, ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])]
      })
        .sort({ date: -1 })
        .lean(),
      Invoice.find({ landlordId: user._id, invoiceCategory: 'rental' })
        .select('tenantId totalAmount amountPaid balanceDue status dueDate')
        .lean(),
      SupportTicket.find({
        $or: [{ userId: user._id }, { email: { $in: tenants.map((t) => (t.email || '').toLowerCase()).filter(Boolean) } }]
      })
        .select('ticketNumber email subject status priority createdAt')
        .lean()
    ]);

    const unitMap = new Map(units.map((u) => [String(u._id), u]));
    const propMap = new Map(properties.map((p) => [String(p._id), p]));
    const { tenantBalanceMap } = computeRentBalances({ invoices, payments, now });

    const tenantPaymentsMap = new Map();
    payments.forEach((p) => {
      if (!p.tenantId) return;
      const tid = String(p.tenantId);
      const list = tenantPaymentsMap.get(tid) || [];
      list.push(p);
      tenantPaymentsMap.set(tid, list);
    });

    const allEnriched = tenants.map((t) => {
      const unit = t.unitId ? unitMap.get(String(t.unitId)) : null;
      const prop = unit?.propertyId ? propMap.get(String(unit.propertyId)) : null;
      const bal = tenantBalanceMap.get(String(t._id)) || { outstanding: 0, overdue: 0 };
      const tPayments = tenantPaymentsMap.get(String(t._id)) || [];
      const totalPaid = tPayments.filter((p) => PAID_STATUSES.has(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);

      let payStatus = 'up_to_date';
      if (bal.overdue > 0) payStatus = 'overdue';
      else if (bal.outstanding > 0) payStatus = 'outstanding';
      else if (tPayments.length === 0) payStatus = 'no_payments';

      const leaseEndDt = t.leaseEnd ? new Date(t.leaseEnd) : null;
      const isExpiringSoon = Boolean(
        t.status === 'active' &&
          leaseEndDt &&
          leaseEndDt.getTime() >= now.getTime() &&
          leaseEndDt.getTime() <= in30Days.getTime()
      );

      const relatedTickets = tickets.filter((tk) => t.email && tk.email === t.email.toLowerCase());

      return {
        _id: t._id,
        name: t.name,
        email: t.email || '',
        phone: t.phone || '',
        status: t.status || 'active',
        propertyId: prop?._id || null,
        propertyName: prop?.name || 'Unassigned',
        unitId: unit?._id || null,
        unitNumber: unit?.unitNumber || '—',
        monthlyRent: Number(unit?.rentAmount || t.rentAmount || 0),
        deposit: Number(t.deposit || 0),
        leaseStart: t.leaseStart || t.moveInDate || null,
        leaseEnd: t.leaseEnd || null,
        isExpiringSoon,
        outstandingBalance: bal.outstanding,
        overdueBalance: bal.overdue,
        totalPaid,
        paymentsCount: tPayments.length,
        paymentStatus: payStatus,
        recentPayments: tPayments.slice(0, 8),
        relatedComplaintsCount: relatedTickets.length,
        relatedComplaints: relatedTickets.slice(0, 5),
        createdAt: t.createdAt
      };
    });

    const stats = {
      totalTenants: allEnriched.length,
      activeTenants: allEnriched.filter((t) => t.status === 'active').length,
      formerTenants: allEnriched.filter((t) => t.status !== 'active').length,
      tenantsWithOutstanding: allEnriched.filter((t) => t.outstandingBalance > 0).length,
      tenantsWithOverdue: allEnriched.filter((t) => t.overdueBalance > 0).length,
      leasesExpiringSoon: allEnriched.filter((t) => t.isExpiringSoon).length
    };

    let filtered = allEnriched;
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q) ||
          (t.phone || '').toLowerCase().includes(q) ||
          (t.unitNumber || '').toLowerCase().includes(q) ||
          (t.propertyName || '').toLowerCase().includes(q)
      );
    }
    if (propertyId && propertyId !== 'all') {
      filtered = filtered.filter((t) => String(t.propertyId) === String(propertyId));
    }
    if (tenantStatus && tenantStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === tenantStatus);
    }
    if (paymentStatus && paymentStatus !== 'all') {
      filtered = filtered.filter((t) => t.paymentStatus === paymentStatus);
    }

    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(limit || 15)));
    const total = filtered.length;
    const items = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      stats,
      properties: properties.map((p) => ({ _id: p._id, name: p.name })),
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load landlord tenants' });
  }
};

/**
 * 8. GET /api/admin/users/:id/payments
 * Financial Monitoring, Payment Intelligence, Analytics Charts, M-Pesa Reconciliation, Pagination & CSV Export.
 */
exports.getUserPayments = async (req, res) => {
  try {
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, scope, properties, units, unitIds } = ctx;
    const {
      range = 'all',
      startDate = '',
      endDate = '',
      search = '',
      status = 'all',
      method = 'all',
      propertyId = 'all',
      page = 1,
      limit = 20,
      export: exportFmt = ''
    } = req.query;

    const { start, end } = resolveDateRange(range, startDate, endDate);

    const [workspacePayments, gatewayTxs, rentalInvoices] = await Promise.all([
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [{ user: user._id }, ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])]
      })
        .populate('tenantId', 'name phone email')
        .populate('unitId', 'unitNumber propertyId')
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      PaymentTransaction.find({ landlordId: user._id })
        .populate('tenantId', 'name phone email')
        .populate('unitId', 'unitNumber propertyId')
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({ landlordId: user._id, invoiceCategory: 'rental' })
        .select('propertyId tenantId totalAmount amountPaid balanceDue status dueDate issuedAt')
        .lean()
    ]);

    const propMap = new Map(properties.map((p) => [String(p._id), p]));
    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const linkedTxIds = new Set(workspacePayments.map((p) => (p.paymentTransactionId ? String(p.paymentTransactionId) : '')).filter(Boolean));
    const txMap = new Map(gatewayTxs.map((tx) => [String(tx._id), tx]));

    // Build unified transaction ledger without double-counting linked gateway transactions
    const unified = [];

    workspacePayments.forEach((p) => {
      const linkedTx = p.paymentTransactionId ? txMap.get(String(p.paymentTransactionId)) : null;
      const pId = p.propertyId
        ? String(p.propertyId)
        : (p.unitId?.propertyId ? String(p.unitId.propertyId) : (p.unitId?._id ? unitToProp.get(String(p.unitId._id)) : null));
      const prop = pId ? propMap.get(pId) : null;
      const dt = p.paidAt || p.date || p.createdAt;
      const rawStatus = String(p.status || 'paid');
      let normalizedStatus = 'pending';
      if (PAID_STATUSES.has(rawStatus)) normalizedStatus = 'paid';
      else if (FAILED_STATUSES.has(rawStatus)) normalizedStatus = 'failed';
      else if (REVERSED_STATUSES.has(rawStatus)) normalizedStatus = 'reversed';

      const reconciliationStatus = linkedTx
        ? linkedTx.reconciliationStatus
        : (p.reconciled ? 'reconciled' : (normalizedStatus === 'paid' ? 'reconciled' : 'pending'));

      unified.push({
        _id: String(p._id),
        source: linkedTx ? 'gateway_linked' : 'workspace',
        gatewayTransactionId: linkedTx ? String(linkedTx._id) : null,
        internalTransactionId: linkedTx?.internalTransactionId || p.invoiceNumber || `PAY-${String(p._id).slice(-6).toUpperCase()}`,
        reference: p.reference || p.invoiceNumber || linkedTx?.accountReference || '—',
        mpesaReference: linkedTx?.providerReference || (/m-?pesa|pesapal|pesaflow|mobile/i.test(p.method || '') ? (p.reference || '') : ''),
        payerName: p.tenantId?.name || linkedTx?.customerName || '—',
        payerEmail: p.tenantId?.email || linkedTx?.customerEmail || '',
        payerPhone: p.tenantId?.phone || linkedTx?.customerPhone || '',
        propertyId: pId,
        propertyName: prop?.name || 'General / Unassigned',
        unitNumber: p.unitId?.unitNumber || '—',
        method: p.method || linkedTx?.paymentChannel || 'cash',
        category: p.category || p.type || 'rent',
        provider: linkedTx?.provider || 'manual',
        expectedAmount: linkedTx ? Number(linkedTx.amount || 0) : Number(p.amount || 0),
        amount: Number(p.amount || 0),
        currency: p.currency || 'KES',
        date: dt,
        status: rawStatus,
        normalizedStatus,
        reconciliationStatus,
        notes: p.notes || ''
      });
    });

    // Include unlinked PaymentTransaction records (e.g., failed/pending/subscription/unmatched gateway attempts)
    gatewayTxs.forEach((tx) => {
      if (linkedTxIds.has(String(tx._id))) return;
      const pId = tx.propertyId ? String(tx.propertyId) : (tx.unitId?.propertyId ? String(tx.unitId.propertyId) : null);
      const prop = pId ? propMap.get(pId) : null;
      const rawStatus = String(tx.status || 'pending');
      let normalizedStatus = 'pending';
      if (rawStatus === 'paid') normalizedStatus = 'paid';
      else if (['failed', 'cancelled'].includes(rawStatus)) normalizedStatus = 'failed';
      else if (['reversed', 'refunded'].includes(rawStatus)) normalizedStatus = 'reversed';

      unified.push({
        _id: String(tx._id),
        source: 'gateway',
        gatewayTransactionId: String(tx._id),
        internalTransactionId: tx.internalTransactionId,
        reference: tx.accountReference || tx.merchantReference || '—',
        mpesaReference: tx.providerReference || '',
        payerName: tx.tenantId?.name || tx.customerName || user.name,
        payerEmail: tx.tenantId?.email || tx.customerEmail || user.email,
        payerPhone: tx.tenantId?.phone || tx.customerPhone || '',
        propertyId: pId,
        propertyName: prop?.name || (['subscription', 'unit_upgrade', 'subscription_renewal'].includes(tx.paymentCategory) ? 'Platform Subscription' : 'Unassigned'),
        unitNumber: tx.unitId?.unitNumber || '—',
        method: tx.paymentChannel || tx.provider || 'hosted_checkout',
        category: tx.paymentCategory || 'rent',
        provider: tx.provider || 'pesapal',
        expectedAmount: Number(tx.amount || 0),
        amount: Number(tx.amountPaid > 0 ? tx.amountPaid : tx.amount || 0),
        currency: tx.currency || 'KES',
        date: tx.paidAt || tx.createdAt,
        status: rawStatus,
        normalizedStatus,
        reconciliationStatus: tx.reconciliationStatus || 'pending',
        failureReason: tx.failureReason || '',
        reversalReason: tx.reversalReason || '',
        gatewayEnvironment: tx.gatewayEnvironment || 'production',
        notes: tx.failureReason || tx.reversalReason || ''
      });
    });

    unified.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    // Date-range filtering applies to analytics & table
    const inRange = unified.filter((t) => {
      if (!start && !end) return true;
      const ts = t.date ? new Date(t.date).getTime() : 0;
      if (start && ts < start.getTime()) return false;
      if (end && ts > end.getTime()) return false;
      return true;
    });

    // Overview financial cards (in selected date range)
    const totalRevenueCollected = inRange
      .filter((t) => t.normalizedStatus === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);
    const successfulCount = inRange.filter((t) => t.normalizedStatus === 'paid').length;
    const failedCount = inRange.filter((t) => t.normalizedStatus === 'failed').length;
    const pendingCount = inRange.filter((t) => t.normalizedStatus === 'pending').length;
    const reversedCount = inRange.filter((t) => t.normalizedStatus === 'reversed').length;

    const expectedRent = units.filter((u) => u.status === 'occupied').reduce((s, u) => s + Number(u.rentAmount || 0), 0);
    const { outstandingRent, overdueRent } = computeRentBalances({ invoices: rentalInvoices, payments: workspacePayments });

    // Analytics 1: Monthly Revenue Trends
    const monthlyMap = new Map();
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(k, {
        month: d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' }),
        collected: 0,
        failed: 0,
        count: 0
      });
    }
    inRange.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(k)) return;
      const b = monthlyMap.get(k);
      if (t.normalizedStatus === 'paid') {
        b.collected += t.amount;
        b.count += 1;
      } else if (t.normalizedStatus === 'failed') {
        b.failed += t.amount;
      }
    });
    const monthlyRevenueTrend = Array.from(monthlyMap.values());

    // Analytics 2: Collections by Property
    const byPropMap = new Map();
    inRange
      .filter((t) => t.normalizedStatus === 'paid')
      .forEach((t) => {
        const name = t.propertyName || 'General';
        byPropMap.set(name, (byPropMap.get(name) || 0) + t.amount);
      });
    const collectionsByProperty = Array.from(byPropMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Analytics 3: Payment Method Distribution
    const byMethodMap = new Map();
    inRange
      .filter((t) => t.normalizedStatus === 'paid')
      .forEach((t) => {
        const m = String(t.method || 'other').replace(/_/g, ' ');
        const cur = byMethodMap.get(m) || { method: m, count: 0, amount: 0 };
        cur.count += 1;
        cur.amount += t.amount;
        byMethodMap.set(m, cur);
      });
    const methodDistribution = Array.from(byMethodMap.values()).sort((a, b) => b.amount - a.amount);

    // Analytics 4: Successful vs Failed
    const statusComparison = [
      { name: 'Successful', count: successfulCount, color: '#16A36A' },
      { name: 'Pending', count: pendingCount, color: '#E9A23B' },
      { name: 'Failed', count: failedCount, color: '#DC4545' },
      { name: 'Reversed', count: reversedCount, color: '#738197' }
    ].filter((s) => s.count > 0);

    // Analytics 5: Outstanding vs Collected
    const collectedVsOutstanding = [
      { name: 'Collected', amount: totalRevenueCollected, color: '#00B8B0' },
      { name: 'Outstanding', amount: outstandingRent, color: '#E9A23B' },
      { name: 'Overdue', amount: overdueRent, color: '#DC4545' }
    ];

    // M-Pesa & Gateway Reconciliation Intelligence
    const refCounts = new Map();
    inRange.forEach((t) => {
      const ref = (t.mpesaReference || '').trim().toUpperCase();
      if (ref && ref !== '—') refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    });
    const duplicateRefs = Array.from(refCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([ref, count]) => ({ reference: ref, count }));

    const amountMismatches = inRange.filter(
      (t) => t.reconciliationStatus === 'amount_mismatch' || (t.source !== 'workspace' && t.normalizedStatus === 'paid' && t.expectedAmount > 0 && t.amount !== t.expectedAmount)
    );
    const unmatchedTransactions = inRange.filter((t) => t.reconciliationStatus === 'unmatched' || t.status === 'unmatched');

    const reconciliation = {
      reconciledCount: inRange.filter((t) => t.reconciliationStatus === 'reconciled').length,
      pendingCount: inRange.filter((t) => t.reconciliationStatus === 'pending').length,
      unmatchedCount: unmatchedTransactions.length,
      mismatchCount: amountMismatches.length,
      duplicateRefs,
      flaggedRecords: [...amountMismatches, ...unmatchedTransactions].slice(0, 15)
    };

    // Table filters
    let filtered = inRange;
    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.internalTransactionId || '').toLowerCase().includes(q) ||
          (t.reference || '').toLowerCase().includes(q) ||
          (t.mpesaReference || '').toLowerCase().includes(q) ||
          (t.payerName || '').toLowerCase().includes(q) ||
          (t.propertyName || '').toLowerCase().includes(q) ||
          (t.unitNumber || '').toLowerCase().includes(q)
      );
    }
    if (status && status !== 'all') filtered = filtered.filter((t) => t.normalizedStatus === status || t.status === status);
    if (method && method !== 'all') filtered = filtered.filter((t) => (t.method || '').toLowerCase() === String(method).toLowerCase());
    if (propertyId && propertyId !== 'all') filtered = filtered.filter((t) => String(t.propertyId) === String(propertyId));

    if (exportFmt === 'csv') {
      const headers = [
        { label: 'Internal ID', key: 'internalTransactionId' },
        { label: 'Reference', key: 'reference' },
        { label: 'M-Pesa Reference', key: 'mpesaReference' },
        { label: 'Payer / Tenant', key: 'payerName' },
        { label: 'Property', key: 'propertyName' },
        { label: 'Unit', key: 'unitNumber' },
        { label: 'Method', key: 'method' },
        { label: 'Amount (KES)', key: 'amount' },
        { label: 'Status', key: 'status' },
        { label: 'Reconciliation', key: 'reconciliationStatus' },
        { label: 'Date', value: (r) => (r.date ? new Date(r.date).toISOString() : '') }
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="landlord-payments-${user._id}.csv"`);
      return res.send(buildCsv(headers, filtered));
    }

    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(limit || 20)));
    const total = filtered.length;
    const items = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const distinctMethods = [...new Set(unified.map((t) => t.method).filter(Boolean))].sort();

    res.json({
      overview: {
        totalRevenueCollected,
        expectedRent,
        outstandingRent,
        overdueRent,
        successfulCount,
        failedCount,
        pendingCount,
        reversedCount
      },
      analytics: {
        monthlyRevenueTrend,
        collectionsByProperty,
        methodDistribution,
        statusComparison,
        collectedVsOutstanding
      },
      reconciliation,
      filters: {
        methods: distinctMethods,
        properties: properties.map((p) => ({ _id: p._id, name: p.name }))
      },
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load financial intelligence' });
  }
};

/**
 * 9. GET /api/admin/users/:id/payments/:paymentId
 * Detailed transaction investigation record + related audit history.
 */
exports.getUserPaymentInvestigation = async (req, res) => {
  try {
    const { id: userId, paymentId } = req.params;
    if (!isValidObjectId(paymentId)) return res.status(400).json({ message: 'Invalid payment ID' });

    const [workspacePayment, gatewayTx] = await Promise.all([
      Payment.findById(paymentId)
        .populate('tenantId', 'name email phone')
        .populate('propertyId', 'name location')
        .populate('unitId', 'unitNumber propertyId')
        .lean(),
      PaymentTransaction.findById(paymentId)
        .populate('tenantId', 'name email phone')
        .populate('propertyId', 'name location')
        .populate('unitId', 'unitNumber')
        .lean()
    ]);

    if (!workspacePayment && !gatewayTx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    let linkedGatewayTx = gatewayTx;
    if (workspacePayment?.paymentTransactionId && !linkedGatewayTx) {
      linkedGatewayTx = await PaymentTransaction.findById(workspacePayment.paymentTransactionId).lean();
    }

    let property = workspacePayment?.propertyId || gatewayTx?.propertyId || null;
    if (!property && workspacePayment?.unitId?.propertyId) {
      property = await Property.findById(workspacePayment.unitId.propertyId).select('name location').lean();
    }

    const auditIds = [String(paymentId), linkedGatewayTx?._id ? String(linkedGatewayTx._id) : null].filter(Boolean);
    const auditHistory = await AdminLog.find({
      $or: [
        { targetId: { $in: auditIds } },
        { targetType: 'User', targetId: String(userId), category: 'payment' }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      transaction: {
        _id: String(workspacePayment?._id || gatewayTx._id),
        gatewayTransactionId: linkedGatewayTx ? String(linkedGatewayTx._id) : null,
        internalTransactionId: linkedGatewayTx?.internalTransactionId || workspacePayment?.invoiceNumber || `PAY-${String(paymentId).slice(-6).toUpperCase()}`,
        reference: workspacePayment?.reference || linkedGatewayTx?.accountReference || '—',
        mpesaReceiptNumber: linkedGatewayTx?.providerReference || (/m-?pesa|pesapal|pesaflow/i.test(workspacePayment?.method || '') ? workspacePayment?.reference : '') || '—',
        amount: Number(workspacePayment?.amount ?? linkedGatewayTx?.amountPaid ?? linkedGatewayTx?.amount ?? 0),
        expectedAmount: Number(linkedGatewayTx?.amount ?? workspacePayment?.amount ?? 0),
        currency: workspacePayment?.currency || linkedGatewayTx?.currency || 'KES',
        payer: {
          name: workspacePayment?.tenantId?.name || linkedGatewayTx?.customerName || '—',
          email: workspacePayment?.tenantId?.email || linkedGatewayTx?.customerEmail || '—',
          phone: workspacePayment?.tenantId?.phone || linkedGatewayTx?.customerPhone || '—'
        },
        propertyName: property?.name || '—',
        propertyLocation: property?.location || '',
        unitNumber: workspacePayment?.unitId?.unitNumber || gatewayTx?.unitId?.unitNumber || '—',
        paymentDate: workspacePayment?.paidAt || workspacePayment?.date || linkedGatewayTx?.paidAt || linkedGatewayTx?.createdAt,
        method: workspacePayment?.method || linkedGatewayTx?.paymentChannel || '—',
        provider: linkedGatewayTx?.provider || 'manual',
        gatewayEnvironment: linkedGatewayTx?.gatewayEnvironment || 'production',
        status: workspacePayment?.status || linkedGatewayTx?.status || '—',
        reconciliationStatus: linkedGatewayTx?.reconciliationStatus || (workspacePayment?.reconciled ? 'reconciled' : 'pending'),
        failureReason: linkedGatewayTx?.failureReason || '',
        reversalReason: linkedGatewayTx?.reversalReason || '',
        notes: workspacePayment?.notes || ''
      },
      auditHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to inspect transaction' });
  }
};

/**
 * 10. GET /api/admin/users/:id/subscriptions
 * Full Subscription & Billing Management data + Plan Usage + Billing History + Plan Changes.
 */
exports.getUserSubscriptions = async (req, res) => {
  try {
    await seedDefaultPlans();
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, properties, units } = ctx;
    const now = new Date();

    const [plans, subscriptions, entitlement, billingTransactions, billingInvoices, planChangeHistory, teamUsersCount] =
      await Promise.all([
        SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
        LandlordSubscription.find({ landlordId: user._id }).sort({ createdAt: -1 }).lean(),
        UnitEntitlement.findOne({ landlordId: user._id }).lean(),
        PaymentTransaction.find({
          landlordId: user._id,
          paymentCategory: { $in: ['subscription', 'unit_upgrade', 'subscription_renewal'] }
        })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        Invoice.find({ landlordId: user._id, invoiceCategory: 'subscription' })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        SubscriptionAuditLog.find({ landlordId: user._id })
          .populate('actorId', 'name email role')
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        User.countDocuments({ $or: [{ _id: user._id }, { organizationOwner: user._id }] })
      ]);

    const currentSub = subscriptions[0] || null;
    const currentPlanCode = (entitlement?.planCode || currentSub?.planCode || user.subscriptionTier || 'starter').toLowerCase();
    const matchedPlan = plans.find((p) => p.code === currentPlanCode) || plans[0] || null;

    const expiresAt = entitlement?.expiresAt || currentSub?.expiryDate || null;
    const daysRemaining = expiresAt
      ? Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const unitsAllowed = entitlement?.isUnlimited || matchedPlan?.isCustomUnlimited
      ? null
      : Number(entitlement?.purchasedLimit || currentSub?.purchasedUnits || matchedPlan?.maxUnits || 5);

    res.json({
      current: {
        planCode: currentPlanCode,
        planName: entitlement?.planName || currentSub?.planName || matchedPlan?.name || 'Starter',
        status: entitlement?.status || currentSub?.status || 'trial',
        billingCycle: currentSub?.billingCycle || 'monthly',
        priceAmount: currentSub?.priceAmount || matchedPlan?.pricing?.monthly || 0,
        currency: currentSub?.currency || matchedPlan?.currency || 'KES',
        startDate: currentSub?.startDate || currentSub?.createdAt || user.createdAt,
        renewalDate: currentSub?.renewalDate || expiresAt,
        trialExpiryDate: (entitlement?.status === 'trial' || currentSub?.status === 'trial') ? expiresAt : null,
        expiryDate: expiresAt,
        daysRemaining,
        autoRenew: currentSub?.autoRenew ?? true,
        features: matchedPlan?.features || []
      },
      usage: {
        propertiesRegistered: properties.length,
        propertiesAllowed: null, // Plans in MakaziFlow meter by units; null = unlimited properties
        unitsRegistered: units.length,
        unitsAllowed,
        usersRegistered: teamUsersCount,
        usersAllowed: null
      },
      plans,
      subscriptions,
      billingHistory: billingTransactions,
      billingInvoices,
      planChangeHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load subscription details' });
  }
};

/**
 * 11. POST /api/admin/users/:id/subscriptions/manage
 * Upgrade, downgrade, extend_trial, extend_subscription, suspend, reactivate, adjust_limit.
 */
exports.manageUserSubscription = async (req, res) => {
  try {
    await seedDefaultPlans();
    const landlordId = req.params.id;
    const user = await User.findById(landlordId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { action, planCode, billingCycle = 'monthly', extendDays = 14, purchasedLimit, reason = 'Super Admin subscription adjustment' } = req.body || {};

    let ent = await UnitEntitlement.findOne({ landlordId });
    let sub = await LandlordSubscription.findOne({ landlordId }).sort({ createdAt: -1 });
    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1 }).lean();

    const prevState = {
      planCode: ent?.planCode || sub?.planCode || user.subscriptionTier,
      status: ent?.status || sub?.status || 'trial',
      purchasedLimit: ent?.purchasedLimit || sub?.purchasedUnits || 5,
      expiresAt: ent?.expiresAt || sub?.expiryDate || null
    };

    const targetPlan = planCode
      ? plans.find((p) => p.code === String(planCode).toLowerCase())
      : plans.find((p) => p.code === (prevState.planCode || 'starter')) || plans[0];

    if (!targetPlan) return res.status(400).json({ message: 'Target subscription plan not found' });

    // Ensure a LandlordSubscription & UnitEntitlement exist so admin controls work even for new trial accounts
    if (!sub) {
      const defaultExp = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      sub = await LandlordSubscription.create({
        landlordId,
        planId: targetPlan._id,
        planCode: targetPlan.code,
        planName: targetPlan.name,
        billingCycle,
        purchasedUnits: targetPlan.maxUnits || 5,
        maxPlanUnits: targetPlan.maxUnits || 5,
        isCustomUnlimited: Boolean(targetPlan.isCustomUnlimited),
        baseAmount: targetPlan.pricing?.[billingCycle] || 0,
        priceAmount: targetPlan.pricing?.[billingCycle] || 0,
        status: 'trial',
        startDate: new Date(),
        expiryDate: defaultExp,
        renewalDate: defaultExp,
        paymentEnvironment: 'trial'
      });
    }

    if (!ent) {
      ent = await UnitEntitlement.create({
        landlordId,
        subscriptionId: sub._id,
        planCode: sub.planCode,
        planName: sub.planName,
        purchasedLimit: sub.purchasedUnits,
        isUnlimited: Boolean(sub.isCustomUnlimited),
        activeUnitCount: await Unit.countDocuments({ user: landlordId, isDemo: { $ne: true } }),
        status: sub.status === 'active' ? 'active' : 'trial',
        expiresAt: sub.expiryDate
      });
    }

    let auditAction = 'unit_limit_adjusted';
    const baseExpiryTs = Math.max(Date.now(), ent.expiresAt ? new Date(ent.expiresAt).getTime() : Date.now());

    if (action === 'upgrade' || action === 'downgrade') {
      sub.planId = targetPlan._id;
      sub.planCode = targetPlan.code;
      sub.planName = targetPlan.name;
      sub.billingCycle = billingCycle;
      sub.purchasedUnits = purchasedLimit ? Math.max(1, Number(purchasedLimit)) : (targetPlan.maxUnits || 5);
      sub.maxPlanUnits = targetPlan.maxUnits || sub.purchasedUnits;
      sub.isCustomUnlimited = Boolean(targetPlan.isCustomUnlimited);
      sub.baseAmount = targetPlan.pricing?.[billingCycle] || 0;
      sub.priceAmount = targetPlan.pricing?.[billingCycle] || 0;
      sub.status = 'active';
      sub.updatedAt = new Date();

      ent.subscriptionId = sub._id;
      ent.planCode = targetPlan.code;
      ent.planName = targetPlan.name;
      ent.purchasedLimit = sub.purchasedUnits;
      ent.isUnlimited = Boolean(targetPlan.isCustomUnlimited);
      ent.status = 'active';
      user.subscriptionTier = targetPlan.code;
      user.activeSubscriptionId = sub._id;
      auditAction = action === 'upgrade' ? 'subscription_upgraded' : 'subscription_downgraded';
    } else if (action === 'extend_trial') {
      const days = Math.max(1, Math.min(365, Number(extendDays || 14)));
      const nextExp = new Date(baseExpiryTs + days * 24 * 60 * 60 * 1000);
      sub.status = 'trial';
      sub.expiryDate = nextExp;
      sub.renewalDate = nextExp;
      ent.status = 'trial';
      ent.expiresAt = nextExp;
      auditAction = 'subscription_renewed';
    } else if (action === 'extend_subscription') {
      const days = Math.max(1, Math.min(730, Number(extendDays || 30)));
      const nextExp = new Date(baseExpiryTs + days * 24 * 60 * 60 * 1000);
      sub.status = 'active';
      sub.expiryDate = nextExp;
      sub.renewalDate = nextExp;
      ent.status = 'active';
      ent.expiresAt = nextExp;
      auditAction = 'subscription_renewed';
    } else if (action === 'suspend') {
      sub.status = 'suspended';
      sub.suspensionReason = String(reason).trim();
      ent.status = 'suspended';
      auditAction = 'subscription_suspended';
    } else if (action === 'reactivate') {
      sub.status = 'active';
      sub.suspensionReason = '';
      ent.status = 'active';
      auditAction = 'subscription_reactivated';
    } else if (action === 'adjust_limit') {
      const nextLimit = Math.max(1, Number(purchasedLimit || ent.purchasedLimit || 5));
      sub.purchasedUnits = nextLimit;
      ent.purchasedLimit = nextLimit;
      auditAction = 'unit_limit_adjusted';
    } else {
      return res.status(400).json({ message: `Unsupported subscription action: ${action}` });
    }

    ent.updatedAt = new Date();
    sub.updatedAt = new Date();
    await Promise.all([sub.save(), ent.save(), user.save()]);

    const newState = {
      planCode: ent.planCode,
      status: ent.status,
      purchasedLimit: ent.purchasedLimit,
      expiresAt: ent.expiresAt
    };

    await Promise.all([
      logSubscriptionAudit({
        landlordId,
        subscriptionId: sub._id,
        actorId: req.user._id,
        actorRole: 'superadmin',
        action: auditAction,
        previousState: prevState,
        newState,
        reason: String(reason).trim()
      }),
      logAdminAction({
        req,
        action: `SUBSCRIPTION_${auditAction.toUpperCase()}`,
        category: 'subscription',
        targetType: 'User',
        targetId: String(landlordId),
        details: `Subscription ${action} for ${user.email}: plan=${ent.planCode}, status=${ent.status}, limit=${ent.purchasedLimit}. Reason: ${reason}`,
        previousState: prevState,
        newState
      })
    ]);

    res.json({ success: true, entitlement: ent, subscription: sub });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update subscription' });
  }
};

/**
 * 12. GET /api/admin/users/:id/security
 * Login history, security events, and chronological immutable audit timeline.
 */
exports.getUserSecurityAudit = async (req, res) => {
  try {
    const ctx = await loadLandlordContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'User not found' });

    const { user, refreshTokens } = ctx;
    const { category = 'all' } = req.query;

    const [activityLogs, adminLogs, subscriptionAudits] = await Promise.all([
      ActivityLog.find({ userId: user._id }).sort({ timestamp: -1 }).limit(100).lean(),
      AdminLog.find({ targetType: 'User', targetId: String(user._id) }).sort({ createdAt: -1 }).limit(100).lean(),
      SubscriptionAuditLog.find({ landlordId: user._id })
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Derive login sessions from active refreshTokens + auth ActivityLogs
    const sessionLogins = refreshTokens.map((rt, idx) => {
      const parsed = parseUserAgent(rt.userAgent);
      return {
        _id: `session-${idx}-${rt.createdAt || ''}`,
        timestamp: rt.createdAt || user.lastLoginAt || user.createdAt,
        ipAddress: 'Recorded on session',
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        status: 'Active Session',
        location: 'Not reliably available'
      };
    });

    const authActivities = activityLogs
      .filter((a) => a.type === 'auth' || /login|otp|password|verify|sign/i.test(a.action || ''))
      .map((a) => ({
        _id: String(a._id),
        timestamp: a.timestamp,
        ipAddress: '—',
        device: 'Web Client',
        browser: '—',
        os: '—',
        status: a.status === 'failed' || /fail/i.test(a.action || '') ? 'Failed' : 'Success',
        action: a.action,
        description: a.description,
        location: 'Not reliably available'
      }));

    const loginHistory = [...sessionLogins, ...authActivities]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 40);

    // Security events
    const securityEvents = [
      ...authActivities.map((a) => ({
        _id: `act-${a._id}`,
        eventType: a.action || 'Authentication Event',
        status: a.status,
        description: a.description || a.action,
        timestamp: a.timestamp,
        actor: user.email,
        ipAddress: a.ipAddress
      })),
      ...adminLogs
        .filter((l) => ['security', 'auth', 'user'].includes(l.category) || /SUSPEND|DEACTIVATE|RESET|VERIF|PASSWORD|ACCESS/i.test(l.action))
        .map((l) => ({
          _id: `adm-${l._id}`,
          eventType: l.action,
          status: l.status || 'success',
          description: l.details,
          timestamp: l.createdAt,
          actor: l.adminEmail || l.adminName || 'Super Admin',
          ipAddress: l.ipAddress || '—'
        }))
    ].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // Unified immutable chronological timeline
    const timeline = [
      {
        eventId: `created-${user._id}`,
        category: 'account',
        action: 'ACCOUNT_CREATED',
        actor: user.email,
        entity: 'User',
        description: `Account registered via ${user.authProvider || 'local'} provider`,
        previousValue: null,
        newValue: { email: user.email, role: user.role },
        ipAddress: '—',
        timestamp: user.createdAt
      },
      ...activityLogs.map((a) => ({
        eventId: String(a._id),
        category: a.type || 'general',
        action: a.action,
        actor: a.userEmail || a.user || user.email,
        entity: a.type || 'Account',
        description: a.description || a.action,
        previousValue: null,
        newValue: null,
        ipAddress: '—',
        timestamp: a.timestamp
      })),
      ...adminLogs.map((l) => ({
        eventId: String(l._id),
        category: l.category || 'admin',
        action: l.action,
        actor: `${l.adminName || 'Super Admin'} (${l.adminEmail || 'admin'})`,
        entity: l.targetType || 'User',
        description: l.details,
        previousValue: l.previousState || null,
        newValue: l.newState || null,
        ipAddress: l.ipAddress || '—',
        timestamp: l.createdAt
      })),
      ...subscriptionAudits.map((s) => ({
        eventId: String(s._id),
        category: 'subscription',
        action: String(s.action || '').toUpperCase(),
        actor: s.actorId?.email || s.actorRole || 'system',
        entity: 'Subscription',
        description: s.reason || `Subscription event: ${s.action}`,
        previousValue: s.previousState || null,
        newValue: s.newState || null,
        ipAddress: '—',
        timestamp: s.createdAt
      }))
    ]
      .filter((e) => category === 'all' || e.category === category)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    res.json({
      securitySummary: {
        isVerified: Boolean(user.isVerified),
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        failedLoginAttempts: Number(user.failedLoginAttempts || 0),
        isLocked: Boolean(user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()),
        activeSessionsCount: refreshTokens.length,
        passwordChangedAt: user.passwordChangedAt || null,
        lastLoginAt: user.lastLoginAt || null
      },
      loginHistory,
      securityEvents: securityEvents.slice(0, 50),
      timeline: timeline.slice(0, 100)
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load security & audit records' });
  }
};

/**
 * 13. GET /api/admin/users/:id/support
 * Support tickets, internal admin-only notes, and sent notifications/communications.
 */
exports.getUserSupportCenter = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email phone').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [tickets, internalNotes, notifications, communications] = await Promise.all([
      SupportTicket.find({
        $or: [{ userId: user._id }, { email: String(user.email || '').toLowerCase() }]
      })
        .populate('assignedTo', 'name email')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(50)
        .lean(),
      AdminNote.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      UserNotification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      CommunicationLog.find({
        $or: [{ user: user._id }, { recipientEmail: String(user.email || '').toLowerCase() }]
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean()
    ]);

    res.json({
      tickets,
      internalNotes,
      notifications,
      communications
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load support center' });
  }
};

/**
 * 14. POST /api/admin/users/:id/notes
 * Create an internal Super Admin note (never exposed to landlord).
 */
exports.createInternalNote = async (req, res) => {
  try {
    const { content, relatedIssue = 'General', priority = 'normal' } = req.body || {};
    if (!content || String(content).trim().length < 2) {
      return res.status(400).json({ message: 'Note content is required.' });
    }

    const user = await User.findById(req.params.id).select('email').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const note = await AdminNote.create({
      userId: user._id,
      adminId: req.user._id,
      adminName: req.user.name || 'Super Admin',
      adminEmail: req.user.email || '',
      content: String(content).trim(),
      relatedIssue: String(relatedIssue || 'General').trim(),
      priority: ['low', 'normal', 'high'].includes(priority) ? priority : 'normal'
    });

    await logAdminAction({
      req,
      action: 'INTERNAL_NOTE_ADDED',
      category: 'support',
      targetType: 'User',
      targetId: String(user._id),
      details: `Added internal note (${note.relatedIssue}) for ${user.email}`
    });

    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to save internal note' });
  }
};

/**
 * 15. POST /api/admin/users/:id/notify
 * Send Email and/or In-App Notification to landlord with audit trail.
 */
exports.sendUserNotification = async (req, res) => {
  try {
    const { channel = 'both', category = 'general', title, message } = req.body || {};
    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ message: 'Notification title and message are required.' });
    }

    const user = await User.findById(req.params.id).select('name email phone').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    let emailStatus = 'not_applicable';
    let emailError = '';

    if (channel === 'email' || channel === 'both') {
      try {
        await sendEmail({
          email: user.email,
          toName: user.name,
          subject: String(title).trim(),
          html: `<div style="font-family:Inter,Arial,sans-serif;color:#152238;line-height:1.6;"><p>Hello ${user.name},</p><p>${String(message).trim().replace(/\n/g, '<br/>')}</p><hr style="border:none;border-top:1px solid #e1e7ef;margin:16px 0;"/><p style="font-size:12px;color:#738197;">Sent by MakaziFlow Administration Team</p></div>`,
          commMeta: { user: user._id, category: category === 'subscription_expiry' ? 'subscription' : 'reminder', recipientType: 'team' }
        });
        emailStatus = 'sent';
      } catch (err) {
        emailStatus = 'failed';
        emailError = err.message || 'Email delivery failed';
      }
    }

    const notification = await UserNotification.create({
      userId: user._id,
      sentByAdminId: req.user._id,
      sentByAdminName: req.user.name || 'Super Admin',
      channel: ['in_app', 'email', 'both'].includes(channel) ? channel : 'both',
      category: ['verification_reminder', 'subscription_expiry', 'payment_reminder', 'announcement', 'security', 'general'].includes(category)
        ? category
        : 'general',
      title: String(title).trim(),
      message: String(message).trim(),
      emailStatus,
      emailError
    });

    await logAdminAction({
      req,
      action: 'USER_NOTIFICATION_SENT',
      category: 'support',
      targetType: 'User',
      targetId: String(user._id),
      details: `Sent ${channel} (${category}) notification "${notification.title}" to ${user.email} (email=${emailStatus})`
    });

    res.status(201).json({
      success: true,
      notification,
      emailStatus,
      emailError
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to send notification' });
  }
};
