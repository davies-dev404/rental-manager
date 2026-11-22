/**
 * Corporate Email Templates for MakaziFlow
 * Modern SHA-inspired card layout: royal-blue hero banner, highlighted amount card,
 * rounded detail rows, green confirmation box, and mobile-responsive dark-slate styling.
 */

const BUSINESS_CONFIG = require('../config/businessConfig');
const { escapeHtml } = require('../middleware/securityMiddleware');
const {
  resolveMpesaPaymentDetails,
  resolvePaymentPurpose,
  resolveInvoicePurposeLabel
} = require('./shaPdfHelpers');

const getEmailTemplate = (title, content, settings, options = {}) => {
    const companyName = (settings?.companyName || settings?.orgName || "").trim();
    const landlordName = (settings?.landlordName || "").trim();
    const propName = (options.propertyName || "").trim();
    const orgName = companyName || propName || landlordName || "Property Management";
    const safeOrgName = escapeHtml(orgName);
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
    const safeDefaultSubtitle = escapeHtml(defaultSubtitle);

    const heroTitle = escapeHtml(options.heroTitle || title || "Official Notice");
    const heroSubtitle = escapeHtml(options.heroSubtitle || defaultSubtitle);
    const heroIcon = escapeHtml(options.heroIcon || "✓");
    const safeTitle = escapeHtml(title);

    const logoHtml = orgLogo && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(orgLogo)
      ? `<img src="${orgLogo}" alt="${safeOrgName}" style="max-height: 36px; max-width: 110px; border-radius: 6px; background: #ffffff; padding: 3px; vertical-align: middle; margin-right: 10px;" />`
      : "";

    const safeEmail = escapeHtml(orgEmail);
    const safePhone = escapeHtml(orgPhone);
    const supportLinks = [];
    if (orgEmail) {
      supportLinks.push(`<a href="mailto:${safeEmail}" style="color: #00d4c8; text-decoration: none; font-weight: 600;">${safeEmail}</a>`);
    }
    if (orgPhone) {
      supportLinks.push(`<a href="tel:${safePhone}" style="color: #00d4c8; text-decoration: none; font-weight: 600;">${safePhone}</a>`);
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
    <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0b1120; padding: 24px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #131823; border-radius: 16px; overflow: hidden; border: 1px solid #263042; box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);">
                    
                    <!-- MakaziFlow Navy & Teal Gradient Hero Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0a1e35 0%, #0d2240 60%, #00a99d 100%); padding: 26px 32px 32px 32px; text-align: center; border-bottom: 3px solid #00d4c8;">
                            <!-- Top Brand Row -->
                            <div style="margin-bottom: 20px; text-align: center;">
                                ${logoHtml}<span style="font-size: 13px; font-weight: 700; color: #ccfbf1; letter-spacing: 0.4px; vertical-align: middle;">${safeOrgName}</span>
                                ${subtitleParts.length > 0 ? `<div style="font-size: 11px; color: #99f6e4; margin-top: 4px; font-weight: 500;">${safeDefaultSubtitle}</div>` : ''}
                            </div>
                            <!-- Circular Emblem -->
                            <div style="width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background-color: rgba(0, 212, 200, 0.20); border: 1px solid rgba(0, 212, 200, 0.45); color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 auto 14px auto; text-align: center;">
                                ${heroIcon}
                            </div>
                            <!-- Hero Headline & Subtitle -->
                            <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                                ${heroTitle}
                            </h1>
                            <p style="margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.4;">
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
                        <td style="background-color: #0d1522; padding: 20px 32px; border-top: 1px solid #263042; text-align: center;">
                            <p style="margin: 0 0 4px 0; color: #e2e8f0; font-size: 12.5px; font-weight: 700;">
                                ${safeOrgName}
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 11px;">
                                &copy; ${new Date().getFullYear()} ${safeOrgName}. All rights reserved.
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
                <td style="color: #94a3b8; font-size: 12.5px; font-weight: 500; text-align: left;">${escapeHtml(label)}</td>
                <td style="color: #f8fafc; font-size: 13px; font-weight: 700; text-align: right;">${escapeHtml(value)}</td>
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

    const safeTenant = escapeHtml(tenantName);
    const safeProp = escapeHtml(propertyName);
    const safeUnit = escapeHtml(unitNumber || 'Assigned Unit');
    const safeUnitShort = escapeHtml(unitNumber || 'Assigned');
    const safeDesc = reminderDescription ? escapeHtml(reminderDescription).replace(/\n/g, '<br/>') : '';

    const content = `
        <p style="color: #f8fafc; font-size: 15px; font-weight: 700; margin: 0 0 10px 0;">
            Dear ${safeTenant},
        </p>

        <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0 0 22px 0;">
            ${safeDesc || `This is a friendly reminder regarding your outstanding balance for <strong>${safeProp ? `${safeProp} — ` : ''}Unit ${safeUnit}</strong>. Please review the details below.`}
        </p>

        <!-- Highlighted Hero Amount Card -->
        <div style="background-color: #1c2331; border: 1px solid #2d3748; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">
                AMOUNT DUE
            </div>
            <div style="font-size: 32px; font-weight: 800; color: #00d4c8; letter-spacing: -0.5px; margin-bottom: 12px;">
                ${escapeHtml(currency)} ${Number(totalDue).toLocaleString()}
            </div>
            <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.18); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35); font-size: 11.5px; font-weight: 700; padding: 5px 14px; border-radius: 999px;">
                Due: ${escapeHtml(formattedDueDate)}
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
            Kindly settle via your designated M-Pesa Paybill, Bank Account, or payment channel using <strong>Unit ${safeUnitShort}</strong> as your reference. If already paid, thank you and please disregard this notice.
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
 * Renders a corporate SHA-style white document email in MakaziFlow Colors (Deep Navy + Signature Teal)
 * used by both Official Receipt Emails and Invoice Emails.
 */
const renderShaDocumentEmail = ({
    docTitle = 'PAYMENT RECEIPT',
    docSubtitle = '',
    settings = {},
    propertyName = '',
    col1Title = 'TENANT DETAILS',
    col1Fields = [],
    col2Title = 'RECEIPT DETAILS',
    col2Fields = [],
    col3Title = 'PAYMENT DETAILS',
    col3Fields = [],
    bannerText = 'PAID',
    bannerColor = '#00a99d',
    summaryTitle = 'PAYMENT SUMMARY',
    summaryColumns = ['BILLING PERIOD', 'DESCRIPTION', 'TOTAL PAID', 'DATE GENERATED'],
    summaryRows = [],
    calloutText = '',
    footerRefLabel = 'Ref #',
    footerRefValue = ''
} = {}) => {
    const companyName = (settings?.companyName || settings?.orgName || '').trim();
    const landlordName = (settings?.landlordName || '').trim();
    const propName = (propertyName || '').trim();
    const businessName = companyName || propName || landlordName || 'Property Management';
    const businessEmail = (settings?.orgEmail || '').trim();
    const businessPhone = (settings?.orgPhone || '').trim();
    const orgLogo = (settings?.orgLogo || '').trim();

    const safeBusinessName = escapeHtml(businessName);
    const logoHtml = orgLogo && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(orgLogo)
        ? `<img src="${orgLogo}" alt="${safeBusinessName}" style="max-height: 36px; max-width: 90px; vertical-align: middle; margin-left: 10px;" />`
        : '';

    const contactLine = [businessPhone, businessEmail].filter(Boolean).map(escapeHtml).join(' | ');

    const renderColumn = (title, fields) => {
        const itemsHtml = (fields || [])
            .filter((f) => f && f.value !== undefined && f.value !== null && String(f.value).trim() !== '')
            .map((f) => `
                <div style="margin-bottom: 9px;">
                    <div style="font-size: 10.5px; font-weight: 700; color: #0d2240; line-height: 1.3;">${escapeHtml(f.label)}</div>
                    <div style="font-size: 11.5px; font-weight: ${f.bold ? '700' : '400'}; color: ${escapeHtml(f.color || '#0f172a')}; line-height: 1.4; word-break: break-word;">${escapeHtml(String(f.value))}</div>
                </div>
            `).join('');

        return `
            <td width="33.33%" valign="top" style="padding: 0 8px 0 0; width: 33.33%;">
                <div style="border-left: 3px solid #00a99d; padding-left: 7px; margin-bottom: 12px; font-size: 11px; font-weight: 800; color: #00a99d; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${escapeHtml(title)}
                </div>
                ${itemsHtml}
            </td>
        `;
    };

    const rowsHtml = (summaryRows || []).map((row) => {
        const cells = Array.isArray(row) ? row : [];
        return `
            <tr>
                ${cells.map((cell, idx) => {
                    const isRight = idx >= 2;
                    return `<td style="padding: 10px 10px; font-size: 11.5px; color: #0f172a; border-bottom: 1px solid #e2e8f0; text-align: ${isRight ? 'right' : 'left'}; vertical-align: top;">${escapeHtml(String(cell ?? ''))}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${escapeHtml(docTitle)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="max-width: 680px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
                    <!-- Top MakaziFlow Navy -> Teal Gradient Accent Bar -->
                    <tr>
                        <td style="height: 10px; background-color: #0d2240; background-image: linear-gradient(90deg, #0a1e35 0%, #0d2240 45%, #00a99d 75%, #00d4c8 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding: 22px 28px 28px 28px;">
                            <!-- Top-Right Org Branding -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="right" style="text-align: right; padding-bottom: 16px;">
                                        <div style="font-size: 15px; font-weight: 800; color: #0d2240;">
                                            ${safeBusinessName}${logoHtml}
                                        </div>
                                        ${propName && propName.toLowerCase() !== businessName.toLowerCase() ? `<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">Property: ${escapeHtml(propName)}</div>` : ''}
                                        ${landlordName && landlordName.toLowerCase() !== businessName.toLowerCase() ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">Landlord: ${escapeHtml(landlordName)}</div>` : ''}
                                        ${contactLine ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">${contactLine}</div>` : ''}
                                    </td>
                                </tr>
                            </table>

                            <!-- Centered Document Title & Teal Subtitle -->
                            <div style="text-align: center; padding: 4px 0 22px 0;">
                                <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1.5px; text-transform: uppercase;">
                                    ${escapeHtml(docTitle)}
                                </div>
                                ${docSubtitle ? `<div style="font-size: 11.5px; font-weight: 700; color: #00a99d; letter-spacing: 0.6px; margin-top: 5px; text-transform: uppercase;">${escapeHtml(docSubtitle)}</div>` : ''}
                            </div>

                            <!-- 3-Column Details Block -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 18px;">
                                <tr>
                                    ${renderColumn(col1Title, col1Fields)}
                                    ${renderColumn(col2Title, col2Fields)}
                                    ${renderColumn(col3Title, col3Fields)}
                                </tr>
                            </table>

                            <!-- Full-Width Bold Status Banner -->
                            <div style="background-color: ${escapeHtml(bannerColor)}; color: #ffffff; text-align: center; padding: 11px 16px; font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; border-radius: 3px; margin-bottom: 22px;">
                                ${escapeHtml(bannerText)}
                            </div>

                            <!-- Summary Section -->
                            <div style="border-left: 3px solid #00a99d; padding-left: 7px; margin-bottom: 10px; font-size: 11px; font-weight: 800; color: #00a99d; text-transform: uppercase; letter-spacing: 0.6px;">
                                ${escapeHtml(summaryTitle)}
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; margin-bottom: 18px;">
                                <thead>
                                    <tr style="background-color: #0d2240;">
                                        ${(summaryColumns || []).map((col, idx) => `
                                            <th style="padding: 9px 10px; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.4px; text-align: ${idx >= 2 ? 'right' : 'left'};">${escapeHtml(col)}</th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>

                            ${calloutText ? `
                                <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-left: 3px solid #00a99d; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; color: #0f172a; font-size: 11.5px; line-height: 1.5; text-align: center;">
                                    ${escapeHtml(calloutText)}
                                </div>
                            ` : ''}

                            <!-- Centered Footer -->
                            <div style="text-align: center; padding-top: 10px; color: #64748b; font-size: 11px; line-height: 1.5;">
                                Thank you for your business | ${safeBusinessName}${footerRefValue ? ` | ${escapeHtml(footerRefLabel)} ${escapeHtml(footerRefValue)}` : ''}
                            </div>
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
 * Corporate Payment Receipt Email Body (SHA Layout in MakaziFlow Colors)
 */
const getReceiptEmailBody = (payment, tenantName, settings = {}, propertyName = '', unitNumber = '') => {
    const dt = new Date(payment.date || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDateTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    const billingPeriod = payment.monthCovered || `${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    const currency = settings?.currency || payment.currency || 'KES';
    const amountFormatted = Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const companyName = (settings?.companyName || settings?.orgName || '').trim();
    const landlordName = (settings?.landlordName || '').trim();
    const businessName = companyName || propertyName || landlordName || 'Property Management';

    const reference = payment.reference || payment._id?.toString().substring(0, 8).toUpperCase() || 'REF-000000';
    const invoiceRef = (
        payment.invoiceNumber ||
        (typeof payment.invoiceId === 'object' ? payment.invoiceId?.invoiceNumber : '') ||
        ''
    ).trim();
    const resolvedUnit = unitNumber || (typeof payment.unitId === 'object' ? payment.unitId?.unitNumber : '') || '';
    const propertyUnitText = propertyName
        ? `${propertyName}${resolvedUnit ? ` — Unit ${resolvedUnit}` : ''}`
        : (resolvedUnit ? `Unit ${resolvedUnit}` : businessName);

    const purpose = resolvePaymentPurpose({
        ...(typeof payment.toObject === 'function' ? payment.toObject() : payment),
        unitNumber: resolvedUnit
    });

    const acctFallback = payment.accountNumber || payment.tenantId?.accountNumber || settings?.paybillAccount || '';
    const mpesa = resolveMpesaPaymentDetails(settings, acctFallback);

    const col1Fields = [
        { label: 'NAME:', value: String(tenantName || payment.tenantId?.name || 'Valued Tenant').toUpperCase() },
        { label: 'PROPERTY / UNIT:', value: propertyUnitText }
    ];
    if (payment.tenantId?.email) col1Fields.push({ label: 'EMAIL:', value: payment.tenantId.email });
    if (payment.tenantId?.phone) col1Fields.push({ label: 'PHONE:', value: payment.tenantId.phone });

    const col2Fields = [
        { label: 'Receipt Number:', value: reference },
        ...(invoiceRef
            ? [
                { label: 'Receipt For:', value: `Invoice #${invoiceRef} (${purpose.purposeText})`, bold: true, color: '#00a99d' },
                { label: 'Invoice For:', value: purpose.purposeText, bold: true }
              ]
            : [{ label: 'Payment For:', value: purpose.purposeText, bold: true }]
        ),
        { label: 'Period Covered:', value: billingPeriod },
        { label: 'Total Amount:', value: `${currency}. ${amountFormatted}`, bold: true },
        { label: 'Date Generated:', value: formattedDateTime }
    ];

    const col3Fields = [
        { label: 'Organisation:', value: businessName },
        { label: 'Payment Mode:', value: String(payment.method || 'M-PESA').replace(/_/g, ' ').toUpperCase() }
    ];
    if (mpesa.mpesaType === 'Till') {
        if (mpesa.shortcode) col3Fields.push({ label: 'Till Number:', value: mpesa.shortcode });
    } else {
        if (mpesa.shortcode) col3Fields.push({ label: 'Paybill Number:', value: mpesa.shortcode });
        if (mpesa.showAccountNumber && mpesa.accountNumber) {
            col3Fields.push({ label: 'Account Number:', value: mpesa.accountNumber });
        }
    }
    col3Fields.push({ label: 'Payer:', value: tenantName || payment.tenantId?.name || 'Tenant' });
    col3Fields.push({ label: 'Amount Paid:', value: `${currency} ${amountFormatted}`, bold: true });

    const rawStatus = String(payment.status || 'PAID').toUpperCase();
    const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);
    const bannerText = isPaid ? 'PAID' : rawStatus;
    const bannerColor = isPaid ? '#00a99d' : (rawStatus === 'PARTIAL' ? '#d97706' : '#dc2626');

    const summaryRows = (purpose.lineItems.length > 0
        ? purpose.lineItems
        : [{ desc: `${purpose.purposeText}${resolvedUnit ? ` (Unit ${resolvedUnit})` : ''}`, amt: payment.amount }]
    ).map((r) => [
        billingPeriod,
        r.desc,
        `${currency} ${Number(r.amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formattedDateTime
    ]);

    return renderShaDocumentEmail({
        docTitle: invoiceRef ? 'INVOICE PAYMENT RECEIPT' : 'PAYMENT RECEIPT',
        docSubtitle: invoiceRef
            ? `RECEIPT FOR INVOICE #${invoiceRef} — ${purpose.purposeText}`
            : `PAYMENT FOR: ${purpose.purposeText}`,
        settings,
        propertyName,
        col1Title: 'TENANT DETAILS',
        col1Fields,
        col2Title: 'RECEIPT DETAILS',
        col2Fields,
        col3Title: 'PAYMENT DETAILS',
        col3Fields,
        bannerText,
        bannerColor,
        summaryTitle: 'PAYMENT SUMMARY',
        summaryColumns: ['BILLING PERIOD', 'DESCRIPTION', 'TOTAL PAID', 'DATE GENERATED'],
        summaryRows,
        calloutText: 'A copy of your official PDF receipt is attached to this email for your records.',
        footerRefLabel: 'Ref #',
        footerRefValue: reference
    });
};

/**
 * Corporate Invoice Email Body (SHA Layout in MakaziFlow Colors)
 */
const getInvoiceEmailBody = (invoice, settings = {}) => {
    const isSub = invoice.invoiceCategory === 'subscription';
    const invRef = String(invoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
    const purposeText = resolveInvoicePurposeLabel(invoice);
    const currency = settings?.currency || invoice.currency || 'KES';
    const totalFormatted = Number(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const issuedDt = new Date(invoice.issuedAt || invoice.createdAt || Date.now());
    const dueDt = new Date(invoice.dueDate || Date.now());
    const fmtDate = (d) => (!isNaN(d.getTime()) ? d.toLocaleDateString('en-KE') : 'N/A');
    const billingPeriod = invoice.billingPeriod || `${String(issuedDt.getMonth() + 1).padStart(2, '0')}/${issuedDt.getFullYear()}`;
    const propName = isSub ? '' : String(invoice.propertyName || '').trim();
    const unitInfo = String(invoice.unitNumber || '').trim();
    const businessName = isSub
        ? BUSINESS_CONFIG.name
        : (settings?.companyName || settings?.orgName || propName || settings?.landlordName || 'Property Management');

    const col1Fields = [
        { label: 'NAME:', value: String(invoice.customerName || 'Valued Tenant').toUpperCase() }
    ];
    if (!isSub && (propName || unitInfo)) {
        col1Fields.push({
            label: 'PROPERTY / UNIT:',
            value: propName && unitInfo ? `${propName} — Unit ${unitInfo}` : (propName || `Unit ${unitInfo}`)
        });
    }
    if (invoice.customerEmail) col1Fields.push({ label: 'EMAIL:', value: invoice.customerEmail });
    if (invoice.customerPhone) col1Fields.push({ label: 'PHONE:', value: invoice.customerPhone });

    const col2Fields = [
        { label: 'Invoice Number:', value: invRef },
        { label: 'Invoice For:', value: purposeText, bold: true, color: '#00a99d' },
        { label: 'Billing Period:', value: billingPeriod },
        { label: 'Issued Date:', value: fmtDate(issuedDt) },
        { label: 'Due Date:', value: fmtDate(dueDt) },
        { label: 'Total Amount:', value: `${currency} ${totalFormatted}`, bold: true }
    ];

    const col3Fields = [{ label: 'Organisation:', value: businessName }];
    if (!isSub) {
        const acctFallback = invoice.accountNumber || settings?.paybillAccount || (unitInfo || invRef);
        const mpesa = resolveMpesaPaymentDetails(settings, acctFallback);
        if (mpesa.mpesaType === 'Till') {
            if (mpesa.shortcode) col3Fields.push({ label: 'Till Number:', value: mpesa.shortcode });
        } else {
            if (mpesa.shortcode) col3Fields.push({ label: 'Paybill Number:', value: mpesa.shortcode });
            if (mpesa.showAccountNumber && mpesa.accountNumber) {
                col3Fields.push({ label: 'Account Number:', value: mpesa.accountNumber });
            }
        }
        if (settings?.orgPhone) col3Fields.push({ label: 'Contact Phone:', value: settings.orgPhone });
    }

    const rawStatus = String(invoice.status || 'OPEN').toUpperCase();
    const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);
    const bannerText = isPaid ? 'PAID' : (rawStatus === 'OPEN' || rawStatus === 'PENDING' ? 'PAYMENT DUE' : rawStatus);
    const bannerColor = isPaid ? '#00a99d' : (rawStatus === 'PARTIAL' ? '#d97706' : (rawStatus === 'OVERDUE' ? '#dc2626' : '#0d2240'));

    const items = Array.isArray(invoice.items) && invoice.items.length > 0
        ? invoice.items
        : [{ description: `${purposeText}${unitInfo ? ` (Unit ${unitInfo})` : ''}`, taxRate: 0, totalAmount: invoice.totalAmount || 0 }];

    const summaryRows = items.map((it) => [
        billingPeriod,
        it.description || purposeText,
        `${Number(it.taxRate || 0)}%`,
        `${currency} ${Number(it.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    return renderShaDocumentEmail({
        docTitle: isSub ? 'SUBSCRIPTION INVOICE' : 'RENTAL INVOICE',
        docSubtitle: `INVOICE #${invRef} — ${purposeText}`,
        settings,
        propertyName: propName,
        col1Title: 'BILL TO',
        col1Fields,
        col2Title: 'INVOICE DETAILS',
        col2Fields,
        col3Title: 'PAYMENT DETAILS',
        col3Fields,
        bannerText,
        bannerColor,
        summaryTitle: 'INVOICE SUMMARY',
        summaryColumns: ['BILLING PERIOD', 'DESCRIPTION', 'VAT %', `TOTAL (${currency})`],
        summaryRows,
        calloutText: settings?.invoiceFootnote || 'A copy of your official PDF invoice is attached. Please remit payment by the due date.',
        footerRefLabel: 'Invoice #',
        footerRefValue: invRef
    });
};

/**
 * SHA-Layout One-Time Password (OTP) Verification Email styled in MakaziFlow Brand Colors
 */
const getOtpEmailBody = ({
    name = 'User',
    otp = '',
    title = 'Your One-Time Password (OTP)',
    subtitle = 'Secure verification for your account',
    instruction = 'Use the verification code below to continue your sign-in securely.',
    expiryMinutes = 3,
    warningText = 'If you did not request this code, please ignore this email or contact support immediately.',
    orgName = BUSINESS_CONFIG.name || 'MakaziFlow'
}) => {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);
    const safeName = escapeHtml(String(name || 'User').trim());
    const safeInstruction = escapeHtml(instruction);
    const safeWarning = escapeHtml(warningText);
    const safeOrgName = escapeHtml(String(orgName || 'MakaziFlow').trim());
    const digits = String(otp || '').trim().split('').filter(Boolean);

    const digitCellsHtml = digits.map((digit) => `
        <td style="padding: 0 5px;">
            <div style="width: 44px; height: 50px; line-height: 50px; background-color: #1c2434; border: 1.5px solid #00a99d; border-radius: 10px; color: #00d4c8; font-size: 22px; font-weight: 800; font-family: 'Courier New', Courier, monospace, sans-serif; text-align: center;">
                ${escapeHtml(digit)}
            </div>
        </td>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0b1120; padding: 28px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="540" style="max-width: 540px; width: 100%; margin: 0 auto; background-color: #131823; border-radius: 16px; overflow: hidden; border: 1px solid #263042; box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.55);">
                    <!-- MakaziFlow Navy-to-Teal Gradient Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0a1e35 0%, #0d2240 58%, #00a99d 100%); padding: 28px 32px; text-align: center; border-bottom: 3px solid #00d4c8;">
                            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #99f6e4; margin-bottom: 8px;">
                                ${safeOrgName}
                            </div>
                            <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                                ${safeTitle}
                            </h1>
                            <p style="margin: 0; font-size: 13px; color: #ccfbf1; line-height: 1.4;">
                                ${safeSubtitle}
                            </p>
                        </td>
                    </tr>

                    <!-- Dark Card Body -->
                    <tr>
                        <td style="padding: 34px 32px 28px 32px; background-color: #131823; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 19px; font-weight: 800; color: #ffffff;">
                                Hello ${safeName},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 13.5px; color: #cbd5e1; line-height: 1.55;">
                                ${safeInstruction}
                            </p>

                            <!-- Individual Rounded Digit Boxes -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 24px auto;">
                                <tr>
                                    ${digitCellsHtml}
                                </tr>
                            </table>

                            <p style="margin: 0 0 22px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                                This code expires in <strong style="color: #f8fafc;">${Number(expiryMinutes) || 3} minutes</strong>. If it expires, request a new one and try again.
                            </p>

                            <!-- Security Warning Callout Box -->
                            <div style="background-color: #171e2b; border: 1px solid #273244; border-radius: 10px; padding: 14px 18px; margin: 0 0 24px 0; color: #cbd5e1; font-size: 12.5px; line-height: 1.5; text-align: center;">
                                ${safeWarning}
                            </div>

                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #94a3b8;">
                                ${safeOrgName}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0d1522; padding: 18px 32px; border-top: 1px solid #263042; text-align: center;">
                            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 11.5px;">
                                Copyright &copy; ${new Date().getFullYear()}. All Rights Reserved.
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 11.5px; font-weight: 600;">
                                ${safeOrgName}
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

module.exports = {
    getEmailTemplate,
    renderShaDocumentEmail,
    getReceiptEmailBody,
    getInvoiceEmailBody,
    getCorporateReminderEmailBody,
    getOtpEmailBody,
    renderDetailRow
};
