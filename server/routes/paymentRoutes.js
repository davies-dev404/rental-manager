const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');
const sendEmail = require('../utils/sendEmail');
const logActivity = require('../utils/logActivity');

// Helper to send receipt
const sendReceiptEmail = async (paymentId) => {
    try {
        console.log(`Starting receipt email for payment: ${paymentId}`);
        const payment = await Payment.findById(paymentId)
            .populate('tenantId', 'name email')
            .populate('unitId', 'unitNumber');
        
        if (!payment) {
            console.error(`Payment not found: ${paymentId}`);
            return;
        }
        if (!payment.tenantId || !payment.tenantId.email) {
            console.log(`No tenant email found for payment: ${paymentId}`);
            return;
        }

        const settings = await Settings.findOne() || {};
        console.log("Settings found, generating PDF...");
        
        // Generate PDF
        const pdfBuffer = await generateReceiptPDF(payment, settings);
        console.log("PDF generated, sending email...");

        await sendEmail({
            email: payment.tenantId.email,
            subject: `Payment Receipt - ${payment._id.toString().substring(0, 8).toUpperCase()}`,
            message: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0f172a;">Payment Receipt</h1>
                    <p>Dear ${payment.tenantId.name},</p>
                    <p>We have successfully received your payment. A PDF receipt is attached for your records.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Amount:</strong> ${payment.amount}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                        <p style="margin: 5px 0;"><strong>Unit:</strong> ${payment.unitId?.unitNumber || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Reference:</strong> ${payment._id}</p>
                    </div>
                    
                    <p>Thank you,<br>${settings.orgName || 'Rental Manager'}</p>
                </div>
            `,
            attachments: [
                {
                    filename: `Receipt-${payment._id.toString().substring(0, 8)}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        console.log("Receipt email sent successfully.");
    } catch (error) {
        console.error("Critical Error in sendReceiptEmail:", error);
        throw error; // Re-throw so the route handler catches it
    }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('tenantId', 'name email')
      .populate('unitId', 'unitNumber')
      .sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { rentAmount, depositAmount, nextPaymentDate, tenantId, date, method, status, monthCovered } = req.body;
    
    const rAmt = Number(rentAmount || 0);
    const dAmt = Number(depositAmount || 0);
    const totalAmount = rAmt + dAmt;

    if (totalAmount <= 0) {
        return res.status(400).json({ message: "No payment amount provided" });
    }

    let paymentType = 'Rent';
    if (rAmt > 0 && dAmt > 0) paymentType = 'Combined';
    else if (dAmt > 0) paymentType = 'Deposit';

    const payment = await Payment.create({
        tenantId,
        amount: totalAmount,
        rentAmount: rAmt,
        depositAmount: dAmt,
        date,
        method,
        status,
        monthCovered: rAmt > 0 ? monthCovered : 'Deposit',
        type: paymentType
    });

    await logActivity(req.user, 'Record Payment', `Recorded ${paymentType} payment of ${totalAmount} for tenant`, 'payment', 'success');

    // Update Tenant nextPaymentDate if provided
    if (nextPaymentDate && tenantId) {
        const Tenant = require('../models/Tenant');
        await Tenant.findByIdAndUpdate(tenantId, { nextPaymentDate });
    }

    // Send ONE Receipt Email
    sendReceiptEmail(payment._id).catch(err => console.error("Email Error:", err));

    const populatedPayment = await Payment.findById(payment._id)
      .populate('tenantId', 'name email')
      .populate('unitId', 'unitNumber');

    res.status(201).json(populatedPayment);
  } catch (error) {
    if (req.user) {
        await logActivity(req.user, 'Record Payment Failed', `Failed to record payment: ${error.message}`, 'payment', 'error');
    }
    res.status(400).json({ message: error.message });
  }
});

// @desc    Resend Receipt Email
// @route   POST /api/payments/:id/email
// @access  Private
router.post('/:id/email', protect, async (req, res) => {
    try {
        await sendReceiptEmail(req.params.id);
        res.json({ message: 'Receipt email sent successfully' });
    } catch (error) {
        console.error("Resend Email Error:", error);
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

// @desc    Download Receipt PDF
// @route   GET /api/payments/:id/pdf
// @access  Private
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('tenantId', 'name email')
            .populate('unitId', 'unitNumber');

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const settings = await Settings.findOne() || {};
        const pdfBuffer = await generateReceiptPDF(payment, settings);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="Receipt-${payment._id}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
});

module.exports = router;
