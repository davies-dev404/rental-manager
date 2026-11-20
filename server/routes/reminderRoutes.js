const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const { protect, admin } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');
const { getCorporateReminderEmailBody } = require('../utils/emailTemplates');
const { getUserBusinessProfile } = require('../utils/getUserBusinessProfile');
const { createAndSendEmailCampaign } = require('../utils/brevoService');

// Get all reminders
router.get('/', protect, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user.id })
      .populate({
        path: 'tenantId',
        select: 'name email phone unitId',
        populate: {
          path: 'unitId',
          select: 'unitNumber propertyId',
          populate: { path: 'propertyId', select: 'name' }
        }
      })
      .sort({ createdAt: -1 });
    res.json(reminders);
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
                fromName: displayBrand,
                replyToEmail: businessProfile.orgEmail || undefined,
                subject: subject || `${displayBrand}: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
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
              await sendSMS({ phone: tenant.phone, message: description });
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
                fromName: displayBrand,
                replyToEmail: businessProfile.orgEmail || undefined,
                subject: subject || `${displayBrand}: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
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
              await sendSMS({ phone: tenant.phone, message: description });
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
        ? `Sent ${emailsSent} email reminder(s) via Brevo${emailsFailed ? ` (${emailsFailed} failed or missing email)` : ''}.`
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
router.post('/:id/send', protect, async (req, res) => {
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
        fromName: displayBrand,
        replyToEmail: businessProfile.orgEmail || undefined,
        subject: reminder.title,
        message: emailHtml
      });
    } else if (reminder.method === 'sms') {
      if (!recipientPhone) {
        return res.status(422).json({ message: `No valid phone number for ${reminder.recipientName || 'this tenant'}.` });
      }
      await sendSMS({
        phone: recipientPhone,
        message: reminder.description
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

    res.json({ message: 'Reminder emailed successfully via Brevo', emailSent: reminder.method !== 'sms', reminder });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send reminder' });
  }
});

// Delete reminder
router.delete('/:id', protect, async (req, res) => {
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

// @desc    Create (and optionally schedule/send) a Brevo Email Campaign
// @route   POST /api/reminders/campaign
// @access  Private (Admin / Landlord)
router.post('/campaign', protect, admin, async (req, res) => {
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
