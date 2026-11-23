const cron = require('node-cron');
const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

let reminderCronTask = null;

// Schedule check every minute to handle "Immediate" and scheduled reminders
const startRentReminders = () => {
  if (process.env.ENABLE_AUTO_CRON_REMINDERS !== 'true') {
    logger.info('Automatic background rent reminders disabled (ENABLE_AUTO_CRON_REMINDERS != true).');
    return null;
  }
  reminderCronTask = cron.schedule('* * * * *', async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const now = new Date();

      const dueIds = await Reminder.find({
        status: 'pending',
        dueDate: { $lte: now }
      }).select('_id').limit(25).lean();

      if (dueIds.length === 0) return;

      for (const item of dueIds) {
        // Atomic claim prevents duplicate execution across multiple instances
        const claimed = await Reminder.findOneAndUpdate(
          { _id: item._id, status: 'pending' },
          { $set: { status: 'processing' } },
          { returnDocument: 'after' }
        );
        if (!claimed) continue;

        try {
          await processReminder(claimed);
          claimed.status = 'sent';
          await claimed.save();
        } catch (remErr) {
          logger.error('reminder_processing_failed', { reminderId: String(claimed._id), error: remErr.message });
          claimed.status = 'failed';
          await claimed.save().catch(() => {});
        }
      }
    } catch (error) {
      logger.error('reminder_cron_error', { error: error.message });
    }
  });

  logger.info('Reminder processor initialized (runs every minute)');
  return reminderCronTask;
};

async function processReminder(reminder) {
  // Strictly isolate tenants to the reminder's owning landlord
  const tenantFilter = { status: 'active' };
  if (reminder.user) {
    tenantFilter.user = reminder.user;
  }
  const tenants = await Tenant.find(tenantFilter)
    .populate('unitId', 'unitNumber')
    .select('name email phone user unitId rentAmount utilities')
    .lean();

  if (tenants.length === 0) return;

  const settings = reminder.user
    ? await Settings.findOne({ user: reminder.user }).lean()
    : await Settings.findOne().lean();

  let targetTenants = tenants;
  if (reminder.type === 'rent_due' || reminder.type === 'overdue') {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    // Single batch distinct lookup prevents N+1 Payment.findOne per tenant
    const paidTenantIds = await Payment.distinct('tenantId', {
      ...(reminder.user ? { user: reminder.user } : {}),
      tenantId: { $in: tenants.map((t) => t._id) },
      status: { $in: ['paid', 'partial', 'Completed'] },
      date: { $gte: currentMonthStart }
    });
    const paidSet = new Set(paidTenantIds.map((id) => String(id)));
    targetTenants = tenants.filter((t) => !paidSet.has(String(t._id)));
  }

  for (const tenant of targetTenants) {
    await sendNotification(tenant, reminder, settings);
  }
}

async function sendNotification(tenant, reminder, settings) {
  try {
    const notifications = settings?.notifications || {};

    if (notifications.email !== false && tenant.email) {
      const { getCorporateReminderEmailBody } = require('../utils/emailTemplates');
      const emailHtml = getCorporateReminderEmailBody({
        tenantName: tenant.name,
        unitNumber: tenant.unitId?.unitNumber || '',
        calculation: {
          totalDue: reminder.amountDue || tenant.rentAmount || 0,
          rentDue: reminder.breakdown?.rent || reminder.amountDue || tenant.rentAmount || 0,
          unpaidUtilities: reminder.breakdown?.utilities || []
        },
        reminderTitle: reminder.title,
        reminderDescription: reminder.description,
        settings,
        dueDate: reminder.dueDate
      });

      await sendEmail({
        email: tenant.email,
        subject: reminder.title,
        message: emailHtml
      });
    }

    if (notifications.sms === true && tenant.phone) {
      const sendSMS = require('../utils/sendSMS');
      await sendSMS({
        phone: tenant.phone,
        message: `${reminder.title}: ${reminder.description || ''} - Rental Management`
      });
    }

    if (notifications.whatsapp === true && tenant.phone) {
      const sendWhatsApp = require('../utils/sendWhatsApp');
      await sendWhatsApp({
        phone: tenant.phone,
        message: `*${reminder.title}*\n\n${reminder.description || ''}\n\n_Rental Management_`
      });
    }
  } catch (err) {
    logger.warn('reminder_notification_failed', { tenantId: String(tenant._id), error: err.message });
  }
}

startRentReminders.stop = () => {
  if (reminderCronTask && typeof reminderCronTask.stop === 'function') {
    reminderCronTask.stop();
  }
};

module.exports = startRentReminders;
