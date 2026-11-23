const User = require('../../models/User');
const Property = require('../../models/Property');
const Unit = require('../../models/Unit');
const Tenant = require('../../models/Tenant');
const Payment = require('../../models/Payment');
const Settings = require('../../models/Settings');
const LandlordSubscription = require('../../models/LandlordSubscription');
const UnitEntitlement = require('../../models/UnitEntitlement');
const ActivityLog = require('../../models/ActivityLog');
const AdminLog = require('../../models/AdminLog');
const { escapeRegExp } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');
const { getDemoExclusionScope } = require('../../services/adminScopeService');

const SAFE_USER_EXCLUDE = '-password -otp -otpExpires -twoFactorSecret -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokens';
const VALID_ACCOUNT_STATUSES = new Set(['active', 'suspended', 'pending_verification', 'deactivated']);

exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { search = '', role = 'all', status = 'all', includeDemo = 'false' } = req.query;
    const scope = await getDemoExclusionScope();

    const filter = includeDemo === 'true' ? {} : { ...scope.userExcludeFilter };
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { companyName: rx }];
    }
    if (role && role !== 'all') {
      filter.role = String(role).trim();
    }
    if (status && status !== 'all' && VALID_ACCOUNT_STATUSES.has(String(status))) {
      filter.accountStatus = String(status);
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(SAFE_USER_EXCLUDE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const userIds = users.map((u) => u._id);
    const [propCounts, unitCounts, tenantCounts, revenueAgg, subs, entitlements, bizSettings] = await Promise.all([
      Property.aggregate([
        { $match: { user: { $in: userIds }, ...scope.propertyExcludeFilter } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      Unit.aggregate([
        { $match: { user: { $in: userIds }, ...scope.unitExcludeFilter } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      Tenant.aggregate([
        { $match: { user: { $in: userIds }, ...scope.tenantExcludeFilter } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        {
          $match: {
            user: { $in: userIds },
            ...scope.paymentExcludeFilter,
            status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] }
          }
        },
        { $group: { _id: '$user', total: { $sum: '$amount' } } }
      ]),
      LandlordSubscription.find({ landlordId: { $in: userIds } }).sort({ createdAt: -1 }).lean(),
      UnitEntitlement.find({ landlordId: { $in: userIds } }).lean(),
      Settings.find({ user: { $in: userIds } })
        .select('user orgName landlordName abbreviatedName orgEmail orgPhone orgAddress taxId mpesaType')
        .lean()
    ]);

    const propMap = new Map(propCounts.map((p) => [String(p._id), p.count]));
    const unitMap = new Map(unitCounts.map((u) => [String(u._id), u.count]));
    const tenantMap = new Map(tenantCounts.map((t) => [String(t._id), t.count]));
    const revMap = new Map(revenueAgg.map((r) => [String(r._id), r.total]));
    const bizMap = new Map(bizSettings.map((s) => [String(s.user), s]));
    const entMap = new Map(entitlements.map((e) => [String(e.landlordId), e]));
    const subMap = new Map();
    subs.forEach((s) => {
      const k = String(s.landlordId);
      if (!subMap.has(k)) subMap.set(k, s);
    });

    const items = users.map((u) => {
      const idStr = String(u._id);
      const effectiveStatus = u.accountStatus || (u.isVerified ? 'active' : 'pending_verification');
      const biz = bizMap.get(idStr);
      return {
        ...u,
        companyName: u.companyName || biz?.orgName || '',
        address: u.address || biz?.orgAddress || '',
        phone: u.phone || biz?.orgPhone || '',
        accountStatus: effectiveStatus,
        propertyCount: propMap.get(idStr) || 0,
        unitCount: unitMap.get(idStr) || 0,
        tenantCount: tenantMap.get(idStr) || 0,
        revenueGenerated: revMap.get(idStr) || 0,
        subscription: subMap.get(idStr) || null,
        entitlement: entMap.get(idStr) || null
      };
    });

    res.json({
      items,
      demoUsersCount: scope.demoUserIds.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch users' });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(SAFE_USER_EXCLUDE).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const scope = await getDemoExclusionScope();

    const properties = await Property.find({ user: user._id, ...scope.propertyExcludeFilter })
      .sort({ createdAt: -1 })
      .lean();
    const propIds = properties.map((p) => p._id);

    const units = await Unit.find({
      ...scope.unitExcludeFilter,
      $or: [
        { user: user._id },
        ...(propIds.length ? [{ propertyId: { $in: propIds } }] : [])
      ]
    })
      .sort({ unitNumber: 1 })
      .lean();
    const unitIds = units.map((u) => u._id);

    const [tenants, revAgg, paymentRecords, bizSettings, subscriptions, entitlement, activityLogs, adminLogs] = await Promise.all([
      Tenant.find({
        ...scope.tenantExcludeFilter,
        $or: [
          { user: user._id },
          ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])
        ]
      })
        .select('name email phone status unitId rentAmount leaseStart leaseEnd createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Payment.aggregate([
        {
          $match: {
            ...scope.paymentExcludeFilter,
            status: { $in: ['paid', 'confirmed', 'Completed', 'partial'] },
            $or: [
              { user: user._id },
              ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])
            ]
          }
        },
        { $group: { _id: '$unitId', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.find({
        ...scope.paymentExcludeFilter,
        $or: [
          { user: user._id },
          ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])
        ]
      })
        .populate('tenantId', 'name phone')
        .select('amount currency method status category type reference date invoiceNumber')
        .sort({ date: -1, createdAt: -1 })
        .limit(25)
        .lean(),
      Settings.findOne({ user: user._id })
        .select('orgName landlordName abbreviatedName orgEmail orgPhone orgAddress taxId mpesaType paybillAccount accountType invoiceTitle')
        .lean(),
      LandlordSubscription.find({ landlordId: user._id }).sort({ createdAt: -1 }).limit(15).lean(),
      UnitEntitlement.findOne({ landlordId: user._id }).lean(),
      ActivityLog.find({ userId: user._id }).sort({ timestamp: -1 }).limit(25).lean(),
      AdminLog.find({ targetType: 'User', targetId: String(user._id) }).sort({ createdAt: -1 }).limit(15).lean()
    ]);

    const unitToProp = new Map(units.map((u) => [String(u._id), String(u.propertyId)]));
    const propUnitCounts = new Map();
    const propOccupiedCounts = new Map();
    const propTenantCounts = new Map();
    const propRevTotals = new Map();

    units.forEach((u) => {
      const pId = String(u.propertyId);
      propUnitCounts.set(pId, (propUnitCounts.get(pId) || 0) + 1);
      if (u.status === 'occupied') propOccupiedCounts.set(pId, (propOccupiedCounts.get(pId) || 0) + 1);
    });
    tenants.forEach((t) => {
      const pId = t.unitId ? unitToProp.get(String(t.unitId)) : null;
      if (pId) propTenantCounts.set(pId, (propTenantCounts.get(pId) || 0) + 1);
    });

    let totalRevenueGenerated = 0;
    let totalPaymentsCount = 0;
    revAgg.forEach((r) => {
      totalRevenueGenerated += r.total || 0;
      totalPaymentsCount += r.count || 0;
      const pId = r._id ? unitToProp.get(String(r._id)) : null;
      if (pId) propRevTotals.set(pId, (propRevTotals.get(pId) || 0) + (r.total || 0));
    });

    const enrichedProperties = properties.map((p) => {
      const pId = String(p._id);
      return {
        ...p,
        unitCount: propUnitCounts.get(pId) || 0,
        occupiedUnits: propOccupiedCounts.get(pId) || 0,
        tenantCount: propTenantCounts.get(pId) || 0,
        revenueGenerated: propRevTotals.get(pId) || 0
      };
    });

    res.json({
      user: {
        ...user,
        companyName: user.companyName || bizSettings?.orgName || '',
        address: user.address || bizSettings?.orgAddress || '',
        phone: user.phone || bizSettings?.orgPhone || '',
        kraPin: user.kraPin || bizSettings?.taxId || '',
        accountStatus: user.accountStatus || (user.isVerified ? 'active' : 'pending_verification')
      },
      businessSettings: bizSettings || null,
      summary: {
        propertyCount: properties.length,
        unitCount: units.length,
        occupiedUnits: units.filter((u) => u.status === 'occupied').length,
        tenantCount: tenants.length,
        revenueGenerated: totalRevenueGenerated,
        paymentsCount: totalPaymentsCount
      },
      properties: enrichedProperties,
      units,
      tenants,
      payments: paymentRecords,
      subscriptions,
      entitlement,
      activityLogs,
      adminLogs
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load user details' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { accountStatus, status, reason = '' } = req.body || {};
    const targetStatus = String(accountStatus || status || '').trim().toLowerCase();
    if (!VALID_ACCOUNT_STATUSES.has(targetStatus)) {
      return res.status(400).json({
        message: 'Invalid account status. Must be active, suspended, pending_verification, or deactivated.'
      });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Safeguards: block self-suspension/deactivation & prevent locking out peer superadmins unintentionally
    if (String(target._id) === String(req.user._id) && targetStatus !== 'active') {
      return res.status(400).json({ message: 'You cannot suspend or deactivate your own administrator account.' });
    }
    if ((target.role === 'superadmin' || target.isSuperAdmin) && targetStatus !== 'active') {
      return res.status(403).json({ message: 'Super Admin accounts cannot be suspended via UI controls.' });
    }

    const prevStatus = target.accountStatus || (target.isVerified ? 'active' : 'pending_verification');
    target.accountStatus = targetStatus;

    if (targetStatus === 'active') {
      target.isVerified = true;
      target.suspendedAt = undefined;
      target.suspendedReason = '';
      target.suspendedBy = undefined;
      target.lockUntil = undefined;
      target.failedLoginAttempts = 0;
    } else if (targetStatus === 'suspended' || targetStatus === 'deactivated') {
      target.suspendedAt = new Date();
      target.suspendedReason = String(reason || (targetStatus === 'suspended' ? 'Suspended by Super Admin' : 'Deactivated by Super Admin')).trim();
      target.suspendedBy = req.user._id;
      // Immediately revoke active JWTs & refresh tokens
      target.tokenVersion = (target.tokenVersion || 0) + 1;
      target.refreshTokens = [];
      target.refreshToken = undefined;
    }

    await target.save();

    const actionMap = {
      active: prevStatus === 'suspended' || prevStatus === 'deactivated' ? 'USER_REACTIVATED' : 'USER_ACTIVATED',
      suspended: 'USER_SUSPENDED',
      deactivated: 'USER_DEACTIVATED',
      pending_verification: 'USER_SET_PENDING'
    };

    await logAdminAction({
      req,
      action: actionMap[targetStatus] || 'USER_STATUS_UPDATED',
      category: 'user',
      targetType: 'User',
      targetId: String(target._id),
      details: `${target.email} status changed from ${prevStatus} to ${targetStatus}${reason ? ` (${reason})` : ''}`,
      previousState: { accountStatus: prevStatus },
      newState: { accountStatus: targetStatus, reason: target.suspendedReason || '' }
    });

    const safeUser = target.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;
    delete safeUser.twoFactorSecret;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;
    delete safeUser.refreshToken;
    delete safeUser.refreshTokens;

    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update user status' });
  }
};
