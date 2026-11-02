const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { initiateSTKPush, registerPullTransactions, queryPullTransactions, generateToken } = require('../utils/daraja');
const { sendPaymentReceipt } = require('../utils/sendPaymentReceipt');
const Payment = require('../models/Payment');
const logActivity = require('../utils/logActivity');

// @desc    Initiate M-Pesa STK Push
// @route   POST /api/mpesa/stk-push
// @access  Private
router.post('/stk-push', protect, async (req, res) => {
    try {
        const { phoneNumber, amount, accountReference, tenantId, unitId, paymentId } = req.body;

        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required."
            });
        }

        // Use configured callback URL with valid production fallback
        const callbackUrl = process.env.MPESA_CALLBACK_URL ||
            (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/api/mpesa/callback` : 'https://rental-manager-1-7jmg.onrender.com/api/mpesa/callback');

        const response = await initiateSTKPush({
            phoneNumber,
            amount,
            accountReference: accountReference || 'Rent Payment',
            callbackUrl
        });

        // Update existing pending payment or create a tracked record
        if (paymentId) {
            await Payment.findByIdAndUpdate(paymentId, {
                checkoutRequestId: response.CheckoutRequestID,
                status: 'Pending',
                method: 'M-Pesa'
            });
        } else if (tenantId) {
            await Payment.create({
                tenantId,
                unitId: unitId || undefined,
                user: req.user._id,
                amount: Number(amount) || 0,
                rentAmount: Number(amount) || 0,
                method: 'M-Pesa',
                status: 'Pending',
                checkoutRequestId: response.CheckoutRequestID,
                reference: accountReference || 'STK Push'
            });
        }

        // Log the attempt
        await logActivity(req.user, 'M-Pesa Payment Initiated', `STK Push sent to ${phoneNumber} for ${amount}`, 'payment', 'info');

        res.json({
            success: true,
            message: "STK Push initiated successfully",
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
            customerMessage: response.CustomerMessage
        });

    } catch (error) {
        console.error("STK Push Route Error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Failed to initiate M-Pesa payment" 
        });
    }
});

// @desc    M-Pesa Callback
// @route   POST /api/mpesa/callback
// @access  Public (Called by Safaricom Daraja)
router.post('/callback', async (req, res) => {
    try {
        console.log("M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

        const stkCallback = req.body?.Body?.stkCallback;
        if (!stkCallback) {
            console.warn("⚠️ Invalid M-Pesa Callback Payload");
            return res.json({ result: "success" }); // Safaricom expects 200 OK
        }

        const checkoutRequestId = stkCallback.CheckoutRequestID;
        console.log(`Processing M-Pesa Callback for CheckoutRequestID [${checkoutRequestId}], ResultCode: ${stkCallback.ResultCode}`);

        if (stkCallback.ResultCode === 0) {
            // Transaction Successful
            const meta = stkCallback.CallbackMetadata?.Item || [];
            const amount = meta.find(i => i.Name === 'Amount')?.Value;
            const mpesaReceiptNumber = meta.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = meta.find(i => i.Name === 'PhoneNumber')?.Value;
            
            // Find and Update Payment record
            const payment = await Payment.findOne({ checkoutRequestId });
            if (payment) {
                payment.status = 'paid';
                if (mpesaReceiptNumber) payment.reference = mpesaReceiptNumber;
                if (amount) payment.amount = Number(amount);
                await payment.save();
                console.log(`✅ Payment Updated: ${payment._id} (${mpesaReceiptNumber}) marked as PAID`);

                // Automatically trigger PDF email and SMS receipts to tenant
                sendPaymentReceipt(payment._id).catch(err => console.error("M-Pesa Auto-Receipt Error:", err.message));
            } else {
                console.log(`⚠️ No existing Payment found matching CheckoutRequestID: ${checkoutRequestId}`);
            }
            
        } else {
            // Failed or Cancelled by User
            console.log(`❌ M-Pesa Payment Failed/Cancelled: ${stkCallback.ResultDesc} (Code: ${stkCallback.ResultCode})`);
            const payment = await Payment.findOne({ checkoutRequestId });
            if (payment) {
                payment.status = 'Failed';
                await payment.save();
            }
        }

        // Return standard success to acknowledge receipt to Safaricom
        res.json({ result: "success" });
    } catch (error) {
        console.error("M-Pesa Callback Processing Error:", error);
        res.status(500).json({ result: "error", message: error.message });
    }
});

// @desc    Register Safaricom Pull API URL
// @route   POST /api/mpesa/pull/register
// @access  Private
router.post('/pull/register', protect, async (req, res) => {
    try {
        const { shortCode, requestType, nominatedNumber, callbackUrl } = req.body;
        const result = await registerPullTransactions({
            shortCode,
            requestType,
            nominatedNumber,
            callbackUrl
        });

        await logActivity(req.user, 'M-Pesa Pull URL Registered', `Registered callback for shortcode ${shortCode || 'default'}`, 'settings', 'info');

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Pull Register Route Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to register Pull URL."
        });
    }
});

// @desc    Query Transactions via Safaricom Pull API
// @route   POST /api/mpesa/pull/query
// @access  Private
router.post('/pull/query', protect, async (req, res) => {
    try {
        const { shortCode, startDate, endDate, offsetValue } = req.body;
        const result = await queryPullTransactions({
            shortCode,
            startDate,
            endDate,
            offsetValue
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Pull Query Route Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to query pull transactions."
        });
    }
});

// @desc    Test M-Pesa OAuth Token generation
// @route   GET /api/mpesa/token
// @access  Private
router.get('/token', protect, async (req, res) => {
    try {
        const { token, baseUrl } = await generateToken();
        res.json({
            success: true,
            message: "Daraja OAuth token generated successfully",
            baseUrl,
            tokenGenerated: !!token
        });
    } catch (error) {
        console.error("M-Pesa Token Test Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate Daraja token."
        });
    }
});

module.exports = router;
