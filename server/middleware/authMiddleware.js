const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('./securityMiddleware');

const protect = async (req, res, next) => {
  let token;

  // 1. Check httpOnly cookie first (XSS Protection - Senior Standard)
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // 2. Fallback to Authorization Bearer Header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token && token !== 'undefined' && token !== 'null') {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.id).select(
        '-password -otp -otpExpires -twoFactorSecret -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokens'
      );
      if (!user) {
        return res.status(401).json({ message: 'User belonging to this token no longer exists' });
      }

      // Enforce session invalidation after password reset / change / forced logout
      if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Session has been revoked. Please sign in again.' });
      }
      if (user.passwordChangedAt && decoded.iat && Number(decoded.iat) < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
        return res.status(401).json({ message: 'Password recently changed. Please sign in again.' });
      }

      req.user = user;
      // Allow env-configured superadmin promotion without DB migration
      const superEmails = (process.env.SUPERADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      if (superEmails.includes((req.user.email || '').toLowerCase())) {
        req.user.isSuperAdmin = true;
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, session expired or invalid' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

const admin = (req, res, next) => {
  if (req.user && (['admin', 'landlord', 'superadmin'].includes(req.user.role) || req.user.isSuperAdmin)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a landlord or administrator' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.isSuperAdmin === true)) {
    next();
  } else {
    res.status(403).json({ message: 'Super Admin authorization required' });
  }
};

module.exports = { protect, admin, superAdmin };
