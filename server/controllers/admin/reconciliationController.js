const PaymentTransaction = require('../../models/PaymentTransaction');
const Payment = require('../../models/Payment');
const PaymentCallback = require('../../models/PaymentCallback');
const TaxSubmission = require('../../models/TaxSubmission');
const Invoice = require('../../models/Invoice');
const EtimsService = require('../../services/tax/EtimsService');
const PaymentService = require('../../services/payments/PaymentService');
const { getDemoExclusionScope } = require('../../services/adminScopeService');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');

const SAAS_CATEGORIES = ['subscription', 'unit_upgrade', 'subscription_renewal'];
const RENT_CATEGORIES = ['rent', 'water', 'electricity', 'service_charge', 'penalty', 'deposit', 'combined'];

function buildEnvFilter(environment = 'production', isCallback = false) {
  if (environment === 'production') {
    return isCallback
      ? { gatewayEnvironment: 'production' }
      : { gatewayEnvironment: 'production', isSandbox: { $ne: true } };
  }
  if (environment === 'sandbox') {
    return isCallback
      ? { gatewayEnvironment: 'sandbox' }
      : { $or: [{ gatewayEnvironment: 'sandbox' }, { isSandbox: true }] };
  }
  return {};
}

function buildDateFilter(startDate, endDate, field = 'createdAt') {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
}

function sanitizeCallbackRecord(cb) {
  const safePayload = cb.payload && typeof cb.payload === 'object' ? { ...cb.payload } : cb.payload;
  if (safePayload && typeof safePayload === 'object') {
    delete safePayload.secret;
    delete safePayload.password;
    delete safePayload.FirstName;
    delete safePayload.MiddleName;
    delete safePayload.LastName;
    if (safePayload.MSISDN) safePayload.MSISDN = '***';
  }
  return {
    ...cb,
    payload: safePayload
  };
}

/**
 * GET /api/admin/reconciliation/overview
 * Strict financial separation between Landlord Rental Collections & AfriNexTech SaaS Revenue,
 * gateway comparison, discrepancy / amount mismatch & duplicate ref alerts, and eTIMS health.
 */
exports.getReconciliationOverview = async (req, res) => {
  try {
    const {
      environment = 'production',
      provider = 'all',
      startDate = '',
      endDate = '',
      landlordId = 'all'
    } = req.query;

    const scope = await getDemoExclusionScope();
    const envMatch = buildEnvFilter(environment, false);
    const cbEnvMatch = buildEnvFilter(environment, true);
    const dateMatch = buildDateFilter(startDate, endDate, 'createdAt');
    const cbDateMatch = buildDateFilter(startDate, endDate, 'receivedAt');

    const txnMatch = {
      ...envMatch,
      ...dateMatch
    };
    if (provider && provider !== 'all') txnMatch.provider = String(provider);
    if (landlordId && landlordId !== 'all' && isValidObjectId(String(landlordId))) {
      txnMatch.landlordId = String(landlordId);
    }

    const ledgerMatch = {
      ...scope.paymentExcludeFilter,
      ...buildDateFilter(startDate, endDate, 'date')
    };
    if (landlordId && landlordId !== 'all' && isValidObjectId(String(landlordId))) {
      ledgerMatch.user = String(landlordId);
    }

    const [
      categoryBreakdown,
      gatewayAgg,
      duplicateRefsAgg,
      amountMismatchTxns,
      unmatchedTxns,
      failedOrReversedTxns,
      callbackStatsAgg,
      etimsStatsAgg,
      workspacePayments
    ] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: txnMatch },
        {
          $group: {
            _id: {
              isSaas: { $in: ['$paymentCategory', SAAS_CATEGORIES] },
              status: '$status'
            },
            count: { $sum: 1 },
            volume: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        { $match: txnMatch },
        {
          $group: {
            _id: { provider: '$provider', status: '$status' },
            count: { $sum: 1 },
            volume: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            ...txnMatch,
            providerReference: { $exists: true, $nin: ['', null] }
          }
        },
        {
          $group: {
            _id: { provider: '$provider', providerReference: '$providerReference' },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            ids: { $push: '$internalTransactionId' }
          }
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 25 }
      ]),
      PaymentTransaction.find({
        ...txnMatch,
        $or: [
          { reconciliationStatus: 'amount_mismatch' },
          {
            status: 'paid',
            $expr: {
              $and: [
                { $gt: ['$amountPaid', 0] },
                { $gt: [{ $abs: { $subtract: ['$amountPaid', '$amount'] } }, 0.01] }
              ]
            }
          }
        ]
      })
        .select('internalTransactionId provider paymentCategory amount amountPaid currency status reconciliationStatus accountReference providerReference landlordId createdAt')
        .populate('landlordId', 'name email')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      PaymentTransaction.find({
        ...txnMatch,
        $or: [{ status: 'unmatched' }, { reconciliationStatus: 'unmatched' }]
      })
        .select('internalTransactionId provider paymentCategory amount currency status reconciliationStatus accountReference providerReference landlordId createdAt')
        .populate('landlordId', 'name email')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      PaymentTransaction.find({
        ...txnMatch,
        status: { $in: ['failed', 'reversed', 'refunded', 'cancelled'] }
      })
        .select('internalTransactionId provider paymentCategory amount amountPaid currency status failureReason reversalReason accountReference providerReference landlordId createdAt')
        .populate('landlordId', 'name email')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      PaymentCallback.aggregate([
        { $match: { ...cbEnvMatch, ...cbDateMatch } },
        { $group: { _id: '$processingStatus', count: { $sum: 1 }, volume: { $sum: '$amountReceived' } } }
      ]),
      TaxSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, taxTotal: { $sum: '$taxAmount' } } }
      ]),
      environment !== 'sandbox'
        ? Payment.find({
            ...ledgerMatch,
            paymentTransactionId: { $in: [null, undefined] }
          })
            .select('amount status method date createdAt')
            .lean()
        : Promise.resolve([])
    ]);

    const saasRevenue = { totalVolume: 0, paidCount: 0, pendingCount: 0, failedCount: 0, reversedCount: 0 };
    const rentalCollections = { totalVolume: 0, paidCount: 0, pendingCount: 0, failedCount: 0, reversedCount: 0 };

    categoryBreakdown.forEach((row) => {
      const bucket = row._id.isSaas ? saasRevenue : rentalCollections;
      const st = row._id.status;
      if (st === 'paid') {
        bucket.totalVolume += row.volume || 0;
        bucket.paidCount += row.count || 0;
      } else if (st === 'pending' || st === 'processing') {
        bucket.pendingCount += row.count || 0;
      } else if (st === 'failed' || st === 'cancelled') {
        bucket.failedCount += row.count || 0;
      } else if (st === 'reversed' || st === 'refunded') {
        bucket.reversedCount += row.count || 0;
      }
    });

    // Include landlord manual/workspace rent ledger entries strictly under Rental Collections (never SaaS)
    workspacePayments.forEach((p) => {
      const st = String(p.status || '').toLowerCase();
      if (st === 'paid' || st === 'confirmed' || st === 'completed') {
        rentalCollections.totalVolume += Number(p.amount || 0);
        rentalCollections.paidCount += 1;
      } else if (st === 'pending') {
        rentalCollections.pendingCount += 1;
      } else {
        rentalCollections.failedCount += 1;
      }
    });

    const gatewayMap = new Map();
    gatewayAgg.forEach((row) => {
      const prov = row._id.provider || 'unknown';
      const st = row._id.status;
      if (!gatewayMap.has(prov)) {
        gatewayMap.set(prov, {
          provider: prov,
          paidVolume: 0,
          paidCount: 0,
          pendingCount: 0,
          failedCount: 0,
          reversedCount: 0
        });
      }
      const entry = gatewayMap.get(prov);
      if (st === 'paid') {
        entry.paidVolume += row.volume || 0;
        entry.paidCount += row.count || 0;
      } else if (st === 'pending' || st === 'processing') {
        entry.pendingCount += row.count || 0;
      } else if (st === 'reversed' || st === 'refunded') {
        entry.reversedCount += row.count || 0;
      } else {
        entry.failedCount += row.count || 0;
      }
    });

    const callbackMap = {};
    callbackStatsAgg.forEach((c) => {
      callbackMap[c._id || 'unknown'] = { count: c.count || 0, volume: c.volume || 0 };
    });

    const etimsMap = {};
    etimsStatsAgg.forEach((e) => {
      etimsMap[e._id || 'unknown'] = { count: e.count || 0, taxTotal: e.taxTotal || 0 };
    });

    res.json({
      environment,
      saasRevenue,
      rentalCollections,
      combinedVolume: saasRevenue.totalVolume + rentalCollections.totalVolume,
      discrepancies: {
        amountMismatchCount: amountMismatchTxns.length + (callbackMap.amount_mismatch?.count || 0),
        unmatchedCallbacksCount: callbackMap.unmatched?.count || 0,
        duplicateReferencesCount: duplicateRefsAgg.length,
        duplicateCallbacksCount: callbackMap.ignored_duplicate?.count || 0,
        rejectedSignaturesCount: callbackMap.rejected_signature?.count || 0
      },
      gatewayBreakdown: Array.from(gatewayMap.values()).sort((a, b) => b.paidVolume - a.paidVolume),
      duplicateReferences: duplicateRefsAgg.map((d) => ({
        provider: d._id.provider,
        providerReference: d._id.providerReference,
        occurrences: d.count,
        totalAmount: d.totalAmount,
        transactionIds: d.ids
      })),
      amountMismatchTransactions: amountMismatchTxns.map((t) => ({
        ...t,
        customerLabel: SAAS_CATEGORIES.includes(t.paymentCategory)
          ? (t.landlordId?.name || 'Landlord')
          : `${t.landlordId?.name || 'Landlord'} (ODPP Protected)`
      })),
      unmatchedTransactions: unmatchedTxns,
      failedOrReversedTransactions: failedOrReversedTxns.map((t) => ({
        ...t,
        customerLabel: SAAS_CATEGORIES.includes(t.paymentCategory)
          ? (t.landlordId?.name || 'Landlord')
          : `${t.landlordId?.name || 'Landlord'} (ODPP Protected)`
      })),
      etimsSummary: {
        validated: etimsMap.validated?.count || 0,
        failed: etimsMap.failed?.count || 0,
        pending: etimsMap.pending?.count || 0,
        validatedTaxTotal: etimsMap.validated?.taxTotal || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to compute reconciliation overview' });
  }
};

/**
 * GET /api/admin/reconciliation/callbacks
 * Paginated webhook/M-Pesa callbacks log with discrepancy filters.
 */
exports.listCallbacks = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const {
      processingStatus = 'all',
      provider = 'all',
      environment = 'production',
      search = ''
    } = req.query;

    const filter = buildEnvFilter(environment, true);
    if (processingStatus && processingStatus !== 'all') {
      filter.processingStatus = String(processingStatus);
    }
    if (provider && provider !== 'all') {
      filter.provider = String(provider);
    }
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [
        { accountReference: rx },
        { providerReference: rx },
        { trackingId: rx },
        { internalTransactionId: rx },
        { processingMessage: rx }
      ];
    }

    const [items, total, statusCountsAgg] = await Promise.all([
      PaymentCallback.find(filter)
        .populate('transactionId', 'internalTransactionId status amount amountPaid paymentCategory landlordId')
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentCallback.countDocuments(filter),
      PaymentCallback.aggregate([
        { $match: buildEnvFilter(environment, true) },
        { $group: { _id: '$processingStatus', count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {};
    statusCountsAgg.forEach((s) => {
      statusCounts[s._id || 'unknown'] = s.count || 0;
    });

    res.json({
      items: items.map(sanitizeCallbackRecord),
      statusCounts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load payment callbacks' });
  }
};

/**
 * POST /api/admin/reconciliation/callbacks/:id/resolve
 * Controlled admin investigation/matching of unmatched or mismatched callbacks.
 */
exports.resolveCallback = async (req, res) => {
  try {
    const cb = await PaymentCallback.findById(req.params.id);
    if (!cb) return res.status(404).json({ message: 'Callback record not found' });

    const { action = 'mark_reviewed', transactionId = '', notes = '' } = req.body || {};
    const prevStatus = cb.processingStatus;

    if (action === 'match_transaction') {
      const query = isValidObjectId(String(transactionId))
        ? { _id: transactionId }
        : {
            $or: [
              { internalTransactionId: String(transactionId).trim() },
              { accountReference: String(transactionId).trim() }
            ]
          };
      const txn = await PaymentTransaction.findOne(query);
      if (!txn) return res.status(404).json({ message: 'Target PaymentTransaction not found' });

      cb.transactionId = txn._id;
      cb.internalTransactionId = txn.internalTransactionId;

      if (txn.status === 'paid') {
        cb.processingStatus = 'processed';
        cb.processingMessage = `Matched to paid transaction ${txn.internalTransactionId}${notes ? `: ${notes}` : ''}`;
      } else {
        // Attempt official gateway verification instead of blindly activating unpaid records
        const verified = await PaymentService.verifyTransactionStatus(txn._id).catch(() => null);
        if (verified?.transaction?.status === 'paid') {
          cb.processingStatus = 'processed';
          cb.processingMessage = `Matched and gateway-verified ${txn.internalTransactionId}`;
        } else {
          cb.processingMessage = `Linked to transaction ${txn.internalTransactionId} (status: ${txn.status}) — awaiting gateway confirmation. ${notes}`;
        }
      }
    } else if (action === 'ignore') {
      cb.processingStatus = 'ignored_duplicate';
      cb.isDuplicate = true;
      cb.processingMessage = `Dismissed by admin: ${notes || 'Duplicate or invalid test callback'}`;
    } else {
      cb.processingMessage = `Investigated by Super Admin: ${notes || cb.processingMessage || 'Reviewed'}`;
    }

    await cb.save();

    await logAdminAction({
      req,
      action: 'CALLBACK_RECONCILIATION_UPDATED',
      category: 'payment',
      targetType: 'PaymentCallback',
      targetId: String(cb._id),
      details: `Callback (${cb.provider} / ${cb.providerReference || cb.accountReference}) action=${action}: ${notes || 'reviewed'}`,
      previousState: { processingStatus: prevStatus },
      newState: { processingStatus: cb.processingStatus, transactionId: cb.transactionId || null }
    });

    res.json({ success: true, callback: sanitizeCallbackRecord(cb.toObject()) });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to resolve callback' });
  }
};

/**
 * GET /api/admin/reconciliation/etims
 * List KRA eTIMS TaxSubmissions, invoice statuses, and retry readiness.
 */
exports.listEtimsSubmissions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { status = 'all', environment = 'all', search = '' } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = String(status);
    if (environment && environment !== 'all') filter.environment = String(environment);
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [{ trdInvcNo: rx }, { etimsReceiptNo: rx }, { lastError: rx }, { tin: rx }];
    }

    const [submissions, total, statsAgg, paidUnsubmittedInvoices] = await Promise.all([
      TaxSubmission.find(filter)
        .select('-requestPayload -responsePayload')
        .populate('landlordId', 'name email kraPin')
        .populate('invoiceId', 'invoiceNumber invoiceCategory totalAmount status etimsStatus customerName')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TaxSubmission.countDocuments(filter),
      TaxSubmission.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            taxAmount: { $sum: '$taxAmount' },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]),
      Invoice.find({ status: 'paid', etimsStatus: { $in: ['not_submitted', 'failed'] } })
        .select('invoiceNumber invoiceCategory landlordId totalAmount taxAmount etimsStatus paidAt')
        .populate('landlordId', 'name email')
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const summary = {
      validatedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      submittedCount: 0,
      validatedTaxTotal: 0,
      configured: EtimsService.isConfigured(),
      configEnvironment: EtimsService.getConfig().environment
    };
    statsAgg.forEach((s) => {
      if (s._id === 'validated') {
        summary.validatedCount = s.count || 0;
        summary.validatedTaxTotal = s.taxAmount || 0;
      } else if (s._id === 'failed') {
        summary.failedCount = s.count || 0;
      } else if (s._id === 'pending') {
        summary.pendingCount = s.count || 0;
      } else if (s._id === 'submitted') {
        summary.submittedCount = s.count || 0;
      }
    });

    res.json({
      summary,
      submissions,
      paidUnsubmittedInvoices,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load eTIMS submissions' });
  }
};

/**
 * POST /api/admin/reconciliation/etims/:id/retry
 * Retries a failed KRA eTIMS tax submission via EtimsService without fabricating success.
 */
exports.retryEtimsSubmission = async (req, res) => {
  try {
    const targetId = req.params.id;
    let submission = await TaxSubmission.findById(targetId);
    let invoiceId = submission?.invoiceId || null;

    if (!submission) {
      const inv = await Invoice.findById(targetId);
      if (!inv) return res.status(404).json({ message: 'TaxSubmission or Invoice not found' });
      invoiceId = inv._id;
    }

    if (submission && submission.status === 'validated') {
      return res.status(400).json({ message: 'This eTIMS submission is already validated by KRA.' });
    }

    if (submission) {
      submission.retryCount = Number(submission.retryCount || 0) + 1;
      submission.updatedAt = new Date();
      await submission.save();
    }

    const result = await EtimsService.submitInvoiceToEtims({
      invoiceId,
      actorUser: req.user?.email || 'Super Admin'
    });

    await logAdminAction({
      req,
      action: 'ETIMS_SUBMISSION_RETRIED',
      category: 'tax',
      targetType: 'TaxSubmission',
      targetId: String(result?.submission?._id || targetId),
      details: `Retried KRA eTIMS submission for invoice ${result?.invoice?.invoiceNumber || invoiceId}: status=${result?.submission?.status || 'unknown'}`,
      newState: {
        status: result?.submission?.status,
        lastError: result?.submission?.lastError || '',
        etimsReceiptNo: result?.submission?.etimsReceiptNo || ''
      }
    });

    res.json({
      success: result?.submission?.status === 'validated',
      configured: Boolean(result?.configured),
      submission: result?.submission,
      invoice: result?.invoice
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to retry eTIMS submission' });
  }
};
