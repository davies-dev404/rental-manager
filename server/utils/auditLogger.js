const AdminLog = require('../models/AdminLog');

/**
 * Extracts client IP safely behind proxies (Render / Vercel / Nginx).
 */
function extractClientIp(req) {
  if (!req) return '';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

/**
 * Records an immutable Super Admin security/audit log entry.
 */
async function logAdminAction({
  req = null,
  admin = null,
  action,
  category = 'security',
  targetType = '',
  targetId = '',
  details = '',
  previousState = null,
  newState = null,
  status = 'success'
}) {
  try {
    const actor = admin || req?.user || null;
    await AdminLog.create({
      adminId: actor?._id || actor?.id || undefined,
      adminEmail: actor?.email || '',
      adminName: actor?.name || 'System',
      adminRole: actor?.role || (actor?.isSuperAdmin ? 'superadmin' : 'system'),
      action: String(action || 'ADMIN_ACTION'),
      category,
      targetType: String(targetType || ''),
      targetId: targetId ? String(targetId) : '',
      details: String(details || ''),
      previousState,
      newState,
      ipAddress: extractClientIp(req),
      userAgent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 300) : '',
      status,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Admin audit log write failed:', err.message);
  }
}

module.exports = {
  logAdminAction,
  extractClientIp
};
