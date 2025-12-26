const axios = require('axios');
const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  let settings = null;
  try {
    settings = await Settings.findOne();
  } catch (err) {
    console.error("Failed to load settings:", err.message);
  }

  // Helper to compile email content
  const getMailOptions = (fromName, fromEmail) => ({
    from: `"${options.fromName || fromName}" <${options.fromEmail || fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments // Note: SendGrid needs specific handling for attachments if we use it, but basic text is priority.
  });

  const errors = [];

  // --- STRATEGY 1: Check Explicit DB Provider (SendGrid) ---
  const provider = settings?.integrations?.email?.provider || 'smtp';
  
  if (provider === 'sendgrid') {
    const apiKey = settings?.integrations?.email?.sendgrid?.apiKey;
    if (apiKey) {
      try {
        console.log("Attempting to send via SendGrid (DB Config)...");
        await sendViaSendGrid(apiKey, options, settings.orgEmail || 'noreply@rental.com', settings.orgName || 'Rental Manager');
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
  const isPlaceholder = (h) => h && (h.toLowerCase().includes('example.com') || h.toLowerCase() === 'smtp.mailtrap.io');

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
        connectionTimeout: 10000, // Reduced timeout for faster fallback
        greetingTimeout: 5000
      });

      const fromEmail = smtpSettings.fromEmail || process.env.FROM_EMAIL || 'noreply@rental.com';
      const fromName = settings?.orgName || process.env.FROM_NAME || 'Rental Manager';

      await transporter.sendMail(getMailOptions(fromName, fromEmail));
      console.log(`📧 Email sent successfully (via DB SMTP) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ DB SMTP Failed:", err.message);
      errors.push(`DB SMTP: ${err.message}`);
    }
  }

  // --- STRATEGY 3: Env SMTP ---
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const envHost = process.env.SMTP_HOST;
      const envPort = Number(process.env.SMTP_PORT) || 587;
      const envSecure = envPort === 465;

      console.log(`Attempting SMTP (ENV): ${envHost}:${envPort}`);
      const transporter = nodemailer.createTransport({
        host: envHost,
        port: envPort,
        secure: envSecure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 5000
      });

      await transporter.sendMail(getMailOptions('Rental Manager', process.env.FROM_EMAIL || 'noreply@rental.com'));
      console.log(`📧 Email sent successfully (via ENV SMTP) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ ENV SMTP Failed:", err.message);
      errors.push(`ENV SMTP: ${err.message}`);
    }
  }

  // --- STRATEGY 4: Env SendGrid (Ultimate Fallback) ---
  if (process.env.SENDGRID_API_KEY) {
    try {
      console.log("Attempting fallback to SendGrid (Env)...");
      await sendViaSendGrid(process.env.SENDGRID_API_KEY, options, process.env.FROM_EMAIL || 'noreply@rental.com', 'Rental Manager');
      console.log(`📧 Email sent successfully (via SendGrid Env) to ${options.email}`);
      return;
    } catch (err) {
      console.error("❌ SendGrid Env Failed:", err.message);
      errors.push(`SendGrid Env: ${err.message}`);
    }
  }

  // Failure
  const finalError = `All methods failed. Errors: [${errors.join(' | ')}]`;
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
