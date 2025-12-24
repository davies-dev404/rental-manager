const axios = require('axios');
const Settings = require('../models/Settings');

/**
 * Helper to get M-Pesa Configuration from DB
 */
const getMpesaConfig = async () => {
    const settings = await Settings.findOne();
    if (!settings || !settings.integrations?.mpesa?.enabled) {
        throw new Error("M-Pesa integration is not enabled in settings.");
    }
    const mpesa = settings.integrations.mpesa;
    
    // Validate keys
    if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.passkey || !mpesa.paybill) {
        throw new Error("Missing M-Pesa configuration keys.");
    }

    const isSandbox = mpesa.environment === 'sandbox';
    const baseUrl = isSandbox 
        ? 'https://sandbox.safaricom.co.ke' 
        : 'https://api.safaricom.co.ke';
        
    return { ...mpesa, baseUrl };
};

/**
 * Generate M-Pesa OAuth Token
 */
const generateToken = async () => {
    try {
        const config = await getMpesaConfig();
        const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
        
        const response = await axios.get(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        
        return { token: response.data.access_token, baseUrl: config.baseUrl, config };
    } catch (error) {
        console.error("M-Pesa Token Error:", error.response?.data || error.message);
        throw new Error("Failed to generate M-Pesa token.");
    }
};

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
const initiateSTKPush = async ({ phoneNumber, amount, accountReference, transactionDesc, callbackUrl }) => {
    try {
        const { token, baseUrl, config } = await generateToken();
        
        // Format date: YYYYMMDDHHmmss
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        
        // Generate Password
        const password = Buffer.from(
            `${config.paybill}${config.passkey}${timestamp}`
        ).toString('base64');

        // Sanitize Phone (Ensure 254...)
        let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) formattedPhone = '254' + formattedPhone;
        
        const payload = {
            "BusinessShortCode": config.paybill,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": Math.ceil(amount), // Ensure integer
            "PartyA": formattedPhone,
            "PartyB": config.paybill,
            "PhoneNumber": formattedPhone,
            "CallBackURL": callbackUrl,
            "AccountReference": accountReference,
            "TransactionDesc": transactionDesc || "Rent Payment" 
        };

        const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.errorMessage || "Failed to initiate STK Push.");
    }
};

module.exports = { initiateSTKPush };
