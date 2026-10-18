const axios = require('axios');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  let settings = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settings = await Settings.findOne().maxTimeMS(2000).lean();
    }
  } catch (err) {
    console.warn("Could not load DB settings for email, using fallback:", err.message);
  }

  // Helper to compile email content
  const getMailOptions = (fromName, fromEmail) => ({
    from: `"${options.fromName || fromName}" <${options.fromEmail || fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments
  });

  const errors = [];

  // --- STRATEGY 1: Check Explicit DB Provider (SendGrid) ---
  const provider = settings?.integrations?.email?.provider || 'smtp';
  
  if (provider === 'sendgrid') {
    const apiKey = settings?.integrations?.email?.sendgrid?.apiKey;
    if (apiKey) {
      try {
        console.log("Attempting to send via SendGrid (DB Config)...");
        await sendViaSendGrid(apiKey, options, settings.orgEmail || 'noreply@makaziflow.com', settings.orgName || 'MakaziFlow');
        console.log(`📧 Email sent successfully (via SendGrid DB) to ${options.email}`);
        return;
      } catch (err) {
        console.error("❌ SendGrid DB Failed:", err.message);
        errors.push(`SendGrid DB: ${err.message}`);
      }
    } else {
        errors.push("SendGrid DB: No API Key configured");
    }
  }

  // --- STRATEGY 2: DB SMTP ---
  const smtpSettings = settings?.integrations?.email?.smtp;
  const isPlaceholder = (h) => !h || h.toLowerCase().includes('example.com') || h.toLowerCase() === 'smtp.mailtrap.io';

  if (smtpSettings && smtpSettings.host && !isPlaceholder(smtpSettings.host)) {
    try {
      const port = Number(smtpSettings.port) || 587;
      const secure = port === 465;
      
      console.log(`Attempting SMTP (DB): ${smtpSettings.host}:${port}`);
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: port,
        secure: secure,
        auth: { user: smtpSettings.user, pass: smtpSettings.pass },
        connectionTimeout: 10000,
        greetingTimeout: 5000
      });

      const fromEmail = smtpSettings.fromEmail || process.env.FROM_EMAIL || process.env.SMTP_USER || 'daviesquan8@gmail.com';
      const fromName = settings?.orgName || process.env.FROM_NAME || 'MakaziFlow';

      await transporter.sendMail(getMailOptions(fromName, fromEmail));
      console.log(`📧 Email sent successfully (via DB SMTP) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ DB SMTP Failed:", err.message);
      errors.push(`DB SMTP: ${err.message}`);
    }
  }

  // --- STRATEGY 3: Env / Default SMTP (Gmail Fallback) ---
  const envHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const envUser = process.env.SMTP_USER || 'daviesquan8@gmail.com';
  const envPass = process.env.SMTP_PASS || 'ethjknultcruugok';
  const envPort = Number(process.env.SMTP_PORT) || 465;
  const envSecure = envPort === 465;

  if (envHost && envUser && envPass) {
    try {
      console.log(`Attempting SMTP (ENV/Default): ${envHost}:${envPort}`);
      const transporter = nodemailer.createTransport({
        host: envHost,
        port: envPort,
        secure: envSecure,
        auth: { user: envUser, pass: envPass },
        connectionTimeout: 10000,
        greetingTimeout: 5000
      });

      const envFromEmail = process.env.FROM_EMAIL || envUser;
      const envFromName = process.env.FROM_NAME || settings?.orgName || 'MakaziFlow';

      await transporter.sendMail(getMailOptions(envFromName, envFromEmail));
      console.log(`📧 Email sent successfully (via SMTP) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ SMTP Failed:", err.message);
      errors.push(`SMTP: ${err.message}`);
    }
  }

  // --- STRATEGY 4: Env SendGrid (Ultimate Fallback) ---
  if (process.env.SENDGRID_API_KEY) {
    try {
      console.log("Attempting fallback to SendGrid (Env)...");
      await sendViaSendGrid(process.env.SENDGRID_API_KEY, options, process.env.FROM_EMAIL || 'noreply@makaziflow.com', 'MakaziFlow');
      console.log(`📧 Email sent successfully (via SendGrid Env) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ SendGrid Env Failed:", err.message);
      errors.push(`SendGrid Env: ${err.message}`);
    }
  }

  // Failure
  const finalError = `All email sending methods failed. Errors: [${errors.join(' | ')}]`;
  console.error(finalError);
  throw new Error(finalError);
};

// --- SendGrid Helper ---
async function sendViaSendGrid(apiKey, options, fromEmail, fromName) {
  // Basic cleaning of fromEmail to ensure it's a valid email, not empty
  const cleanFrom = fromEmail && fromEmail.includes('@') ? fromEmail : 'noreply@rental.com';

  const data = {
    personalizations: [{ to: [{ email: options.email }] }],
    from: { email: cleanFrom, name: fromName || 'Rental Manager' },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.message }]
  };

  // Convert attachments if present (SendGrid expects base64 content)
  // This is a simplified handler. Ideally, we read files to base64.
  // Assuming options.attachments is the nodemailer format { filename, path/content }
  // Only handling text/buffer content for now to avoid fs complexity here if not needed.
  
  await axios.post('https://api.sendgrid.com/v3/mail/send', data, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
}

module.exports = sendEmail;
