const PaymentTransaction = require('../../models/PaymentTransaction');
const Payment = require('../../models/Payment');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const PaymentCallback = require('../../models/PaymentCallback');
const PaymentAllocation = require('../../models/PaymentAllocation');
const PaymentReceipt = require('../../models/PaymentReceipt');
const Invoice = require('../../models/Invoice');
const PaymentService = require('../../services/payments/PaymentService');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
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
    const { search = '', status = 'all', environment = 'production', startDate = '', endDate = '', propertyId = 'all' } = req.query;

    const [allProps, allUnits] = await Promise.all([
      Property.find(scope.propertyExcludeFilter)
        .populate('user', 'name email')
        .select('name location user')
        .sort({ name: 1 })
        .lean(),
      Unit.find(scope.unitExcludeFilter).select('_id propertyId unitNumber').lean()
    ]);

    const propMap = new Map(allProps.map((pr) => [String(pr._id), pr]));
    const unitMap = new Map(allUnits.map((u) => [String(u._id), u]));

    const selectedPropId = propertyId && propertyId !== 'all' && isValidObjectId(String(propertyId))
      ? String(propertyId)
      : null;
    const selectedPropUnitIds = selectedPropId
      ? allUnits.filter((u) => String(u.propertyId) === selectedPropId).map((u) => u._id)
      : [];

    if (selectedPropId) {
      const propClause = {
        $or: [
          { propertyId: selectedPropId },
          ...(selectedPropUnitIds.length > 0 ? [{ unitId: { $in: selectedPropUnitIds } }] : [])
        ]
      };
      if (filter.$and) {
        filter.$and.push(propClause);
      } else {
        Object.assign(filter, propClause);
      }
    }

    // Also load recorded landlord workspace payments when viewing production/all records
    const includeWorkspacePayments = environment !== 'sandbox';
    const ledgerFilter = { ...scope.paymentExcludeFilter };
    if (selectedPropId) {
      ledgerFilter.$or = [
        { propertyId: selectedPropId },
        ...(selectedPropUnitIds.length > 0 ? [{ unitId: { $in: selectedPropUnitIds } }] : [])
      ];
    }
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      const ledgerSearch = { $or: [{ reference: rx }, { invoiceNumber: rx }, { method: rx }, { type: rx }] };
      if (ledgerFilter.$or) {
        const propOr = ledgerFilter.$or;
        delete ledgerFilter.$or;
        ledgerFilter.$and = [{ $or: propOr }, ledgerSearch];
      } else {
        Object.assign(ledgerFilter, ledgerSearch);
      }
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
        .limit(300)
        .lean(),
      includeWorkspacePayments
        ? Payment.find(ledgerFilter)
            .populate('user', 'name email phone')
            .populate('unitId', 'unitNumber propertyId')
            .sort({ date: -1, createdAt: -1 })
            .limit(300)
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

    const resolvePropDetails = (propIdVal, unitIdVal) => {
      const unitObj = unitIdVal && typeof unitIdVal === 'object' ? unitIdVal : unitMap.get(String(unitIdVal || ''));
      const pid = propIdVal
        ? String(propIdVal)
        : (unitObj?.propertyId ? String(unitObj.propertyId) : null);
      const propObj = pid ? propMap.get(pid) : null;
      return {
        propertyId: pid || null,
        propertyName: propObj?.name || '',
        unitNumber: unitObj?.unitNumber || ''
      };
    };

    const combined = [
      ...gatewayTxns.map((t) => {
        const isSub = ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(t.paymentCategory);
        const propInfo = resolvePropDetails(t.propertyId, t.unitId);
        // ODPP Privacy Compliance: never expose tenant names/emails/phones on non-subscription payments
        const safeLabel = isSub
          ? (t.landlordId?.name || 'Landlord')
          : `${propInfo.propertyName || t.landlordId?.name || 'Property'}${propInfo.unitNumber ? ` · Unit ${propInfo.unitNumber}` : ''} (Tenant Protected - ODPP)`;
        return {
          ...t,
          tenantId: undefined,
          propertyId: propInfo.propertyId,
          propertyName: propInfo.propertyName || (isSub ? 'Platform Subscription' : 'Assigned Property'),
          unitNumber: propInfo.unitNumber,
          customerName: safeLabel,
          customerEmail: isSub ? (t.landlordId?.email || '') : 'ODPP Protected',
          customerPhone: isSub ? (t.landlordId?.phone || '') : '',
          sourceType: 'gateway',
          sortAt: new Date(t.paidAt || t.createdAt).getTime()
        };
      }),
      ...ledgerPayments
        .filter((p) => !p.paymentTransactionId || !gatewayLinkedIds.has(String(p.paymentTransactionId)))
        .map((p) => {
          const propInfo = resolvePropDetails(p.propertyId, p.unitId);
          return {
            _id: `pay_${p._id}`,
            isWorkspacePayment: true,
            sourceType: 'workspace_ledger',
            propertyId: propInfo.propertyId,
            propertyName: propInfo.propertyName || p.property || 'Property',
            unitNumber: propInfo.unitNumber,
            internalTransactionId: p.reference || p.invoiceNumber || String(p._id),
            accountReference: p.invoiceNumber || p.reference || p.type || 'Rent Payment',
            providerReference: p.reference || '',
            provider: p.method || 'M-Pesa / Ledger',
            paymentChannel: p.category || p.type || 'rent',
            paymentCategory: p.category || 'rent',
            paymentMethodDetail: propInfo.unitNumber ? `Unit ${propInfo.unitNumber}` : (p.type || 'Rent'),
            landlordId: p.user || null,
            customerName: `${propInfo.propertyName || 'Property'}${propInfo.unitNumber ? ` · Unit ${propInfo.unitNumber}` : ''} (Tenant Protected - ODPP)`,
            customerEmail: p.user?.email || '',
            amount: p.amount || 0,
            amountPaid: p.amount || 0,
            currency: p.currency || 'KES',
            status: ['paid', 'confirmed', 'Completed'].includes(p.status) ? 'paid' : p.status,
            createdAt: p.date || p.createdAt,
            sortAt: new Date(p.date || p.createdAt).getTime()
          };
        })
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

    // Compute total paid per property across all non-demo settled payments
    const propTotalsAgg = await Payment.aggregate([
      {
        $match: {
          ...scope.paymentExcludeFilter,
          status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] }
        }
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unitId',
          foreignField: '_id',
          as: 'unitDoc'
        }
      },
      {
        $project: {
          amount: 1,
          resolvedPropId: { $ifNull: ['$propertyId', { $arrayElemAt: ['$unitDoc.propertyId', 0] }] }
        }
      },
      {
        $group: {
          _id: '$resolvedPropId',
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    const propTotalsById = new Map(
      propTotalsAgg
        .filter((x) => x._id)
        .map((x) => [String(x._id), { totalPaid: x.totalPaid || 0, paymentCount: x.paymentCount || 0 }])
    );

    res.json({
      items,
      summary,
      properties: allProps.map((pr) => {
        const stats = propTotalsById.get(String(pr._id)) || { totalPaid: 0, paymentCount: 0 };
        return {
          _id: String(pr._id),
          name: pr.name,
          location: pr.location || '',
          landlordName: pr.user?.name || 'Landlord',
          totalPaid: stats.totalPaid,
          paymentCount: stats.paymentCount
        };
      }),
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
      customerName: isSub ? (txn.landlordId?.name || txn.customerName || 'Landlord') : `${txn.landlordId?.name || 'Landlord'} · Tenant Protected (ODPP)`,
      customerEmail: isSub ? (txn.landlordId?.email || txn.customerEmail || '') : 'ODPP Protected',
      customerPhone: isSub ? (txn.landlordId?.phone || txn.customerPhone || '') : ''
    };

    const [invoice, callbacks, allocations, rawReceipt] = await Promise.all([
      txn.invoiceId ? Invoice.findById(txn.invoiceId).select('invoiceNumber status totalAmount amountPaid balanceDue billingPeriod createdAt').lean() : null,
      PaymentCallback.find({ transactionId: txn._id }).select('-rawPayload.secret -rawPayload.password -payload.FirstName -payload.MiddleName -payload.LastName -payload.MSISDN').sort({ receivedAt: -1 }).lean(),
      PaymentAllocation.find({ transactionId: txn._id }).select('-tenantId').lean(),
      PaymentReceipt.findOne({ transactionId: txn._id }).lean()
    ]);

    const receipt = rawReceipt
      ? {
          ...rawReceipt,
          tenantId: undefined,
          recipientName: isSub ? rawReceipt.recipientName : 'Tenant Protected (ODPP)',
          recipientEmail: isSub ? rawReceipt.recipientEmail : ''
        }
      : null;

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
    const propertyId = req.query.propertyId;
    if (propertyId && propertyId !== 'all' && isValidObjectId(String(propertyId))) {
      const propUnits = await Unit.find({ propertyId: String(propertyId) }).select('_id').lean();
      const unitIds = propUnits.map((u) => u._id);
      const propClause = {
        $or: [
          { propertyId: String(propertyId) },
          ...(unitIds.length > 0 ? [{ unitId: { $in: unitIds } }] : [])
        ]
      };
      if (filter.$and) filter.$and.push(propClause);
      else Object.assign(filter, propClause);
    }
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
