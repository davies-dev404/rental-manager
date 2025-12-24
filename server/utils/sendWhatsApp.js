const axios = require('axios');
const Settings = require('../models/Settings');

const sendWhatsApp = async (options) => {
  const { phone, message } = options;
  if (!phone || !message) {
      console.warn("WhatsApp Error: Missing phone or message");
      return;
  }

  try {
      const settings = await Settings.findOne();
      const waSettings = settings?.integrations?.whatsapp; 
      
      if (waSettings && waSettings.enabled) {
          
          // --- TWILIO (WhatsApp) ---
          if (waSettings.provider === 'twilio') {
              const { accountSid, authToken, fromNumber } = waSettings.twilio;
              
              if (accountSid && authToken && fromNumber) {
                  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                  
                  // Ensure 'whatsapp:' prefix
                  const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
                  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

                  const params = new URLSearchParams();
                  params.append('To', to);
                  params.append('From', from);
                  params.append('Body', message);

                  await axios.post(url, params, {
                      headers: { 
                          'Authorization': `Basic ${auth}`,
                          'Content-Type': 'application/x-www-form-urlencoded'
                      }
                  });
                  console.log(`💬 WhatsApp sent to ${to}`);
                  return;
              }
          }
      }
  } catch (err) {
      console.error("Failed to send WhatsApp:", err.response ? err.response.data : err.message);
  }

  // Fallback
  console.log('--------------------------------------------------');
  console.log(`💬 [SIMULATION] WHATSAPP TO: ${phone}`);
  console.log(`MESSAGE: ${message}`);
  console.log('--------------------------------------------------');
};

module.exports = sendWhatsApp;
