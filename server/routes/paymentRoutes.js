const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const { protect } = require('../middleware/authMiddleware');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');
const { generateInvoicePDF } = require('../utils/generateInvoicePDF');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');
const { getReceiptEmailBody, getEmailTemplate } = require('../utils/emailTemplates');

const { sendPaymentReceipt, getPropertyNameForPayment } = require('../utils/sendPaymentReceipt');
const { getUserBusinessProfile } = require('../utils/getUserBusinessProfile');
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
    const isUnpaid = ['pending', 'unpaid', 'overdue', 'open', 'draft'].includes(normalizedStatus);

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
        notes: req.body.notes || req.body.description || undefined,
        paidAt: isUnpaid ? undefined : new Date(),
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
        `Recorded ${paymentType} payment (${(status || 'paid').toUpperCase()}) of KES ${totalAmount} for ${tenant.name} (${breakdownText || 'Total: ' + totalAmount})`,
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

// @desc    Update payment status or details (e.g. mark pending/unpaid/partial payment as paid without re-recording)
// @route   PUT /api/payments/:id  |  PATCH /api/payments/:id
// @access  Private
const updatePaymentHandler = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
      .populate('tenantId', 'name email phone')
      .populate('unitId', 'unitNumber');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const prevStatus = String(payment.status || '').toLowerCase();
    const { status, method, reference, transactionId, date, amount, notes, sendReceipt } = req.body || {};

    if (status !== undefined) {
      const normalized = String(status).trim().toLowerCase();
      payment.status = normalized === 'confirmed' ? 'paid' : normalized;
    }
    if (method !== undefined && method !== '') payment.method = method;
    if (reference !== undefined) payment.reference = reference;
    else if (transactionId !== undefined) payment.reference = transactionId;
    if (date !== undefined && date) payment.date = new Date(date);
    if (notes !== undefined) payment.notes = notes;
    if (amount !== undefined && Number(amount) > 0) {
      payment.amount = Number(amount);
    }

    const nextStatus = String(payment.status || '').toLowerCase();
    const wasPaid = ['paid', 'confirmed', 'completed'].includes(prevStatus);
    const isNowPaid = ['paid', 'confirmed', 'completed'].includes(nextStatus);

    if (!wasPaid && isNowPaid) {
      payment.paidAt = new Date();
    }

    await payment.save();

    let receiptEmailSent = false;
    let receiptEmailReason = null;

    if (!wasPaid && isNowPaid && sendReceipt !== false && Number(payment.amount || 0) > 0) {
      try {
        const emailResult = await sendReceiptEmail(payment._id);
        receiptEmailSent = Boolean(emailResult?.emailSent);
        receiptEmailReason = emailResult?.reason || null;
      } catch (e) {
        receiptEmailReason = e.message;
        console.warn('Update-to-paid receipt email warning:', e.message);
      }
    }

    await logActivity(
      req.user,
      'Update Payment',
      `Updated payment #${payment._id.toString().slice(-6).toUpperCase()} for ${payment.tenantId?.name || 'tenant'} from ${prevStatus || 'pending'} to ${payment.status}`,
      'payment',
      'success'
    );

    const updated = await Payment.findById(payment._id)
      .populate('tenantId', 'name email phone')
      .populate({
        path: 'unitId',
        select: 'unitNumber propertyId',
        populate: { path: 'propertyId', select: 'name' }
      });

    res.json({
      ...updated.toObject(),
      property: updated.unitId?.propertyId?.name || 'Property',
      receiptEmailSent,
      receiptEmailReason
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update payment' });
  }
};

router.put('/:id', protect, updatePaymentHandler);
router.patch('/:id', protect, updatePaymentHandler);

// @desc    Delete payment / invoice record
// @route   DELETE /api/payments/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    await payment.deleteOne();
    await logActivity(req.user, 'Delete Payment', `Deleted payment record #${req.params.id.slice(-6).toUpperCase()}`, 'payment', 'info');
    res.json({ message: 'Payment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete payment' });
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
            const result = await sendReceiptEmail(req.params.id);
            if (!result || !result.emailSent) {
                return res.status(422).json({
                    message: result?.reason || 'Receipt email could not be sent via Brevo.',
                    emailSent: false
                });
            }
            res.json({ message: 'Receipt email sent successfully via Brevo', emailSent: true });
        } catch (emailError) {
             console.error("Inner Email/PDF Error:", emailError);
             if (emailError.code === 'ETIMEDOUT') {
                 return res.status(422).json({ message: 'Email connection timed out. Check Brevo settings.', error: emailError.message });
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
            .populate('tenantId', 'name email phone')
            .populate('unitId', 'unitNumber propertyId');

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const settings = await getUserBusinessProfile(req.user);
        const propertyName = await getPropertyNameForPayment(payment);
        const pdfBuffer = await generateReceiptPDF(payment, settings, propertyName);

        const businessName = settings?.companyName || settings?.orgName || propertyName || settings?.landlordName || 'Property Management';
        const ref = payment.reference || payment._id.toString().substring(0, 8).toUpperCase();
        const filename = `Receipt-${businessName.replace(/\s+/g, '_')}-${ref}.pdf`;
        const disposition = req.query.download === '1' ? 'attachment' : 'inline';

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `${disposition}; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
});

// @desc    Generate & Download Rental Invoice PDF
// @route   POST /api/payments/invoice-pdf
// @access  Private
router.post('/invoice-pdf', protect, async (req, res) => {
    try {
        const {
            invoiceNumber,
            invoiceId,
            tenantId,
            tenantName,
            email,
            phone,
            propertyName,
            unitNumber,
            dueDate,
            issuedAt,
            amount,
            items,
            vatRate = 0,
            notes
        } = req.body || {};

        let tenant = null;
        if (tenantId && require('mongoose').Types.ObjectId.isValid(tenantId)) {
            tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId');
        }
        if (!tenant && tenantName) {
            tenant = await Tenant.findOne({ name: new RegExp('^' + String(tenantName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), user: req.user.id }).populate('unitId');
        }

        const settings = await getUserBusinessProfile(req.user);
        const invNum = invoiceNumber || invoiceId || `INV-${Date.now().toString().slice(-6)}`;
        const resolvedName = tenant?.name || tenantName || 'Valued Tenant';
        const resolvedEmail = tenant?.email || email || '';
        const resolvedPhone = tenant?.phone || phone || '';
        const uNum = unitNumber || tenant?.unitId?.unitNumber || '';
        const pName = propertyName || settings?.orgName || 'Property Management';

        const numericAmt = Number(amount || 0);
        const rate = Number(vatRate || 0);
        const taxAmt = rate > 0 ? Math.round((numericAmt * rate) / (100 + rate)) : 0;
        const subtotalAmt = numericAmt - taxAmt;

        const normalizedItems = Array.isArray(items) && items.length > 0
            ? items.map(it => ({
                description: it.description || it.itemName || 'Monthly Rent & Utilities',
                taxRate: Number(it.taxRate ?? rate),
                taxAmount: Number(it.taxAmount ?? 0),
                totalAmount: Number(it.totalAmount ?? it.amount ?? 0)
            }))
            : [{
                description: `${pName}${uNum ? ` - Unit ${uNum}` : ''} (${notes || 'Rent & Utility Invoice'})`,
                taxRate: rate,
                taxAmount: taxAmt,
                totalAmount: numericAmt
            }];

        const invoiceObj = {
            invoiceCategory: 'rental',
            propertyName: propertyName || '',
            invoiceNumber: invNum,
            issuedAt: issuedAt || new Date(),
            createdAt: issuedAt || new Date(),
            dueDate: dueDate || new Date(),
            customerName: resolvedName,
            customerEmail: resolvedEmail,
            customerPhone: resolvedPhone,
            items: normalizedItems,
            subtotal: subtotalAmt,
            vatRate: rate,
            taxAmount: taxAmt,
            totalAmount: numericAmt
        };

        const pdfBuffer = await generateInvoicePDF(invoiceObj, settings);
        const filename = `Invoice-${invNum.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Invoice PDF Error:", error);
        res.status(500).json({ message: error.message || 'Failed to generate invoice PDF' });
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

        const settings = await getUserBusinessProfile(req.user);
        const resolvedPropName = propertyName || (tenant?.unitId?.propertyId ? (await Property.findById(tenant.unitId.propertyId).select('name').lean())?.name : '') || '';
        const businessName = settings?.companyName || settings?.orgName || resolvedPropName || settings?.landlordName || 'Property Management';
        const uNum = unitNumber || tenant?.unitId?.unitNumber || tenant?.unit || 'assigned unit';
        const invRef = invoiceId || `INV-${Date.now().toString().slice(-6)}`;
        const totalAmt = Number(amount || 0).toLocaleString();
        const cleanDueDate = dueDate || new Date().toISOString().split('T')[0];

        let emailSent = false;
        let smsSent = false;
        let emailError = null;
        let smsError = null;

        // 1. Corporate Email Dispatch via Brevo with Official PDF Attachment
        if (recipientEmail && recipientEmail.includes('@') && !recipientEmail.endsWith('@makaziflow.com')) {
            try {
                const emailContent = `
                    <div style="font-size: 15px; color: #334155; line-height: 1.6;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                            Dear ${recipientName},
                        </p>
                        <p style="margin: 0 0 16px 0;">
                            An official invoice has been issued for <strong>Unit ${uNum}</strong> at <strong>${businessName}</strong>. Your PDF invoice is attached for your records.
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

                const numericAmount = Number(amount || 0);
                const pdfBuffer = await generateInvoicePDF({
                    invoiceCategory: 'rental',
                    propertyName: resolvedPropName,
                    invoiceNumber: invRef,
                    issuedAt: new Date(),
                    createdAt: new Date(),
                    dueDate: cleanDueDate,
                    customerName: recipientName,
                    customerEmail: recipientEmail,
                    customerPhone: recipientPhone || '',
                    items: [{
                        description: `${businessName} - Unit ${uNum}${notes ? ` (${notes})` : ' (Rent & Utilities)'}`,
                        taxRate: 0,
                        taxAmount: 0,
                        totalAmount: numericAmount
                    }],
                    subtotal: numericAmount,
                    vatRate: 0,
                    taxAmount: 0,
                    totalAmount: numericAmount
                }, settings);

                await sendEmail({
                    email: recipientEmail,
                    toName: recipientName,
                    fromName: businessName,
                    replyToEmail: settings?.orgEmail || undefined,
                    subject: `Invoice #${invRef} - KES ${totalAmt} Due - ${businessName}`,
                    message: getEmailTemplate(`Invoice #${invRef}`, emailContent, settings, { propertyName: resolvedPropName }),
                    attachments: [
                        {
                            filename: `Invoice-${invRef.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                });
                emailSent = true;
                console.log(`📧 Invoice #${invRef} emailed with PDF to ${recipientEmail}`);
            } catch (err) {
                emailError = err.message || 'Brevo invoice email delivery failed';
                console.error(`❌ Failed to email invoice to ${recipientEmail}:`, emailError);
            }
        } else {
            emailError = `Tenant "${recipientName}" has no valid email address`;
        }

        // 2. Instant SMS Dispatch (best-effort if phone configured)
        if (recipientPhone) {
            try {
                const smsMsg = `Invoice #${invRef}: KES ${totalAmt} due on ${cleanDueDate} for Unit ${uNum} (${businessName}). Please remit payment on time. Thank you.`;
                await sendSMS({ phone: recipientPhone, message: smsMsg });
                smsSent = true;
                console.log(`📱 Instant SMS invoice dispatched to ${recipientPhone}`);
            } catch (smsErr) {
                smsError = smsErr.message || 'SMS delivery failed';
                console.error(`❌ Failed to send SMS invoice to ${recipientPhone}:`, smsError);
            }
        }

        await logActivity(
            req.user,
            'Send Invoice',
            `Dispatched invoice #${invRef} of KES ${totalAmt} to ${recipientName} (Email: ${emailSent ? 'Yes' : 'No'}, SMS: ${smsSent ? 'Yes' : 'No'})`,
            'invoice',
            emailSent || smsSent ? 'success' : 'error'
        );

        if (!emailSent && !smsSent) {
            return res.status(422).json({
                success: false,
                emailSent: false,
                smsSent: false,
                emailError,
                smsError,
                recipientName,
                invRef,
                message: emailError || smsError || `Could not deliver invoice to ${recipientName}.`
            });
        }

        res.json({ success: true, emailSent, smsSent, emailError, smsError, recipientName, invRef });
    } catch (error) {
        console.error("Invoice Dispatch Error:", error);
        res.status(500).json({ message: error.message || 'Failed to dispatch invoice' });
    }
});

module.exports = router;
