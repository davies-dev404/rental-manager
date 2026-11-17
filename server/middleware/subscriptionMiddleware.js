const Property = require('../models/Property');
const { ensureLandlordEntitlement } = require('../services/subscriptionService');

/**
 * Resolves the owning landlord ID for the current request
 * (supports landlord/admin creating directly or caretaker acting on an assigned property).
 */
async function resolveLandlordId(req) {
  if (req.user.role === 'caretaker' && req.body?.propertyId) {
    const prop = await Property.findById(req.body.propertyId).select('user');
    if (prop && prop.user) return prop.user;
  }
  return req.user._id || req.user.id;
}

/**
 * Middleware: validates subscription exists & is not expired/suspended before mutating portfolio
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const landlordId = await resolveLandlordId(req);
    const entitlement = await ensureLandlordEntitlement(landlordId);

    if (['expired', 'suspended'].includes(entitlement.status)) {
      return res.status(403).json({
        code: 'SUBSCRIPTION_INACTIVE',
        message: `Your subscription is currently ${entitlement.status}. Please renew your subscription to perform this action.`,
        entitlement
      });
    }

    req.landlordEntitlement = entitlement;
    req.resolvedLandlordId = landlordId;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify subscription status', error: err.message });
  }
};

module.exports = {
  resolveLandlordId,
  requireActiveSubscription
};
