const Payment = require('../models/Payment');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const sendEmail = require('./sendEmail');
const sendSMS = require('./sendSMS');
const { generateReceiptPDF } = require('./generateReceiptPDF');
const { getReceiptEmailBody } = require('./emailTemplates');
const { getUserBusinessProfile } = require('./getUserBusinessProfile');

/**
 * Helper to resolve property name from unit or payment
 */
const getPropertyNameForPayment = async (payment) => {
    try {
        let unitDoc = payment.unitId;
        if (unitDoc && typeof unitDoc !== 'object') {
            unitDoc = await Unit.findById(unitDoc);
        }
        if (unitDoc && unitDoc.propertyId) {
            const property = await Property.findById(unitDoc.propertyId);
            return property?.name || null;
        }
    } catch (e) {
        console.warn("Could not resolve property name for receipt:", e.message);
    }
    return null;
};

/**
 * Universal Payment Receipt Dispatcher:
 * 1. Generates branded PDF receipt
 * 2. Delivers corporate Email Receipt with PDF attached to tenant.email
 * 3. Delivers instant SMS Receipt confirmation to tenant.phone
 */
const sendPaymentReceipt = async (paymentId) => {
    try {
        console.log(`🧾 Dispatching payment receipts for: ${paymentId}`);
        const payment = await Payment.findOne({ _id: paymentId })
            .populate('tenantId', 'name email phone')
            .populate('unitId', 'unitNumber propertyId');

        if (!payment) {
            console.error(`Receipt Dispatch: Payment not found for ID ${paymentId}`);
            return { success: false, reason: 'Payment not found' };
        }

        const tenant = payment.tenantId;
        if (!tenant) {
            console.warn(`Receipt Dispatch: No tenant associated with payment ${paymentId}`);
            return { success: false, reason: 'No tenant found' };
        }

        const settings = await getUserBusinessProfile(payment.user);
        const propertyName = await getPropertyNameForPayment(payment);
        const businessName = settings?.orgName || propertyName || 'Property Management';
        const unitNumber = payment.unitId?.unitNumber ? `Unit ${payment.unitId.unitNumber}` : 'your unit';
        const reference = payment.reference || payment._id.toString().substring(0, 8).toUpperCase();
        const amountFormatted = Number(payment.amount || 0).toLocaleString();

        let emailSent = false;
        let emailError = null;

        // 1. Send Corporate Email Receipt with Attached PDF (Strictly via Brevo Email)
        if (!tenant.email || !String(tenant.email).includes('@')) {
            emailError = `Tenant "${tenant.name}" does not have a valid email address.`;
            console.warn(`⚠️ ${emailError}`);
            return { success: false, emailSent: false, smsSent: false, reason: emailError };
        }

        try {
            console.log(`Generating PDF receipt for ${tenant.email}...`);
            const pdfBuffer = await generateReceiptPDF(payment, settings, propertyName);
            const emailHtml = getReceiptEmailBody(payment, tenant.name, settings, propertyName);

            await sendEmail({
                email: tenant.email,
                fromName: businessName,
                replyToEmail: settings?.orgEmail || undefined,
                subject: `Official Payment Receipt - ${businessName} - #${reference}`,
                message: emailHtml,
                attachments: [
                    {
                        filename: `Receipt-${businessName.replace(/\s+/g, '_')}-${reference}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            });
            emailSent = true;
            console.log(`📧 Receipt PDF emailed strictly to ${tenant.email}`);
        } catch (err) {
            emailError = err.message || 'Brevo email delivery failed';
            console.error(`❌ Failed to email receipt to ${tenant.email}:`, emailError);
        }

        // Receipts are configured to be sent strictly via email
        return {
            success: emailSent,
            emailSent,
            smsSent: false,
            reason: emailError
        };
    } catch (error) {
        console.error("Critical error in sendPaymentReceipt:", error);
        throw error;
    }
};

module.exports = {
    sendPaymentReceipt,
    getPropertyNameForPayment
};
