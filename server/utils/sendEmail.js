const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

/**
 * Robust Email Dispatcher with Multi-Provider Fallback:
 * 1. Resend API (HTTP REST — fast, resilient, bypasses SMTP port blocking)
 * 2. SendGrid (HTTP REST)
 * 3. DB SMTP (configured in Settings)
 * 4. Env SMTP (Gmail with Port 465 SSL + automatic Port 587 STARTTLS fallback)
 */

// Helper to send via Resend HTTPS API
async function sendViaResend(apiKey, options, fromName) {
  let fromAddress = process.env.RESEND_FROM || `"${fromName || 'MakaziFlow'}" <onboarding@resend.dev>`;
  const replyToEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'daviesquan8@gmail.com';
  
  // Resend requires a verified domain to send from custom addresses.
  // Public domains like @gmail.com cannot be verified on Resend and trigger a 403.
  // In that case, we send via onboarding@resend.dev with reply_to set to the user's Gmail.
  let safeFrom = fromAddress;
  if (/@(gmail|yahoo|hotmail|outlook)\.com/i.test(fromAddress)) {
    safeFrom = `"${fromName || 'MakaziFlow'}" <onboarding@resend.dev>`;
  }

  const payload = {
    from: safeFrom,
    reply_to: replyToEmail,
    to: [options.email],
    subject: options.subject,
    html: options.message,
  };

  if (options.attachments && Array.isArray(options.attachments)) {
    payload.attachments = options.attachments.map(att => ({
      filename: att.filename,
      content: att.content ? (Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content) : undefined,
      path: att.path
    }));
  }

  const response = await axios.post('https://api.resend.com/emails', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return response.data;
}

// Helper to send via SendGrid API
async function sendViaSendGrid(apiKey, options, fromEmail, fromName) {
  const cleanFrom = fromEmail && fromEmail.includes('@') ? fromEmail : 'noreply@makaziflow.com';
  const data = {
    personalizations: [{ to: [{ email: options.email }] }],
    from: { email: cleanFrom, name: fromName || 'MakaziFlow' },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.message }]
  };

  await axios.post('https://api.sendgrid.com/v3/mail/send', data, {
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
}

// Helper for fresh Nodemailer transport (no persistent pooling to prevent dead sockets)
async function sendViaNodemailer(host, port, secure, user, pass, mailOptions, label = 'SMTP') {
  const cleanPass = pass ? pass.replace(/\s+/g, '') : '';
  const cleanUser = user ? user.trim() : '';
  const cleanHost = host ? host.trim() : '';
  const numPort = Number(port) || 465;

  const transporter = nodemailer.createTransport({
    host: cleanHost,
    port: numPort,
    secure: secure !== undefined ? secure : (numPort === 465),
    auth: { user: cleanUser, pass: cleanPass },
    connectionTimeout: 10000,
    greetingTimeout: 7000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false }
  });

  return await transporter.sendMail(mailOptions);
}

const sendEmail = async (options) => {
  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(1500).lean();
    }
  } catch (err) {
    console.warn("Could not load DB settings for email, using fallback:", err.message);
  }

  const orgName = settings?.orgName || process.env.FROM_NAME || 'MakaziFlow';
  const orgEmail = settings?.orgEmail || process.env.FROM_EMAIL || 'noreply@makaziflow.com';

  const getMailOptions = (fromName, fromEmail) => ({
    from: `"${options.fromName || fromName || orgName}" <${options.fromEmail || fromEmail || orgEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments
  });

  const errors = [];

  // ==========================================
  // STRATEGY 1: Resend API (HTTP REST)
  // ==========================================
  const resendApiKey = process.env.RESEND_API_KEY || settings?.integrations?.email?.resend?.apiKey;
  if (resendApiKey) {
    try {
      console.log(`Attempting Resend API for ${options.email}...`);
      const resendResult = await sendViaResend(resendApiKey, options, orgName);
      console.log(`📧 Email sent successfully (via Resend API) to ${options.email} [ID: ${resendResult?.id}]`);
      return;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`⚠️ Resend API Failed (${errMsg}), falling back to SMTP...`);
      errors.push(`Resend: ${errMsg}`);
    }
  }

  // ==========================================
  // STRATEGY 2: SendGrid API (HTTP REST)
  // ==========================================
  const sendgridApiKey = settings?.integrations?.email?.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
  if (sendgridApiKey && settings?.integrations?.email?.provider === 'sendgrid') {
    try {
      console.log(`Attempting SendGrid API for ${options.email}...`);
      await sendViaSendGrid(sendgridApiKey, options, orgEmail, orgName);
      console.log(`📧 Email sent successfully (via SendGrid) to ${options.email}`);
      return;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`⚠️ SendGrid Failed (${errMsg}), falling back to SMTP...`);
      errors.push(`SendGrid: ${errMsg}`);
    }
  }

  // ==========================================
  // STRATEGY 3: DB Configured SMTP (if fully configured)
  // ==========================================
  const smtpSettings = settings?.integrations?.email?.smtp;
  const isPlaceholder = (h) => !h || h.trim() === '' || h.toLowerCase().includes('example.com') || h.toLowerCase() === 'smtp.mailtrap.io';

  if (smtpSettings?.host && !isPlaceholder(smtpSettings.host) && smtpSettings.user && smtpSettings.pass) {
    try {
      const port = Number(smtpSettings.port) || 587;
      const secure = port === 465;
      console.log(`Attempting DB SMTP (${smtpSettings.host}:${port})...`);
      const fromEmail = smtpSettings.fromEmail || orgEmail;
      await sendViaNodemailer(smtpSettings.host, port, secure, smtpSettings.user, smtpSettings.pass, getMailOptions(orgName, fromEmail), 'DB SMTP');
      console.log(`📧 Email sent successfully (via DB SMTP) to ${options.email}`);
      return;
    } catch (err) {
      console.warn(`⚠️ DB SMTP Failed (${err.message}), trying Env SMTP...`);
      errors.push(`DB SMTP: ${err.message}`);
    }
  }

  // ==========================================
  // STRATEGY 4: Environment SMTP (Gmail Fallback with Port 465 & 587 Auto-Retry)
  // ==========================================
  const envHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envPort = Number(process.env.SMTP_PORT) || 465;
  const envFromEmail = process.env.FROM_EMAIL || envUser || 'noreply@makaziflow.com';

  if (envUser && envPass) {
    // Primary ENV attempt
    try {
      console.log(`Attempting SMTP (ENV): ${envHost}:${envPort}...`);
      await sendViaNodemailer(envHost, envPort, envPort === 465, envUser, envPass, getMailOptions(orgName, envFromEmail), 'ENV SMTP');
      console.log(`📧 Email sent successfully (via Env SMTP) to ${options.email}`);
      return;
    } catch (primaryErr) {
      console.warn(`⚠️ Env SMTP port ${envPort} failed (${primaryErr.message}). Retrying alternate port...`);
      errors.push(`Env SMTP (${envPort}): ${primaryErr.message}`);

      // Alternate port retry (465 SSL <-> 587 STARTTLS)
      const alternatePort = envPort === 465 ? 587 : 465;
      const alternateSecure = alternatePort === 465;
      try {
        console.log(`Attempting SMTP (Alternate Port ${alternatePort})...`);
        await sendViaNodemailer(envHost, alternatePort, alternateSecure, envUser, envPass, getMailOptions(orgName, envFromEmail), 'Alternate SMTP');
        console.log(`📧 Email sent successfully (via Alternate SMTP port ${alternatePort}) to ${options.email}`);
        return;
      } catch (altErr) {
        console.error(`❌ Alternate SMTP port ${alternatePort} failed:`, altErr.message);
        errors.push(`Alternate SMTP (${alternatePort}): ${altErr.message}`);
      }
    }
  }

  // Final failure
  const finalError = `All email sending methods failed. Errors: [${errors.join(' | ')}]`;
  console.error(finalError);
  throw new Error(finalError);
};

module.exports = sendEmail;
