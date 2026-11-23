const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const User = require('../../models/User');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');
const { getDemoExclusionScope } = require('../../services/adminScopeService');

exports.listProperties = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { search = '', location = 'all', landlordId = 'all', type = 'all', status = 'all' } = req.query;

    const scope = await getDemoExclusionScope();
    const filter = { ...scope.propertyExcludeFilter };
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [{ name: rx }, { location: rx }, { type: rx }];
    }
    if (location && location !== 'all') {
      filter.location = new RegExp(escapeRegExp(String(location).trim()), 'i');
    }
    if (landlordId && landlordId !== 'all' && isValidObjectId(String(landlordId))) {
      filter.user = landlordId;
    }
    if (type && type !== 'all') {
      filter.type = new RegExp(`^${escapeRegExp(String(type).trim())}$`, 'i');
    }
    if (status && status !== 'all') {
      if (status === 'flagged') filter.isFlagged = true;
      else filter.status = String(status).trim();
    }

    const [total, properties, distinctLocations, distinctTypes, landlordsList] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter)
        .populate('user', 'name email phone companyName accountStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.distinct('location', scope.propertyExcludeFilter),
      Property.distinct('type', scope.propertyExcludeFilter),
      User.find({ ...scope.userExcludeFilter, role: { $in: ['admin', 'landlord'] }, isSuperAdmin: { $ne: true } })
        .select('name email')
        .sort({ name: 1 })
        .limit(200)
        .lean()
    ]);

    const propIds = properties.map((p) => p._id);
    const propUnits = await Unit.find({ propertyId: { $in: propIds }, ...scope.unitExcludeFilter })
      .select('_id propertyId status rentAmount')
      .lean();
    const unitToProp = new Map(propUnits.map((u) => [String(u._id), String(u.propertyId)]));
    const propUnitIds = propUnits.map((u) => u._id);

    const [tenantList, paymentAgg] = await Promise.all([
      Tenant.find({ unitId: { $in: propUnitIds }, ...scope.tenantExcludeFilter })
        .select('unitId status')
        .lean(),
      Payment.aggregate([
        {
          $match: {
            unitId: { $in: propUnitIds },
            ...scope.paymentExcludeFilter,
            status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] }
          }
        },
        { $group: { _id: '$unitId', total: { $sum: '$amount' } } }
      ])
    ]);

    const unitMap = new Map();
    propUnits.forEach((u) => {
      const k = String(u.propertyId);
      const b = unitMap.get(k) || {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        maintenanceUnits: 0,
        monthlyRentPotential: 0,
        tenantCount: 0,
        revenueGenerated: 0
      };
      b.totalUnits += 1;
      if (u.status === 'occupied') b.occupiedUnits += 1;
      else if (u.status === 'maintenance') b.maintenanceUnits += 1;
      else b.vacantUnits += 1;
      b.monthlyRentPotential += Number(u.rentAmount || 0);
      unitMap.set(k, b);
    });

    tenantList.forEach((t) => {
      const k = unitToProp.get(String(t.unitId));
      if (k && unitMap.has(k)) unitMap.get(k).tenantCount += 1;
    });

    paymentAgg.forEach((r) => {
      const k = unitToProp.get(String(r._id));
      if (k && unitMap.has(k)) unitMap.get(k).revenueGenerated += r.total || 0;
    });

    const items = properties.map((p) => {
      const u = unitMap.get(String(p._id)) || {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        maintenanceUnits: 0,
        monthlyRentPotential: 0,
        tenantCount: 0,
        revenueGenerated: 0
      };
      const occupancyRate = u.totalUnits > 0 ? Math.round((u.occupiedUnits / u.totalUnits) * 100) : 0;
      return {
        ...p,
        status: p.isFlagged ? 'flagged' : (p.status || 'active'),
        landlord: p.user || null,
        unitStats: { ...u, occupancyRate }
      };
    });

    res.json({
      items,
      demoPropertiesRemaining: scope.demoPropertyIds.length,
      filters: {
        locations: distinctLocations.filter(Boolean).sort(),
        types: distinctTypes.filter(Boolean).sort(),
        landlords: landlordsList
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch properties' });
  }
};

exports.getPropertyDetail = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('user', 'name email phone companyName accountStatus createdAt')
      .lean();
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const units = await Unit.find({ propertyId: property._id })
      .select('unitNumber type rentAmount status bedrooms bathrooms size createdAt')
      .sort({ unitNumber: 1 })
      .lean();

    const totalUnits = units.length;
    const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
    const vacantUnits = units.filter((u) => u.status === 'vacant').length;
    const maintenanceUnits = units.filter((u) => u.status === 'maintenance').length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    res.json({
      property: {
        ...property,
        status: property.isFlagged ? 'flagged' : (property.status || 'active')
      },
      landlord: property.user || null,
      units,
      occupancy: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load property details' });
  }
};

exports.flagProperty = async (req, res) => {
  try {
    const { status, isFlagged, reason = '' } = req.body || {};
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ message: 'Property not found' });

    const prevState = { status: prop.status, isFlagged: prop.isFlagged, flagReason: prop.flagReason };
    const nextStatus = ['active', 'flagged', 'inactive', 'suspended'].includes(status)
      ? status
      : (isFlagged ? 'flagged' : 'active');

    prop.status = nextStatus;
    prop.isFlagged = nextStatus === 'flagged' || Boolean(isFlagged);
    if (prop.isFlagged || nextStatus === 'suspended' || nextStatus === 'inactive') {
      prop.flagReason = String(reason || `Marked as ${nextStatus} by Super Admin`).trim();
      prop.flaggedAt = new Date();
      prop.flaggedBy = req.user._id;
    } else {
      prop.flagReason = '';
      prop.flaggedAt = undefined;
      prop.flaggedBy = undefined;
    }

    await prop.save();

    await logAdminAction({
      req,
      action: prop.isFlagged ? 'PROPERTY_FLAGGED' : 'PROPERTY_STATUS_UPDATED',
      category: 'property',
      targetType: 'Property',
      targetId: String(prop._id),
      details: `Property "${prop.name}" updated to status=${prop.status} (flagged=${prop.isFlagged})${reason ? `: ${reason}` : ''}`,
      previousState: prevState,
      newState: { status: prop.status, isFlagged: prop.isFlagged, flagReason: prop.flagReason }
    });

    res.json({ success: true, property: prop });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update property moderation status' });
  }
};
