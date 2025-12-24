const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const sendEmail = require('../utils/sendEmail');

// Schedule check every minute to handle "Immediate" and scheduled reminders
const startRentReminders = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find pending reminders due now or in the past
      const reminders = await Reminder.find({
          status: 'pending',
          dueDate: { $lte: now }
      });

      if (reminders.length === 0) return;

      console.log(`⏰ Processing ${reminders.length} due reminders...`);

      for (const reminder of reminders) {
          await processReminder(reminder);
          
          // Mark as sent
          reminder.status = 'sent';
          await reminder.save();
      }

    } catch (error) {
       console.error('Error in Reminder Job:', error);
    }
  });

  console.log('✅ Reminder processor initialized (Runs every minute)');
};

async function processReminder(reminder) {
    const tenants = await Tenant.find({ status: 'active' });

    if (reminder.type === 'rent_due' || reminder.type === 'overdue') {
        // Filter for tenants who haven't paid this month
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        
        for (const tenant of tenants) {
            const hasPaid = await Payment.findOne({
                tenantId: tenant._id,
                status: { $in: ['paid', 'partial', 'Completed'] },
                date: { $gte: currentMonthStart }
            });

            if (!hasPaid) {
                await sendNotification(tenant, reminder);
            }
        }
    } else {
        // Send to ALL active tenants (e.g. maintenance, inspection)
        for (const tenant of tenants) {
            await sendNotification(tenant, reminder);
        }
    }
}

async function sendNotification(tenant, reminder) {
    console.log(`📣 Processing notification for ${tenant.name}: ${reminder.title}`);
    
    try {
        // Fetch global settings to see what channels are enabled
        const settings = await require('../models/Settings').findOne();
        const notifications = settings?.notifications || {};

        // 1. Email (Default)
        if (notifications.email !== false) { // Default to true if undefined
             await sendEmail({
                email: tenant.email,
                subject: reminder.title,
                message: `<p>Hello ${tenant.name},</p><p>${reminder.description || reminder.title}</p><p>Thank you,<br>Rental Management</p>`
            });
        }

        // 2. SMS
        if (notifications.sms === true && tenant.phone) {
             const sendSMS = require('../utils/sendSMS');
             await sendSMS({
                 phone: tenant.phone,
                 message: `${reminder.title}: ${reminder.description || ''} - Rental Management`
             });
        }

        // 3. WhatsApp
        // Check if either specific whatsapp toggle or just generally enabled if we had one
        if (notifications.whatsapp === true && tenant.phone) {
             const sendWhatsApp = require('../utils/sendWhatsApp');
             await sendWhatsApp({
                 phone: tenant.phone,
                 message: `*${reminder.title}*\n\n${reminder.description || ''}\n\n_Rental Management_`
             });
        }

    } catch (err) {
        console.error("Failed to send notification:", err.message);
    }
}

module.exports = startRentReminders;
