const PaymentTransaction = require('../../models/PaymentTransaction');
const Payment = require('../../models/Payment');
const PaymentCallback = require('../../models/PaymentCallback');
const PaymentAllocation = require('../../models/PaymentAllocation');
const PaymentReceipt = require('../../models/PaymentReceipt');
const Invoice = require('../../models/Invoice');
const PaymentService = require('../../services/payments/PaymentService');
const { escapeRegExp } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');
const { getDemoExclusionScope } = require('../../services/adminScopeService');

function buildPaymentFilter(query = {}) {
  const { search = '', provider = 'all', channel = 'all', status = 'all', category = 'all', environment = 'production', startDate = '', endDate = '' } = query;
  const filter = {};

  if (environment === 'production') {
    filter.gatewayEnvironment = 'production';
    filter.isSandbox = { $ne: true };
  } else if (environment === 'sandbox') {
    filter.$or = [{ gatewayEnvironment: 'sandbox' }, { isSandbox: true }];
  }
  if (provider && provider !== 'all') filter.provider = String(provider);
  if (channel && channel !== 'all') filter.paymentChannel = String(channel);
  if (status && status !== 'all') filter.status = String(status);
  if (category && category !== 'all') filter.paymentCategory = String(category);

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
    const searchClause = {
      $or: [
        { internalTransactionId: rx },
        { accountReference: rx },
        { providerReference: rx },
        { trackingId: rx },
        { customerName: rx },
        { customerEmail: rx },
        { customerPhone: rx }
      ]
    };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, searchClause];
      delete filter.$or;
    } else {
      Object.assign(filter, searchClause);
    }
  }
  return filter;
}

exports.listPayments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const skip = (page - 1) * limit;
    const filter = buildPaymentFilter(req.query);
    const scope = await getDemoExclusionScope();
    const { search = '', status = 'all', environment = 'production', startDate = '', endDate = '' } = req.query;

    // Also load recorded landlord workspace payments when viewing production/all records
    const includeWorkspacePayments = environment !== 'sandbox';
    const ledgerFilter = { ...scope.paymentExcludeFilter };
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      ledgerFilter.$or = [{ reference: rx }, { invoiceNumber: rx }, { method: rx }, { type: rx }];
    }
    if (status && status !== 'all') {
      ledgerFilter.status = status === 'paid' ? { $in: ['paid', 'confirmed', 'Completed'] } : String(status);
    }
    if (startDate || endDate) {
      ledgerFilter.date = {};
      if (startDate) ledgerFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        ledgerFilter.date.$lte = end;
      }
    }

    const [gatewayTxns, ledgerPayments, summaryAgg, ledgerSummaryAgg] = await Promise.all([
      PaymentTransaction.find(filter)
        .select('-metadata')
        .populate('landlordId', 'name email phone')
        .populate('subscriptionId', 'planCode planName billingCycle')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      includeWorkspacePayments
        ? Payment.find(ledgerFilter)
            .populate('user', 'name email phone')
            .populate('unitId', 'unitNumber')
            .sort({ date: -1, createdAt: -1 })
            .limit(200)
            .lean()
        : Promise.resolve([]),
      PaymentTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', '$amount'] } }
          }
        }
      ]),
      includeWorkspacePayments
        ? Payment.aggregate([
            { $match: ledgerFilter },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                volume: { $sum: '$amount' }
              }
            }
          ])
        : Promise.resolve([])
    ]);

    const gatewayLinkedIds = new Set(
      ledgerPayments.map((p) => (p.paymentTransactionId ? String(p.paymentTransactionId) : null)).filter(Boolean)
    );

    const combined = [
      ...gatewayTxns.map((t) => {
        const isSub = ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory);
        return {
          ...t,
          tenantId: undefined,
          customerName: isSub ? (t.landlordId?.name || t.customerName || 'Subscriber') : `${t.landlordId?.name || 'Subscriber'} · Protected Tenant Payment`,
          customerEmail: isSub ? (t.landlordId?.email || t.customerEmail || '') : (t.landlordId?.email || ''),
          customerPhone: isSub ? (t.landlordId?.phone || t.customerPhone || '') : '',
          sourceType: 'gateway',
          sortAt: new Date(t.paidAt || t.createdAt).getTime()
        };
      }),
      ...ledgerPayments
        .filter((p) => !p.paymentTransactionId || !gatewayLinkedIds.has(String(p.paymentTransactionId)))
        .map((p) => ({
          _id: `pay_${p._id}`,
          isWorkspacePayment: true,
          sourceType: 'workspace_ledger',
          internalTransactionId: p.reference || p.invoiceNumber || String(p._id),
          accountReference: p.invoiceNumber || p.reference || p.type || 'Rent Payment',
          providerReference: p.reference || '',
          provider: p.method || 'M-Pesa / Ledger',
          paymentChannel: p.category || p.type || 'rent',
          paymentCategory: p.category || 'rent',
          paymentMethodDetail: p.unitId?.unitNumber ? `Unit ${p.unitId.unitNumber}` : (p.type || 'Rent'),
          landlordId: p.user || null,
          customerName: p.unitId?.unitNumber ? `${p.user?.name || 'Subscriber'} · Unit ${p.unitId.unitNumber}` : (p.user?.name || 'Subscriber Ledger'),
          customerEmail: p.user?.email || '',
          amount: p.amount || 0,
          amountPaid: p.amount || 0,
          currency: p.currency || 'KES',
          status: ['paid', 'confirmed', 'Completed'].includes(p.status) ? 'paid' : p.status,
          createdAt: p.date || p.createdAt,
          sortAt: new Date(p.date || p.createdAt).getTime()
        }))
    ].sort((a, b) => b.sortAt - a.sortAt);

    const total = combined.length;
    const items = combined.slice(skip, skip + limit);

    const summary = {
      totalCount: total,
      paidCount: 0,
      paidVolume: 0,
      pendingCount: 0,
      failedCount: 0,
      refundedOrReversedCount: 0
    };
    summaryAgg.forEach((s) => {
      if (s._id === 'paid') {
        summary.paidCount += s.count;
        summary.paidVolume += s.volume || 0;
      } else if (['pending', 'processing'].includes(s._id)) {
        summary.pendingCount += s.count;
      } else if (['failed', 'cancelled'].includes(s._id)) {
        summary.failedCount += s.count;
      } else if (['reversed', 'refunded'].includes(s._id)) {
        summary.refundedOrReversedCount += s.count;
      }
    });
    ledgerSummaryAgg.forEach((s) => {
      if (['paid', 'confirmed', 'Completed', 'partial'].includes(s._id)) {
        summary.paidCount += s.count;
        summary.paidVolume += s.volume || 0;
      } else if (['pending', 'Pending', 'open'].includes(s._id)) {
        summary.pendingCount += s.count;
      } else if (['Failed', 'overdue'].includes(s._id)) {
        summary.failedCount += s.count;
      }
    });

    res.json({
      items,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load payment transactions' });
  }
};

exports.getPaymentDetail = async (req, res) => {
  try {
    const txn = await PaymentTransaction.findById(req.params.id)
      .select('-metadata.secret -metadata.apiKey -metadata.token')
      .populate('landlordId', 'name email phone')
      .populate('subscriptionId', 'planCode planName billingCycle status expiryDate')
      .lean();
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });

    const isSub = ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(txn.paymentCategory);
    const sanitizedTxn = {
      ...txn,
      tenantId: undefined,
      customerName: isSub ? txn.customerName : `${txn.landlordId?.name || 'Subscriber'} · Protected Tenant Payment`,
      customerEmail: isSub ? txn.customerEmail : (txn.landlordId?.email || ''),
      customerPhone: isSub ? txn.customerPhone : ''
    };

    const [invoice, callbacks, allocations, receipt] = await Promise.all([
      txn.invoiceId ? Invoice.findById(txn.invoiceId).select('invoiceNumber status totalAmount amountPaid balanceDue billingPeriod createdAt').lean() : null,
      PaymentCallback.find({ transactionId: txn._id }).select('-rawPayload.secret -rawPayload.password').sort({ receivedAt: -1 }).lean(),
      PaymentAllocation.find({ transactionId: txn._id }).lean(),
      PaymentReceipt.findOne({ transactionId: txn._id }).lean()
    ]);

    res.json({ transaction: sanitizedTxn, invoice, callbacks, allocations, receipt });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load transaction details' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const result = await PaymentService.verifyTransactionStatus(req.params.id);
    await logAdminAction({
      req,
      action: 'PAYMENT_VERIFICATION_CHECKED',
      category: 'payment',
      targetType: 'PaymentTransaction',
      targetId: String(req.params.id),
      details: `Pulled verified gateway status for transaction ${result?.transaction?.internalTransactionId || req.params.id}: status=${result?.transaction?.status}`,
      newState: { status: result?.transaction?.status }
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Verification failed' });
  }
};

exports.reversePayment = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason || reason.length < 4) {
      return res.status(400).json({ message: 'An explicit audit reason (min 4 chars) is required for reversals/refunds.' });
    }
    const txn = await PaymentService.handleReversal({
      transactionId: req.params.id,
      reason,
      actorId: req.user._id
    });
    await logAdminAction({
      req,
      action: 'PAYMENT_REVERSED',
      category: 'payment',
      targetType: 'PaymentTransaction',
      targetId: String(req.params.id),
      details: `Reversed transaction ${txn.internalTransactionId} (${txn.currency || 'KES'} ${txn.amountPaid || txn.amount}): ${reason}`,
      newState: { status: txn.status, reversalReason: reason }
    });
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to reverse payment' });
  }
};

exports.exportPaymentsCsv = async (req, res) => {
  try {
    const filter = buildPaymentFilter({ ...req.query, environment: req.query.environment || 'production' });
    const txns = await PaymentTransaction.find(filter)
      .populate('landlordId', 'name email')
      .populate('subscriptionId', 'planName billingCycle')
      .sort({ createdAt: -1 })
      .limit(2500)
      .lean();

    const csvSafe = (v) => {
      const s = String(v ?? '');
      const neutralized = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${neutralized.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Timestamp', 'Internal ID', 'Account Ref', 'Provider Ref', 'Environment',
      'Category', 'Provider', 'Channel', 'Subscriber Name', 'Subscriber Email',
      'Currency', 'Amount', 'Amount Paid', 'Status'
    ];
    const rows = txns.map((t) => [
      t.createdAt ? new Date(t.createdAt).toISOString() : '',
      t.internalTransactionId,
      t.accountReference,
      t.providerReference || t.trackingId || '',
      t.gatewayEnvironment || 'sandbox',
      t.paymentCategory,
      t.provider,
      t.paymentMethodDetail || t.paymentChannel || '',
      t.landlordId?.name || 'Subscriber',
      t.landlordId?.email || '',
      t.currency || 'KES',
      t.amount || 0,
      t.amountPaid || 0,
      t.status
    ]);

    const csv = [headers, ...rows].map((r) => r.map(csvSafe).join(',')).join('\n');
    await logAdminAction({
      req,
      action: 'EXPORT_PAYMENTS_CSV',
      category: 'report',
      targetType: 'PaymentTransaction',
      details: `Exported ${txns.length} payment transactions to CSV`
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="makaziflow-admin-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to export CSV' });
  }
};
