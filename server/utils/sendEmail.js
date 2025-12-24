const nodemailer = require('nodemailer');

const Settings = require('../models/Settings');

const sendEmail = async (options) => {
  let transporter;
  let fromEmail = process.env.FROM_EMAIL || 'noreply@rental.com';
  let fromName = process.env.FROM_NAME || 'Rental Manager';

  // 1. Try DB Settings First
  try {
      const settings = await Settings.findOne();
      const smtpSettings = settings?.integrations?.email?.smtp;
      
      if (smtpSettings && smtpSettings.host) {
          const secure = smtpSettings.port === 465;
          console.log(`Configuring SMTP Transport: ${smtpSettings.host}:${smtpSettings.port} (Secure: ${secure})`);
          transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: secure,
            auth: {
              user: smtpSettings.user,
              pass: smtpSettings.pass,
            },
            connectionTimeout: 30000, // Wait 30s
            greetingTimeout: 30000,
            debug: true, // Show debug logs
            logger: true // Log to console
          });
          fromEmail = smtpSettings.fromEmail || fromEmail;
          fromName = settings.orgName || fromName; // Use Org Name as Sender Name
          console.log("Using Database SMTP Settings");
      }
  } catch (dbErr) {
      console.error("Failed to fetch settings for email:", dbErr.message);
  }

  // 2. Fallback to Env if no DB settings found
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const envPort = process.env.SMTP_PORT || 587;
      const envSecure = parseInt(envPort) === 465;
      console.log(`Configuring SMTP Transport from ENV: ${process.env.SMTP_HOST}:${envPort} (Secure: ${envSecure})`);
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: envPort,
        secure: envSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        debug: true,
        logger: true
      });
      console.log("Using .env SMTP Settings");
  }

  // 3. Send or Log
  if (transporter) {
      const mailOptions = {
        from: `"${options.fromName || fromName}" <${options.fromEmail || fromEmail}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
        attachments: options.attachments // Support attachments
      };
      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${options.email}`);
  } else {
      // 4. Fallback: Log to console
      console.log('==================================================');
      console.log(`📧 EMAIL TO: ${options.email}`);
      console.log(`SUBJECT: ${options.subject}`);
      console.log(`MESSAGE: ${options.message}`);
      console.log('==================================================');
  }
};

module.exports = sendEmail;
