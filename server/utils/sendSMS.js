const axios = require('axios');
const Settings = require('../models/Settings');

const sendSMS = async (options) => {
  const { phone, message } = options;
  if (!phone || !message) {
      console.warn("SMS Error: Missing phone or message");
      return;
  }

  // 1. Try DB Settings First
  try {
      const settings = await Settings.findOne();
      const smsSettings = settings?.integrations?.sms; // { enabled, provider, twilio: {}, africastalking: {} }
      
      if (smsSettings && smsSettings.enabled) {
          
          // --- TWILIO ---
          if (smsSettings.provider === 'twilio') {
              const { accountSid, authToken, phoneNumber } = smsSettings.twilio;
              if (accountSid && authToken && phoneNumber) {
                  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                  
                  // Form Data for Twilio
                  const params = new URLSearchParams();
                  params.append('To', phone);
                  params.append('From', phoneNumber);
                  params.append('Body', message);

                  await axios.post(url, params, {
                      headers: { 
                          'Authorization': `Basic ${auth}`,
                          'Content-Type': 'application/x-www-form-urlencoded'
                      }
                  });
                  console.log(`📱 SMS sent to ${phone} via Twilio`);
                  return;
              }
          }

          // --- AFRICA'S TALKING ---
          if (smsSettings.provider === 'africastalking') {
              const { username, apiKey } = smsSettings.africastalking;
              if (username && apiKey) {
                  const isSandbox = username === 'sandbox';
                  const url = isSandbox 
                      ? 'https://api.sandbox.africastalking.com/version1/messaging'
                      : 'https://api.africastalking.com/version1/messaging';

                  const params = new URLSearchParams();
                  params.append('username', username);
                  params.append('to', phone);
                  params.append('message', message);

                  await axios.post(url, params, {
                      headers: { 
                          'apiKey': apiKey,
                          'Content-Type': 'application/x-www-form-urlencoded',
                          'Accept': 'application/json'
                      }
                  });
                  console.log(`📱 SMS sent to ${phone} via Africa's Talking`);
                  return;
              }
          }
      }
  } catch (err) {
      console.error("Failed to send SMS:", err.response ? err.response.data : err.message);
  }

  // 2. Fallback to Env for Africa's Talking (if configured in .env)
  if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
      console.log("Using .env Africa's Talking Settings");
      try {
          const credentials = {
              apiKey: process.env.AT_API_KEY,
              username: process.env.AT_USERNAME
          };
          const AfricasTalking = require('africastalking')(credentials);
          const sms = AfricasTalking.SMS;
          
          await sms.send({ 
              to: phone, 
              message: message,
              from: process.env.AT_FROM // Optional: Shortcode/Sender ID
          });
          
          console.log(`📱 SMS sent to ${phone} via Africa's Talking (SDK)`);
          return;
      } catch (sdkErr) {
           console.error("Failed to send SMS via SDK:", sdkErr.message || sdkErr);
      }
  }

  // 3. Fallback: Log Simulation
  console.log('--------------------------------------------------');
  console.log(`📱 [SIMULATION] SMS TO: ${phone}`);
  console.log(`MESSAGE: ${message}`);
  console.log('--------------------------------------------------');
};

module.exports = sendSMS;
