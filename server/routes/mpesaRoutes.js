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
        
        // Use a publicly accessible URL for production. For local dev, this won't work without ngrok.
        const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback';

        const response = await initiateSTKPush({
            phoneNumber,
            amount,
            accountReference,
            callbackUrl
        });

        // Update the Pending Payment with CheckoutRequestID if paymentId provided
        if (paymentId) {
            await Payment.findByIdAndUpdate(paymentId, {
                checkoutRequestId: response.CheckoutRequestID,
                status: 'Pending'
            });
        }

        // Log the attempt
        await logActivity(req.user, 'M-Pesa Payment Initiated', `STK Push sent to ${phoneNumber} for ${amount}`, 'payment', 'info');

        res.json({
            success: true,
            message: "STK Push initiated successfully",
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID
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
// @access  Public (Called by Safaricom)
router.post('/callback', async (req, res) => {
    try {
        const { Body } = req.body;
        const { stkCallback } = Body;
        
        console.log("M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

        const checkoutRequestId = stkCallback.CheckoutRequestID;

        if (stkCallback.ResultCode === 0) {
            // Success
            const meta = stkCallback.CallbackMetadata.Item;
            const amount = meta.find(i => i.Name === 'Amount')?.Value;
            const mpesaReceiptNumber = meta.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = meta.find(i => i.Name === 'PhoneNumber')?.Value;
            
            // Find and Update Payment
            const payment = await Payment.findOne({ checkoutRequestId });
            if (payment) {
                payment.status = 'paid'; // Or 'Completed' based on your enum preference
                payment.reference = mpesaReceiptNumber;
                payment.amount = amount; // Confirm exact amount
                await payment.save();
                console.log(`✅ Payment Updated: ${payment._id} is now PAID`);

                // Automatically trigger PDF email and SMS receipts to tenant
                sendPaymentReceipt(payment._id).catch(err => console.error("M-Pesa Auto-Receipt Error:", err.message));
            } else {
                 console.log(`⚠️ Payment not found for CheckoutRequestID: ${checkoutRequestId}`);
            }
            
        } else {
            // Failed / Cancelled
            console.log(`❌ Payment Failed: ${stkCallback.ResultDesc}`);
            const payment = await Payment.findOne({ checkoutRequestId });
            if (payment) {
                payment.status = 'Failed';
                await payment.save();
            }
        }

        res.json({ result: "success" });
    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).json({ result: "error" });
    }
});


// @desc    Register Safaricom Pull API URL
// @route   POST /api/mpesa/pull/register
// @access  Private
router.post("/pull/register", protect, async (req, res) => {
    try {
        const { shortCode, requestType, nominatedNumber, callbackUrl } = req.body;
        const result = await registerPullTransactions({
            shortCode,
            requestType,
            nominatedNumber,
            callbackUrl
        });

        await logActivity(req.user, "M-Pesa Pull URL Registered", "Registered callback for shortcode " + (shortCode || "default"), "settings", "info");

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
router.post("/pull/query", protect, async (req, res) => {
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
router.get("/token", protect, async (req, res) => {
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
