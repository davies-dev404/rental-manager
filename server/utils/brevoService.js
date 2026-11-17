const axios = require('axios');
const nodemailer = require('nodemailer');
const BUSINESS_CONFIG = require('../config/businessConfig');

const verifiedSenderCache = new Map();

/**
 * Checks Brevo /v3/senders and /v3/senders/domains (cached 2 min) so an unverified
 * domain/sender never causes silent async rejections by Brevo. Falls back to an active
 * verified Brevo sender while keeping Reply-To on the preferred business email.
 */
async function resolveVerifiedSenderEmail(apiKey, preferredEmail) {
  const cleanPreferred = String(preferredEmail || '').trim();
  const resolvedKey = resolveBrevoApiKey(apiKey || process.env.BREVO_API_KEY);
  if (!cleanPreferred || !resolvedKey || process.env.NODE_ENV === 'test') {
    return { email: cleanPreferred, fallbackUsed: false };
  }

  const cacheKey = `${resolvedKey.slice(-10)}:${cleanPreferred.toLowerCase()}`;
  const cached = verifiedSenderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const headers = { 'api-key': resolvedKey, 'Accept': 'application/json' };
    const [sendersRes, domainsRes] = await Promise.all([
      axios.get('https://api.brevo.com/v3/senders', { headers, timeout: 4000 }).catch(() => null),
      axios.get('https://api.brevo.com/v3/senders/domains', { headers, timeout: 4000 }).catch(() => null)
    ]);

    const senders = Array.isArray(sendersRes?.data?.senders) ? sendersRes.data.senders : [];
    const domains = Array.isArray(domainsRes?.data?.domains) ? domainsRes.data.domains : [];
    const prefLower = cleanPreferred.toLowerCase();
    const prefDomain = prefLower.split('@')[1] || '';

    const exactSenderActive = senders.some(
      (s) => String(s.email || '').toLowerCase() === prefLower && s.active === true
    );
    const domainAuthenticated = domains.some(
      (d) =>
        String(d.domain_name || '').toLowerCase() === prefDomain &&
        (d.verified === true || d.authenticated === true)
    );

    if (exactSenderActive || domainAuthenticated || (senders.length === 0 && domains.length === 0)) {
      const value = { email: cleanPreferred, fallbackUsed: false };
      verifiedSenderCache.set(cacheKey, { value, expiresAt: Date.now() + 120000 });
      return value;
    }

    const activeFallback = senders.find((s) => s.active === true && s.email);
    if (activeFallback) {
      console.warn(
        `⚠️ Brevo sender ${cleanPreferred} is not yet validated in Brevo. Using verified sender ${activeFallback.email} (Reply-To: ${cleanPreferred}) so email/OTP delivery succeeds.`
      );
      const value = {
        email: String(activeFallback.email).trim(),
        fallbackUsed: true,
        preferredEmail: cleanPreferred
      };
      verifiedSenderCache.set(cacheKey, { value, expiresAt: Date.now() + 120000 });
      return value;
    }
  } catch {
    // Non-fatal: proceed with preferredEmail if lookup fails
  }

  return { email: cleanPreferred, fallbackUsed: false };
}

/**
 * Resolves a Brevo v3 API key whether provided as raw `xkeysib-...`
 * or Base64-encoded JSON (`eyJhcGlfa2V5Ijoi...`).
 */
function resolveBrevoApiKey(rawKey) {
  const trimmed = String(rawKey || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('xkeysib-')) return trimmed;

  // Handle Base64 JSON wrapper: { "api_key": "xkeysib-..." }
  if (trimmed.startsWith('eyJ')) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.api_key) {
        return String(parsed.api_key).trim();
      }
    } catch {
      // Fall through to trimmed value if not Base64 JSON
    }
  }
  return trimmed;
}

/**
 * Formats Kenyan & international phone numbers to E.164 format for Brevo SMS/WhatsApp
 */
function formatPhoneE164(phone) {
  let clean = String(phone || '').replace(/[\s\-()]/g, '').trim();
  if (!clean) return '';
  if (clean.startsWith('07') || clean.startsWith('01')) {
    return `+254${clean.slice(1)}`;
  }
  if (clean.startsWith('254')) {
    return `+${clean}`;
  }
  if (!clean.startsWith('+')) {
    return `+${clean}`;
  }
  return clean;
}

/**
 * 1. Send Transactional Email via Brevo REST API v3 (/v3/smtp/email)
 */
async function sendTransactionalEmail({
  apiKey,
  to,
  toName,
  subject,
  htmlContent,
  senderName,
  senderEmail,
  replyToEmail,
  attachments
}) {
  const resolvedKey = resolveBrevoApiKey(apiKey || process.env.BREVO_API_KEY);
  if (!resolvedKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const preferredEmail = (senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || BUSINESS_CONFIG.email).trim();
  const senderCheck = await resolveVerifiedSenderEmail(resolvedKey, preferredEmail);
  const fromEmail = senderCheck.email || preferredEmail;
  const fromName = (senderName || process.env.FROM_NAME || BUSINESS_CONFIG.name).trim();
  const replyTo = (replyToEmail || preferredEmail).trim();

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to.trim(), name: toName || to.split('@')[0] }],
    subject,
    htmlContent,
    replyTo: { name: fromName, email: replyTo }
  };

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachment = attachments
      .map((att) => ({
        name: att.filename,
        content: att.content
          ? (Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64'))
          : undefined,
        url: att.path
      }))
      .filter((att) => att.content || att.url);
  }

  const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'api-key': resolvedKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 12000
  });

  return response.data;
}

/**
 * 2. Send Email via Brevo SMTP Relay (smtp-relay.brevo.com:587)
 */
async function sendSmtpRelayEmail({
  host,
  port,
  user,
  pass,
  to,
  subject,
  html,
  fromName,
  fromEmail,
  attachments
}) {
  const smtpHost = (host || process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim();
  const smtpPort = Number(port || process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);
  const smtpUser = (user || process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '').trim();
  const smtpPass = (pass || process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || '').trim();

  if (!smtpUser || !smtpPass) {
    throw new Error('Brevo SMTP credentials (BREVO_SMTP_USER, BREVO_SMTP_KEY) are not configured');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 7000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false }
  });

  const preferredAddr = (fromEmail || process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || BUSINESS_CONFIG.email).trim();
  const smtpSenderCheck = await resolveVerifiedSenderEmail(process.env.BREVO_API_KEY, preferredAddr);
  const senderAddr = smtpSenderCheck.email || preferredAddr;
  const senderLabel = (fromName || process.env.FROM_NAME || BUSINESS_CONFIG.name).trim();

  return await transporter.sendMail({
    from: `"${senderLabel}" <${senderAddr}>`,
    replyTo: preferredAddr,
    to,
    subject,
    html,
    attachments
  });
}

/**
 * 3. Send Transactional SMS / OTP via Brevo v3 (/v3/transactionalSMS/sms)
 */
async function sendTransactionalSMS({ apiKey, phone, message, sender, type = 'transactional' }) {
  const resolvedKey = resolveBrevoApiKey(apiKey || process.env.BREVO_API_KEY);
  if (!resolvedKey) {
    throw new Error('BREVO_API_KEY is not configured for SMS delivery');
  }

  const recipient = formatPhoneE164(phone);
  if (!recipient) {
    throw new Error('Valid recipient phone number is required');
  }

  const senderId = String(sender || process.env.BREVO_SMS_SENDER || 'MakaziFlow').replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || 'MakaziFlow';

  const response = await axios.post(
    'https://api.brevo.com/v3/transactionalSMS/sms',
    {
      sender: senderId,
      recipient,
      content: message,
      type
    },
    {
      headers: {
        'api-key': resolvedKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 12000
    }
  );

  return response.data;
}

/**
 * 4. Send Transactional WhatsApp via Brevo v3 (/v3/whatsapp/sendMessage)
 */
async function sendTransactionalWhatsApp({ apiKey, phone, text, templateId, senderNumber }) {
  const resolvedKey = resolveBrevoApiKey(apiKey || process.env.BREVO_API_KEY);
  if (!resolvedKey) {
    throw new Error('BREVO_API_KEY is not configured for WhatsApp delivery');
  }
  const waSender = senderNumber || process.env.BREVO_WHATSAPP_SENDER;
  if (!waSender) {
    throw new Error('BREVO_WHATSAPP_SENDER is not configured');
  }

  const recipient = formatPhoneE164(phone).replace(/^\+/, '');
  const payload = templateId
    ? {
        senderNumber: waSender,
        contactNumbers: [recipient],
        templateId: Number(templateId)
      }
    : {
        senderNumber: waSender,
        contactNumbers: [recipient],
        text
      };

  const response = await axios.post('https://api.brevo.com/v3/whatsapp/sendMessage', payload, {
    headers: {
      'api-key': resolvedKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 12000
  });

  return response.data;
}

/**
 * 5. Create (and optionally send immediately or schedule) a Brevo Email Campaign (/v3/emailCampaigns)
 */
async function createAndSendEmailCampaign({
  apiKey,
  name,
  subject,
  htmlContent,
  senderName,
  senderEmail,
  listIds = [],
  scheduledAt = null,
  sendNow = false
}) {
  const resolvedKey = resolveBrevoApiKey(apiKey || process.env.BREVO_API_KEY);
  if (!resolvedKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const preferredCampEmail = (senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || BUSINESS_CONFIG.email).trim();
  const campSenderCheck = await resolveVerifiedSenderEmail(resolvedKey, preferredCampEmail);

  const campaignPayload = {
    name: name || `MakaziFlow Campaign - ${new Date().toISOString().slice(0, 10)}`,
    subject: subject || 'MakaziFlow Notification',
    sender: {
      name: senderName || process.env.FROM_NAME || BUSINESS_CONFIG.name,
      email: campSenderCheck.email || preferredCampEmail
    },
    replyTo: preferredCampEmail,
    type: 'classic',
    htmlContent,
    ...(Array.isArray(listIds) && listIds.length > 0 ? { recipients: { listIds: listIds.map(Number) } } : {}),
    ...(scheduledAt ? { scheduledAt } : {})
  };

  const createRes = await axios.post('https://api.brevo.com/v3/emailCampaigns', campaignPayload, {
    headers: {
      'api-key': resolvedKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 15000
  });

  const campaignId = createRes.data?.id;
  let dispatchedNow = false;
  if (sendNow && campaignId && !scheduledAt) {
    await axios.post(
      `https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`,
      {},
      {
        headers: {
          'api-key': resolvedKey,
          'Accept': 'application/json'
        },
        timeout: 12000
      }
    );
    dispatchedNow = true;
  }

  return {
    ...(createRes.data || {}),
    campaignId,
    sentNow: dispatchedNow
  };
}

module.exports = {
  resolveBrevoApiKey,
  resolveVerifiedSenderEmail,
  formatPhoneE164,
  sendTransactionalEmail,
  sendSmtpRelayEmail,
  sendTransactionalSMS,
  sendTransactionalWhatsApp,
  createAndSendEmailCampaign
};
