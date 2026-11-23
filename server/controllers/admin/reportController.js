const PDFDocument = require('pdfkit');
const User = require('../../models/User');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const PaymentTransaction = require('../../models/PaymentTransaction');
const LandlordSubscription = require('../../models/LandlordSubscription');
const ActivityLog = require('../../models/ActivityLog');
const AdminLog = require('../../models/AdminLog');
const { logAdminAction } = require('../../utils/auditLogger');

const VALID_REPORT_TYPES = new Set([
  'users',
  'properties',
  'tenants',
  'revenue',
  'transactions',
  'subscriptions',
  'occupancy',
  'activity'
]);

function resolveDateRange(query = {}) {
  const now = new Date();
  const period = String(query.period || 'monthly').toLowerCase();
  let start = query.startDate ? new Date(query.startDate) : null;
  let end = query.endDate ? new Date(query.endDate) : new Date(now);
  if (end) end.setHours(23, 59, 59, 999);

  if (!start || isNaN(start.getTime())) {
    if (period === 'weekly') {
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
  const dateFilter = { $gte: start, $lte: end };

  if (type === 'users') {
    const users = await User.find({ createdAt: dateFilter })
      .select('name email phone role accountStatus isVerified createdAt')
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
      columns: ['Name', 'Email', 'Phone', 'Role', 'Status', 'Registered'],
      rows: users.map((u) => [
        u.name,
        u.email,
        u.phone || '—',
        u.role,
        u.accountStatus || (u.isVerified ? 'active' : 'pending_verification'),
        new Date(u.createdAt).toISOString().slice(0, 10)
      ])
    };
  }

  if (type === 'properties') {
    const props = await Property.find({ createdAt: dateFilter })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return {
      type,
      period,
      title: 'Property Registration Report',
      summary: {
        totalProperties: props.length,
        flaggedCount: props.filter((p) => p.isFlagged).length
      },
      columns: ['Property', 'Location', 'Type', 'Landlord', 'Status', 'Created'],
      rows: props.map((p) => [
        p.name,
        p.location,
        p.type || 'Apartment',
        p.user?.email || p.user?.name || '—',
        p.isFlagged ? 'flagged' : (p.status || 'active'),
        new Date(p.createdAt).toISOString().slice(0, 10)
      ])
    };
  }

  if (type === 'tenants') {
    const tenants = await Tenant.find({ createdAt: dateFilter })
      .populate('user', 'name email')
      .populate({ path: 'unitId', select: 'unitNumber propertyId', populate: { path: 'propertyId', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    return {
      type,
      period,
      title: 'Tenant Growth Report',
      summary: {
        totalTenants: tenants.length,
        activeTenants: tenants.filter((t) => t.status === 'active').length
      },
      columns: ['Tenant', 'Phone', 'Landlord', 'Property / Unit', 'Rent (KES)', 'Status', 'Created'],
      rows: tenants.map((t) => [
        t.name,
        t.phone || '—',
        t.user?.email || '—',
        t.unitId?.propertyId?.name ? `${t.unitId.propertyId.name} (${t.unitId.unitNumber})` : (t.unitId?.unitNumber || 'Unassigned'),
        Number(t.rentAmount || 0).toLocaleString(),
        t.status,
        new Date(t.createdAt).toISOString().slice(0, 10)
      ])
    };
  }

  if (type === 'revenue') {
    const txns = await PaymentTransaction.find({
      gatewayEnvironment: 'production',
      isSandbox: { $ne: true },
      status: 'paid',
      createdAt: dateFilter
    }).sort({ createdAt: -1 }).lean();

    const byMonth = new Map();
    txns.forEach((t) => {
      const m = new Date(t.paidAt || t.createdAt).toISOString().slice(0, 7);
      const entry = byMonth.get(m) || { month: m, subscriptionRevenue: 0, rentalVolume: 0, count: 0 };
      const amt = Number(t.amountPaid || t.amount || 0);
      if (['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory)) {
        entry.subscriptionRevenue += amt;
      } else {
        entry.rentalVolume += amt;
      }
      entry.count += 1;
      byMonth.set(m, entry);
    });
    const series = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    return {
      type,
      period,
      title: 'Platform Revenue Summary Report',
      summary: {
        totalSubscriptionRevenue: series.reduce((s, x) => s + x.subscriptionRevenue, 0),
        totalRentalVolume: series.reduce((s, x) => s + x.rentalVolume, 0),
        settledTransactions: txns.length
      },
      columns: ['Month', 'Settled Count', 'Subscription Revenue (KES)', 'Rental Collection (KES)', 'Combined Volume (KES)'],
      rows: series.map((r) => [
        r.month,
        r.count,
        r.subscriptionRevenue.toLocaleString(),
        r.rentalVolume.toLocaleString(),
        (r.subscriptionRevenue + r.rentalVolume).toLocaleString()
      ])
    };
  }

  if (type === 'transactions') {
    const txns = await PaymentTransaction.find({
      gatewayEnvironment: 'production',
      isSandbox: { $ne: true },
      createdAt: dateFilter
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
      columns: ['Date', 'Reference', 'Category', 'Provider', 'Payer', 'Amount (KES)', 'Status'],
      rows: txns.map((t) => [
        new Date(t.createdAt).toISOString().slice(0, 10),
        t.providerReference || t.accountReference,
        t.paymentCategory,
        t.provider,
        t.landlordId?.email || t.customerEmail || t.customerName || '—',
        Number(t.amountPaid || t.amount || 0).toLocaleString(),
        t.status
      ])
    };
  }

  if (type === 'subscriptions') {
    const subs = await LandlordSubscription.find({ createdAt: dateFilter })
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
    const props = await Property.find().populate('user', 'name email').lean();
    const units = await Unit.find().lean();
    const byProp = new Map();
    units.forEach((u) => {
      const k = String(u.propertyId);
      const bucket = byProp.get(k) || { total: 0, occupied: 0, vacant: 0, maintenance: 0 };
      bucket.total += 1;
      if (u.status === 'occupied') bucket.occupied += 1;
      else if (u.status === 'maintenance') bucket.maintenance += 1;
      else bucket.vacant += 1;
      byProp.set(k, bucket);
    });
    const rows = props.map((p) => {
      const u = byProp.get(String(p._id)) || { total: 0, occupied: 0, vacant: 0, maintenance: 0 };
      const rate = u.total > 0 ? Math.round((u.occupied / u.total) * 100) : 0;
      return [p.name, p.location, p.user?.email || '—', u.total, u.occupied, u.vacant, `${rate}%`];
    });
    return {
      type,
      period,
      title: 'Portfolio Occupancy Report',
      summary: {
        totalProperties: props.length,
        totalUnits: units.length,
        occupiedUnits: units.filter((u) => u.status === 'occupied').length,
        vacantUnits: units.filter((u) => u.status === 'vacant').length
      },
      columns: ['Property', 'Location', 'Landlord', 'Total Units', 'Occupied', 'Vacant', 'Occupancy %'],
      rows
    };
  }

  // 'activity'
  const [adminLogs, activityLogs] = await Promise.all([
    AdminLog.find({ createdAt: dateFilter }).sort({ createdAt: -1 }).limit(300).lean(),
    ActivityLog.find({ timestamp: dateFilter }).sort({ timestamp: -1 }).limit(300).lean()
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
