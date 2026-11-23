const PDFDocument = require('pdfkit');
const User = require('../../models/User');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const PaymentTransaction = require('../../models/PaymentTransaction');
const LandlordSubscription = require('../../models/LandlordSubscription');
const ActivityLog = require('../../models/ActivityLog');
const AdminLog = require('../../models/AdminLog');
const { logAdminAction } = require('../../utils/auditLogger');
const { getDemoExclusionScope } = require('../../services/adminScopeService');

const VALID_REPORT_TYPES = new Set([
  'users',
  'landlords',
  'properties',
  'tenants',
  'revenue',
  'transactions',
  'subscriptions',
  'occupancy',
  'activity'
]);

const SETTLED_PAYMENT_STATUSES = ['paid', 'confirmed', 'Completed', 'partial'];

function resolveDateRange(query = {}) {
  const now = new Date();
  const period = String(query.period || 'monthly').toLowerCase();
  let start = query.startDate ? new Date(query.startDate) : null;
  let end = query.endDate ? new Date(query.endDate) : new Date(now);
  if (end) end.setHours(23, 59, 59, 999);

  if (!start || isNaN(start.getTime())) {
    if (period === 'all') {
      start = new Date(0);
    } else if (period === 'weekly') {
      start = new Date(now.getTime() - 7 * 86400000);
    } else if (period === 'annual') {
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    } else {
      start = new Date(now.getTime() - 30 * 86400000);
    }
  }
  return { start, end, period };
}

async function generateReportPayload(type, query = {}) {
  const { start, end, period } = resolveDateRange(query);
  const hasExplicitDates = Boolean(query.startDate || query.endDate);
  const dateFilter = { $gte: start, $lte: end };
  const scope = await getDemoExclusionScope();
  const applyDateFilter = period !== 'all' || hasExplicitDates;

  if (type === 'users') {
    const users = await User.find({
      ...scope.userExcludeFilter,
      ...(applyDateFilter ? { createdAt: dateFilter } : {})
    })
      .select('name email phone companyName role accountStatus isVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return {
      type,
      period,
      title: 'User Registration Report',
      summary: {
        totalRecords: users.length,
        activeCount: users.filter((u) => (u.accountStatus || 'active') === 'active').length,
        suspendedCount: users.filter((u) => u.accountStatus === 'suspended').length
      },
      columns: ['Name', 'Email', 'Phone', 'Company', 'Role', 'Status', 'Registered'],
      rows: users.map((u) => [
        u.name,
        u.email,
        u.phone || '—',
        u.companyName || '—',
        u.role,
        u.accountStatus || (u.isVerified ? 'active' : 'pending_verification'),
        new Date(u.createdAt).toISOString().slice(0, 10)
      ])
    };
  }

  if (type === 'landlords') {
    const [landlords, props, units, tenants, payments, subs] = await Promise.all([
      User.find({
        ...scope.userExcludeFilter,
        role: { $in: ['admin', 'landlord'] },
        isSuperAdmin: { $ne: true }
      })
        .select('name email phone companyName accountStatus subscriptionTier createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Property.find(scope.propertyExcludeFilter).select('_id user').lean(),
      Unit.find(scope.unitExcludeFilter).select('_id user status propertyId').lean(),
      Tenant.find(scope.tenantExcludeFilter).select('_id user unitId status').lean(),
      Payment.find({
        ...scope.paymentExcludeFilter,
        status: { $in: SETTLED_PAYMENT_STATUSES },
        ...(applyDateFilter ? { date: dateFilter } : {})
      })
        .select('user amount')
        .lean(),
      LandlordSubscription.find({
        status: { $in: ['active', 'trial', 'grace_period'] }
      })
        .select('landlordId planName status')
        .lean()
    ]);

    const propCountByUser = new Map();
    const unitCountByUser = new Map();
    const occupiedByUser = new Map();
    const tenantCountByUser = new Map();
    const revByUser = new Map();
    const payCountByUser = new Map();
    const subByUser = new Map(subs.map((s) => [String(s.landlordId), `${s.planName} (${s.status})`]));

    props.forEach((p) => {
      const k = String(p.user);
      propCountByUser.set(k, (propCountByUser.get(k) || 0) + 1);
    });
    units.forEach((u) => {
      const k = String(u.user);
      unitCountByUser.set(k, (unitCountByUser.get(k) || 0) + 1);
      if (u.status === 'occupied') occupiedByUser.set(k, (occupiedByUser.get(k) || 0) + 1);
    });
    tenants.forEach((t) => {
      const k = String(t.user);
      tenantCountByUser.set(k, (tenantCountByUser.get(k) || 0) + 1);
    });
    payments.forEach((p) => {
      const k = String(p.user);
      revByUser.set(k, (revByUser.get(k) || 0) + Number(p.amount || 0));
      payCountByUser.set(k, (payCountByUser.get(k) || 0) + 1);
    });

    let totalRevenueKES = 0;
    const rows = landlords.map((l) => {
      const k = String(l._id);
      const pCount = propCountByUser.get(k) || 0;
      const uCount = unitCountByUser.get(k) || 0;
      const occCount = occupiedByUser.get(k) || 0;
      const tCount = tenantCountByUser.get(k) || 0;
      const rev = revByUser.get(k) || 0;
      const pays = payCountByUser.get(k) || 0;
      const occRate = uCount > 0 ? `${Math.round((occCount / uCount) * 100)}%` : '0%';
      totalRevenueKES += rev;
      return [
        l.name,
        l.email,
        pCount,
        uCount,
        tCount,
        occRate,
        pays,
        rev.toLocaleString(),
        subByUser.get(k) || l.subscriptionTier || 'Starter'
      ];
    });

    return {
      type,
      period,
      title: 'Landlord Portfolio & Revenue Report',
      summary: {
        totalLandlords: landlords.length,
        totalPropertiesRegistered: props.length,
        totalTenantsRegistered: tenants.length,
        totalLandlordRevenueKES: totalRevenueKES
      },
      columns: [
        'Landlord',
        'Email',
        'Properties',
        'Units',
        'Tenants Registered',
        'Occupancy',
        'Payments',
        'Revenue Generated (KES)',
        'Plan'
      ],
      rows
    };
  }

  if (type === 'properties') {
    const [props, units, tenants, payments] = await Promise.all([
      Property.find({
        ...scope.propertyExcludeFilter,
        ...(hasExplicitDates ? { createdAt: dateFilter } : {})
      })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean(),
      Unit.find(scope.unitExcludeFilter).select('_id propertyId status').lean(),
      Tenant.find(scope.tenantExcludeFilter).select('_id unitId status').lean(),
      Payment.find({
        ...scope.paymentExcludeFilter,
        status: { $in: SETTLED_PAYMENT_STATUSES },
        ...(applyDateFilter ? { date: dateFilter } : {})
      })
        .select('unitId amount')
        .lean()
    ]);

    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const statsByProp = new Map();
    const ensure = (k) => {
      if (!statsByProp.has(k)) {
        statsByProp.set(k, { units: 0, occupied: 0, tenants: 0, revenue: 0 });
      }
      return statsByProp.get(k);
    };

    units.forEach((u) => {
      const b = ensure(String(u.propertyId));
      b.units += 1;
      if (u.status === 'occupied') b.occupied += 1;
    });
    tenants.forEach((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (pId) ensure(pId).tenants += 1;
    });
    payments.forEach((p) => {
      const pId = p.unitId ? unitToProp.get(String(p.unitId)) : null;
      if (pId) ensure(pId).revenue += Number(p.amount || 0);
    });

    let totalUnits = 0;
    let totalTenants = 0;
    let totalRevenue = 0;
    const rows = props.map((p) => {
      const st = statsByProp.get(String(p._id)) || { units: 0, occupied: 0, tenants: 0, revenue: 0 };
      totalUnits += st.units;
      totalTenants += st.tenants;
      totalRevenue += st.revenue;
      const occ = st.units > 0 ? `${Math.round((st.occupied / st.units) * 100)}%` : '0%';
      return [
        p.name,
        p.location,
        p.type || 'Apartment',
        p.user?.email || p.user?.name || '—',
        st.units,
        st.tenants,
        occ,
        st.revenue.toLocaleString(),
        p.isFlagged ? 'flagged' : (p.status || 'active'),
        new Date(p.createdAt).toISOString().slice(0, 10)
      ];
    });

    return {
      type,
      period,
      title: 'Synced Property Portfolio & Revenue Report',
      summary: {
        totalProperties: props.length,
        totalUnits,
        totalRegisteredTenants: totalTenants,
        totalRevenueGeneratedKES: totalRevenue
      },
      columns: [
        'Property',
        'Location',
        'Type',
        'Landlord',
        'Units',
        'Tenants Registered',
        'Occupancy',
        'Revenue Generated (KES)',
        'Status',
        'Created'
      ],
      rows
    };
  }

  if (type === 'tenants') {
    const [props, units, tenants] = await Promise.all([
      Property.find(scope.propertyExcludeFilter)
        .populate('user', 'name email companyName')
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean(),
      Unit.find(scope.unitExcludeFilter).select('_id propertyId status').lean(),
      Tenant.find({
        ...scope.tenantExcludeFilter,
        ...(hasExplicitDates ? { createdAt: dateFilter } : {})
      })
        .select('unitId status')
        .lean()
    ]);

    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const statsByProp = new Map();
    const ensure = (k) => {
      if (!statsByProp.has(k)) {
        statsByProp.set(k, { units: 0, occupied: 0, totalTenants: 0, activeTenants: 0, pastTenants: 0 });
      }
      return statsByProp.get(k);
    };

    units.forEach((u) => {
      const b = ensure(String(u.propertyId));
      b.units += 1;
      if (u.status === 'occupied') b.occupied += 1;
    });
    tenants.forEach((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (!pId) return;
      const b = ensure(pId);
      b.totalTenants += 1;
      if (t.status === 'active') b.activeTenants += 1;
      else b.pastTenants += 1;
    });

    const rows = props.map((p) => {
      const b = statsByProp.get(String(p._id)) || { units: 0, occupied: 0, totalTenants: 0, activeTenants: 0, pastTenants: 0 };
      const occ = b.units > 0 ? `${Math.round((b.occupied / b.units) * 100)}%` : '0%';
      return [
        p.name,
        p.location,
        p.user?.companyName || p.user?.name || '—',
        p.user?.email || '—',
        b.units,
        b.totalTenants,
        b.activeTenants,
        b.pastTenants,
        occ
      ];
    });

    return {
      type,
      period,
      title: 'ODPP-Compliant Tenant Count Summary Report',
      summary: {
        totalRegisteredTenants: tenants.length,
        activeTenancies: tenants.filter((t) => t.status === 'active').length,
        pastTenancies: tenants.filter((t) => t.status !== 'active').length,
        propertiesCovered: props.length
      },
      columns: ['Property', 'Location', 'Landlord', 'Email', 'Units', 'Registered Tenants', 'Active', 'Past', 'Occupancy'],
      rows
    };
  }

  if (type === 'revenue') {
    const [txns, landlordPayments] = await Promise.all([
      PaymentTransaction.find({
        gatewayEnvironment: 'production',
        isSandbox: { $ne: true },
        status: 'paid',
        ...(applyDateFilter ? { createdAt: dateFilter } : {})
      })
        .sort({ createdAt: -1 })
        .lean(),
      Payment.find({
        ...scope.paymentExcludeFilter,
        status: { $in: SETTLED_PAYMENT_STATUSES },
        ...(applyDateFilter ? { date: dateFilter } : {})
      })
        .select('amount date paymentTransactionId')
        .lean()
    ]);

    const linkedTxnIds = new Set(
      landlordPayments
        .map((p) => (p.paymentTransactionId ? String(p.paymentTransactionId) : null))
        .filter(Boolean)
    );

    const byMonth = new Map();
    const ensureMonth = (m) => {
      if (!byMonth.has(m)) {
        byMonth.set(m, { month: m, subscriptionRevenue: 0, landlordRevenue: 0, count: 0 });
      }
      return byMonth.get(m);
    };

    txns.forEach((t) => {
      const m = new Date(t.paidAt || t.createdAt).toISOString().slice(0, 7);
      const entry = ensureMonth(m);
      const amt = Number(t.amountPaid || t.amount || 0);
      if (['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory)) {
        entry.subscriptionRevenue += amt;
        entry.count += 1;
      } else if (!linkedTxnIds.has(String(t._id))) {
        entry.landlordRevenue += amt;
        entry.count += 1;
      }
    });

    landlordPayments.forEach((p) => {
      const m = new Date(p.date || p.createdAt).toISOString().slice(0, 7);
      const entry = ensureMonth(m);
      entry.landlordRevenue += Number(p.amount || 0);
      entry.count += 1;
    });

    const series = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    const totalSubscriptionRevenue = series.reduce((s, x) => s + x.subscriptionRevenue, 0);
    const totalLandlordRevenue = series.reduce((s, x) => s + x.landlordRevenue, 0);
    return {
      type,
      period,
      title: 'Synced Platform & Landlord Revenue Report',
      summary: {
        totalSubscriptionRevenueKES: totalSubscriptionRevenue,
        totalLandlordRevenueKES: totalLandlordRevenue,
        combinedSystemVolumeKES: totalSubscriptionRevenue + totalLandlordRevenue,
        settledPaymentsCount: series.reduce((s, x) => s + x.count, 0)
      },
      columns: ['Month', 'Settled Count', 'Subscription Revenue (KES)', 'Landlord Revenue (KES)', 'Combined Volume (KES)'],
      rows: series.map((r) => [
        r.month,
        r.count,
        r.subscriptionRevenue.toLocaleString(),
        r.landlordRevenue.toLocaleString(),
        (r.subscriptionRevenue + r.landlordRevenue).toLocaleString()
      ])
    };
  }

  if (type === 'transactions') {
    const txns = await PaymentTransaction.find({
      gatewayEnvironment: 'production',
      isSandbox: { $ne: true },
      ...(applyDateFilter ? { createdAt: dateFilter } : {})
    })
      .populate('landlordId', 'email name')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return {
      type,
      period,
      title: 'Platform Transactions Report',
      summary: {
        totalTransactions: txns.length,
        paidCount: txns.filter((t) => t.status === 'paid').length,
        totalPaidKES: txns.filter((t) => t.status === 'paid').reduce((s, t) => s + Number(t.amountPaid || t.amount || 0), 0)
      },
      columns: ['Date', 'Reference', 'Category', 'Provider', 'Subscriber', 'Amount (KES)', 'Status'],
      rows: txns.map((t) => [
        new Date(t.createdAt).toISOString().slice(0, 10),
        t.providerReference || t.accountReference,
        t.paymentCategory,
        t.provider,
        t.landlordId?.email || t.landlordId?.name || 'Subscriber',
        Number(t.amountPaid || t.amount || 0).toLocaleString(),
        t.status
      ])
    };
  }

  if (type === 'subscriptions') {
    const subs = await LandlordSubscription.find({
      ...(scope.demoUserIds.length ? { landlordId: { $nin: scope.demoUserIds } } : {}),
      ...(applyDateFilter ? { createdAt: dateFilter } : {})
    })
      .populate('landlordId', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return {
      type,
      period,
      title: 'Subscription Analytics Report',
      summary: {
        totalSubscriptions: subs.length,
        activeCount: subs.filter((s) => ['active', 'trial'].includes(s.status)).length,
        expiredCount: subs.filter((s) => s.status === 'expired').length
      },
      columns: ['Landlord', 'Plan', 'Cycle', 'Units', 'Amount (KES)', 'Status', 'Expiry'],
      rows: subs.map((s) => [
        s.landlordId?.email || s.landlordId?.name || '—',
        s.planName,
        s.billingCycle,
        s.isCustomUnlimited ? 'Unlimited' : s.purchasedUnits,
        Number(s.priceAmount || 0).toLocaleString(),
        s.status,
        s.expiryDate ? new Date(s.expiryDate).toISOString().slice(0, 10) : '—'
      ])
    };
  }

  if (type === 'occupancy') {
    const [props, units, tenants] = await Promise.all([
      Property.find(scope.propertyExcludeFilter).populate('user', 'name email').lean(),
      Unit.find(scope.unitExcludeFilter).lean(),
      Tenant.find(scope.tenantExcludeFilter).select('unitId').lean()
    ]);
    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const byProp = new Map();
    units.forEach((u) => {
      const k = String(u.propertyId);
      const bucket = byProp.get(k) || { total: 0, occupied: 0, vacant: 0, maintenance: 0, tenants: 0 };
      bucket.total += 1;
      if (u.status === 'occupied') bucket.occupied += 1;
      else if (u.status === 'maintenance') bucket.maintenance += 1;
      else bucket.vacant += 1;
      byProp.set(k, bucket);
    });
    tenants.forEach((t) => {
      const k = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (k && byProp.has(k)) byProp.get(k).tenants += 1;
    });
    const rows = props.map((p) => {
      const u = byProp.get(String(p._id)) || { total: 0, occupied: 0, vacant: 0, maintenance: 0, tenants: 0 };
      const rate = u.total > 0 ? Math.round((u.occupied / u.total) * 100) : 0;
      return [p.name, p.location, p.user?.email || '—', u.total, u.tenants, u.occupied, u.vacant, `${rate}%`];
    });
    return {
      type,
      period,
      title: 'Portfolio Occupancy Report',
      summary: {
        totalProperties: props.length,
        totalUnits: units.length,
        registeredTenants: tenants.length,
        occupiedUnits: units.filter((u) => u.status === 'occupied').length,
        vacantUnits: units.filter((u) => u.status === 'vacant').length
      },
      columns: ['Property', 'Location', 'Landlord', 'Total Units', 'Tenants', 'Occupied', 'Vacant', 'Occupancy %'],
      rows
    };
  }

  // 'activity'
  const [adminLogs, activityLogs] = await Promise.all([
    AdminLog.find(applyDateFilter ? { createdAt: dateFilter } : {}).sort({ createdAt: -1 }).limit(300).lean(),
    ActivityLog.find({
      ...(scope.demoUserIds.length ? { userId: { $nin: scope.demoUserIds } } : {}),
      ...(applyDateFilter ? { timestamp: dateFilter } : {})
    })
      .sort({ timestamp: -1 })
      .limit(300)
      .lean()
  ]);
  const merged = [
    ...adminLogs.map((l) => ({
      date: l.createdAt,
      source: 'AdminAudit',
      actor: l.adminEmail || l.adminName,
      action: l.action,
      details: l.details,
      status: l.status
    })),
    ...activityLogs.map((l) => ({
      date: l.timestamp,
      source: 'PlatformActivity',
      actor: l.userEmail || l.user,
      action: l.action,
      details: l.description,
      status: l.status
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    type: 'activity',
    period,
    title: 'Account & Security Activity Report',
    summary: { totalEvents: merged.length },
    columns: ['Timestamp', 'Source', 'Actor', 'Action', 'Details', 'Status'],
    rows: merged.map((e) => [
      new Date(e.date).toISOString().slice(0, 19).replace('T', ' '),
      e.source,
      e.actor || 'System',
      e.action,
      e.details || '',
      e.status
    ])
  };
}

function buildReportPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36, layout: report.columns.length > 6 ? 'landscape' : 'portrait' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const navy = '#0d2240';
      const teal = '#00a99d';
      const pageW = doc.page.width;
      const contentW = pageW - 72;

      const drawBar = () => {
        const grad = doc.linearGradient(24, 20, pageW - 24, 20);
        grad.stop(0, '#0a1e35').stop(0.5, navy).stop(0.8, teal).stop(1, '#00d4c8');
        doc.rect(24, 20, pageW - 48, 8).fill(grad);
      };

      drawBar();
      doc.font('Helvetica-Bold').fontSize(13).fillColor(navy).text('MakaziFlow Platform Administration', 36, 40);
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text(`Generated: ${new Date().toLocaleString('en-KE')} | Period: ${report.period}`, 36, 56);
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a')
        .text(report.title.toUpperCase(), 36, 78, { width: contentW, align: 'center' });

      let y = 108;
      const colW = contentW / Math.max(1, report.columns.length);

      const drawHead = () => {
        doc.rect(36, y, contentW, 20).fill(navy);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
        report.columns.forEach((col, idx) => {
          doc.text(String(col).toUpperCase(), 40 + idx * colW, y + 6, { width: colW - 8, ellipsis: true });
        });
        y += 20;
      };

      drawHead();

      const rows = report.rows.slice(0, 400);
      rows.forEach((r, idx) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          drawBar();
          y = 44;
          drawHead();
        }
        if (idx % 2 === 1) {
          doc.rect(36, y, contentW, 20).fill('#f8fafc');
        }
        doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a');
        r.forEach((cell, cIdx) => {
          doc.text(String(cell ?? ''), 40 + cIdx * colW, y + 6, { width: colW - 8, height: 12, ellipsis: true });
        });
        y += 20;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

exports.getReportData = async (req, res) => {
  try {
    const reportType = String(req.params.type || 'revenue').toLowerCase();
    if (!VALID_REPORT_TYPES.has(reportType)) {
      return res.status(400).json({ message: 'Unsupported report type' });
    }
    const report = await generateReportPayload(reportType, req.query);
    res.json({ ...report, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to generate report' });
  }
};

exports.exportReport = async (req, res) => {
  try {
    const reportType = String(req.params.type || 'revenue').toLowerCase();
    const format = String(req.query.format || 'csv').toLowerCase();
    if (!VALID_REPORT_TYPES.has(reportType)) {
      return res.status(400).json({ message: 'Unsupported report type' });
    }

    const report = await generateReportPayload(reportType, req.query);

    await logAdminAction({
      req,
      action: `EXPORT_REPORT_${format.toUpperCase()}`,
      category: 'report',
      targetType: reportType,
      details: `Exported ${report.title} (${report.rows.length} rows) as ${format.toUpperCase()}`
    });

    if (format === 'pdf') {
      const pdfBuf = await buildReportPdfBuffer(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="makaziflow-${reportType}-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
      return res.send(pdfBuf);
    }

    const csvSafe = (v) => {
      const s = String(v ?? '');
      const neutralized = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${neutralized.replace(/"/g, '""')}"`;
    };
    const csv = [report.columns, ...report.rows].map((r) => r.map(csvSafe).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="makaziflow-${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to export report' });
  }
};
