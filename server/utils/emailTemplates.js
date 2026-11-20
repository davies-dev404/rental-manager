/**
 * Corporate Email Templates for MakaziFlow
 * Modern SHA-inspired card layout: royal-blue hero banner, highlighted amount card,
 * rounded detail rows, green confirmation box, and mobile-responsive dark-slate styling.
 */

const BUSINESS_CONFIG = require('../config/businessConfig');

const getEmailTemplate = (title, content, settings, options = {}) => {
    const companyName = (settings?.companyName || settings?.orgName || "").trim();
    const landlordName = (settings?.landlordName || "").trim();
    const propName = (options.propertyName || "").trim();
    const orgName = companyName || propName || landlordName || "Property Management";
    const orgLogo = (settings?.orgLogo || "").trim();
    const orgEmail = (settings?.orgEmail || "").trim();
    const orgPhone = (settings?.orgPhone || "").trim();

    const subtitleParts = [];
    if (companyName && propName && propName.toLowerCase() !== companyName.toLowerCase()) {
      subtitleParts.push(propName);
    }
    if (landlordName && landlordName.toLowerCase() !== orgName.toLowerCase()) {
      subtitleParts.push(`Landlord: ${landlordName}`);
    }
    const defaultSubtitle = subtitleParts.length > 0 ? subtitleParts.join(" • ") : "Official Property Notice";

    const heroTitle = options.heroTitle || title || "Official Notice";
    const heroSubtitle = options.heroSubtitle || defaultSubtitle;
    const heroIcon = options.heroIcon || "✓";

    const logoHtml = orgLogo && orgLogo.startsWith("data:image/")
      ? `<img src="${orgLogo}" alt="${orgName}" style="max-height: 36px; max-width: 110px; border-radius: 6px; background: #ffffff; padding: 3px; vertical-align: middle; margin-right: 10px;" />`
      : "";

    const supportLinks = [];
    if (orgEmail) {
      supportLinks.push(`<a href="mailto:${orgEmail}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${orgEmail}</a>`);
    }
    if (orgPhone) {
      supportLinks.push(`<a href="tel:${orgPhone}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${orgPhone}</a>`);
    }
    const supportHtml = supportLinks.length > 0
      ? `<p style="margin: 22px 0 4px 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">Questions? Reach us at ${supportLinks.join(' &nbsp;|&nbsp; ')}.<br/>We're happy to help.</p>`
      : `<p style="margin: 22px 0 4px 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">We're happy to help with any questions regarding your tenancy.</p>`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0b1120; padding: 24px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #131823; border-radius: 16px; overflow: hidden; border: 1px solid #263042; box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Royal Blue Gradient Hero Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #1e40af 100%); padding: 26px 32px 32px 32px; text-align: center;">
                            <!-- Top Brand Row -->
                            <div style="margin-bottom: 20px; text-align: center;">
                                ${logoHtml}<span style="font-size: 13px; font-weight: 700; color: #e0e7ff; letter-spacing: 0.4px; vertical-align: middle;">${orgName}</span>
                                ${subtitleParts.length > 0 ? `<div style="font-size: 11px; color: #bfdbfe; margin-top: 4px; font-weight: 500;">${defaultSubtitle}</div>` : ''}
                            </div>
                            <!-- Circular Emblem -->
                            <div style="width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background-color: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 auto 14px auto; text-align: center;">
                                ${heroIcon}
                            </div>
                            <!-- Hero Headline & Subtitle -->
                            <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                                ${heroTitle}
                            </h1>
                            <p style="margin: 0; font-size: 13px; color: #dbeafe; line-height: 1.4;">
                                ${heroSubtitle}
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 30px 32px 24px 32px; background-color: #131823; color: #e2e8f0;">
                            ${content}
                            ${supportHtml}
                        </td>
                    </tr>

                    <!-- Footer Strip -->
                    <tr>
                        <td style="background-color: #171d29; padding: 20px 32px; border-top: 1px solid #263042; text-align: center;">
                            <p style="margin: 0 0 4px 0; color: #cbd5e1; font-size: 12.5px; font-weight: 700;">
                                The ${orgName} Team
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 11px;">
                                &copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.
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

const renderDetailRow = (label, value) => `
    <div style="background-color: #171e2b; border: 1px solid #273244; border-radius: 8px; padding: 11px 14px; margin-bottom: 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
                <td style="color: #94a3b8; font-size: 12.5px; font-weight: 500; text-align: left;">${label}</td>
                <td style="color: #f8fafc; font-size: 13px; font-weight: 700; text-align: right;">${value}</td>
            </tr>
        </table>
    </div>
`;

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
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Upon Receipt';
    const totalDue = calculation?.totalDue !== undefined ? calculation.totalDue : 0;
    const rentDue = calculation?.rentDue !== undefined ? calculation.rentDue : totalDue;
    const utilities = calculation?.unpaidUtilities || calculation?.breakdown?.utilities || [];
    const companyName = (settings?.companyName || settings?.orgName || "").trim();
    const landlordName = (settings?.landlordName || "").trim();
    const orgName = companyName || propertyName || landlordName || 'Property Management';
    const currency = settings?.currency || 'KES';

    const utilityRows = utilities.map(u =>
        renderDetailRow(u.name || 'Utility', `${currency} ${Number(u.amount || 0).toLocaleString()}`)
    ).join('');

    const content = `
        <p style="color: #f8fafc; font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">
            Dear ${tenantName},
        </p>

        <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0 0 22px 0;">
            ${reminderDescription || `This is a friendly reminder regarding your outstanding balance for <strong>${propertyName ? `${propertyName} — ` : ''}Unit ${unitNumber || 'Assigned Unit'}</strong>. Please review the details below.`}
        </p>

        <!-- Highlighted Hero Amount Card -->
        <div style="background-color: #1c2331; border: 1px solid #2d3748; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">
                AMOUNT DUE
            </div>
            <div style="font-size: 32px; font-weight: 800; color: #60a5fa; letter-spacing: -0.5px; margin-bottom: 12px;">
                ${currency} ${Number(totalDue).toLocaleString()}
            </div>
            <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.18); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35); font-size: 11.5px; font-weight: 700; padding: 5px 14px; border-radius: 999px;">
                Due: ${formattedDueDate}
            </span>
        </div>

        <!-- Payment Details Rows -->
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px;">
            PAYMENT DETAILS
        </div>
        ${propertyName || unitNumber ? renderDetailRow('Property / Unit', `${propertyName || orgName}${unitNumber ? ` — Unit ${unitNumber}` : ''}`) : ''}
        ${rentDue > 0 ? renderDetailRow(`House Rent (Unit ${unitNumber || 'Assigned'})`, `${currency} ${Number(rentDue).toLocaleString()}`) : ''}
        ${utilityRows}
        ${renderDetailRow('Organisation', orgName)}
        ${landlordName && landlordName.toLowerCase() !== orgName.toLowerCase() ? renderDetailRow('Landlord', landlordName) : ''}

        <!-- Soft Green Instructions Box -->
        <div style="background-color: #0f2419; border: 1px solid #1e4d30; border-radius: 10px; padding: 14px 16px; margin-top: 18px; color: #6ee7b7; font-size: 12.5px; line-height: 1.5; text-align: center;">
            Kindly settle via your designated M-Pesa Paybill, Bank Account, or payment channel using <strong>Unit ${unitNumber || 'Assigned'}</strong> as your reference. If already paid, thank you and please disregard this notice.
        </div>
    `;

    return getEmailTemplate(reminderTitle || 'Payment Reminder', content, settings, {
        propertyName,
        heroTitle: reminderTitle || 'Payment Reminder!',
        heroSubtitle: `Statement notice for ${propertyName ? `${propertyName} — ` : ''}Unit ${unitNumber || 'Assigned Unit'}`,
        heroIcon: '!'
    });
};

/**
 * Corporate Payment Receipt Email Body (SHA Style)
 */
const getReceiptEmailBody = (payment, tenantName, settings, propertyName, unitNumber = '') => {
    const amount = Number(payment.amount || 0).toLocaleString();
    const date = new Date(payment.date || Date.now()).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    const companyName = (settings?.companyName || settings?.orgName || "").trim();
    const landlordName = (settings?.landlordName || "").trim();
    const businessName = companyName || propertyName || landlordName || 'Property Management';
    const reference = payment.reference || payment._id?.toString().substring(0, 8).toUpperCase();
    const currency = settings?.currency || 'KES';
    const resolvedUnit = unitNumber || (typeof payment.unitId === 'object' ? payment.unitId?.unitNumber : '') || '';
    const propertyUnitText = propertyName
        ? `${propertyName}${resolvedUnit ? ` (Unit ${resolvedUnit})` : ''}`
        : (resolvedUnit ? `Unit ${resolvedUnit}` : businessName);

    const content = `
        <p style="color: #f8fafc; font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">
            Dear ${tenantName},
        </p>
        <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0 0 22px 0;">
            Great news — we have successfully received and processed your payment. Thank you for keeping your rental account up to date.
        </p>

        <!-- Highlighted Hero Amount Card -->
        <div style="background-color: #1c2331; border: 1px solid #2d3748; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">
                AMOUNT PAID
            </div>
            <div style="font-size: 34px; font-weight: 800; color: #60a5fa; letter-spacing: -0.5px; margin-bottom: 12px;">
                ${currency} ${amount}
            </div>
            <span style="display: inline-block; background-color: rgba(37, 99, 235, 0.22); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.35); font-size: 11.5px; font-weight: 700; padding: 5px 14px; border-radius: 999px;">
                ✓ Payment Successful
            </span>
        </div>

        <!-- Payment Details Rows -->
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px;">
            PAYMENT DETAILS
        </div>
        ${renderDetailRow('Receipt / Reference Number', reference)}
        ${renderDetailRow('Property / Unit', propertyUnitText)}
        ${renderDetailRow('Organisation', businessName)}
        ${landlordName && landlordName.toLowerCase() !== businessName.toLowerCase() ? renderDetailRow('Landlord', landlordName) : ''}
        ${renderDetailRow('Payment Mode & Date', `${String(payment.method || 'M-Pesa').toUpperCase()} &bull; ${date}`)}

        <!-- Soft Green Attached Receipt Callout Box -->
        <div style="background-color: #0f2419; border: 1px solid #1e4d30; border-radius: 10px; padding: 14px 16px; margin-top: 18px; color: #6ee7b7; font-size: 12.5px; line-height: 1.5; text-align: center;">
            A copy of your official payment receipt is attached to this email. Please retain it for your records or for any future reference.
        </div>
    `;

    return getEmailTemplate('Payment Confirmed!', content, settings, {
        propertyName,
        heroTitle: 'Payment Confirmed!',
        heroSubtitle: 'Your payment has been successfully received',
        heroIcon: '✓'
    });
};

module.exports = {
    getEmailTemplate,
    getReceiptEmailBody,
    getCorporateReminderEmailBody,
    renderDetailRow
};
