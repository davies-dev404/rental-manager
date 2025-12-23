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
    console.log(`📧 Sending ${reminder.method} to ${tenant.name}: ${reminder.title}`);
    
    if (reminder.method === 'email') {
        try {
            await sendEmail({
                email: tenant.email,
                subject: reminder.title,
                message: `<p>Hello ${tenant.name},</p><p>${reminder.description || reminder.title}</p><p>Thank you,<br>Rental Management</p>`
            });
        } catch (err) {
            console.error("Failed to send email:", err.message);
        }
    }
    // SMS logic would go here
}

module.exports = startRentReminders;
