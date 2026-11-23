const User = require('../models/User');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Reminder = require('../models/Reminder');
const Settings = require('../models/Settings');
const LandlordSubscription = require('../models/LandlordSubscription');
const UnitEntitlement = require('../models/UnitEntitlement');
const ActivityLog = require('../models/ActivityLog');
const Invoice = require('../models/Invoice');

/**
 * Exact (name, location) pairs seeded by seedDemoDataForUser() before `isDemo: true` was added.
 */
const LEGACY_DEMO_PROPERTY_TUPLES = [
  { name: 'Kilimani Heights Apartments', location: 'Argwings Kodhek Rd, Kilimani, Nairobi' },
  { name: 'Westlands Executive Suites', location: 'Muthithi Rd, Westlands, Nairobi' },
  { name: 'Roysambu Garden Court', location: 'Off Thika Superhighway, Roysambu, Nairobi' },
  { name: 'Karen Ridge Villas', location: 'Karen Road, Karen, Nairobi' },
  { name: 'Thika Road Mansions', location: 'Eastern Bypass, Ruiru, Kiambu' }
];

const DEMO_EMAIL_REGEX = /(@demo\.com$|@dummy\.com$|@sample\.com$|demotenant)/i;

/**
 * Builds consistent non-demo exclusion match clauses for all Msimamizi Admin queries
 * so sample/demo portfolios and demo users never pollute production metrics or tables.
 */
async function getDemoExclusionScope() {
  const demoUsers = await User.find({
    $or: [{ isDemoMode: true }, { email: DEMO_EMAIL_REGEX }]
  })
    .select('_id')
    .lean();

  const demoUserIds = demoUsers.map((u) => u._id);

  const propOr = [
    { isDemo: true },
    ...LEGACY_DEMO_PROPERTY_TUPLES.map((t) => ({ name: t.name, location: t.location }))
  ];
  if (demoUserIds.length > 0) {
    propOr.push({ user: { $in: demoUserIds } });
  }

  const demoProperties = await Property.find({ $or: propOr }).select('_id').lean();
  const demoPropertyIds = demoProperties.map((p) => p._id);

  const unitOr = [{ isDemo: true }];
  if (demoPropertyIds.length > 0) unitOr.push({ propertyId: { $in: demoPropertyIds } });
  if (demoUserIds.length > 0) unitOr.push({ user: { $in: demoUserIds } });

  const demoUnits = await Unit.find({ $or: unitOr }).select('_id').lean();
  const demoUnitIds = demoUnits.map((u) => u._id);

  const tenantOr = [{ isDemo: true }];
  if (demoUnitIds.length > 0) tenantOr.push({ unitId: { $in: demoUnitIds } });
  if (demoUserIds.length > 0) tenantOr.push({ user: { $in: demoUserIds } });

  const demoTenants = await Tenant.find({ $or: tenantOr }).select('_id').lean();
  const demoTenantIds = demoTenants.map((t) => t._id);

  return {
    demoUserIds,
    demoPropertyIds,
    demoUnitIds,
    demoTenantIds,
    userExcludeFilter: {
      ...(demoUserIds.length > 0 ? { _id: { $nin: demoUserIds } } : {}),
      isDemoMode: { $ne: true },
      role: { $ne: 'superadmin' },
      isSuperAdmin: { $ne: true }
    },
    propertyExcludeFilter: {
      ...(demoPropertyIds.length > 0 ? { _id: { $nin: demoPropertyIds } } : {}),
      isDemo: { $ne: true }
    },
    unitExcludeFilter: {
      ...(demoUnitIds.length > 0 ? { _id: { $nin: demoUnitIds } } : {}),
      isDemo: { $ne: true }
    },
    tenantExcludeFilter: {
      ...(demoTenantIds.length > 0 ? { _id: { $nin: demoTenantIds } } : {}),
      isDemo: { $ne: true }
    },
    paymentExcludeFilter: {
      isDemo: { $ne: true },
      ...(demoUserIds.length > 0 ? { user: { $nin: demoUserIds } } : {}),
      ...(demoUnitIds.length > 0 ? { unitId: { $nin: demoUnitIds } } : {}),
      ...(demoTenantIds.length > 0 ? { tenantId: { $nin: demoTenantIds } } : {})
    }
  };
}

/**
 * Permanently removes all seeded demo properties, units, tenants, payments,
 * expenses, and reminders (both newly tagged `isDemo: true` and legacy seed copies),
 * while resetting `isDemoMode` on affected landlord accounts.
 */
async function purgeSeededDemoRecords() {
  const scope = await getDemoExclusionScope();

  const [delPayments, delTenants, delUnits, delProps, delExpenses, delReminders] = await Promise.all([
    scope.demoUnitIds.length || scope.demoTenantIds.length || scope.demoUserIds.length
      ? Payment.deleteMany({
          $or: [
            { isDemo: true },
            ...(scope.demoUserIds.length ? [{ user: { $in: scope.demoUserIds } }] : []),
            ...(scope.demoUnitIds.length ? [{ unitId: { $in: scope.demoUnitIds } }] : []),
            ...(scope.demoTenantIds.length ? [{ tenantId: { $in: scope.demoTenantIds } }] : [])
          ]
        })
      : Payment.deleteMany({ isDemo: true }),
    scope.demoTenantIds.length
      ? Tenant.deleteMany({ _id: { $in: scope.demoTenantIds } })
      : { deletedCount: 0 },
    scope.demoUnitIds.length
      ? Unit.deleteMany({ _id: { $in: scope.demoUnitIds } })
      : { deletedCount: 0 },
    scope.demoPropertyIds.length
      ? Property.deleteMany({ _id: { $in: scope.demoPropertyIds } })
      : { deletedCount: 0 },
    scope.demoPropertyIds.length || scope.demoUserIds.length
      ? Expense.deleteMany({
          $or: [
            ...(scope.demoPropertyIds.length ? [{ propertyId: { $in: scope.demoPropertyIds } }] : []),
            ...(scope.demoUserIds.length ? [{ user: { $in: scope.demoUserIds } }] : [])
          ]
        })
      : { deletedCount: 0 },
    scope.demoUserIds.length
      ? Reminder.deleteMany({ user: { $in: scope.demoUserIds } })
      : { deletedCount: 0 }
  ]);

  if (scope.demoUserIds.length > 0) {
    await User.updateMany(
      { _id: { $in: scope.demoUserIds }, isDemoMode: true },
      { $set: { isDemoMode: false } }
    );
  }

  return {
    deletedProperties: delProps.deletedCount || 0,
    deletedUnits: delUnits.deletedCount || 0,
    deletedTenants: delTenants.deletedCount || 0,
    deletedPayments: delPayments.deletedCount || 0,
    deletedExpenses: delExpenses.deletedCount || 0,
    deletedReminders: delReminders.deletedCount || 0,
    resetDemoUsers: scope.demoUserIds.length
  };
}

/**
 * Permanently removes non-superadmin test accounts NOT in `keepEmails` along with
 * their properties, units, tenants, payments, invoices, expenses, reminders, and settings.
 */
async function purgeTestAccountsExcept(keepEmails = ['kipsoidavis@gmail.com']) {
  const normalizedKeep = new Set(
    (Array.isArray(keepEmails) ? keepEmails : [keepEmails])
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if (normalizedKeep.size === 0) {
    throw new Error('At least one landlord email must be kept when cleaning test accounts.');
  }

  const allNonSuper = await User.find({
    role: { $ne: 'superadmin' },
    isSuperAdmin: { $ne: true }
  })
    .select('_id email')
    .lean();

  const removeUserIds = allNonSuper
    .filter((u) => !normalizedKeep.has(String(u.email || '').trim().toLowerCase()))
    .map((u) => u._id);

  if (removeUserIds.length === 0) {
    return {
      deletedUsers: 0,
      deletedProperties: 0,
      deletedUnits: 0,
      deletedTenants: 0,
      deletedPayments: 0
    };
  }

  const props = await Property.find({ user: { $in: removeUserIds } }).select('_id').lean();
  const propIds = props.map((p) => p._id);
  const units = await Unit.find({ $or: [{ user: { $in: removeUserIds } }, ...(propIds.length ? [{ propertyId: { $in: propIds } }] : [])] })
    .select('_id')
    .lean();
  const unitIds = units.map((u) => u._id);
  const tenants = await Tenant.find({ $or: [{ user: { $in: removeUserIds } }, ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : [])] })
    .select('_id')
    .lean();
  const tenantIds = tenants.map((t) => t._id);

  const [delPay, delInv, delTen, delUnit, delProp, delExp, delRem, delSet, delSub, delEnt, delAct, delUsr] = await Promise.all([
    Payment.deleteMany({
      $or: [
        { user: { $in: removeUserIds } },
        ...(unitIds.length ? [{ unitId: { $in: unitIds } }] : []),
        ...(tenantIds.length ? [{ tenantId: { $in: tenantIds } }] : [])
      ]
    }),
    Invoice.deleteMany({
      $or: [
        { user: { $in: removeUserIds } },
        ...(tenantIds.length ? [{ tenantId: { $in: tenantIds } }] : [])
      ]
    }),
    Tenant.deleteMany({ _id: { $in: tenantIds } }),
    Unit.deleteMany({ _id: { $in: unitIds } }),
    Property.deleteMany({ _id: { $in: propIds } }),
    Expense.deleteMany({ $or: [{ user: { $in: removeUserIds } }, ...(propIds.length ? [{ propertyId: { $in: propIds } }] : [])] }),
    Reminder.deleteMany({ user: { $in: removeUserIds } }),
    Settings.deleteMany({ user: { $in: removeUserIds } }),
    LandlordSubscription.deleteMany({ landlordId: { $in: removeUserIds } }),
    UnitEntitlement.deleteMany({ landlordId: { $in: removeUserIds } }),
    ActivityLog.deleteMany({ userId: { $in: removeUserIds } }),
    User.deleteMany({ _id: { $in: removeUserIds } })
  ]);

  return {
    deletedUsers: delUsr.deletedCount || 0,
    deletedProperties: delProp.deletedCount || 0,
    deletedUnits: delUnit.deletedCount || 0,
    deletedTenants: delTen.deletedCount || 0,
    deletedPayments: delPay.deletedCount || 0,
    deletedInvoices: delInv.deletedCount || 0,
    deletedExpenses: delExp.deletedCount || 0,
    deletedReminders: delRem.deletedCount || 0,
    deletedSettings: delSet.deletedCount || 0,
    deletedSubscriptions: delSub.deletedCount || 0,
    deletedEntitlements: delEnt.deletedCount || 0,
    deletedActivityLogs: delAct.deletedCount || 0
  };
}

module.exports = {
  LEGACY_DEMO_PROPERTY_TUPLES,
  getDemoExclusionScope,
  purgeSeededDemoRecords,
  purgeTestAccountsExcept
};
