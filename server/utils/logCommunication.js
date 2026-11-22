const mongoose = require('mongoose');
const CommunicationLog = require('../models/CommunicationLog');

function extractPlainPreview(rawHtmlOrText = '', subject = '') {
  if (/otp|one-time|verification code|password reset|2fa|two-factor/i.test(String(subject || ''))) {
    return 'Account security verification notice sent (sensitive code masked).';
  }
  const stripped = String(rawHtmlOrText || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const clean = stripped || String(subject || '').trim() || 'Notification dispatched';
  return clean.length > 280 ? `${clean.slice(0, 277)}...` : clean;
}

/**
 * Automatically records any project-wide Email, SMS, or WhatsApp dispatch in CommunicationLog,
 * resolving Landlord, Tenant, Property, and Unit context when callers don't pass explicit commMeta.
 */
async function logCommunication({
  type = 'email',
  email = '',
  phone = '',
  subject = '',
  message = '',
  toName = '',
  status = 'delivered',
  provider = '',
  charge = null,
  errorMessage = '',
  commMeta = null,
  forceLog = false
}) {
  try {
    if (!forceLog && process.env.NODE_ENV === 'test') return null;
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return null;

    const meta = commMeta || {};
    let userId = meta.userId || null;
    let tenantId = meta.tenantId || null;
    let propertyId = meta.propertyId || null;
    let propertyName = meta.propertyName || '';
    let unitNumber = meta.unitNumber || '';
    let recipientName = (meta.recipientName || toName || '').trim();
    let recipientType = meta.recipientType || '';
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();

    if (!userId || (!tenantId && !recipientType)) {
      const Tenant = require('../models/Tenant');
      let tenantDoc = null;
      if (cleanEmail) {
        const esc = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        tenantDoc = await Tenant.findOne({ email: new RegExp(`^${esc}$`, 'i') })
          .populate({ path: 'unitId', select: 'unitNumber propertyId', populate: { path: 'propertyId', select: 'name' } })
          .maxTimeMS(1200)
          .lean();
      } else if (cleanPhone) {
        const tail9 = cleanPhone.replace(/\D/g, '').slice(-9);
        if (tail9.length >= 9) {
          tenantDoc = await Tenant.findOne({ phone: new RegExp(`${tail9}$`) })
            .populate({ path: 'unitId', select: 'unitNumber propertyId', populate: { path: 'propertyId', select: 'name' } })
            .maxTimeMS(1200)
            .lean();
        }
      }

      if (tenantDoc) {
        userId = userId || tenantDoc.user;
        tenantId = tenantId || tenantDoc._id;
        recipientType = recipientType || 'tenant';
        recipientName = recipientName || tenantDoc.name || '';
        unitNumber = unitNumber || tenantDoc.unitId?.unitNumber || '';
        propertyId = propertyId || tenantDoc.unitId?.propertyId?._id || tenantDoc.unitId?.propertyId || null;
        propertyName = propertyName || tenantDoc.unitId?.propertyId?.name || '';
      } else {
        const User = require('../models/User');
        let userDoc = null;
        if (cleanEmail) {
          const esc = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          userDoc = await User.findOne({ email: new RegExp(`^${esc}$`, 'i') })
            .select('_id name role organizationOwner')
            .maxTimeMS(1200)
            .lean();
        }
        if (userDoc) {
          userId = userId || userDoc.organizationOwner || userDoc._id;
          recipientType = recipientType || (userDoc.role === 'tenant' ? 'tenant' : 'team');
          recipientName = recipientName || userDoc.name || '';
        }
      }
    }

    // Also fill missing propertyId / propertyName from unitId or tenantId if caller passed tenantId without propertyId
    if (tenantId && !propertyId) {
      const Tenant = require('../models/Tenant');
      const tDoc = await Tenant.findById(tenantId)
        .populate({ path: 'unitId', select: 'unitNumber propertyId', populate: { path: 'propertyId', select: 'name' } })
        .maxTimeMS(1000)
        .lean()
        .catch(() => null);
      if (tDoc) {
        userId = userId || tDoc.user;
        unitNumber = unitNumber || tDoc.unitId?.unitNumber || '';
        propertyId = tDoc.unitId?.propertyId?._id || tDoc.unitId?.propertyId || null;
        propertyName = propertyName || tDoc.unitId?.propertyId?.name || '';
        recipientName = recipientName || tDoc.name || '';
      }
    }

    if (!userId) return null;

    let category = meta.category || 'other';
    if (!meta.category) {
      const s = String(subject || '').toLowerCase();
      if (s.includes('receipt')) category = 'receipt';
      else if (s.includes('invoice')) category = 'invoice';
      else if (s.includes('reminder')) category = 'reminder';
      else if (s.includes('subscription') || s.includes('unit limit')) category = 'subscription';
      else if (/otp|verification|password/i.test(s)) category = 'security';
    }

    const preview = meta.previewText || extractPlainPreview(message, subject);
    const resolvedCharge = charge !== null ? Number(charge) : (type === 'sms' && status === 'delivered' ? 0.80 : 0);

    return await CommunicationLog.create({
      user: userId,
      type,
      category,
      recipientType: recipientType || (tenantId ? 'tenant' : 'team'),
      tenantId: tenantId || undefined,
      propertyId: propertyId || undefined,
      propertyName,
      unitNumber,
      recipientName: recipientName || cleanEmail || cleanPhone || 'Recipient',
      recipientEmail: cleanEmail,
      recipientPhone: cleanPhone,
      title: String(meta.title || subject || `${type.toUpperCase()} Notification`).slice(0, 200),
      message: preview,
      status,
      charge: resolvedCharge,
      provider,
      errorMessage: String(errorMessage || '').slice(0, 300),
      reminderId: meta.reminderId || undefined
    });
  } catch (err) {
    console.warn('CommunicationLog warning:', err.message);
    return null;
  }
}

module.exports = { logCommunication, extractPlainPreview };
