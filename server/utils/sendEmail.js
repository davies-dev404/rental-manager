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
      
      // Check if host is present and NOT just whitespace
      if (smtpSettings && smtpSettings.host && smtpSettings.host.trim() !== '') {
          const port = Number(smtpSettings.port) || 587;
          const secure = port === 465;
          
          console.log(`Configuring SMTP Transport from DB: ${smtpSettings.host}:${port} (Secure: ${secure})`);
          
          const dbTransporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: port,
            secure: secure,
            auth: {
              user: smtpSettings.user,
              pass: smtpSettings.pass,
            },
            connectionTimeout: 10000, // 10s timeout
            greetingTimeout: 10000,
            debug: true,
            logger: true, 
            family: 4
          });

          // Verify connection before using
          try {
              await dbTransporter.verify();
              console.log("✅ DB SMTP Settings Verified Successfully");
              transporter = dbTransporter;
              
              if (smtpSettings.fromEmail) fromEmail = smtpSettings.fromEmail;
              if (settings.orgName) fromName = settings.orgName;

          } catch (verifyErr) {
              console.error("❌ DB SMTP Verification Failed:", verifyErr.message);
              console.log("Falling back to .env settings...");
              transporter = null; // Ensure null so we fall back
          }
      }
  } catch (dbErr) {
      console.error("Failed to fetch settings for email:", dbErr.message);
      // Fallback continues
  }

  // 2. Fallback to Env if no DB settings found or Verification Failed
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const envPort = Number(process.env.SMTP_PORT) || 587;
      const envSecure = envPort === 465;
      console.log(`Configuring SMTP Transport from ENV: ${process.env.SMTP_HOST}:${envPort} (Secure: ${envSecure})`);
      
      transporter = nodemailer.createTransport({
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
  }

  // 3. Send or Log
  if (transporter) {
      try {
          const mailOptions = {
            from: `"${options.fromName || fromName}" <${options.fromEmail || fromEmail}>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
            attachments: options.attachments
          };
          
          await transporter.sendMail(mailOptions);
          console.log(`📧 Email sent successfully to ${options.email}`);
      } catch (sendErr) {
          console.error(`❌ Failed to send email to ${options.email}:`, sendErr.message);
          throw sendErr; // Re-throw to allow caller to handle/log
      }
  } else {
      // 4. Fallback: Log to console if no transporter could be created
      console.log('==================================================');
      console.log('❌ NO EMAIL TRANSPORTER CONFIGURED. LOGGING EMAIL ONLY.');
      console.log(`TO: ${options.email}`);
      console.log(`SUBJECT: ${options.subject}`);
      console.log(`MESSAGE (truncated): ${options.message?.substring(0, 100)}...`);
      console.log('==================================================');
      // We do NOT throw here, we just log. 
      // OR should we throw? If verify code, failing silently is bad.
      // But for development/no-smtp setup, logging is better.
      // Given user complains "doesn't send", logging implies "it didn't send".
  }
};

module.exports = sendEmail;
