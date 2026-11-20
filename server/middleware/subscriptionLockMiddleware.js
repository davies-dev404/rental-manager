const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSubscriptionLockState } = require('../services/subscriptionService');
const { getJwtSecret } = require('./securityMiddleware');

/**
 * Middleware: locks workspace actions once the 14-day trial or paid subscription
 * expires without payment, leaving Auth, Billing, Settings (GET), and Pesaflow
 * checkout routes accessible so the user can pay and unlock immediately.
 */
async function requireActiveSubscription(req, res, next) {
  try {
    let activeUser = req.user;
    if (!activeUser) {
      let token = req.cookies?.jwt;
      if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          const decoded = jwt.verify(token, getJwtSecret());
          activeUser = await User.findById(decoded.id).select(
            '-password -otp -otpExpires -twoFactorSecret -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokens'
          );
          if (
            activeUser &&
            decoded.tv !== undefined &&
            Number(decoded.tv) !== Number(activeUser.tokenVersion || 0)
          ) {
            return res.status(401).json({ message: 'Session has been revoked. Please sign in again.' });
          }
        } catch {
          return next();
        }
      }
    }

    if (!activeUser) return next();
    const role = (activeUser.role || '').toLowerCase();
    const superEmails = (process.env.SUPERADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (
      role === 'superadmin' ||
      role === 'tenant' ||
      activeUser.isSuperAdmin === true ||
      superEmails.includes((activeUser.email || '').toLowerCase())
    ) {
      return next();
    }

    const userId = activeUser._id || activeUser.id;
    const lockState = await getSubscriptionLockState(userId, activeUser, { resyncCount: false });
    if (lockState.isLocked) {
      return res.status(402).json({
        code: 'SUBSCRIPTION_LOCKED',
        isLocked: true,
        message: lockState.lockReason || 'Your 14-day free trial has expired. Please complete payment in Billing & Plans to unlock your workspace.'
      });
    }
    next();
  } catch (err) {
    console.warn('Subscription lock check warning:', err.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ message: 'Unable to verify subscription status right now. Please try again.' });
    }
    next();
  }
}

module.exports = { requireActiveSubscription };
