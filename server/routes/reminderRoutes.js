const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const CommunicationLog = require('../models/CommunicationLog');
const PaymentReceipt = require('../models/PaymentReceipt');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');
const { validateObjectId, isValidObjectId } = require('../middleware/securityMiddleware');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');
const { getCorporateReminderEmailBody, getEmailTemplate } = require('../utils/emailTemplates');
const { getUserBusinessProfile } = require('../utils/getUserBusinessProfile');
const { createAndSendEmailCampaign } = require('../utils/brevoService');

// Get all project communications unified for the landlord (Reminders + Project Emails/SMS + Receipts)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const [reminders, commLogs, emailedReceipts] = await Promise.all([
      Reminder.find({ user: userId })
        .populate({
          path: 'tenantId',
          select: 'name email phone unitId',
          populate: {
            path: 'unitId',
            select: 'unitNumber propertyId',
            populate: { path: 'propertyId', select: 'name' }
          }
        })
        .sort({ createdAt: -1 })
        .limit(300)
        .lean(),
      CommunicationLog.find({ user: userId })
        .populate('propertyId', 'name')
        .populate({
          path: 'tenantId',
          select: 'name email phone unitId',
          populate: {
            path: 'unitId',
            select: 'unitNumber propertyId',
            populate: { path: 'propertyId', select: 'name' }
          }
        })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      PaymentReceipt.find({ landlordId: userId, emailedTo: { $nin: ['', null] } })
        .populate({
          path: 'tenantId',
          select: 'name email phone unitId',
          populate: {
            path: 'unitId',
            select: 'unitNumber propertyId',
            populate: { path: 'propertyId', select: 'name' }
          }
        })
        .sort({ issuedAt: -1 })
        .limit(200)
        .lean()
    ]);

    const normalizedReminders = reminders.map((r) => {
      const propObj = r.tenantId?.unitId?.propertyId;
      return {
        ...r,
        source: 'reminder',
        recipientType: r.tenantId ? 'tenant' : 'tenant',
        propertyId: propObj?._id ? String(propObj._id) : (typeof propObj === 'string' ? propObj : ''),
        propertyName: propObj?.name || '',
        unitNumber: r.tenantId?.unitId?.unitNumber || '',
        charge: r.method === 'sms' ? 0.80 : 0,
        canResend: true
      };
    });

    const normalizedLogs = commLogs.map((l) => {
      const propObj = l.propertyId || l.tenantId?.unitId?.propertyId;
      const propId = propObj?._id ? String(propObj._id) : (typeof propObj === 'string' ? propObj : '');
      const propName = l.propertyName || propObj?.name || '';
      const unitNum = l.unitNumber || l.tenantId?.unitId?.unitNumber || '';
      return {
        _id: l._id,
        source: 'communication_log',
        title: l.title,
        description: l.message,
        type: l.category || l.type,
        method: l.type,
        recipientType: l.recipientType || (l.tenantId ? 'tenant' : 'team'),
        tenantId: l.tenantId || null,
        recipientName: l.recipientName || l.tenantId?.name || l.recipientEmail || l.recipientPhone || 'Recipient',
        recipientEmail: l.recipientEmail || l.tenantId?.email || '',
        recipientPhone: l.recipientPhone || l.tenantId?.phone || '',
        propertyId: propId,
        propertyName: propName,
        unitNumber: unitNum,
        status: l.status === 'delivered' ? 'sent' : l.status,
        charge: Number(l.charge || 0),
        errorMessage: l.errorMessage || '',
        canResend: l.category !== 'security',
        createdAt: l.createdAt
      };
    });

    // Include historical emailed receipts that predate CommunicationLog
    const existingReceiptKeys = new Set(
      commLogs
        .filter((l) => l.category === 'receipt')
        .map((l) => `${(l.recipientEmail || '').toLowerCase()}|${new Date(l.createdAt).toISOString().slice(0, 10)}|${(l.title || '').toLowerCase()}`)
    );

    const legacyReceipts = emailedReceipts
      .filter((rct) => {
        const key = `${(rct.emailedTo || '').toLowerCase()}|${new Date(rct.emailedAt || rct.issuedAt).toISOString().slice(0, 10)}`;
        for (const existingKey of existingReceiptKeys) {
          if (existingKey.startsWith(key)) return false;
        }
        return true;
      })
      .map((rct) => {
        const propObj = rct.tenantId?.unitId?.propertyId;
        const propId = propObj?._id ? String(propObj._id) : (typeof propObj === 'string' ? propObj : '');
        const propName = propObj?.name || '';
        const unitNum = rct.tenantId?.unitId?.unitNumber || '';
        const isSub = rct.receiptCategory === 'subscription';
        return {
          _id: rct._id,
          source: 'receipt',
          title: `Receipt #${rct.receiptNumber}`,
          description: `${rct.description || 'Official Payment Receipt'} — KES ${Number(rct.amount || 0).toLocaleString()}`,
          type: 'receipt',
          method: 'email',
          recipientType: isSub ? 'team' : 'tenant',
          tenantId: rct.tenantId || null,
          recipientName: rct.recipientName || rct.tenantId?.name || rct.emailedTo,
          recipientEmail: rct.emailedTo || rct.recipientEmail || '',
          propertyId: propId,
          propertyName: propName,
          unitNumber: unitNum,
          status: 'sent',
          charge: 0,
          canResend: false,
          createdAt: rct.emailedAt || rct.issuedAt
        };
      });

    const unified = [...normalizedReminders, ...normalizedLogs, ...legacyReceipts].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    res.json(unified);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper: Calculate outstanding balances (rent + utilities + unpaid/pending records) for active tenants
async function getTenantsWithBalances(userId) {
  const tenants = await Tenant.find({ user: userId, status: 'active' })
    .populate({
      path: 'unitId',
      select: 'unitNumber rentAmount propertyId',
      populate: { path: 'propertyId', select: 'name' }
    });

  // Current month payment window (inclusive through final day of the month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  const payments = await Payment.find({
    user: userId,
    date: { $gte: startOfMonth, $lt: endOfMonth }
  });

  const paidStatuses = new Set(['paid', 'partial', 'completed', 'confirmed']);
  const unpaidStatuses = new Set(['pending', 'unpaid', 'overdue', 'open']);

  return tenants.map(tenant => {
    const allTenantPayments = payments.filter(
      p => p.tenantId && p.tenantId.toString() === tenant._id.toString()
    );
    const tenantPayments = allTenantPayments.filter(
      p => paidStatuses.has((p.status || '').toLowerCase())
    );
    const unpaidRecorded = allTenantPayments
      .filter(p => unpaidStatuses.has((p.status || '').toLowerCase()))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const rentPaid = tenantPayments.reduce((s, p) => s + (Number(p.rentAmount) || 0), 0);
    const utilityPaid = tenantPayments.reduce((s, p) => s + (Number(p.utilityAmount) || 0), 0);
    const totalPaid = tenantPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const expectedRent = tenant.rentAmount || tenant.unitId?.rentAmount || 0;
    const utilities = Array.isArray(tenant.utilities) ? tenant.utilities : [];
    const expectedUtilities = utilities
      .filter(u => !u.isIncluded)
      .reduce((s, u) => s + (Number(u.amount) || 0), 0);

    const gapTotal = Math.max(0, (expectedRent + expectedUtilities) - totalPaid);
    const totalDue = Math.max(gapTotal, unpaidRecorded);
    const utilityDue = Math.max(0, expectedUtilities - utilityPaid);
    const rentDue = Math.max(Math.max(0, expectedRent - rentPaid), Math.max(0, totalDue - utilityDue));

    return {
      tenant,
      expectedRent,
      expectedUtilities,
      rentPaid,
      utilityPaid,
      totalPaid,
      unpaidRecorded,
      rentDue,
      utilityDue,
      totalDue,
      unpaidUtilities: utilities.filter(u => !u.isIncluded)
    };
  });
}

// Get debtors list (tenants with unpaid rent or utilities)
router.get('/debtors', protect, async (req, res) => {
  try {
    const all = await getTenantsWithBalances(req.user.id);
    const debtors = all.filter(item => item.totalDue > 0);
    res.json(debtors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper: compose personalized message
function generatePersonalizedMessage(tenant, calculation) {
  const unitNum = tenant.unitId?.unitNumber || 'assigned unit';
  const lines = [
    `Dear ${tenant.name},`,
    `This is a friendly reminder regarding your outstanding balance for Unit ${unitNum}.`,
    ''
  ];

  if (calculation.rentDue > 0) {
    lines.push(`• Rent Due: KES ${calculation.rentDue.toLocaleString()}`);
  }

  if (calculation.unpaidUtilities && calculation.unpaidUtilities.length > 0) {
    calculation.unpaidUtilities.forEach(u => {
      lines.push(`• ${u.name}: KES ${Number(u.amount).toLocaleString()}`);
    });
  }

  lines.push('');
  lines.push(`TOTAL OUTSTANDING: KES ${calculation.totalDue.toLocaleString()}`);
  lines.push('Please settle this payment as soon as possible. Thank you for your cooperation.');

  return lines.join('\n');
}

// Helper: compose HTML email body using registered company/user template
function generatePersonalizedEmailHtml(tenant, calculation, options = {}) {
  const unitNum = tenant.unitId?.unitNumber || '';
  const propName = options.propertyName || tenant.unitId?.propertyId?.name || '';
  return getCorporateReminderEmailBody({
    tenantName: tenant.name,
    unitNumber: unitNum,
    calculation,
    reminderTitle: options.title || `Payment Reminder - Unit ${unitNum || ''}`,
    reminderDescription: options.description || null,
    settings: options.settings || null,
    propertyName: propName,
    dueDate: options.dueDate || null
  });
}


// Add / Send Personalized Reminder
router.post('/', protect, async (req, res) => {
  try {
    const {
      tenantId,
      type,
      method,
      frequency,
      dueDate,
      customNote,
      subject,
      sendImmediately,
      propertyIds,
      sendToAll
    } = req.body || {};

    const dispatchMethod = method || 'email';
    const shouldSendNow = sendImmediately !== false;
    const businessProfile = await getUserBusinessProfile(req.user);

    // Case 1: Specific tenant selected
    if (tenantId && tenantId !== 'all_debtors') {
      if (!isValidObjectId(String(tenantId))) {
        return res.status(400).json({ message: 'Invalid tenant identifier' });
      }
      const tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId', 'unitNumber rentAmount propertyId');
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      const all = await getTenantsWithBalances(req.user.id);
      const match = all.find(item => item.tenant._id.toString() === tenant._id.toString());
      const calculation = match || {
        tenant,
        rentDue: tenant.rentAmount || 0,
        utilityDue: 0,
        totalDue: tenant.rentAmount || 0,
        unpaidUtilities: []
      };

      const description = customNote || generatePersonalizedMessage(tenant, calculation);
      let emailSent = false;
      let smsSent = false;
      let deliveryError = null;

      if (shouldSendNow) {
        if (dispatchMethod === 'email') {
          if (tenant.email && String(tenant.email).includes('@')) {
            try {
              const propName = match?.tenant?.unitId?.propertyId?.name || '';
              const displayBrand = businessProfile.companyName || businessProfile.orgName || propName || businessProfile.landlordName || 'Property Management';
              await sendEmail({
                email: tenant.email,
                toName: tenant.name,
                fromName: displayBrand,
                replyToEmail: businessProfile.orgEmail || undefined,
                subject: subject || `${displayBrand}: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
                skipCommunicationLog: true,
                message: generatePersonalizedEmailHtml(tenant, calculation, {
                  title: subject,
                  description: customNote || undefined,
                  settings: businessProfile,
                  propertyName: propName,
                  dueDate
                })
              });
              emailSent = true;
            } catch (e) {
              deliveryError = e.message;
              console.error('Email send failed for reminder:', e.message);
            }
          } else {
            deliveryError = `Tenant "${tenant.name}" has no email address configured.`;
          }
        } else if (dispatchMethod === 'sms') {
          if (tenant.phone) {
            try {
              await sendSMS({ phone: tenant.phone, message: description, skipCommunicationLog: true });
              smsSent = true;
            } catch (e) {
              deliveryError = e.message;
              console.error('SMS send failed for reminder:', e.message);
            }
          } else {
            deliveryError = `Tenant "${tenant.name}" has no phone number configured.`;
          }
        }
      }

      const finalStatus = shouldSendNow ? ((emailSent || smsSent) ? 'sent' : 'failed') : 'pending';

      const reminder = await Reminder.create({
        title: subject || `Payment Reminder - ${tenant.name} (Unit ${tenant.unitId?.unitNumber || ''})`,
        type: type || 'rent_due',
        method: dispatchMethod,
        frequency: frequency || 'immediate',
        dueDate: dueDate || new Date(),
        tenantId: tenant._id,
        recipientName: tenant.name,
        recipientEmail: tenant.email,
        recipientPhone: tenant.phone,
        amountDue: calculation.totalDue,
        breakdown: {
          rent: calculation.rentDue,
          utilities: calculation.unpaidUtilities.map(u => ({ name: u.name, amount: Number(u.amount) || 0 }))
        },
        description,
        status: finalStatus,
        user: req.user.id
      });

      await logActivity(
        req.user,
        'Send Reminder',
        `Reminder ${shouldSendNow ? (emailSent || smsSent ? 'dispatched' : 'failed') : 'scheduled'} for ${tenant.name} (KES ${calculation.totalDue})`,
        'reminder',
        emailSent || smsSent || !shouldSendNow ? 'success' : 'error'
      );

      return res.status(201).json({
        ...reminder.toObject(),
        emailSent,
        smsSent,
        emailsSent: emailSent ? 1 : 0,
        emailsFailed: shouldSendNow && dispatchMethod === 'email' && !emailSent ? 1 : 0,
        lastError: deliveryError
      });
    }

    // Case 2: Bulk send to unpaid debtors (or all active tenants when sendToAll is true)
    const all = await getTenantsWithBalances(req.user.id);
    const propertyFilterSet = Array.isArray(propertyIds) && propertyIds.length > 0
      ? new Set(propertyIds.map(id => String(id)))
      : null;

    const recipients = all.filter(item => {
      if (!sendToAll && item.totalDue <= 0) return false;
      if (propertyFilterSet) {
        const rawProp = item.tenant.unitId?.propertyId?._id || item.tenant.unitId?.propertyId;
        const unitPropId = rawProp ? String(rawProp) : null;
        return unitPropId && propertyFilterSet.has(unitPropId);
      }
      return true;
    });

    if (recipients.length === 0) {
      return res.status(200).json({
        message: sendToAll
          ? 'No active tenants found for the selected property.'
          : 'All matching tenants are fully paid! No reminders needed.',
        count: 0,
        emailsSent: 0,
        emailsFailed: 0,
        smsSent: 0,
        reminders: []
      });
    }

    const createdReminders = [];
    let emailsSent = 0;
    let emailsFailed = 0;
    let smsSentCount = 0;
    let smsFailed = 0;
    let lastError = null;

    for (const item of recipients) {
      const { tenant } = item;
      const description = customNote || generatePersonalizedMessage(tenant, item);
      let emailDelivered = false;
      let smsDelivered = false;

      if (shouldSendNow) {
        if (dispatchMethod === 'email') {
          if (tenant.email && String(tenant.email).includes('@')) {
            try {
              const propName = tenant.unitId?.propertyId?.name || '';
              const displayBrand = businessProfile.companyName || businessProfile.orgName || propName || businessProfile.landlordName || 'Property Management';
              await sendEmail({
                email: tenant.email,
                toName: tenant.name,
                fromName: displayBrand,
                replyToEmail: businessProfile.orgEmail || undefined,
                subject: subject || `${displayBrand}: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
                skipCommunicationLog: true,
                message: generatePersonalizedEmailHtml(tenant, item, {
                  title: subject,
                  description: customNote || undefined,
                  settings: businessProfile,
                  propertyName: propName,
                  dueDate
                })
              });
              emailDelivered = true;
              emailsSent++;
            } catch (e) {
              emailsFailed++;
              lastError = e.message;
              console.error('Email send failed for bulk reminder:', e.message);
            }
          } else {
            emailsFailed++;
            lastError = `Missing email address for ${tenant.name}`;
          }
        } else if (dispatchMethod === 'sms') {
          if (tenant.phone) {
            try {
              await sendSMS({ phone: tenant.phone, message: description, skipCommunicationLog: true });
              smsDelivered = true;
              smsSentCount++;
            } catch (e) {
              smsFailed++;
              lastError = e.message;
              console.error('SMS send failed for bulk reminder:', e.message);
            }
          } else {
            smsFailed++;
            lastError = `Missing phone number for ${tenant.name}`;
          }
        }
      }

      const remStatus = shouldSendNow
        ? ((emailDelivered || smsDelivered) ? 'sent' : 'failed')
        : 'pending';

      const rem = await Reminder.create({
        title: subject || `Payment Reminder - ${tenant.name} (Unit ${tenant.unitId?.unitNumber || ''})`,
        type: type || 'rent_due',
        method: dispatchMethod,
        frequency: frequency || 'immediate',
        dueDate: dueDate || new Date(),
        tenantId: tenant._id,
        recipientName: tenant.name,
        recipientEmail: tenant.email,
        recipientPhone: tenant.phone,
        amountDue: item.totalDue,
        breakdown: {
          rent: item.rentDue,
          utilities: item.unpaidUtilities.map(u => ({ name: u.name, amount: Number(u.amount) || 0 }))
        },
        description,
        status: remStatus,
        user: req.user.id
      });
      createdReminders.push(rem);
    }

    await logActivity(
      req.user,
      'Bulk Personalized Reminders',
      `Dispatched reminders via ${dispatchMethod}: ${emailsSent} email(s) sent, ${emailsFailed} failed`,
      'reminder',
      emailsSent > 0 || smsSentCount > 0 ? 'success' : 'error'
    );

    res.status(201).json({
      message: emailsSent > 0
        ? `Sent ${emailsSent} reminder(s) via Email${emailsFailed ? ` (${emailsFailed} failed or missing email)` : ''}.`
        : (lastError || `Processed ${recipients.length} reminder(s), 0 delivered.`),
      count: recipients.length,
      emailsSent,
      emailsFailed,
      smsSent: smsSentCount,
      smsFailed,
      lastError,
      reminders: createdReminders
    });

  } catch (error) {
    console.error('Reminder error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Send single reminder immediately by ID
router.post('/:id/send', protect, validateObjectId('id'), async (req, res) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user.id })
      .populate({ path: 'tenantId', populate: { path: 'unitId', select: 'unitNumber' } });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    const recipientEmail = reminder.recipientEmail || reminder.tenantId?.email;
    const recipientPhone = reminder.recipientPhone || reminder.tenantId?.phone;

    if (reminder.method === 'email' || (!reminder.method && recipientEmail)) {
      if (!recipientEmail || !String(recipientEmail).includes('@')) {
        return res.status(422).json({ message: `No valid email address for ${reminder.recipientName || 'this tenant'}.` });
      }
      const businessProfile = await getUserBusinessProfile(req.user);
      const displayBrand = businessProfile.companyName || businessProfile.orgName || businessProfile.landlordName || 'Property Management';
      const emailHtml = getCorporateReminderEmailBody({
        tenantName: reminder.recipientName || reminder.tenantId?.name || 'Valued Resident',
        unitNumber: reminder.tenantId?.unitId?.unitNumber || '',
        calculation: {
          totalDue: reminder.amountDue || 0,
          rentDue: reminder.breakdown?.rent || reminder.amountDue || 0,
          unpaidUtilities: reminder.breakdown?.utilities || []
        },
        reminderTitle: reminder.title,
        reminderDescription: reminder.description,
        settings: businessProfile,
        dueDate: reminder.dueDate
      });

      await sendEmail({
        email: recipientEmail,
        toName: reminder.recipientName || reminder.tenantId?.name || undefined,
        fromName: displayBrand,
        replyToEmail: businessProfile.orgEmail || undefined,
        subject: reminder.title,
        skipCommunicationLog: true,
        message: emailHtml
      });
    } else if (reminder.method === 'sms') {
      if (!recipientPhone) {
        return res.status(422).json({ message: `No valid phone number for ${reminder.recipientName || 'this tenant'}.` });
      }
      await sendSMS({
        phone: recipientPhone,
        message: reminder.description,
        skipCommunicationLog: true
      });
    }

    reminder.status = 'sent';
    await reminder.save();

    await logActivity(
      req.user,
      'Send Reminder',
      `Reminder dispatched to ${reminder.recipientName || 'tenant'} via ${reminder.method || 'email'}`,
      'reminder',
      'success'
    );

    res.json({ message: 'Reminder sent via Email', emailSent: reminder.method !== 'sms', reminder });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send reminder' });
  }
});

// Resend a logged CommunicationLog item cleanly
router.post('/logs/:id/resend', protect, validateObjectId('id'), async (req, res) => {
  try {
    const log = await CommunicationLog.findOne({ _id: req.params.id, user: req.user.id });
    if (!log) return res.status(404).json({ message: 'Communication log not found' });
    if (log.category === 'security') {
      return res.status(400).json({ message: 'Security verification codes cannot be resent from Communication logs.' });
    }

    const businessProfile = await getUserBusinessProfile(req.user);
    const displayBrand = businessProfile.companyName || businessProfile.orgName || log.propertyName || businessProfile.landlordName || 'Property Management';

    if (log.type === 'sms') {
      if (!log.recipientPhone) {
        return res.status(422).json({ message: `No phone number recorded for ${log.recipientName || 'recipient'}.` });
      }
      const smsRes = await sendSMS({
        phone: log.recipientPhone,
        message: log.message || log.title,
        commMeta: {
          category: log.category,
          userId: req.user.id,
          tenantId: log.tenantId,
          propertyId: log.propertyId,
          propertyName: log.propertyName,
          unitNumber: log.unitNumber,
          recipientName: log.recipientName,
          recipientType: log.recipientType,
          title: log.title
        }
      });
      if (!smsRes?.success) {
        return res.status(502).json({ message: smsRes?.error || smsRes?.reason || 'Failed to resend SMS.' });
      }
    } else {
      if (!log.recipientEmail || !String(log.recipientEmail).includes('@')) {
        return res.status(422).json({ message: `No valid email recorded for ${log.recipientName || 'recipient'}.` });
      }
      const safeHtml = getEmailTemplate(
        log.title || `${displayBrand} Notice`,
        `<p>Dear ${log.recipientName || 'Valued Resident'},</p><p>${String(log.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
        businessProfile,
        { propertyName: log.propertyName || '' }
      );
      await sendEmail({
        email: log.recipientEmail,
        toName: log.recipientName || undefined,
        fromName: displayBrand,
        replyToEmail: businessProfile.orgEmail || undefined,
        subject: log.title || `${displayBrand}: Notice`,
        message: safeHtml,
        commMeta: {
          category: log.category,
          userId: req.user.id,
          tenantId: log.tenantId,
          propertyId: log.propertyId,
          propertyName: log.propertyName,
          unitNumber: log.unitNumber,
          recipientName: log.recipientName,
          recipientType: log.recipientType,
          previewText: log.message
        }
      });
    }

    res.json({ success: true, message: `Resent ${log.type.toUpperCase()} to ${log.recipientName || log.recipientEmail || log.recipientPhone}` });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to resend message' });
  }
});

// Send real broadcast message to Tenants and/or Team (and record all dispatches cleanly)
router.post('/broadcast', protect, admin, async (req, res) => {
  try {
    const {
      audience = 'all_tenants',
      propertyId = 'all',
      method = 'email',
      subject = 'Management Notice',
      message = ''
    } = req.body || {};

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ message: 'Message body is required.' });
    }

    const userId = req.user._id || req.user.id;
    const businessProfile = await getUserBusinessProfile(req.user);
    const displayBrand = businessProfile.companyName || businessProfile.orgName || businessProfile.landlordName || 'Property Management';
    const dispatchMethod = method === 'sms' ? 'sms' : 'email';

    const targets = [];

    if (audience === 'team' || audience === 'both') {
      const teamUsers = await User.find({
        $or: [{ organizationOwner: userId }, { _id: userId }]
      }).select('name email phone').lean();
      teamUsers.forEach((u) => {
        targets.push({
          recipientType: 'team',
          recipientName: u.name || 'Team Member',
          email: u.email,
          phone: u.phone,
          propertyName: ''
        });
      });
    }

    if (audience !== 'team') {
      let allTenants = await Tenant.find({ user: userId, status: 'active' })
        .populate({
          path: 'unitId',
          select: 'unitNumber propertyId',
          populate: { path: 'propertyId', select: 'name' }
        })
        .lean();

      if (propertyId && propertyId !== 'all') {
        allTenants = allTenants.filter((t) => {
          const pId = t.unitId?.propertyId?._id ? String(t.unitId.propertyId._id) : String(t.unitId?.propertyId || '');
          return pId === String(propertyId);
        });
      }

      if (audience === 'debtors') {
        const balances = await getTenantsWithBalances(userId);
        const debtorIds = new Set(balances.filter((b) => b.totalDue > 0).map((b) => String(b.tenant._id)));
        allTenants = allTenants.filter((t) => debtorIds.has(String(t._id)));
      }

      allTenants.forEach((t) => {
        targets.push({
          recipientType: 'tenant',
          tenantId: t._id,
          recipientName: t.name,
          email: t.email,
          phone: t.phone,
          propertyId: t.unitId?.propertyId?._id || t.unitId?.propertyId || undefined,
          propertyName: t.unitId?.propertyId?.name || '',
          unitNumber: t.unitId?.unitNumber || ''
        });
      });
    }

    if (targets.length === 0) {
      return res.json({ count: 0, sentCount: 0, failedCount: 0, message: 'No matching recipients found.' });
    }

    let sentCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const target of targets) {
      const commMeta = {
        category: 'broadcast',
        userId,
        tenantId: target.tenantId,
        propertyId: target.propertyId,
        propertyName: target.propertyName,
        unitNumber: target.unitNumber,
        recipientName: target.recipientName,
        recipientType: target.recipientType,
        title: subject || `${displayBrand} Announcement`,
        previewText: cleanMessage
      };

      if (dispatchMethod === 'sms') {
        if (!target.phone) {
          failedCount++;
          lastError = `Missing phone number for ${target.recipientName}`;
          continue;
        }
        const smsRes = await sendSMS({
          phone: target.phone,
          message: `${cleanMessage} - ${displayBrand}`,
          commMeta
        });
        if (smsRes?.success) sentCount++;
        else {
          failedCount++;
          lastError = smsRes?.error || smsRes?.reason || 'SMS failed';
        }
      } else {
        if (!target.email || !String(target.email).includes('@')) {
          failedCount++;
          lastError = `Missing email address for ${target.recipientName}`;
          continue;
        }
        try {
          const safeHtml = getEmailTemplate(
            subject || `${displayBrand} Notice`,
            `<p>Dear ${target.recipientName || 'Resident'},</p><p>${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`,
            businessProfile,
            { propertyName: target.propertyName || '' }
          );
          await sendEmail({
            email: target.email,
            toName: target.recipientName,
            fromName: displayBrand,
            replyToEmail: businessProfile.orgEmail || undefined,
            subject: subject || `${displayBrand}: ${cleanMessage.slice(0, 50)}`,
            message: safeHtml,
            commMeta
          });
          sentCount++;
        } catch (err) {
          failedCount++;
          lastError = err.message;
        }
      }
    }

    await logActivity(
      req.user,
      'Broadcast Message',
      `Dispatched ${dispatchMethod.toUpperCase()} broadcast: ${sentCount} delivered, ${failedCount} failed`,
      'reminder',
      sentCount > 0 ? 'success' : 'error'
    );

    res.status(201).json({
      success: sentCount > 0,
      count: targets.length,
      sentCount,
      failedCount,
      lastError,
      message: `Sent ${sentCount} of ${targets.length} message(s) via ${dispatchMethod.toUpperCase()}${failedCount ? ` (${failedCount} failed)` : ''}.`
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Broadcast failed' });
  }
});

// Delete reminder
router.delete('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user.id });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    await reminder.deleteOne();
    await logActivity(req.user, 'Delete Reminder', `Deleted reminder "${reminder.title}"`, 'reminder', 'info');
    res.json({ message: 'Reminder removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create (and optionally schedule/send) a Platform Email Campaign
// @route   POST /api/reminders/campaign
// @access  Private (Super Admin only - prevents cross-tenant Brevo list access)
router.post('/campaign', protect, superAdmin, async (req, res) => {
  try {
    const {
      name,
      subject,
      htmlContent,
      senderName,
      senderEmail,
      listIds,
      scheduledAt,
      sendNow
    } = req.body || {};

    if (!subject || !htmlContent) {
      return res.status(400).json({ message: 'Campaign subject and htmlContent are required' });
    }

    const parsedListIds = Array.isArray(listIds)
      ? listIds.map(Number).filter(n => !Number.isNaN(n))
      : [];

    const result = await createAndSendEmailCampaign({
      name: name || `MakaziFlow Campaign — ${subject}`,
      subject,
      htmlContent,
      senderName,
      senderEmail,
      listIds: parsedListIds,
      scheduledAt: scheduledAt || null,
      sendNow: Boolean(sendNow)
    });

    await logActivity(
      req.user,
      'Brevo Campaign',
      `Created Brevo email campaign "${name || subject}" (ID: ${result.campaignId || 'N/A'}, sentNow: ${result.sentNow})`,
      'reminder',
      'success'
    );

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Brevo campaign error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
