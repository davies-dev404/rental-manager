const axios = require('axios');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const sendSMS = require('./sendSMS');

async function sendViaTwilioWhatsApp(phone, message, config = {}) {
  const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const keySid = config.apiKeySid || process.env.TWILIO_API_KEY_SID || config.accountSid;
  const secret = config.apiSecret || process.env.TWILIO_API_SECRET || config.authToken || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = config.fromNumber || process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid && !config.accountSid) {
    throw new Error('Twilio Account SID (AC...) missing. Set TWILIO_ACCOUNT_SID in .env or Settings');
  }
  if (!fromNumber) {
    throw new Error('Twilio WhatsApp From Number missing. Set TWILIO_WHATSAPP_NUMBER in .env or Settings');
  }

  const effectiveAccountSid = accountSid;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${effectiveAccountSid}/Messages.json`;
  const auth = Buffer.from(`${keySid}:${secret}`).toString('base64');

  // Ensure 'whatsapp:' prefix
  const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', message);

  const res = await axios.post(url, params, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  });

  return res.data;
}

/**
 * Robust WhatsApp Dispatcher with Multi-Service Fallback:
 * 1. Twilio WhatsApp
 * 2. Fallback to SMS (Twilio SMS -> Africa's Talking -> Brevo SMS)
 * 3. Graceful Simulation Fallback
 */
const sendWhatsApp = async (options) => {
  const { phone, message } = options || {};
  if (!phone || !message) {
    console.warn("WhatsApp Error: Missing phone or message");
    return { success: false, reason: "Missing phone or message" };
  }

  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(1500).lean();
    }
  } catch (err) {
    console.warn("Could not load DB settings for WhatsApp, using fallbacks:", err.message);
  }

  const errors = [];
  const waSettings = settings?.integrations?.whatsapp?.twilio || {};

  // Strategy 1: Twilio WhatsApp
  try {
    console.log(`Attempting Twilio WhatsApp to ${phone}...`);
    const result = await sendViaTwilioWhatsApp(phone, message, waSettings);
    console.log(`💬 WhatsApp sent successfully to ${phone} via Twilio`);
    return { success: true, provider: 'twilio_whatsapp', result };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.warn(`⚠️ Twilio WhatsApp failed (${msg}), falling back to SMS...`);
    errors.push(`Twilio WhatsApp: ${msg}`);
  }

  // Strategy 2: Fallback to SMS if WhatsApp delivery is unconfigured or failed
  try {
    console.log(`Falling back to SMS for ${phone}...`);
    const cleanPhone = phone.replace(/^whatsapp:/i, '');
    const smsResult = await sendSMS({ phone: cleanPhone, message });
    if (smsResult && smsResult.success) {
      console.log(`📱 WhatsApp fallback SMS delivered to ${cleanPhone}`);
      return { success: true, provider: 'fallback_sms', result: smsResult };
    }
  } catch (smsErr) {
    errors.push(`Fallback SMS: ${smsErr.message}`);
  }

  // Strategy 3: Simulation Fallback
  console.log('--------------------------------------------------');
  console.log(`💬 [SIMULATION FALLBACK] WHATSAPP TO: ${phone}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`Errors: [${errors.join(' | ')}]`);
  console.log('--------------------------------------------------');
  return { success: false, simulated: true, errors };
};

module.exports = sendWhatsApp;
