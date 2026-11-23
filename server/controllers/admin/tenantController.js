const Tenant = require('../../models/Tenant');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const User = require('../../models/User');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
const { getDemoExclusionScope } = require('../../services/adminScopeService');

/**
 * ODPP / Data Protection Compliant Tenant Metrics:
 * Returns aggregated tenant registration counts per property and landlord,
 * without exposing individual tenant names, phone numbers, emails, or ID numbers.
 */
exports.listTenants = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { search = '', landlordId = 'all', propertyId = 'all' } = req.query;

    const scope = await getDemoExclusionScope();

    const propFilter = { ...scope.propertyExcludeFilter };
    if (landlordId && landlordId !== 'all' && isValidObjectId(String(landlordId))) {
      propFilter.user = landlordId;
    }
    if (propertyId && propertyId !== 'all' && propertyId !== 'unassigned' && isValidObjectId(String(propertyId))) {
      propFilter._id = propertyId;
    }

    const [allProperties, filteredProperties, landlordsList, allUnits, allTenants] = await Promise.all([
      Property.find(scope.propertyExcludeFilter)
        .populate('user', 'name email companyName')
        .select('name location type user')
        .sort({ name: 1 })
        .lean(),
      Property.find(propFilter)
        .populate('user', 'name email companyName')
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ ...scope.userExcludeFilter, role: { $in: ['admin', 'landlord'] } })
        .select('name email companyName')
        .sort({ name: 1 })
        .limit(200)
        .lean(),
      Unit.find(scope.unitExcludeFilter).select('_id propertyId status user').lean(),
      Tenant.find(scope.tenantExcludeFilter).select('unitId status user').lean()
    ]);

    const unitToProp = new Map(allUnits.map((u) => [String(u._id), String(u.propertyId)]));
    const unitsByProp = new Map();
    allUnits.forEach((u) => {
      const k = String(u.propertyId);
      const b = unitsByProp.get(k) || { totalUnits: 0, occupiedUnits: 0 };
      b.totalUnits += 1;
      if (u.status === 'occupied') b.occupiedUnits += 1;
      unitsByProp.set(k, b);
    });

    const tenantsByProp = new Map();
    let activeTenancies = 0;
    let pastTenancies = 0;
    let unassignedTenancies = 0;

    allTenants.forEach((t) => {
      if (t.status === 'active') activeTenancies += 1;
      else pastTenancies += 1;

      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (!pId) {
        unassignedTenancies += 1;
        return;
      }
      const b = tenantsByProp.get(pId) || { totalTenants: 0, activeTenants: 0, pastTenants: 0 };
      b.totalTenants += 1;
      if (t.status === 'active') b.activeTenants += 1;
      else b.pastTenants += 1;
      tenantsByProp.set(pId, b);
    });

    const searchRx = search && String(search).trim()
      ? new RegExp(escapeRegExp(String(search).trim()), 'i')
      : null;

    let rows = filteredProperties.map((p) => {
      const k = String(p._id);
      const uStats = unitsByProp.get(k) || { totalUnits: 0, occupiedUnits: 0 };
      const tStats = tenantsByProp.get(k) || { totalTenants: 0, activeTenants: 0, pastTenants: 0 };
      const occupancyRate = uStats.totalUnits > 0 ? Math.round((uStats.occupiedUnits / uStats.totalUnits) * 100) : 0;
      return {
        _id: p._id,
        propertyName: p.name,
        location: p.location,
        type: p.type || 'Apartment',
        landlord: p.user || null,
        totalUnits: uStats.totalUnits,
        occupiedUnits: uStats.occupiedUnits,
        occupancyRate,
        registeredTenantsCount: tStats.totalTenants,
        activeTenantsCount: tStats.activeTenants,
        pastTenantsCount: tStats.pastTenants
      };
    });

    if (searchRx) {
      rows = rows.filter(
        (r) =>
          searchRx.test(r.propertyName || '') ||
          searchRx.test(r.location || '') ||
          searchRx.test(r.landlord?.name || '') ||
          searchRx.test(r.landlord?.email || '')
      );
    }

    const total = rows.length;
    const pagedItems = rows.slice(skip, skip + limit);

    const propertyBreakdown = allProperties.map((p) => {
      const tStats = tenantsByProp.get(String(p._id)) || { totalTenants: 0, activeTenants: 0 };
      return {
        _id: p._id,
        name: p.name,
        location: p.location,
        landlordName: p.user?.companyName || p.user?.name || p.user?.email || '—',
        tenantCount: tStats.totalTenants,
        activeTenants: tStats.activeTenants
      };
    });

    res.json({
      privacyMode: 'odpp_counts_only',
      summary: {
        totalRegisteredTenants: allTenants.length,
        activeTenancies,
        pastTenancies,
        unassignedTenancies,
        propertiesCovered: allProperties.length
      },
      items: pagedItems,
      filters: {
        properties: propertyBreakdown,
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
    res.status(500).json({ message: err.message || 'Failed to load aggregated tenant counts' });
  }
};

exports.getTenantDetail = async (req, res) => {
  return res.status(403).json({
    code: 'ODPP_PRIVACY_RESTRICTED',
    message: 'Individual tenant profiles and personal data are restricted under ODPA/ODPP privacy regulations. View aggregated registered tenant counts per property instead.'
  });
};
