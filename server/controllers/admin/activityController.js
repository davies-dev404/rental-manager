const AdminLog = require('../../models/AdminLog');
const SubscriptionAuditLog = require('../../models/SubscriptionAuditLog');
const { escapeRegExp } = require('../../middleware/securityMiddleware');

exports.listAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const skip = (page - 1) * limit;
    const { source = 'admin', category = 'all', status = 'all', search = '', startDate = '', endDate = '' } = req.query;

    const filter = {};
    if (category && category !== 'all') filter.category = String(category);
    if (status && status !== 'all') filter.status = String(status);
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
      filter.$or = [{ action: rx }, { details: rx }, { adminEmail: rx }, { adminName: rx }, { targetId: rx }, { ipAddress: rx }];
    }

    if (source === 'subscription') {
      const subFilter = {};
      if (search && String(search).trim()) {
        const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
        subFilter.$or = [{ action: rx }, { reason: rx }];
      }
      const [total, subLogs] = await Promise.all([
        SubscriptionAuditLog.countDocuments(subFilter),
        SubscriptionAuditLog.find(subFilter)
          .populate('landlordId', 'name email')
          .populate('actorId', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
      return res.json({
        items: subLogs.map((l) => ({
          _id: l._id,
          source: 'subscription',
          adminName: l.actorId?.name || 'System',
          adminEmail: l.actorId?.email || l.landlordId?.email || '',
          adminRole: l.actorRole,
          action: l.action,
          category: 'subscription',
          targetType: 'LandlordSubscription',
          targetId: String(l.subscriptionId || l.landlordId?._id || ''),
          details: l.reason || JSON.stringify(l.newState || {}),
          previousState: l.previousState,
          newState: l.newState,
          ipAddress: '',
          status: 'success',
          createdAt: l.createdAt
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      });
    }

    const [total, items] = await Promise.all([
      AdminLog.countDocuments(filter),
      AdminLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.json({
      items: items.map((i) => ({ ...i, source: 'admin' })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load activity logs' });
  }
};
