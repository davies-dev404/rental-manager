const rateLimit = require('express-rate-limit');
const { protect, superAdmin } = require('./authMiddleware');
const PlatformSetting = require('../models/PlatformSetting');
const { logAdminAction } = require('../utils/auditLogger');

const IS_TEST = () => process.env.NODE_ENV === 'test';

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS' || req.method === 'GET',
  message: { message: 'Too many administrative requests. Please slow down.' }
});

/**
 * Enforces strict server-side Super Admin authorization and records denied privilege attempts.
 */
const requireSuperAdmin = [
  protect,
  (req, res, next) => {
    const isSuper = Boolean(
      req.user &&
      (req.user.role === 'superadmin' || req.user.isSuperAdmin === true)
    );
    if (isSuper) {
      return next();
    }
    logAdminAction({
      req,
      admin: req.user,
      action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      category: 'security',
      targetType: 'Endpoint',
      targetId: req.originalUrl,
      details: `Blocked role=${req.user?.role || 'unknown'} (${req.user?.email || 'unauthenticated'}) from ${req.method} ${req.originalUrl}`,
      status: 'warning'
    }).catch(() => {});
    return res.status(403).json({ message: 'Super Admin authorization required' });
  }
];

let maintenanceCache = { fetchedAt: 0, enabled: false, message: '' };
const CACHE_TTL_MS = 10000;

function invalidateMaintenanceCache() {
  maintenanceCache = { fetchedAt: 0, enabled: false, message: '' };
}

/**
 * Global maintenance mode guard:
 * Allows health checks, auth routes, public landing info, and Super Admin endpoints.
 */
async function enforceMaintenanceMode(req, res, next) {
  try {
    if (
      req.method === 'OPTIONS' ||
      req.path === '/' ||
      req.path === '/api/health' ||
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/api/public') ||
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/super-admin')
    ) {
      return next();
    }

    const now = Date.now();
    if (now - maintenanceCache.fetchedAt > CACHE_TTL_MS) {
      const doc = await PlatformSetting.findOne({ key: 'global' })
        .select('maintenanceMode maintenanceMessage')
        .lean()
        .catch(() => null);
      maintenanceCache = {
        fetchedAt: now,
        enabled: Boolean(doc?.maintenanceMode),
        message: doc?.maintenanceMessage || 'MakaziFlow is currently undergoing scheduled maintenance. Please check back shortly.'
      };
    }

    if (!maintenanceCache.enabled) {
      return next();
    }

    if (req.user && (req.user.role === 'superadmin' || req.user.isSuperAdmin === true)) {
      return next();
    }

    return res.status(503).json({
      code: 'MAINTENANCE_MODE',
      maintenanceMode: true,
      message: maintenanceCache.message
    });
  } catch {
    return next();
  }
}

module.exports = {
  requireSuperAdmin,
  superAdmin,
  adminActionLimiter,
  enforceMaintenanceMode,
  invalidateMaintenanceCache
};
