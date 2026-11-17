const { resolveBrevoApiKey, sendTransactionalWhatsApp } = require('./brevoService');
const sendSMS = require('./sendSMS');

/**
 * Unified Brevo WhatsApp Dispatcher with Brevo Transactional SMS Fallback
 */
const sendWhatsApp = async (options) => {
  const { phone, message, templateId } = options || {};
  if (!phone || !message) {
    console.warn('WhatsApp Error: Missing phone or message');
    return { success: false, reason: 'Missing phone or message' };
  }

  const cleanPhone = String(phone).replace(/^whatsapp:/i, '').trim();
  const brevoApiKey = resolveBrevoApiKey(process.env.BREVO_API_KEY);

  if (brevoApiKey && process.env.BREVO_WHATSAPP_SENDER) {
    try {
      const result = await sendTransactionalWhatsApp({
        apiKey: brevoApiKey,
        phone: cleanPhone,
        text: message,
        templateId
      });
      console.log(`💬 WhatsApp sent via Brevo to ${cleanPhone}`);
      return { success: true, provider: 'brevo_whatsapp', result };
    } catch (err) {
      console.warn(`⚠️ Brevo WhatsApp failed (${err.response?.data?.message || err.message}), falling back to Brevo SMS...`);
    }
  }

  // Fallback directly to Brevo Transactional SMS
  return await sendSMS({ phone: cleanPhone, message });
};

module.exports = sendWhatsApp;
