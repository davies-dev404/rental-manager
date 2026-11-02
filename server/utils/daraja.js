const axios = require('axios');
const Settings = require('../models/Settings');

/**
 * Helper to get M-Pesa Configuration (checks DB first, falls back to process.env)
 */
const getMpesaConfig = async () => {
    let mpesa = null;
    try {
        const settings = await Settings.findOne();
        if (settings && settings.integrations?.mpesa?.enabled) {
            mpesa = settings.integrations.mpesa;
        }
    } catch (e) {
        console.warn("Could not load M-Pesa settings from DB, falling back to process.env", e.message);
    }
    
    // Resolve credentials (DB first, fallback to process.env)
    const consumerKey = mpesa?.consumerKey || process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = mpesa?.consumerSecret || process.env.MPESA_CONSUMER_SECRET;
    const passkey = mpesa?.passkey || process.env.MPESA_PASSKEY;
    const paybill = mpesa?.paybill || process.env.MPESA_SHORTCODE || process.env.MPESA_PAYBILL || '174379';
    const environment = mpesa?.environment || process.env.MPESA_ENVIRONMENT || 'sandbox';

    if (!consumerKey || !consumerSecret || !passkey || !paybill) {
        throw new Error("Missing M-Pesa configuration keys in both settings and .env.");
    }

    const isSandbox = environment === 'sandbox';
    const baseUrl = isSandbox 
        ? (process.env.MPESA_SANDBOX_BASE_URL || 'https://sandbox.safaricom.co.ke') 
        : (process.env.MPESA_PROD_BASE_URL || 'https://api.safaricom.co.ke');
        
    return {
        enabled: true,
        environment,
        consumerKey,
        consumerSecret,
        passkey,
        paybill,
        baseUrl,
        pullRegisterUrl: isSandbox
            ? (process.env.MPESA_SANDBOX_PULL_REGISTER_URL || 'https://sandbox.safaricom.co.ke/pulltransactions/v1/register')
            : (process.env.MPESA_PULL_REGISTER_URL || 'https://api.safaricom.co.ke/pulltransactions/v1/register'),
        pullQueryUrl: isSandbox
            ? (process.env.MPESA_SANDBOX_PULL_QUERY_URL || 'https://sandbox.safaricom.co.ke/pulltransactions/v1/query')
            : (process.env.MPESA_PULL_QUERY_URL || 'https://api.safaricom.co.ke/pulltransactions/v1/query')
    };
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
            "CallBackURL": callbackUrl || process.env.MPESA_CALLBACK_URL,
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

/**
 * Register Pull API URL with Safaricom Daraja
 */
const registerPullTransactions = async ({ shortCode, requestType = "Pull", nominatedNumber, callbackUrl } = {}) => {
    try {
        const { token, config } = await generateToken();
        const url = config.pullRegisterUrl;

        const payload = {
            "ShortCode": shortCode || config.paybill,
            "RequestType": requestType || "Pull",
            "NominatedNumber": nominatedNumber || "",
            "CallBackURL": callbackUrl || process.env.MPESA_CALLBACK_URL || ""
        };

        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Pull Register Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.errorMessage || error.message || "Failed to register Pull URL.");
    }
};

/**
 * Query Transactions via Safaricom Daraja Pull API
 */
const queryPullTransactions = async ({ shortCode, startDate, endDate, offsetValue = "0" } = {}) => {
    try {
        const { token, config } = await generateToken();
        const url = config.pullQueryUrl;

        const payload = {
            "ShortCode": shortCode || config.paybill,
            "StartDate": startDate,
            "EndDate": endDate,
            "OffSetValue": String(offsetValue || "0")
        };

        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Pull Query Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.errorMessage || error.message || "Failed to query pull transactions.");
    }
};

module.exports = {
    generateToken,
    initiateSTKPush,
    registerPullTransactions,
    queryPullTransactions,
    getMpesaConfig
};
