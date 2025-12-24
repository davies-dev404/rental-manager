const PDFDocument = require('pdfkit');

/**
 * Generates a PDF Receipt for a payment
 * @param {Object} payment - Populated payment object
 * @param {Object} settings - System settings for business info
 * @returns {Promise<Buffer>} - PDF Buffer
 */
const generateReceiptPDF = (payment, settings) => {
    return new Promise((resolve, reject) => {
        try {
            console.log("Generating PDF for payment:", payment._id);
            // Create a document and enable buffer collection
            const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            
            doc.on('error', (err) => {
                console.error("PDFKit Error:", err);
                reject(err);
            });

            // --- Colors ---
            const primaryColor = '#0f172a';
            const secondaryColor = '#64748b';
            const accentColor = '#10b981';

            // --- Watermark (Absolute Positioning) ---
            doc.save();
            doc.rotate(-45, { origin: [300, 400] });
            doc.fontSize(100).font('Helvetica-Bold').fillColor('#f1f5f9').opacity(0.5).text('DWELLO', 0, 400, { align: 'center', width: 600 });
            doc.restore();

            // --- Header Section (Top) ---
            let yPos = 50;

            // Logo
            const logoPath = require('path').join(__dirname, '../assets/logo.png');
            try {
                doc.image(logoPath, 50, yPos, { width: 80 }); 
            } catch (e) {
                // Fallback text if logo missing
                 doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text('Dwello', 50, yPos + 10);
            }

            // Business Info (Right Aligned)
            const businessName = settings?.orgName || "Dwello";
            const businessEmail = settings?.orgEmail || "support@dwello.com";
            const businessPhone = settings?.orgPhone || "";
            const businessAddress = settings?.orgAddress || "";

            doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor).text(businessName, 300, yPos, { align: 'right', width: 250 });
            yPos += 20;
            if (businessEmail) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(businessEmail, 300, yPos, { align: 'right', width: 250 });
                yPos += 12;
            }
            if (businessPhone) {
                doc.text(businessPhone, 300, yPos, { align: 'right', width: 250 });
                yPos += 12;
            }
            if (businessAddress) {
                doc.text(businessAddress, 300, yPos, { align: 'right', width: 250 });
            }

            // --- Title & ID ---
            yPos = 140; 
            doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text('PAYMENT RECEIPT', 50, yPos, { align: 'left', characterSpacing: 1 });
            yPos += 25;
            if (payment._id) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`#${payment._id.toString().substring(0, 8).toUpperCase()}`, 50, yPos, { align: 'left' });
            }

            yPos += 20;
            // Divider
            doc.strokeColor('#e2e8f0').lineWidth(2).moveTo(50, yPos).lineTo(545, yPos).stroke();
            yPos += 20;

            // --- Info Grid ---
            const col1X = 50;
            const col2X = 350;
            
            // Column 1: Tenant
            doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text('BILLED TO', col1X, yPos);
            let leftY = yPos + 15;
            doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(payment.tenantId?.name || "Unknown Tenant", col1X, leftY);
            leftY += 15;
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(payment.tenantId?.email || "", col1X, leftY);
            leftY += 12;
            const unitInfo = typeof payment.unitId === 'object' ? (payment.unitId?.unitNumber || 'N/A') : payment.unitId;
            doc.text(`Unit: ${unitInfo || 'N/A'}`, col1X, leftY);

            // Column 2: Details
            doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text('PAYMENT DETAILS', col2X, yPos);
            let rightY = yPos + 15;
            
            // Helper for detail rows
            const drawDetailRow = (label, value, color = primaryColor, isBold = true) => {
                doc.font('Helvetica').fillColor(secondaryColor).text(label, col2X, rightY);
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color).text(value, col2X + 80, rightY);
                rightY += 14;
            };

            drawDetailRow('Date:', new Date(payment.date || Date.now()).toLocaleDateString());
            drawDetailRow('Method:', payment.method ? payment.method.replace('_', ' ').toUpperCase() : 'UNKNOWN');
            const status = payment.status ? payment.status.toUpperCase() : 'UNKNOWN';
            drawDetailRow('Status:', status, status === 'PAID' ? accentColor : '#f59e0b');

            // --- Amount Box ---
            yPos = Math.max(leftY, rightY) + 40; // Start below the lowest column
            
            // Box Background
            doc.rect(50, yPos, 495, 100).fill('#f8fafc'); 
            
            let amountContentY = yPos + 20;
            doc.fillColor(primaryColor);

            // Rent & Deposit
            if (payment.rentAmount > 0) {
                doc.fontSize(10).font('Helvetica').text('Rent Payment', 70, amountContentY);
                doc.text(`${payment.rentAmount.toLocaleString()}`, 450, amountContentY, { align: 'right' });
                amountContentY += 20;
            }
            if (payment.depositAmount > 0) {
                doc.font('Helvetica').text('Security Deposit', 70, amountContentY);
                doc.text(`${payment.depositAmount.toLocaleString()}`, 450, amountContentY, { align: 'right' });
                amountContentY += 20;
            }

            // Divider inside box
            const dividerY = Math.max(amountContentY, yPos + 60); 
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(70, dividerY).lineTo(525, dividerY).stroke();

            // Total
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('TOTAL PAID', 70, dividerY + 15);
            const amount = typeof payment.amount === 'number' ? payment.amount.toLocaleString() : '0';
            doc.fontSize(20).font('Helvetica-Bold').fillColor(accentColor).text(`${amount}`, 450, dividerY + 10, { align: 'right' });

            // --- Footer (Fixed Position) ---
            const footerY = 750;
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('Thank you for choosing Dwello!', 50, footerY, { align: 'center', width: 495 });
            doc.fontSize(8).text('Computer generated receipt, no signature required.', 50, footerY + 15, { align: 'center', width: 495 });
            
            doc.end();
        } catch (error) {
            console.error("PDF Generation Logic Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };
