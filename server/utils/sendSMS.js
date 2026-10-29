const axios = require('axios');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

/**
 * 1. Twilio SMS Sender
 */
async function sendViaTwilio(phone, message, config = {}) {
  const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const keySid = config.apiKeySid || process.env.TWILIO_API_KEY_SID || config.accountSid;
  const secret = config.apiSecret || process.env.TWILIO_API_SECRET || config.authToken || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = config.phoneNumber || process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  if (!accountSid && !config.accountSid) {
    throw new Error('Twilio Account SID (AC...) missing. Set TWILIO_ACCOUNT_SID in .env or Settings');
  }
  if (!fromNumber) {
    throw new Error('Twilio Sender Phone Number missing. Set TWILIO_PHONE_NUMBER in .env or Settings');
  }

  const effectiveAccountSid = accountSid;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${effectiveAccountSid}/Messages.json`;
  const auth = Buffer.from(`${keySid}:${secret}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', phone);
  params.append('From', fromNumber);
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
 * 2. Africa's Talking SMS Sender
 */
async function sendViaAfricasTalking(phone, message, config = {}) {
  const username = config.username || process.env.AT_USERNAME;
  const apiKey = config.apiKey || process.env.AT_API_KEY;
  const from = config.from || process.env.AT_FROM;

  if (!username || !apiKey) {
    throw new Error("Africa's Talking credentials missing (AT_USERNAME, AT_API_KEY)");
  }

  const isSandbox = username.toLowerCase() === 'sandbox';
  const url = isSandbox 
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const params = new URLSearchParams();
  params.append('username', username);
  params.append('to', phone);
  params.append('message', message);
  if (from) params.append('from', from);

  const res = await axios.post(url, params, {
    headers: {
      'apiKey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  return res.data;
}

/**
 * 3. Brevo Transactional SMS Sender
 */
async function sendViaBrevoSMS(phone, message) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  const sender = process.env.BREVO_SMS_SENDER || 'MakaziFlow';

  let cleanPhone = phone.trim();
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+${cleanPhone}`;
  }

  const res = await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', {
    sender: sender.substring(0, 11),
    recipient: cleanPhone,
    content: message
  }, {
    headers: {
      'api-key': apiKey.trim(),
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return res.data;
}

/**
 * Robust SMS Dispatcher with Multi-Service Waterfall Fallback:
 * 1. Twilio SMS
 * 2. Africa's Talking SMS
 * 3. Brevo Transactional SMS
 * 4. Simulation Fallback (ensures business flows never crash)
 */
const sendSMS = async (options) => {
  const { phone, message } = options || {};
  if (!phone || !message) {
    console.warn("SMS Error: Missing phone or message");
    return { success: false, reason: "Missing phone or message" };
  }

  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(1500).lean();
    }
  } catch (err) {
    console.warn("Could not load DB settings for SMS, using fallbacks:", err.message);
  }

  const errors = [];
  const smsIntegrations = settings?.integrations?.sms || {};
  const activeProvider = smsIntegrations.provider || 'twilio';

  // Order providers starting with preferred provider, followed by fallbacks
  const providerOrder = activeProvider === 'africastalking'
    ? ['africastalking', 'twilio', 'brevo']
    : activeProvider === 'brevo'
    ? ['brevo', 'twilio', 'africastalking']
    : ['twilio', 'africastalking', 'brevo'];

  for (const provider of providerOrder) {
    if (provider === 'twilio') {
      try {
        console.log(`Attempting Twilio SMS to ${phone}...`);
        const twilioConfig = smsIntegrations.twilio || {};
        const result = await sendViaTwilio(phone, message, twilioConfig);
        console.log(`📱 SMS sent successfully via Twilio to ${phone} [SID: ${result?.sid || 'ok'}]`);
        return { success: true, provider: 'twilio', result };
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.warn(`⚠️ Twilio SMS failed (${msg}). Trying fallback provider...`);
        errors.push(`Twilio: ${msg}`);
      }
    }

    if (provider === 'africastalking') {
      try {
        console.log(`Attempting Africa's Talking SMS to ${phone}...`);
        const atConfig = smsIntegrations.africastalking || {};
        const result = await sendViaAfricasTalking(phone, message, atConfig);
        console.log(`📱 SMS sent successfully via Africa's Talking to ${phone}`);
        return { success: true, provider: 'africastalking', result };
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.warn(`⚠️ Africa's Talking SMS failed (${msg}). Trying fallback provider...`);
        errors.push(`Africa's Talking: ${msg}`);
      }
    }

    if (provider === 'brevo') {
      try {
        console.log(`Attempting Brevo SMS to ${phone}...`);
        const result = await sendViaBrevoSMS(phone, message);
        console.log(`📱 SMS sent successfully via Brevo to ${phone}`);
        return { success: true, provider: 'brevo', result };
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.warn(`⚠️ Brevo SMS failed (${msg})...`);
        errors.push(`Brevo SMS: ${msg}`);
      }
    }
  }

  // Graceful simulation fallback
  console.log('--------------------------------------------------');
  console.log(`📱 [SIMULATION FALLBACK] SMS TO: ${phone}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`Errors: [${errors.join(' | ')}]`);
  console.log('--------------------------------------------------');
  return { success: false, simulated: true, errors };
};

module.exports = sendSMS;
