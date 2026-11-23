const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');

function maskIdNumber(val) {
  const s = String(val || '').trim();
  if (!s) return '';
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, s.length - 4))}${s.slice(-4)}`;
}

exports.listTenants = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { search = '', status = 'all', landlordId = 'all' } = req.query;

    const filter = {};
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { accountNumber: rx }];
    }
    if (status && status !== 'all') {
      if (status === 'inactive') {
        filter.status = { $ne: 'active' };
      } else {
        filter.status = String(status).trim();
      }
    }
    if (landlordId && landlordId !== 'all' && isValidObjectId(String(landlordId))) {
      filter.user = landlordId;
    }

    const [total, tenants] = await Promise.all([
      Tenant.countDocuments(filter),
      Tenant.find(filter)
        .select('name email phone user unitId status leaseStart leaseEnd rentAmount deposit accountNumber moveInDate moveOutDate nextPaymentDate createdAt')
        .populate('user', 'name email phone companyName')
        .populate({
          path: 'unitId',
          select: 'unitNumber rentAmount status propertyId',
          populate: { path: 'propertyId', select: 'name location' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const tenantIds = tenants.map((t) => t._id);
    const paymentAgg = await Payment.aggregate([
      { $match: { tenantId: { $in: tenantIds }, status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] } } },
      { $group: { _id: '$tenantId', totalPaid: { $sum: '$amount' }, paymentCount: { $sum: 1 }, lastPaymentAt: { $max: '$date' } } }
    ]);
    const payMap = new Map(paymentAgg.map((p) => [String(p._id), p]));

    const now = Date.now();
    const items = tenants.map((t) => {
      const pStats = payMap.get(String(t._id)) || { totalPaid: 0, paymentCount: 0, lastPaymentAt: null };
      const leaseExpired = t.leaseEnd && new Date(t.leaseEnd).getTime() < now;
      const isInactive = t.status !== 'active' || !t.unitId || Boolean(leaseExpired);
      return {
        ...t,
        landlord: t.user || null,
        property: t.unitId?.propertyId || null,
        unit: t.unitId ? { _id: t.unitId._id, unitNumber: t.unitId.unitNumber, rentAmount: t.unitId.rentAmount, status: t.unitId.status } : null,
        paymentSummary: pStats,
        isInactiveRecord: isInactive,
        inactiveReason: t.status !== 'active' ? 'Past tenancy' : (!t.unitId ? 'No unit assigned' : (leaseExpired ? 'Lease expired' : ''))
      };
    });

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch tenants' });
  }
};

exports.getTenantDetail = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .select('-otherPhones -nextOfKin -bankPayerNames')
      .populate('user', 'name email phone companyName')
      .populate({
        path: 'unitId',
        select: 'unitNumber rentAmount status propertyId type',
        populate: { path: 'propertyId', select: 'name location type' }
      })
      .lean();

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const payments = await Payment.find({ tenantId: tenant._id })
      .select('amount currency date method status reference type category monthCovered invoiceNumber createdAt')
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json({
      tenant: {
        ...tenant,
        nationalId: maskIdNumber(tenant.nationalId),
        kraPin: maskIdNumber(tenant.kraPin)
      },
      landlord: tenant.user || null,
      property: tenant.unitId?.propertyId || null,
      unit: tenant.unitId || null,
      payments
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load tenant details' });
  }
};
