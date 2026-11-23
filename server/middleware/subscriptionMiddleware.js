const Property = require('../models/Property');
const { ensureLandlordEntitlement } = require('../services/subscriptionService');

/**
 * Resolves the owning landlord ID for the current request with strict ownership validation.
 * Caretakers may only act on properties explicitly assigned to them or belonging to their organizationOwner.
 */
async function resolveLandlordId(req) {
  if (req.user.role === 'caretaker') {
    if (req.body?.propertyId) {
      const prop = await Property.findOne({
        _id: req.body.propertyId,
        $or: [
          { caretakerId: req.user._id },
          ...(req.user.organizationOwner ? [{ user: req.user.organizationOwner }] : [])
        ]
      }).select('user');

      if (!prop || !prop.user) {
        const err = new Error('Forbidden: Caretaker is not assigned to this property.');
        err.statusCode = 403;
        throw err;
      }
      return prop.user;
    }
    if (req.user.organizationOwner) {
      return req.user.organizationOwner;
    }
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
    res.status(err.statusCode || 500).json({
      message: err.statusCode === 403 ? err.message : 'Failed to verify subscription status',
      error: err.statusCode === 403 ? undefined : err.message
    });
  }
};

module.exports = {
  resolveLandlordId,
  requireActiveSubscription
};
