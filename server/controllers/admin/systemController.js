const mongoose = require('mongoose');
const DeadLetterJob = require('../../models/DeadLetterJob');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentCallback = require('../../models/PaymentCallback');
const TaxSubmission = require('../../models/TaxSubmission');
const LandlordSubscription = require('../../models/LandlordSubscription');
const User = require('../../models/User');
const Property = require('../../models/Property');
const SupportTicket = require('../../models/SupportTicket');
const Invoice = require('../../models/Invoice');
const AdminLog = require('../../models/AdminLog');
const FeatureFlag = require('../../models/FeatureFlag');
const EtimsService = require('../../services/tax/EtimsService');
const { getDemoExclusionScope } = require('../../services/adminScopeService');
const { escapeRegExp } = require('../../middleware/securityMiddleware');
const { replayDeadLetter } = require('../../services/dlqService');
const { getTelemetrySnapshot, getPrometheusMetricsText } = require('../../services/metricsService');
const { getAllBreakersStatus } = require('../../utils/resilience');
const { getRedisTelemetry } = require('../../config/redisClient');
const { getCacheTelemetry } = require('../../services/cacheService');
const { getQueuesTelemetry } = require('../../queues/jobQueues');
const { getSocketTelemetry } = require('../../services/socketService');
const { listFeatureFlags, invalidateFlagCache } = require('../../services/featureFlagService');
const { getRuntimeCapabilities } = require('../../config/envConfig');

exports.getSystemHealth = async (req, res) => {
  try {
    // 1. Live Database ping measurement
    let dbPingMs = null;
    let dbHealthy = false;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = mongoose.connection.readyState;

    if (readyState === 1 && mongoose.connection.db) {
      const start = process.hrtime.bigint();
      try {
        await mongoose.connection.db.admin().ping();
        dbPingMs = Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(2));
        dbHealthy = true;
      } catch {
        dbHealthy = false;
      }
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [
      failedPayments24h,
      pendingPaymentsCount,
      deadLetterCount,
      recentSecurityEvents,
      unmatchedCallbacksCount,
      failedEtimsCount,
      expiringSubscriptionsCount,
      openSupportTicketsCount
    ] = await Promise.all([
      PaymentTransaction.countDocuments({ status: 'failed', createdAt: { $gte: since24h } }),
      PaymentTransaction.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      DeadLetterJob.countDocuments({ status: 'dead' }),
      AdminLog.countDocuments({ category: 'security', createdAt: { $gte: since24h } }),
      PaymentCallback.countDocuments({ processingStatus: 'unmatched' }),
      TaxSubmission.countDocuments({ status: 'failed' }),
      LandlordSubscription.countDocuments({
        status: { $in: ['active', 'trial', 'grace_period'] },
        expiryDate: { $gte: new Date(), $lte: in14Days }
      }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } })
    ]);

    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const httpTelemetry = getTelemetrySnapshot();
    const redis = getRedisTelemetry();
    const cache = getCacheTelemetry();
    const queues = await getQueuesTelemetry();
    const socket = getSocketTelemetry();
    const breakers = getAllBreakersStatus();

    res.json({
      checkedAt: new Date().toISOString(),
      application: {
        status: dbHealthy ? 'healthy' : 'degraded',
        env: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        memoryMB: {
          rss: Math.round(mem.rss / 1048576),
          heapUsed: Math.round(mem.heapUsed / 1048576),
          heapTotal: Math.round(mem.heapTotal / 1048576)
        },
        cpuUserMs: Math.round(cpu.user / 1000),
        capabilities: getRuntimeCapabilities()
      },
      database: {
        healthy: dbHealthy,
        status: states[readyState] || 'unknown',
        readyState,
        pingLatencyMs: dbPingMs
      },
      infrastructure: {
        redis,
        cache,
        queues,
        socket,
        circuitBreakers: breakers
      },
      payments: {
        failedLast24h: failedPayments24h,
        pendingActive: pendingPaymentsCount,
        unmatchedCallbacksCount,
        failedEtimsCount
      },
      alerts: {
        expiringSubscriptionsCount,
        openSupportTicketsCount,
        unmatchedCallbacksCount,
        failedEtimsCount,
        failedPayments24h
      },
      integrations: {
        pesapalConfigured: Boolean((process.env.PESAPAL_CONSUMER_KEY || '').trim() && (process.env.PESAPAL_CONSUMER_SECRET || '').trim()),
        intasendConfigured: Boolean((process.env.INTASEND_SECRET_KEY || '').trim()),
        mpesaConfigured: Boolean((process.env.MPESA_SHORTCODE || process.env.MPESA_CONSUMER_KEY || '').trim()),
        etimsConfigured: EtimsService.isConfigured(),
        brevoConfigured: Boolean((process.env.BREVO_API_KEY || '').trim())
      },
      reliability: {
        ...httpTelemetry,
        deadLetterJobsPending: deadLetterCount
      },
      backups: {
        strategy: 'MongoDB Atlas Automated Snapshots + Documented Logical Backup/Restore Policy',
        policyDoc: 'BACKUP_AND_RECOVERY.md',
        automatedBackupHookConfigured: Boolean((process.env.BACKUP_STATUS_WEBHOOK_SECRET || '').trim())
      },
      security: {
        authFailuresSinceBoot: httpTelemetry.authFailures,
        rateLimitHitsSinceBoot: httpTelemetry.rateLimited,
        adminSecurityEvents24h: recentSecurityEvents
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPrometheusMetrics = async (req, res) => {
  try {
    const text = await getPrometheusMetricsText();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(text);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listFeatureFlags = async (req, res) => {
  try {
    const flags = await listFeatureFlags();
    res.json({ flags });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateFeatureFlag = async (req, res) => {
  try {
    const key = String(req.params.key || '').trim().toLowerCase();
    if (!key || !/^[a-z0-9_.-]+$/.test(key)) {
      return res.status(400).json({ message: 'Invalid feature flag key' });
    }

    const update = { updatedAt: new Date() };
    if (typeof req.body.enabled === 'boolean') update.enabled = req.body.enabled;
    if (req.body.rolloutPercentage !== undefined) {
      update.rolloutPercentage = Math.min(100, Math.max(0, Number(req.body.rolloutPercentage) || 0));
    }
    if (req.body.name) update.name = String(req.body.name).trim();
    if (req.body.description !== undefined) update.description = String(req.body.description).trim();
    if (req.user?._id) update.updatedBy = req.user._id;

    const flag = await FeatureFlag.findOneAndUpdate(
      { key },
      { $set: update },
      { returnDocument: 'after', upsert: Boolean(req.body.name) }
    );
    if (!flag) return res.status(404).json({ message: 'Feature flag not found' });

    invalidateFlagCache();
    res.json({ flag });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listDeadLetterJobs = async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const filter = status ? { status } : {};
    const jobs = await DeadLetterJob.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ jobs, total: jobs.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.replayDeadLetterJob = async (req, res) => {
  try {
    const out = await replayDeadLetter(req.params.id, req.user?._id);
    res.json({ message: 'Dead letter job replayed successfully', ...out });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.resolveDeadLetterJob = async (req, res) => {
  try {
    const job = await DeadLetterJob.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'resolved',
          resolutionNotes: String(req.body?.notes || 'Marked resolved by administrator').slice(0, 300),
          replayedBy: req.user?._id,
          replayedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    if (!job) return res.status(404).json({ message: 'Dead letter job not found' });
    res.json({ message: 'Dead letter job marked resolved', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.globalSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ users: [], properties: [], transactions: [], invoices: [], tickets: [] });
    }
    const rx = new RegExp(escapeRegExp(q), 'i');
    const scope = await getDemoExclusionScope();

    const [users, properties, transactions, invoices, tickets] = await Promise.all([
      User.find({
        ...scope.userExcludeFilter,
        role: { $ne: 'superadmin' },
        $or: [{ name: rx }, { email: rx }, { phone: rx }, { companyName: rx }]
      })
        .select('name email phone companyName accountStatus role')
        .limit(6)
        .lean(),
      Property.find({
        ...scope.propertyExcludeFilter,
        $or: [{ name: rx }, { location: rx }]
      })
        .populate('user', 'name email')
        .select('name location type status user')
        .limit(6)
        .lean(),
      PaymentTransaction.find({
        $or: [{ internalTransactionId: rx }, { accountReference: rx }, { providerReference: rx }, { trackingId: rx }]
      })
        .select('internalTransactionId accountReference providerReference provider paymentCategory amount amountPaid currency status')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Invoice.find({
        invoiceCategory: 'subscription',
        $or: [{ invoiceNumber: rx }, { customerName: rx }, { customerEmail: rx }]
      })
        .select('invoiceNumber customerName landlordId totalAmount status')
        .limit(5)
        .lean(),
      SupportTicket.find({
        $or: [{ ticketNumber: rx }, { subject: rx }, { email: rx }, { name: rx }]
      })
        .select('ticketNumber subject email status priority')
        .limit(5)
        .lean()
    ]);

    res.json({ users, properties, transactions, invoices, tickets });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Global search failed' });
  }
};
