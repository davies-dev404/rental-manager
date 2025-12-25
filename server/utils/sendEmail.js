const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  let settings = null;
  try {
    settings = await Settings.findOne();
  } catch (err) {
    console.error("Failed to load settings:", err.message);
  }

  const getMailOptions = (fromName, fromEmail) => ({
    from: `"${options.fromName || fromName}" <${options.fromEmail || fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments
  });

  let dbError = null;
  let envError = null;

  // 1. Try DB Settings
  const smtpSettings = settings?.integrations?.email?.smtp;
  if (smtpSettings && smtpSettings.host && smtpSettings.host.trim() !== '') {
    try {
      const port = Number(smtpSettings.port) || 587;
      const secure = port === 465;
      
      console.log(`Attempting SMTP (DB): ${smtpSettings.host}:${port} (Secure: ${secure})`);
      
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: port,
        secure: secure,
        auth: {
          user: smtpSettings.user,
          pass: smtpSettings.pass,
        },
        connectionTimeout: 10000, 
        greetingTimeout: 10000,
        family: 4
      });

      const fromEmail = smtpSettings.fromEmail || process.env.FROM_EMAIL || 'noreply@rental.com';
      const fromName = settings.orgName || process.env.FROM_NAME || 'Rental Manager';

      await transporter.sendMail(getMailOptions(fromName, fromEmail));
      console.log(`📧 Email sent successfully (via DB Settings) to ${options.email}`);
      return; // Exit if successful
    } catch (err) {
      console.error("❌ DB SMTP Send Failed:", err.message);
      dbError = err.message;
    }
  } else {
      dbError = "No DB SMTP settings configured";
  }

  // 2. Fallback to Env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const envPort = Number(process.env.SMTP_PORT) || 587;
      const envSecure = envPort === 465;
      console.log(`Attempting SMTP (ENV): ${process.env.SMTP_HOST}:${envPort} (Secure: ${envSecure})`);
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: envPort,
        secure: envSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        family: 4
      });

      const fromEmail = process.env.FROM_EMAIL || 'noreply@rental.com';
      const fromName = process.env.FROM_NAME || 'Rental Manager';

      await transporter.sendMail(getMailOptions(fromName, fromEmail));
      console.log(`📧 Email sent successfully (via ENV) to ${options.email}`);
      return; // Exit if successful
    } catch (err) {
      console.error("❌ ENV SMTP Send Failed:", err.message);
      envError = err.message;
    }
  } else {
      envError = "No ENV SMTP settings configured";
  }

  // 3. Failure Reporting
  console.log('==================================================');
  console.log('❌ ALL EMAIL METHODS FAILED. LOGGING EMAIL ONLY.');
  console.log(`TO: ${options.email}`);
  console.log(`SUBJECT: ${options.subject}`);
  console.log('==================================================');
  
  // Throw descriptive error for UI
  throw new Error(`Email Failed. DB Error: [${dbError}] | Env Error: [${envError}]`);
};

module.exports = sendEmail;
