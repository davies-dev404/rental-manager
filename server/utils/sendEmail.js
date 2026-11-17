const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const BUSINESS_CONFIG = require('../config/businessConfig');
const {
  resolveBrevoApiKey,
  sendTransactionalEmail,
  sendSmtpRelayEmail
} = require('./brevoService');

/**
 * Unified Brevo-First Email Dispatcher:
 * 1. Brevo REST API v3 (/v3/smtp/email)
 * 2. Brevo SMTP Relay (smtp-relay.brevo.com:587)
 * 3. Optional Custom DB SMTP (if explicitly configured by tenant/org)
 */
const sendEmail = async (options) => {
  // Suppress emails to demo, placeholder, and test addresses
  const targetEmail = (options.email || '').toLowerCase().trim();
  const isDemoOrFake =
    targetEmail.endsWith('@example.com') ||
    targetEmail.endsWith('@test.com') ||
    targetEmail.endsWith('@demo.com') ||
    targetEmail.endsWith('@sample.com') ||
    targetEmail.endsWith('@dummy.com') ||
    targetEmail.includes('demotenant') ||
    targetEmail === 'tenant@makaziflow.com';

  if (isDemoOrFake) {
    console.log('[Email Suppressed] Skipped real delivery to demo/test tenant: ' + options.email);
    return { success: true, simulated: true };
  }

  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(1500).lean();
    }
  } catch (err) {
    console.warn('Could not load DB settings for email, using env config:', err.message);
  }

  const orgName = options.fromName || process.env.FROM_NAME || settings?.orgName || BUSINESS_CONFIG.name;
  // Prioritize the configured Brevo sender over stale/personal DB orgEmail so Brevo never falls back to an unverified Gmail sender
  const orgEmail =
    options.fromEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    settings?.integrations?.email?.brevo?.senderEmail ||
    process.env.FROM_EMAIL ||
    BUSINESS_CONFIG.email ||
    settings?.orgEmail;
  const replyToEmail = options.replyToEmail || settings?.orgEmail || orgEmail;
  const errors = [];

  // 1. Brevo Transactional Email REST API v3
  const brevoApiKey = resolveBrevoApiKey(process.env.BREVO_API_KEY || settings?.integrations?.email?.brevo?.apiKey);
  if (brevoApiKey) {
    try {
      const result = await sendTransactionalEmail({
        apiKey: brevoApiKey,
        to: options.email,
        toName: options.toName,
        subject: options.subject,
        htmlContent: options.message || options.html,
        senderName: orgName,
        senderEmail: orgEmail,
        replyToEmail,
        attachments: options.attachments
      });
      console.log(`📧 Email sent via Brevo API v3 to ${options.email} [ID: ${result?.messageId || 'ok'}]`);
      return { success: true, provider: 'brevo_api', messageId: result?.messageId };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`⚠️ Brevo API v3 failed (${errMsg}), falling back to Brevo SMTP Relay...`);
      errors.push(`Brevo API: ${errMsg}`);
    }
  }

  // 2. Brevo SMTP Relay (smtp-relay.brevo.com:587)
  const brevoSmtpUser = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '').trim();
  const brevoSmtpKey = (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || settings?.integrations?.email?.brevo?.smtpKey || '').trim();
  if (brevoSmtpUser && brevoSmtpKey) {
    try {
      await sendSmtpRelayEmail({
        host: process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587),
        user: brevoSmtpUser,
        pass: brevoSmtpKey,
        to: options.email,
        subject: options.subject,
        html: options.message || options.html,
        fromName: orgName,
        fromEmail: orgEmail,
        attachments: options.attachments
      });
      console.log(`📧 Email sent via Brevo SMTP Relay to ${options.email}`);
      return { success: true, provider: 'brevo_smtp' };
    } catch (err) {
      console.warn(`⚠️ Brevo SMTP Relay failed (${err.message})`);
      errors.push(`Brevo SMTP: ${err.message}`);
    }
  }

  // 3. Custom Org DB SMTP (only if explicitly configured and non-placeholder)
  const smtpSettings = settings?.integrations?.email?.smtp;
  const isPlaceholder = (h) => !h || h.trim() === '' || h.toLowerCase().includes('example.com') || h.toLowerCase() === 'smtp.mailtrap.io';
  if (smtpSettings?.host && !isPlaceholder(smtpSettings.host) && smtpSettings.user && smtpSettings.pass) {
    try {
      const port = Number(smtpSettings.port) || 587;
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host.trim(),
        port,
        secure: port === 465,
        auth: { user: smtpSettings.user.trim(), pass: smtpSettings.pass.replace(/\s+/g, '') },
        connectionTimeout: 10000,
        tls: { rejectUnauthorized: false }
      });
      await transporter.sendMail({
        from: `"${orgName}" <${smtpSettings.fromEmail || orgEmail}>`,
        to: options.email,
        subject: options.subject,
        html: options.message || options.html,
        attachments: options.attachments
      });
      console.log(`📧 Email sent via Custom DB SMTP to ${options.email}`);
      return { success: true, provider: 'custom_smtp' };
    } catch (err) {
      errors.push(`Custom DB SMTP: ${err.message}`);
    }
  }

  const finalError = `Brevo email delivery failed. Errors: [${errors.join(' | ')}]`;
  console.error(finalError);
  throw new Error(finalError);
};

module.exports = sendEmail;
