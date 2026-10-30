/**
 * Corporate Email Templates for MakaziFlow
 * Professional, brandable, mobile-responsive HTML templates for receipts and rent reminders.
 */

const getEmailTemplate = (title, content, settings, options = {}) => {
    const orgName = options.propertyName || settings?.orgName || "MakaziFlow Property Management";
    const orgEmail = settings?.orgEmail || process.env.FROM_EMAIL || "support@makaziflow.com";
    const orgPhone = settings?.orgPhone || "+254 700 000 000";
    const primaryColor = "#0f172a"; // Deep slate / obsidian

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: left;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0;">
                                            ${orgName}
                                        </div>
                                        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-top: 4px;">
                                            Real Estate & Property Operations
                                        </div>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="display: inline-block; background-color: rgba(255,255,255,0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; rounded-pill; border-radius: 9999px;">
                                            Official Notice
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 40px; background-color: #ffffff;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 28px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 6px 0; color: #475569; font-size: 13px; font-weight: 600;">
                                ${orgName}
                            </p>
                            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                Inquiries: <a href="mailto:${orgEmail}" style="color: #0284c7; text-decoration: none;">${orgEmail}</a>
                            </p>
                            <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                                &copy; ${new Date().getFullYear()} ${orgName}. Automated & secured by MakaziFlow.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

/**
 * Corporate Rent Reminder Email Body
 */
const getCorporateReminderEmailBody = ({
    tenantName,
    unitNumber,
    calculation,
    reminderTitle,
    reminderDescription,
    settings,
    propertyName,
    dueDate
}) => {
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Immediate / Upon Receipt';
    const totalDue = calculation?.totalDue !== undefined ? calculation.totalDue : 0;
    const rentDue = calculation?.rentDue !== undefined ? calculation.rentDue : totalDue;
    const utilities = calculation?.unpaidUtilities || calculation?.breakdown?.utilities || [];

    const utilityRows = utilities.map(u => `
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 14px;">${u.name}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">KES ${Number(u.amount).toLocaleString()}</td>
        </tr>
    `).join('');

    const content = `
        <!-- Title Badge -->
        <div style="margin-bottom: 24px;">
            <span style="background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 6px;">
                Payment Statement
            </span>
            <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 12px 0 6px 0; letter-spacing: -0.5px;">
                ${reminderTitle || 'Rent & Utilities Payment Reminder'}
            </h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                Notice issued for <strong>Unit ${unitNumber || 'Assigned Unit'}</strong>
            </p>
        </div>

        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
            Dear <strong>${tenantName}</strong>,
        </p>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            ${reminderDescription || `This is a friendly reminder that your balance for <strong>Unit ${unitNumber || ''}</strong> is scheduled for payment. Please review the itemized breakdown below.`}
        </p>

        <!-- Balance Card -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; color: #ffffff; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td>
                        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Total Balance Outstanding</span>
                        <div style="font-size: 32px; font-weight: 800; color: #38bdf8; margin-top: 4px; letter-spacing: -1px;">
                            KES ${Number(totalDue).toLocaleString()}
                        </div>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                            Due: ${formattedDueDate}
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Breakdown Table -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Item Description</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Amount Due</th>
                </tr>
            </thead>
            <tbody>
                ${rentDue > 0 ? `
                <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 14px;">House Rent (Unit ${unitNumber || ''})</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">KES ${Number(rentDue).toLocaleString()}</td>
                </tr>
                ` : ''}
                ${utilityRows}
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 14px 16px; color: #0f172a; font-size: 15px; font-weight: 700;">Total Payable</td>
                    <td style="padding: 14px 16px; color: #0f172a; font-size: 16px; font-weight: 800; text-align: right;">KES ${Number(totalDue).toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <!-- Payment Channel / Instructions Box -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                Payment Instructions
            </div>
            <p style="margin: 0; font-size: 13.5px; color: #15803d; line-height: 1.5;">
                Kindly settle via your designated property M-Pesa Paybill, Bank Account, or mobile payment channel using <strong>Unit ${unitNumber || ''}</strong> as your reference.
            </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0; font-style: italic;">
            Note: If you have already made this payment within the last 24 hours, thank you! Please disregard this reminder.
        </p>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            Warm regards,<br>
            <strong>${propertyName || settings?.orgName || 'Property Management Team'}</strong>
        </p>
    `;

    return getEmailTemplate(reminderTitle || 'Payment Reminder', content, settings, { propertyName });
};

/**
 * Corporate Payment Receipt Email Body
 */
const getReceiptEmailBody = (payment, tenantName, settings, propertyName) => {
    const amount = Number(payment.amount || 0).toLocaleString();
    const date = new Date(payment.date || Date.now()).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = new Date(payment.date || Date.now()).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const businessName = propertyName || settings?.orgName || 'MakaziFlow';
    const reference = payment.reference || payment._id?.toString().substring(0, 8).toUpperCase();

    const content = `
        <!-- Title Badge -->
        <div style="margin-bottom: 20px;">
            <span style="background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 10px; border-radius: 6px;">
                Payment Confirmed
            </span>
            <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 12px 0 4px 0; letter-spacing: -0.5px;">
                Official Payment Receipt
            </h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                Receipt Ref: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">#${reference}</span>
            </p>
        </div>

        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
            Dear <strong>${tenantName}</strong>,
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            We confirm receipt of your payment. A detailed, official PDF receipt with complete tax & breakdown records is attached to this email.
        </p>

        <!-- Summary Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding-bottom: 12px; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600;">Amount Received</td>
                    <td style="padding-bottom: 12px; color: #0f172a; font-size: 22px; font-weight: 800; text-align: right; color: #059669;">
                        KES ${amount}
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Payment Method</td>
                    <td style="padding-bottom: 8px; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right; text-transform: uppercase;">
                        ${payment.method || 'M-Pesa'}
                    </td>
                </tr>
                <tr>
                    <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Date & Time</td>
                    <td style="padding-bottom: 8px; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">
                        ${date} at ${time}
                    </td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 13px;">Transaction / Receipt Reference</td>
                    <td style="color: #0f172a; font-size: 13px; text-align: right; font-family: monospace; font-weight: 700;">
                        ${reference}
                    </td>
                </tr>
            </table>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            Thank you for your prompt payment and continued partnership.
        </p>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            Best regards,<br>
            <strong>${businessName}</strong>
        </p>
    `;

    return getEmailTemplate('Payment Receipt', content, settings, { propertyName: businessName });
};

module.exports = {
    getEmailTemplate,
    getReceiptEmailBody,
    getCorporateReminderEmailBody
};
