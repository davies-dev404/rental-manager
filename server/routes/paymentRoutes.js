const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectId, isValidObjectId, escapeRegExp } = require('../middleware/securityMiddleware');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');
const { generateInvoicePDF } = require('../utils/generateInvoicePDF');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');
const { getReceiptEmailBody, getInvoiceEmailBody } = require('../utils/emailTemplates');
const {
  classifyTextPurpose,
  normalizeCategoryTag,
  resolvePaymentPurpose,
  resolveInvoicePurposeLabel
} = require('../utils/shaPdfHelpers');

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
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
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
    let sAmt = Number(req.body.serviceChargeAmount || 0);
    let pAmt = Number(req.body.penaltyAmount || 0);
    let dAutoAmt = dAmt;

    // Calculate total utility amount from utilities breakdown if provided
    let uList = Array.isArray(utilities) ? utilities : [];
    let uAmt = Number(utilityAmount || 0);
    if (uList.length > 0 && uAmt === 0) {
        uAmt = uList.reduce((acc, u) => acc + Number(u.amount || 0), 0);
    }

    const rawTypeStr = String(req.body.type || '').trim();
    const rawCatStr = String(req.body.category || '').trim().toLowerCase();
    const rawNotesStr = String(req.body.notes || req.body.description || '').trim();
    const detectedPurpose = classifyTextPurpose(`${rawTypeStr} ${rawNotesStr}`);
    const explicitNonRentType = rawTypeStr && !/^(rent|rental payment|combined)$/i.test(rawTypeStr);

    const isExplicitMaint = rawCatStr === 'maintenance' || detectedPurpose === 'Maintenance';
    const isExplicitUtil = ['water', 'electricity', 'utilities', 'garbage', 'sewer', 'gas'].includes(rawCatStr) || detectedPurpose === 'Utilities';
    const isExplicitDeposit = rawCatStr === 'deposit' || detectedPurpose === 'Security Deposit';
    const isExplicitSvc = rawCatStr === 'service_charge' || detectedPurpose === 'Service Charge';
    const isExplicitPenalty = rawCatStr === 'penalty' || detectedPurpose === 'Late Payment Penalty';

    // Never allow a single-purpose Maintenance/Utilities/Penalty/Deposit/Service Charge invoice
    // to be mislabeled as Rent via rentAmount
    if (isExplicitMaint && uAmt === 0 && dAutoAmt === 0 && sAmt === 0 && pAmt === 0) {
        rAmt = 0;
    }

    // Allocate generic amount cleanly without mislabeling Maintenance/Utilities/Penalty invoices as Rent
    if (amount !== undefined && amount !== null && Number(amount) > 0 && rAmt === 0 && dAutoAmt === 0 && uAmt === 0 && sAmt === 0 && pAmt === 0) {
        const amtNum = Number(amount);
        if (isExplicitMaint) {
            // Maintenance / repair stays out of rentAmount so receipts/invoices say Maintenance
        } else if (isExplicitUtil) {
            uAmt = amtNum;
        } else if (isExplicitDeposit) {
            dAutoAmt = amtNum;
        } else if (isExplicitSvc) {
            sAmt = amtNum;
        } else if (isExplicitPenalty) {
            pAmt = amtNum;
        } else if (!explicitNonRentType && (rentAmount === undefined || Number(rentAmount) === 0)) {
            rAmt = amtNum;
        }
    }

    const totalAmount = (amount && Number(amount) > 0) ? Number(amount) : (rAmt + dAutoAmt + uAmt + sAmt + pAmt);

    const normalizedStatus = (status || 'paid').toLowerCase();
    const isUnpaid = ['pending', 'unpaid', 'overdue', 'open', 'draft'].includes(normalizedStatus);

    if (totalAmount <= 0 && !isUnpaid) {
        return res.status(400).json({ message: "No payment amount provided" });
    }

    let paymentType = rawTypeStr || (detectedPurpose || 'Rent');
    const components = [];
    if (rAmt > 0) components.push('Rent');
    if (dAutoAmt > 0) components.push('Deposit');
    if (uAmt > 0) components.push('Utilities');
    if (sAmt > 0) components.push('Service Charge');
    if (pAmt > 0) components.push('Late Payment Penalty');
    if (components.length > 1) paymentType = 'Combined';
    else if (isExplicitMaint && (!rawTypeStr || /^rent$/i.test(rawTypeStr))) paymentType = 'Maintenance';
    else if (isExplicitUtil && (!rawTypeStr || /^rent$/i.test(rawTypeStr))) paymentType = 'Utilities';
    else if (components.length === 1 && !explicitNonRentType) paymentType = components[0];

    let paymentCategory = rawCatStr || '';
    if (!paymentCategory || (paymentCategory === 'rent' && (isExplicitMaint || isExplicitUtil || isExplicitDeposit || isExplicitSvc || isExplicitPenalty))) {
        if (components.length > 1) paymentCategory = 'combined';
        else if (isExplicitMaint) paymentCategory = 'maintenance';
        else if (uAmt > 0 || isExplicitUtil) paymentCategory = 'utilities';
        else if (sAmt > 0 || isExplicitSvc) paymentCategory = 'service_charge';
        else if (pAmt > 0 || isExplicitPenalty) paymentCategory = 'penalty';
        else if (dAutoAmt > 0 || isExplicitDeposit) paymentCategory = 'deposit';
        else if (explicitNonRentType) paymentCategory = 'other';
        else paymentCategory = 'rent';
    }

    let tenant = null;

    if (tenantId && isValidObjectId(String(tenantId))) {
        tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id });
    }
    
    if (!tenant && tenantName) {
        tenant = await Tenant.findOne({ name: new RegExp('^' + escapeRegExp(String(tenantName).trim()) + '$', 'i'), user: req.user.id });
    }

    if (!tenant && unitNumber) {
        const matchingUnit = await Unit.findOne({ unitNumber: new RegExp('^' + escapeRegExp(String(unitNumber).trim()) + '$', 'i'), user: req.user.id });
        if (matchingUnit) {
            tenant = await Tenant.findOne({ unitId: matchingUnit._id, user: req.user.id });
        }
    }
    
    if (!tenant) {
        return res.status(404).json({ message: "Tenant not found for this payment" });
    }

    let finalUnitId = tenant.unitId;
    if (!finalUnitId && reqUnitId && isValidObjectId(String(reqUnitId))) {
        const ownedUnit = await Unit.findOne({ _id: reqUnitId, user: req.user.id }).select('_id');
        if (!ownedUnit) {
            return res.status(403).json({ message: 'Unit does not belong to your organization' });
        }
        finalUnitId = ownedUnit._id;
    }
    const paymentDate = date ? new Date(date) : new Date();
    const defaultMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

    const payment = await Payment.create({
        tenantId: tenant._id,
        unitId: finalUnitId,
        invoiceId: req.body.invoiceId && isValidObjectId(String(req.body.invoiceId)) ? req.body.invoiceId : undefined,
        invoiceNumber: req.body.invoiceNumber ? String(req.body.invoiceNumber).trim() : '',
        amount: totalAmount,
        rentAmount: rAmt,
        depositAmount: dAutoAmt,
        utilityAmount: uAmt,
        serviceChargeAmount: sAmt,
        penaltyAmount: pAmt,
        utilities: uList,
        date: paymentDate,
        method: method || 'cash',
        status: status || 'paid',
        monthCovered: monthCovered || defaultMonth,
        type: paymentType,
        category: paymentCategory,
        reference: reference || req.body.transactionId || undefined,
        notes: req.body.notes || req.body.description || undefined,
        paidAt: isUnpaid ? undefined : new Date(),
        user: req.user.id
    });

    const breakdownText = [
        rAmt > 0 ? `Rent: ${rAmt}` : null,
        uAmt > 0 ? `Utilities: ${uAmt}` : null,
        dAutoAmt > 0 ? `Deposit: ${dAutoAmt}` : null,
        sAmt > 0 ? `Service Charge: ${sAmt}` : null,
        pAmt > 0 ? `Penalty: ${pAmt}` : null
    ].filter(Boolean).join(', ');

    await logActivity(
        req.user,
        'Record Payment',
        `Recorded ${paymentType} payment (${(status || 'paid').toUpperCase()}) of KES ${totalAmount} for ${tenant.name} (${breakdownText || 'Total: ' + totalAmount})`,
        'payment',
        isUnpaid ? 'warning' : 'success'
    );

    // Update Tenant nextPaymentDate if provided (scoped to req.user.id)
    if (nextPaymentDate && tenant?._id) {
        await Tenant.findOneAndUpdate({ _id: tenant._id, user: req.user.id }, { nextPaymentDate });
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

    if (payment.paymentTransactionId) {
      return res.status(403).json({
        message: 'Verified gateway-settled payments are immutable and cannot be edited directly.'
      });
    }

    const prevStatus = String(payment.status || '').toLowerCase();
    const { status, method, reference, transactionId, date, amount, notes, sendReceipt, invoiceNumber, fromInvoice, type, category } = req.body || {};

    if (status !== undefined) {
      const normalized = String(status).trim().toLowerCase();
      payment.status = normalized === 'confirmed' ? 'paid' : normalized;
    }
    if (method !== undefined && method !== '') payment.method = method;
    if (type !== undefined && String(type).trim()) payment.type = String(type).trim();
    if (category !== undefined && String(category).trim()) {
      const normCat = String(category).trim().toLowerCase();
      const allowedCats = ['rent', 'water', 'electricity', 'utilities', 'maintenance', 'service_charge', 'penalty', 'deposit', 'other', 'combined'];
      if (allowedCats.includes(normCat)) {
        payment.category = normCat;
        const amtForBucket = Number(amount !== undefined ? amount : payment.amount || 0);
        if (normCat === 'maintenance' || normCat === 'other') {
          payment.rentAmount = 0;
          payment.utilityAmount = 0;
          payment.serviceChargeAmount = 0;
          payment.penaltyAmount = 0;
          payment.depositAmount = 0;
          if (!type || /^rent$/i.test(String(payment.type || ''))) {
            payment.type = normCat === 'maintenance' ? 'Maintenance' : (payment.type || 'Other');
          }
        } else if (['utilities', 'water', 'electricity'].includes(normCat)) {
          payment.rentAmount = 0;
          payment.utilityAmount = amtForBucket;
          payment.serviceChargeAmount = 0;
          payment.penaltyAmount = 0;
          payment.depositAmount = 0;
          if (!type || /^rent$/i.test(String(payment.type || ''))) payment.type = 'Utilities';
        } else if (normCat === 'service_charge') {
          payment.rentAmount = 0;
          payment.utilityAmount = 0;
          payment.serviceChargeAmount = amtForBucket;
          payment.penaltyAmount = 0;
          payment.depositAmount = 0;
          if (!type || /^rent$/i.test(String(payment.type || ''))) payment.type = 'Service Charge';
        } else if (normCat === 'penalty') {
          payment.rentAmount = 0;
          payment.utilityAmount = 0;
          payment.serviceChargeAmount = 0;
          payment.penaltyAmount = amtForBucket;
          payment.depositAmount = 0;
          if (!type || /^rent$/i.test(String(payment.type || ''))) payment.type = 'Late Payment Penalty';
        } else if (normCat === 'deposit') {
          payment.rentAmount = 0;
          payment.utilityAmount = 0;
          payment.serviceChargeAmount = 0;
          payment.penaltyAmount = 0;
          payment.depositAmount = amtForBucket;
          if (!type || /^rent$/i.test(String(payment.type || ''))) payment.type = 'Security Deposit';
        } else if (normCat === 'rent') {
          payment.rentAmount = amtForBucket;
          payment.utilityAmount = 0;
          payment.serviceChargeAmount = 0;
          payment.penaltyAmount = 0;
          payment.depositAmount = 0;
          if (!type) payment.type = 'Rent';
        }
      }
    }
    if (reference !== undefined) payment.reference = reference;
    else if (transactionId !== undefined) payment.reference = transactionId;
    if (invoiceNumber !== undefined && String(invoiceNumber).trim()) {
      payment.invoiceNumber = String(invoiceNumber).trim();
    } else if (fromInvoice && !payment.invoiceNumber) {
      payment.invoiceNumber = `INV-${payment._id.toString().slice(-6).toUpperCase()}`;
    }
    if (date !== undefined && date) payment.date = new Date(date);
    if (notes !== undefined) payment.notes = notes;
    if (amount !== undefined) {
      const parsedAmt = Number(amount);
      if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
        return res.status(400).json({ message: 'Payment amount must be a positive number' });
      }
      payment.amount = parsedAmt;
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

router.put('/:id', protect, admin, validateObjectId('id'), updatePaymentHandler);
router.patch('/:id', protect, admin, validateObjectId('id'), updatePaymentHandler);

// @desc    Delete payment / invoice record
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
router.delete('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.paymentTransactionId) {
      return res.status(403).json({
        message: 'Verified gateway-settled payments cannot be deleted directly.'
      });
    }
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
router.post('/:id/email', protect, validateObjectId('id'), async (req, res) => {
    try {
        // Verify ownership first
        const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        try {
            const result = await sendReceiptEmail(req.params.id);
            if (!result || !result.emailSent) {
                return res.status(422).json({
                    message: result?.reason || 'Receipt could not be sent via Email.',
                    emailSent: false
                });
            }
            res.json({ message: 'Receipt sent via Email', emailSent: true });
        } catch (emailError) {
             console.error("Inner Email/PDF Error:", emailError);
             if (emailError.code === 'ETIMEDOUT') {
                 return res.status(422).json({ message: 'Email connection timed out. Check email configuration.', error: emailError.message });
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
router.get('/:id/pdf', protect, validateObjectId('id'), async (req, res) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
            .populate('tenantId', 'name email phone accountNumber')
            .populate('unitId', 'unitNumber propertyId')
            .populate('invoiceId', 'invoiceNumber billingPeriod items notes');

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
            paymentId,
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
            notes,
            type,
            invoiceType,
            category
        } = req.body || {};

        let dbPayment = null;
        const lookupPayId = paymentId || (invoiceId && isValidObjectId(String(invoiceId)) ? invoiceId : null);
        if (lookupPayId && isValidObjectId(String(lookupPayId))) {
            dbPayment = await Payment.findOne({ _id: lookupPayId, user: req.user.id })
                .populate('tenantId', 'name email phone accountNumber')
                .populate('unitId', 'unitNumber propertyId')
                .populate('invoiceId', 'invoiceNumber billingPeriod items notes');
        }

        let tenant = dbPayment?.tenantId || null;
        if (!tenant && tenantId && require('mongoose').Types.ObjectId.isValid(tenantId)) {
            tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId');
        }
        if (!tenant && tenantName) {
            tenant = await Tenant.findOne({ name: new RegExp('^' + String(tenantName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), user: req.user.id }).populate('unitId');
        }

        const settings = await getUserBusinessProfile(req.user);
        const invNum = invoiceNumber || dbPayment?.invoiceNumber || (invoiceId && !isValidObjectId(String(invoiceId)) ? invoiceId : '') || `INV-${String(dbPayment?._id || Date.now()).slice(-6).toUpperCase()}`;
        const resolvedName = tenant?.name || tenantName || 'Valued Tenant';
        const resolvedEmail = tenant?.email || email || '';
        const resolvedPhone = tenant?.phone || phone || '';
        const uNum = unitNumber || dbPayment?.unitId?.unitNumber || tenant?.unitId?.unitNumber || '';

        const numericAmt = Number(amount !== undefined && amount !== null ? amount : (dbPayment?.amount || 0));
        const rate = Number(vatRate || 0);
        const taxAmt = rate > 0 ? Math.round((numericAmt * rate) / (100 + rate)) : 0;
        const subtotalAmt = numericAmt - taxAmt;

        // Smartly differentiate Rent vs Maintenance vs Utilities vs Penalty/Deposit/Service Charge
        const mergedNotes = String(notes || dbPayment?.notes || '').trim();
        const mergedType = String(type || invoiceType || dbPayment?.type || '').trim();
        const mergedCategory = String(category || dbPayment?.category || '').trim().toLowerCase();

        const resolvedPurpose = dbPayment
            ? resolvePaymentPurpose({
                ...(typeof dbPayment.toObject === 'function' ? dbPayment.toObject() : dbPayment),
                ...(category ? { category: mergedCategory } : {}),
                ...(type || invoiceType ? { type: mergedType } : {}),
                ...(notes ? { notes: mergedNotes } : {}),
                unitNumber: uNum
              })
            : resolvePaymentPurpose({
                amount: numericAmt,
                type: mergedType,
                category: mergedCategory,
                notes: mergedNotes,
                unitNumber: uNum
              });

        const categoryTagForItem = (tag = '') => {
            const t = String(tag || '').toLowerCase();
            if (t.includes('maint')) return 'maintenance';
            if (t.includes('util')) return 'utilities';
            if (t.includes('service')) return 'service_charge';
            if (t.includes('penalt')) return 'penalty';
            if (t.includes('deposit')) return 'deposit';
            if (t.includes('rent')) return 'rent';
            return mergedCategory || undefined;
        };

        const normalizedItems = Array.isArray(items) && items.length > 0
            ? items.map(it => ({
                description: it.description || it.itemName || resolvedPurpose.purposeText,
                category: it.category || categoryTagForItem(classifyTextPurpose(`${it.description || ''} ${it.itemName || ''}`) || resolvedPurpose.purposeText),
                taxRate: Number(it.taxRate ?? rate),
                taxAmount: Number(it.taxAmount ?? 0),
                totalAmount: Number(it.totalAmount ?? it.amount ?? 0)
            }))
            : resolvedPurpose.lineItems.map((li) => {
                const lineAmt = Number(li.amt || numericAmt);
                const lineTax = rate > 0 ? Math.round((lineAmt * rate) / (100 + rate)) : 0;
                return {
                    description: li.desc,
                    category: categoryTagForItem(li.categoryLabel || resolvedPurpose.purposeText),
                    taxRate: rate,
                    taxAmount: lineTax,
                    totalAmount: lineAmt
                };
            });

        const invoiceObj = {
            invoiceCategory: 'rental',
            category: categoryTagForItem(resolvedPurpose.purposeText) || mergedCategory || 'rent',
            invoiceType: resolvedPurpose.purposeText || mergedType,
            notes: mergedNotes,
            propertyName: propertyName || '',
            unitNumber: uNum,
            accountNumber: tenant?.accountNumber || '',
            invoiceNumber: invNum,
            issuedAt: issuedAt || new Date(),
            createdAt: issuedAt || new Date(),
            dueDate: dueDate || dbPayment?.date || new Date(),
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
        const { paymentId, tenantId, invoiceId, amount, dueDate, notes, invoiceType, category, invoiceItems, propertyName, unitNumber, tenantName: fallbackName, email: fallbackEmail, phone: fallbackPhone } = req.body;
        
        let dbPayment = null;
        const lookupPayId = paymentId || (invoiceId && isValidObjectId(String(invoiceId)) ? invoiceId : null);
        if (lookupPayId && isValidObjectId(String(lookupPayId))) {
            dbPayment = await Payment.findOne({ _id: lookupPayId, user: req.user.id })
                .populate('tenantId', 'name email phone accountNumber')
                .populate('unitId', 'unitNumber propertyId')
                .populate('invoiceId', 'invoiceNumber billingPeriod items notes');
        }

        let tenant = dbPayment?.tenantId || null;
        if (!tenant && tenantId && isValidObjectId(String(tenantId))) {
            tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId');
        }
        if (!tenant && fallbackName) {
            tenant = await Tenant.findOne({ name: new RegExp('^' + escapeRegExp(String(fallbackName).trim()) + '$', 'i'), user: req.user.id }).populate('unitId');
        }

        const recipientName = tenant?.name || fallbackName || 'Valued Tenant';
        const recipientEmail = tenant?.email || fallbackEmail;
        const recipientPhone = tenant?.phone || fallbackPhone;

        const settings = await getUserBusinessProfile(req.user);
        const resolvedPropName = propertyName || (tenant?.unitId?.propertyId ? (await Property.findById(tenant.unitId.propertyId).select('name').lean())?.name : '') || '';
        const businessName = settings?.companyName || settings?.orgName || resolvedPropName || settings?.landlordName || 'Property Management';
        const uNum = unitNumber || dbPayment?.unitId?.unitNumber || tenant?.unitId?.unitNumber || tenant?.unit || 'assigned unit';
        const invRef = (invoiceId && !isValidObjectId(String(invoiceId)) ? invoiceId : '') || dbPayment?.invoiceNumber || `INV-${String(dbPayment?._id || Date.now()).slice(-6).toUpperCase()}`;
        const totalAmt = Number(amount !== undefined && amount !== null ? amount : (dbPayment?.amount || 0)).toLocaleString();
        const cleanDueDate = dueDate || new Date().toISOString().split('T')[0];

        const mergedNotes = String(notes || dbPayment?.notes || '').trim();
        const mergedType = String(invoiceType || dbPayment?.type || '').trim();
        const mergedCategory = String(category || dbPayment?.category || '').trim().toLowerCase();
        const resolvedPurpose = dbPayment
            ? resolvePaymentPurpose({
                ...(typeof dbPayment.toObject === 'function' ? dbPayment.toObject() : dbPayment),
                ...(category ? { category: mergedCategory } : {}),
                ...(invoiceType ? { type: mergedType } : {}),
                ...(notes ? { notes: mergedNotes } : {}),
                unitNumber: uNum
              })
            : resolvePaymentPurpose({
                amount: Number(amount || 0),
                type: mergedType,
                category: mergedCategory,
                notes: mergedNotes,
                unitNumber: uNum
              });

        const categoryTagForItem = (tag = '') => {
            const t = String(tag || '').toLowerCase();
            if (t.includes('maint')) return 'maintenance';
            if (t.includes('util')) return 'utilities';
            if (t.includes('service')) return 'service_charge';
            if (t.includes('penalt')) return 'penalty';
            if (t.includes('deposit')) return 'deposit';
            if (t.includes('rent')) return 'rent';
            return mergedCategory || undefined;
        };

        let emailSent = false;
        let smsSent = false;
        let emailError = null;
        let smsError = null;

        // 1. Email Dispatch with Official PDF Attachment (SHA Layout in MakaziFlow Colors)
        if (recipientEmail && recipientEmail.includes('@') && !recipientEmail.endsWith('@makaziflow.com')) {
            try {
                const numericAmount = Number(amount !== undefined && amount !== null ? amount : (dbPayment?.amount || 0));
                const resolvedItemList = Array.isArray(invoiceItems) && invoiceItems.length > 0
                    ? invoiceItems.map((it) => ({
                        description: it.description || it.name || resolvedPurpose.purposeText,
                        category: it.category || categoryTagForItem(classifyTextPurpose(`${it.description || ''} ${it.name || ''}`) || resolvedPurpose.purposeText),
                        taxRate: Number(it.taxRate || 0),
                        taxAmount: Number(it.taxAmount || 0),
                        totalAmount: Number(it.totalAmount ?? it.amount ?? 0)
                      }))
                    : resolvedPurpose.lineItems.map((li) => ({
                        description: li.desc,
                        category: categoryTagForItem(li.categoryLabel || resolvedPurpose.purposeText),
                        taxRate: 0,
                        taxAmount: 0,
                        totalAmount: Number(li.amt || numericAmount)
                      }));

                const invoiceObj = {
                    invoiceCategory: 'rental',
                    category: categoryTagForItem(resolvedPurpose.purposeText) || mergedCategory || 'rent',
                    invoiceType: resolvedPurpose.purposeText || mergedType,
                    notes: mergedNotes,
                    propertyName: resolvedPropName,
                    unitNumber: uNum,
                    accountNumber: tenant?.accountNumber || '',
                    invoiceNumber: invRef,
                    issuedAt: new Date(),
                    createdAt: new Date(),
                    dueDate: cleanDueDate,
                    customerName: recipientName,
                    customerEmail: recipientEmail,
                    customerPhone: recipientPhone || '',
                    items: resolvedItemList,
                    subtotal: numericAmount,
                    vatRate: 0,
                    taxAmount: 0,
                    totalAmount: numericAmount
                };

                const purposeText = resolveInvoicePurposeLabel(invoiceObj);
                const pdfBuffer = await generateInvoicePDF(invoiceObj, settings);
                const shaInvoiceHtml = getInvoiceEmailBody(invoiceObj, settings);

                await sendEmail({
                    email: recipientEmail,
                    toName: recipientName,
                    fromName: businessName,
                    replyToEmail: settings?.orgEmail || undefined,
                    subject: `Invoice #${invRef} (${purposeText}) - KES ${totalAmt} Due - ${businessName}`,
                    message: shaInvoiceHtml,
                    commMeta: {
                        category: 'invoice',
                        userId: req.user.id,
                        tenantId: tenant?._id || undefined,
                        propertyId: tenant?.unitId?.propertyId?._id || tenant?.unitId?.propertyId || undefined,
                        propertyName: resolvedPropName || '',
                        unitNumber: uNum || '',
                        recipientName,
                        recipientType: 'tenant',
                        previewText: `Invoice #${invRef} (${purposeText}) for KES ${totalAmt} due ${cleanDueDate} (${resolvedPropName || 'Property'} Unit ${uNum}).`
                    },
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
                emailError = err.message || 'Invoice email delivery failed';
                console.error(`❌ Failed to email invoice to ${recipientEmail}:`, emailError);
            }
        } else {
            emailError = `Tenant "${recipientName}" has no valid email address`;
        }

        // 2. Instant SMS Dispatch (best-effort if phone configured)
        if (recipientPhone) {
            try {
                const smsPurpose = resolveInvoicePurposeLabel({
                    invoiceType: invoiceType || notes || '',
                    notes: notes || '',
                    items: Array.isArray(invoiceItems) ? invoiceItems : []
                });
                const smsMsg = `Invoice #${invRef} (${smsPurpose}): KES ${totalAmt} due on ${cleanDueDate} for Unit ${uNum} (${businessName}). Please remit payment on time. Thank you.`;
                await sendSMS({
                    phone: recipientPhone,
                    message: smsMsg,
                    commMeta: {
                        category: 'invoice',
                        userId: req.user.id,
                        tenantId: tenant?._id || undefined,
                        propertyId: tenant?.unitId?.propertyId?._id || tenant?.unitId?.propertyId || undefined,
                        propertyName: resolvedPropName || '',
                        unitNumber: uNum || '',
                        recipientName,
                        recipientType: 'tenant',
                        title: `Invoice #${invRef} SMS`
                    }
                });
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
