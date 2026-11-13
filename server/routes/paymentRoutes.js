const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const { protect } = require('../middleware/authMiddleware');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');
const { getReceiptEmailBody, getEmailTemplate } = require('../utils/emailTemplates');

const { sendPaymentReceipt, getPropertyNameForPayment } = require('../utils/sendPaymentReceipt');
const sendReceiptEmail = sendPaymentReceipt;

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('tenantId', 'name email phone')
      .populate({
        path: 'unitId',
        select: 'unitNumber propertyId',
        populate: {
          path: 'propertyId',
          select: 'name'
        }
      })
      .sort({ date: -1 });

    const paymentsWithProperty = payments.map((p) => {
      const propName = p.unitId?.propertyId?.name || p.property || 'Property';
      return {
        ...p.toObject(),
        property: propName
      };
    });
    res.json(paymentsWithProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
            .populate('tenantId', 'name email')
            .populate('unitId', 'unitNumber');
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      amount,
      rentAmount, 
      depositAmount, 
      utilityAmount, 
      utilities, 
      nextPaymentDate, 
      tenantId, 
      unitId: reqUnitId,
      unit: unitNumber,
      tenant: tenantName,
      date, 
      method, 
      status, 
      monthCovered,
      reference 
    } = req.body;
    
    let rAmt = Number(rentAmount || 0);
    const dAmt = Number(depositAmount || 0);
    
    // Calculate total utility amount from utilities breakdown if provided
    let uList = Array.isArray(utilities) ? utilities : [];
    let uAmt = Number(utilityAmount || 0);
    if (uList.length > 0 && uAmt === 0) {
        uAmt = uList.reduce((acc, u) => acc + Number(u.amount || 0), 0);
    }

    // If generic amount is provided and rentAmount wasn't specified, allocate remainder to rentAmount
    if (amount !== undefined && amount !== null && Number(amount) > 0 && rAmt === 0 && dAmt === 0 && uAmt === 0) {
        rAmt = Number(amount);
    }

    const totalAmount = (amount && Number(amount) > 0) ? Number(amount) : (rAmt + dAmt + uAmt);

    const normalizedStatus = (status || 'paid').toLowerCase();
    const isUnpaid = ['pending', 'unpaid', 'overdue'].includes(normalizedStatus);

    if (totalAmount <= 0 && !isUnpaid) {
        return res.status(400).json({ message: "No payment amount provided" });
    }

    let paymentType = req.body.type || 'Rent';
    const components = [];
    if (rAmt > 0) components.push('Rent');
    if (dAmt > 0) components.push('Deposit');
    if (uAmt > 0) components.push('Utilities');
    if (components.length > 1) paymentType = 'Combined';
    else if (components.length === 1) paymentType = components[0];

    let tenant = null;

    if (tenantId && require('mongoose').Types.ObjectId.isValid(tenantId)) {
        tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id });
    }
    
    if (!tenant && tenantName) {
        tenant = await Tenant.findOne({ name: new RegExp('^' + tenantName + '$', 'i'), user: req.user.id });
    }

    if (!tenant && unitNumber) {
        const matchingUnit = await Unit.findOne({ unitNumber: new RegExp('^' + unitNumber + '$', 'i'), user: req.user.id });
        if (matchingUnit) {
            tenant = await Tenant.findOne({ unitId: matchingUnit._id, user: req.user.id });
        }
    }

    // Fallback: pick any tenant if none specified or find the first active tenant
    if (!tenant && !tenantId) {
        tenant = await Tenant.findOne({ user: req.user.id, status: 'active' });
    }
    
    if (!tenant) {
        return res.status(404).json({ message: "Tenant not found for this payment" });
    }

    const finalUnitId = tenant.unitId || reqUnitId;
    const paymentDate = date ? new Date(date) : new Date();
    const defaultMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

    const payment = await Payment.create({
        tenantId: tenant._id,
        unitId: finalUnitId,
        amount: totalAmount,
        rentAmount: rAmt > 0 ? rAmt : totalAmount,
        depositAmount: dAmt,
        utilityAmount: uAmt,
        utilities: uList,
        date: paymentDate,
        method: method || 'cash',
        status: status || 'paid',
        monthCovered: monthCovered || defaultMonth,
        type: paymentType,
        reference: reference || req.body.transactionId || undefined,
        user: req.user.id
    });

    const breakdownText = [
        rAmt > 0 ? `Rent: ${rAmt}` : null,
        uAmt > 0 ? `Utilities: ${uAmt}` : null,
        dAmt > 0 ? `Deposit: ${dAmt}` : null
    ].filter(Boolean).join(', ');

    await logActivity(
        req.user,
        'Record Payment',
        `Recorded ${paymentType} payment (${status.toUpperCase()}) of KES ${totalAmount} for ${tenant.name} (${breakdownText || 'Total: ' + totalAmount})`,
        'payment',
        isUnpaid ? 'warning' : 'success'
    );

    // Update Tenant nextPaymentDate if provided
    if (nextPaymentDate && tenantId) {
        await Tenant.findByIdAndUpdate(tenantId, { nextPaymentDate });
    }

    // Send ONE Receipt Email only if payment was actually made
    if (!isUnpaid && totalAmount > 0) {
        sendReceiptEmail(payment._id).catch(err => console.error("Email Error:", err));
    }

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
        // Verify ownership first
        const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        try {
            await sendReceiptEmail(req.params.id);
            res.json({ message: 'Receipt email sent successfully' });
        } catch (emailError) {
             console.error("Inner Email/PDF Error:", emailError);
             // Check if it's a timeout
             if (emailError.code === 'ETIMEDOUT') {
                 return res.status(422).json({ message: 'Email connection timed out. Check SMTP settings.', error: emailError.message });
             }
             res.status(422).json({ message: `Failed to send email: ${emailError.message}`, error: emailError.message });
        }

    } catch (error) {
        console.error("Resend Email Route Error:", error);
        res.status(500).json({ message: `System error: ${error.message}`, error: error.message });
    }
});

// @desc    Download Receipt PDF
// @route   GET /api/payments/:id/pdf
// @access  Private
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
            .populate('tenantId', 'name email')
            .populate('unitId', 'unitNumber propertyId');

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const settings = await Settings.findOne() || {};
        const propertyName = await getPropertyNameForPayment(payment);
        const pdfBuffer = await generateReceiptPDF(payment, settings, propertyName);

        const businessName = propertyName || settings?.orgName || 'MakaziFlow';
        const filename = `Receipt-${businessName.replace(/\s+/g, '_')}-${payment._id}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
});

// @desc    Dispatch Invoice via Corporate Email and Instant SMS
// @route   POST /api/payments/send-invoice
// @access  Private
router.post('/send-invoice', protect, async (req, res) => {
    try {
        const { tenantId, invoiceId, amount, dueDate, notes, propertyName, unitNumber, tenantName: fallbackName, email: fallbackEmail, phone: fallbackPhone } = req.body;
        
        let tenant = null;
        if (tenantId && require('mongoose').Types.ObjectId.isValid(tenantId)) {
            tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId');
        }
        if (!tenant && fallbackName) {
            tenant = await Tenant.findOne({ name: new RegExp('^' + fallbackName.trim() + '$', 'i'), user: req.user.id }).populate('unitId');
        }

        const recipientName = tenant?.name || fallbackName || 'Valued Tenant';
        const recipientEmail = tenant?.email || fallbackEmail;
        const recipientPhone = tenant?.phone || fallbackPhone;

        const settings = await Settings.findOne() || {};
        const businessName = propertyName || settings?.orgName || 'MakaziFlow';
        const uNum = unitNumber || tenant?.unitId?.unitNumber || tenant?.unit || 'assigned unit';
        const invRef = invoiceId || `INV-${Date.now().toString().slice(-6)}`;
        const totalAmt = Number(amount || 0).toLocaleString();
        const cleanDueDate = dueDate || new Date().toISOString().split('T')[0];

        let emailSent = false;
        let smsSent = false;

        // 1. Corporate Email Dispatch
        if (recipientEmail && recipientEmail.includes('@') && !recipientEmail.endsWith('@makaziflow.com')) {
            try {
                const emailContent = `
                    <div style="font-size: 15px; color: #334155; line-height: 1.6;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                            Dear ${recipientName},
                        </p>
                        <p style="margin: 0 0 16px 0;">
                            An official invoice has been issued for <strong>Unit ${uNum}</strong> at <strong>${businessName}</strong>.
                        </p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <tr>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Invoice Reference:</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; text-align: right;">${invRef}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Due Date:</td>
                                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; text-align: right;">${cleanDueDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 14px 16px; font-weight: 700; color: #0f172a; font-size: 16px;">Total Amount Due:</td>
                                <td style="padding: 14px 16px; font-weight: 800; color: #0284c7; font-size: 18px; text-align: right;">KES ${totalAmt}</td>
                            </tr>
                        </table>
                        ${notes ? `<p style="margin: 16px 0; font-size: 13px; color: #64748b; font-style: italic;">Note: ${notes}</p>` : ''}
                        <p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">
                            Please make payment on or before the due date. Thank you for your continued cooperation.
                        </p>
                    </div>
                `;

                await sendEmail({
                    email: recipientEmail,
                    subject: `Invoice #${invRef} - KES ${totalAmt} Due - ${businessName}`,
                    message: getEmailTemplate(`Invoice #${invRef}`, emailContent, settings, { propertyName: businessName })
                });
                emailSent = true;
                console.log(`📧 Invoice #${invRef} emailed to ${recipientEmail}`);
            } catch (err) {
                console.error(`❌ Failed to email invoice to ${recipientEmail}:`, err.message);
            }
        }

        // 2. Instant SMS Dispatch
        if (recipientPhone) {
            try {
                const smsMsg = `Invoice #${invRef}: KES ${totalAmt} due on ${cleanDueDate} for Unit ${uNum} (${businessName}). Please remit payment on time. Thank you.`;
                await sendSMS({ phone: recipientPhone, message: smsMsg });
                smsSent = true;
                console.log(`📱 Instant SMS invoice dispatched to ${recipientPhone}`);
            } catch (smsErr) {
                console.error(`❌ Failed to send SMS invoice to ${recipientPhone}:`, smsErr.message);
            }
        }

        await logActivity(
            req.user,
            'Send Invoice',
            `Dispatched invoice #${invRef} of KES ${totalAmt} to ${recipientName} (Email: ${emailSent ? 'Yes' : 'No'}, SMS: ${smsSent ? 'Yes' : 'No'})`,
            'invoice',
            'success'
        );

        res.json({ success: true, emailSent, smsSent, recipientName, invRef });
    } catch (error) {
        console.error("Invoice Dispatch Error:", error);
        res.status(500).json({ message: error.message || 'Failed to dispatch invoice' });
    }
});

module.exports = router;
