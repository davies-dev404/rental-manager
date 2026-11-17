const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const { resolveBrevoApiKey, sendTransactionalSMS } = require('./brevoService');

/**
 * Unified Brevo Transactional SMS / OTP Dispatcher
 */
const sendSMS = async (options) => {
  const { phone, message, sender, type } = options || {};
  if (!phone || !message) {
    console.warn('SMS Error: Missing phone or message');
    return { success: false, reason: 'Missing phone or message' };
  }

  // Suppress live SMS billing to obvious dummy/test phones during automated test suites
  const cleanDigits = String(phone).replace(/\D/g, '');
  if (process.env.NODE_ENV === 'test' || cleanDigits === '0700000000' || cleanDigits === '254700000000') {
    console.log(`[SMS Suppressed in Test] Skipped delivery to ${phone}`);
    return { success: true, simulated: true, provider: 'brevo' };
  }

  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(1500).lean();
    }
  } catch (err) {
    console.warn('Could not load DB settings for SMS:', err.message);
  }

  const brevoApiKey = resolveBrevoApiKey(
    process.env.BREVO_API_KEY || settings?.integrations?.email?.brevo?.apiKey
  );

  if (brevoApiKey) {
    try {
      const result = await sendTransactionalSMS({
        apiKey: brevoApiKey,
        phone,
        message,
        sender: sender || process.env.BREVO_SMS_SENDER || 'MakaziFlow',
        type: type || 'transactional'
      });
      console.log(`📱 SMS sent via Brevo to ${phone} [Ref: ${result?.messageId || result?.reference || 'ok'}]`);
      return { success: true, provider: 'brevo', result };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`⚠️ Brevo SMS delivery notice (${errMsg})`);
      return { success: false, provider: 'brevo', error: errMsg };
    }
  }

  console.warn('⚠️ BREVO_API_KEY missing: SMS simulated cleanly without crash.');
  return { success: false, simulated: true, provider: 'brevo', reason: 'BREVO_API_KEY not configured' };
};

module.exports = sendSMS;
