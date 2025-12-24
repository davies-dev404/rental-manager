const getEmailTemplate = (title, content, settings) => {
    const orgName = settings?.orgName || "Dwello";
    const orgEmail = settings?.orgEmail || "support@dwello.com";
    const primaryColor = "#0f172a";
    const accentColor = "#10b981";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
            <td style="padding: 40px 20px; text-align: center;">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: ${primaryColor}; padding: 30px 40px; text-align: center;">
                             <!-- Logo Placeholder - Ideally use a hosted URL for images in email -->
                             <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">${orgName.toUpperCase()}</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">${orgEmail}</p>
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

const getReceiptEmailBody = (payment, tenantName, settings) => {
    const amount = payment.amount.toLocaleString();
    const date = new Date(payment.date).toLocaleDateString();
    
    const content = `
        <h2 style="color: #0f172a; margin-top: 0;">Payment Receipt</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Dear ${tenantName},</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">We have successfully received your payment. A detailed PDF receipt is attached to this email.</p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding-bottom: 10px; color: #64748b; font-size: 14px;">Amount Paid</td>
                    <td style="padding-bottom: 10px; color: #0f172a; font-size: 18px; font-weight: bold; text-align: right;">Ksh ${amount}</td>
                </tr>
                <tr>
                    <td style="padding-bottom: 10px; color: #64748b; font-size: 14px;">Date</td>
                    <td style="padding-bottom: 10px; color: #0f172a; font-size: 16px; text-align: right;">${date}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-size: 14px;">Reference ID</td>
                    <td style="color: #0f172a; font-size: 14px; text-align: right; font-family: monospace;">${payment._id}</td>
                </tr>
            </table>
        </div>

        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Thank you for your timely payment.</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Best regards,<br><strong>${settings?.orgName || 'Dwello Team'}</strong></p>
    `;
    return getEmailTemplate('Payment Receipt', content, settings);
};

module.exports = { getEmailTemplate, getReceiptEmailBody };
