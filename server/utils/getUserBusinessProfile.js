const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const User = require('../models/User');

const LEGACY_PLACEHOLDERS = new Set([
  'makaziflow',
  'makaziflow properties ltd',
  'makaazihub inc.'
]);

/**
 * Resolves the business/management letterhead & landlord profile strictly for
 * the registered user owning a record.
 * - `companyName` / `orgName` is ONLY set if the user configured a company/management name
 *   (never substituting the landlord's login username as if it were a company name).
 * - `landlordName` carries the landlord's registered/configured name separately.
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
  const savedOrgName = cleanStr(userSettings?.orgName);
  const userCompanyName = cleanStr(userDoc?.companyName);

  const isPlaceholder = (s) => LEGACY_PLACEHOLDERS.has(s.toLowerCase());
  const companyName =
    (savedOrgName && !isPlaceholder(savedOrgName) ? savedOrgName : '') ||
    (userCompanyName && !isPlaceholder(userCompanyName) ? userCompanyName : '');

  const landlordName =
    cleanStr(userSettings?.landlordName) ||
    cleanStr(userDoc?.name) ||
    '';

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
    orgName: companyName,
    companyName,
    landlordName,
    orgLogo: cleanStr(userSettings?.orgLogo),
    orgEmail: resolvedEmail,
    orgPhone: resolvedPhone,
    orgAddress: resolvedAddress,
    taxId: resolvedTaxId,
    invoiceTitle: cleanStr(userSettings?.invoiceTitle),
    invoiceFootnote: cleanStr(userSettings?.invoiceFootnote),
    currency: cleanStr(userSettings?.currency) || 'KES',
    timezone: cleanStr(userSettings?.timezone) || 'Africa/Nairobi'
  };
}

/**
 * Decodes a data:image/(png|jpeg|jpg);base64,... URL into a Buffer for PDFKit.
 */
function decodeLogoDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  try {
    return Buffer.from(match[2], 'base64');
  } catch {
    return null;
  }
}

module.exports = { getUserBusinessProfile, decodeLogoDataUrl };
