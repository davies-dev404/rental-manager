const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const logActivity = require('../utils/logActivity');

// Get all reminders
router.get('/', protect, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user.id })
      .populate('tenantId', 'name email phone unitId')
      .sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper: Calculate outstanding balances (rent + utilities) for active tenants
async function getTenantsWithBalances(userId) {
  const tenants = await Tenant.find({ user: userId, status: 'active' }).populate('unitId', 'unitNumber rentAmount');
  
  // Current month payment window
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const payments = await Payment.find({
    user: userId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  return tenants.map(tenant => {
    const tenantPayments = payments.filter(p =>
      p.tenantId && p.tenantId.toString() === tenant._id.toString() &&
      ['paid', 'partial', 'Completed'].includes(p.status)
    );

    const rentPaid = tenantPayments.reduce((s, p) => s + (p.rentAmount || 0), 0);
    const utilityPaid = tenantPayments.reduce((s, p) => s + (p.utilityAmount || 0), 0);
    const totalPaid = tenantPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const expectedRent = tenant.rentAmount || tenant.unitId?.rentAmount || 0;
    const utilities = Array.isArray(tenant.utilities) ? tenant.utilities : [];
    const expectedUtilities = utilities
      .filter(u => !u.isIncluded)
      .reduce((s, u) => s + (Number(u.amount) || 0), 0);

    const rentDue = Math.max(0, expectedRent - rentPaid);
    const utilityDue = Math.max(0, expectedUtilities - utilityPaid);
    const totalDue = Math.max(0, (expectedRent + expectedUtilities) - totalPaid);

    return {
      tenant,
      expectedRent,
      expectedUtilities,
      rentPaid,
      utilityPaid,
      totalPaid,
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

// Helper: compose HTML email body
function generatePersonalizedEmailHtml(tenant, calculation) {
  const unitNum = tenant.unitId?.unitNumber || 'assigned unit';
  let utilityRows = '';
  if (calculation.unpaidUtilities && calculation.unpaidUtilities.length > 0) {
    utilityRows = calculation.unpaidUtilities.map(u => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${u.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">KES ${Number(u.amount).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0;">Payment Reminder</h2>
      <p style="color: #475569; font-size: 15px;">Dear <strong>${tenant.name}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        This is a personalized reminder regarding your pending balance for <strong>Unit ${unitNum}</strong>.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; color: #334155;">Item</th>
            <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; color: #334155;">Amount Due</th>
          </tr>
        </thead>
        <tbody>
          ${calculation.rentDue > 0 ? `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">House Rent</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">KES ${calculation.rentDue.toLocaleString()}</td>
            </tr>
          ` : ''}
          ${utilityRows}
          <tr style="background-color: #f1f5f9; font-size: 16px;">
            <td style="padding: 12px; font-weight: bold; color: #0f172a;">Total Balance Due</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: #dc2626;">KES ${calculation.totalDue.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
        Kindly arrange payment through your authorized payment channel. If you have already made this payment, please disregard this reminder.
      </p>
    </div>
  `;
}

// Add / Send Personalized Reminder
router.post('/', protect, async (req, res) => {
  try {
    const { tenantId, type, method, frequency, dueDate, customNote, sendImmediately } = req.body;

    // Case 1: Specific tenant selected
    if (tenantId && tenantId !== 'all_debtors') {
      const tenant = await Tenant.findOne({ _id: tenantId, user: req.user.id }).populate('unitId', 'unitNumber rentAmount');
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

      const reminder = await Reminder.create({
        title: `Payment Reminder - ${tenant.name} (Unit ${tenant.unitId?.unitNumber || ''})`,
        type: type || 'rent_due',
        method: method || 'email',
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
        status: sendImmediately ? 'sent' : 'pending',
        user: req.user.id
      });

      if (sendImmediately) {
        if (method === 'email' && tenant.email) {
          try {
            await sendEmail({
              email: tenant.email,
              subject: `MakaaziHub: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
              message: generatePersonalizedEmailHtml(tenant, calculation)
            });
          } catch (e) {
            console.error('Email send failed for reminder:', e.message);
          }
        } else if (method === 'sms' && tenant.phone) {
          try {
            await sendSMS({
              phone: tenant.phone,
              message: description
            });
          } catch (e) {
            console.error('SMS send failed for reminder:', e.message);
          }
        }
      }

      await logActivity(
        req.user,
        'Send Reminder',
        `Personalized reminder ${sendImmediately ? 'dispatched' : 'scheduled'} for ${tenant.name} (KES ${calculation.totalDue})`,
        'reminder',
        'success'
      );

      return res.status(201).json(reminder);
    }

    // Case 2: Bulk send ONLY to tenants who have NOT paid (debtors)
    const all = await getTenantsWithBalances(req.user.id);
    const debtors = all.filter(item => item.totalDue > 0);

    if (debtors.length === 0) {
      return res.status(200).json({ message: 'All tenants are fully paid! No reminders needed.' });
    }

    const createdReminders = [];
    for (const item of debtors) {
      const { tenant } = item;
      const description = customNote || generatePersonalizedMessage(tenant, item);

      const rem = await Reminder.create({
        title: `Payment Reminder - ${tenant.name} (Unit ${tenant.unitId?.unitNumber || ''})`,
        type: type || 'rent_due',
        method: method || 'email',
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
        status: sendImmediately ? 'sent' : 'pending',
        user: req.user.id
      });
      createdReminders.push(rem);

      if (sendImmediately) {
        if (method === 'email' && tenant.email) {
          try {
            await sendEmail({
              email: tenant.email,
              subject: `MakaaziHub: Payment Reminder for Unit ${tenant.unitId?.unitNumber || ''}`,
              message: generatePersonalizedEmailHtml(tenant, item)
            });
          } catch (e) {
            console.error('Email send failed for bulk reminder:', e.message);
          }
        } else if (method === 'sms' && tenant.phone) {
          try {
            await sendSMS({
              phone: tenant.phone,
              message: description
            });
          } catch (e) {
            console.error('SMS send failed for bulk reminder:', e.message);
          }
        }
      }
    }

    await logActivity(
      req.user,
      'Bulk Personalized Reminders',
      `Sent personalized reminders to ${debtors.length} unpaid tenant(s)`,
      'reminder',
      'success'
    );

    res.status(201).json({
      message: `Personalized reminders sent to ${debtors.length} tenant(s) with unpaid balances.`,
      count: debtors.length,
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
    const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user.id }).populate('tenantId');
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });

    if (reminder.method === 'email' && reminder.recipientEmail) {
      await sendEmail({
        email: reminder.recipientEmail,
        subject: reminder.title,
        message: `<div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">
          <h2>${reminder.title}</h2>
          <pre style="white-space:pre-wrap;font-family:inherit;color:#334155;">${reminder.description}</pre>
        </div>`
      });
    } else if (reminder.method === 'sms' && reminder.recipientPhone) {
      await sendSMS({
        phone: reminder.recipientPhone,
        message: reminder.description
      });
    }

    reminder.status = 'sent';
    await reminder.save();

    await logActivity(
      req.user,
      'Send Reminder',
      `Reminder dispatched to ${reminder.recipientName || 'tenant'} via ${reminder.method}`,
      'reminder',
      'success'
    );

    res.json({ message: 'Reminder sent successfully', reminder });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

module.exports = router;
