const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const User = require('../models/User');

/**
 * Resolves the business/company letterhead profile strictly for the registered
 * landlord/company user owning a record — never leaking another tenant/org's
 * Settings document or falling back to a generic platform name on tenant docs.
 */
async function getUserBusinessProfile(userOrId) {
  let userDoc = null;
  let userId = null;

  if (userOrId && typeof userOrId === 'object' && (userOrId._id || userOrId.id)) {
    userId = userOrId._id || userOrId.id;
    userDoc = userOrId;
  } else if (userOrId && mongoose.Types.ObjectId.isValid(userOrId)) {
    userId = userOrId;
  }

  if (userId && (!userDoc || (!userDoc.email && !userDoc.name))) {
    try {
      userDoc = await User.findById(userId)
        .select('name email phone companyName address kraPin')
        .lean();
    } catch (e) {
      console.warn('getUserBusinessProfile: could not load user:', e.message);
    }
  }

  let userSettings = null;
  if (userId) {
    try {
      userSettings = await Settings.findOne({ user: userId }).lean();
    } catch (e) {
      console.warn('getUserBusinessProfile: could not load user settings:', e.message);
    }
  }

  const cleanStr = (val) => (typeof val === 'string' ? val.trim() : '');
  const registeredName = cleanStr(userDoc?.companyName) || cleanStr(userDoc?.name) || 'Property Management';
  const savedOrgName = cleanStr(userSettings?.orgName);

  // Ignore legacy platform default placeholders if the user has never customized their orgName
  const resolvedOrgName =
    savedOrgName &&
    !['makaziflow', 'makaziflow properties ltd', 'makaazihub inc.'].includes(savedOrgName.toLowerCase())
      ? savedOrgName
      : registeredName;

  const resolvedEmail =
    cleanStr(userSettings?.orgEmail) ||
    cleanStr(userDoc?.email) ||
    '';

  const resolvedPhone =
    cleanStr(userSettings?.orgPhone) ||
    cleanStr(userDoc?.phone) ||
    '';

  const resolvedAddress =
    cleanStr(userSettings?.orgAddress) ||
    cleanStr(userDoc?.address) ||
    '';

  const resolvedTaxId =
    cleanStr(userSettings?.taxId) ||
    cleanStr(userDoc?.kraPin) ||
    '';

  return {
    ...(userSettings || {}),
    user: userId || undefined,
    orgName: resolvedOrgName,
    orgEmail: resolvedEmail,
    orgPhone: resolvedPhone,
    orgAddress: resolvedAddress,
    taxId: resolvedTaxId,
    currency: cleanStr(userSettings?.currency) || 'KES',
    timezone: cleanStr(userSettings?.timezone) || 'Africa/Nairobi'
  };
}

module.exports = { getUserBusinessProfile };
