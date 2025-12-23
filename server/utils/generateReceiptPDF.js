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
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
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

            // --- Business Info (Top Right) ---
            const businessName = settings?.orgName || "Rental Manager";
            const businessEmail = settings?.orgEmail || "";
            const businessPhone = settings?.orgPhone || "";
            const businessAddress = settings?.orgAddress || "";

            doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text(businessName || "M", { align: 'right' });
            if (businessEmail) doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(businessEmail, { align: 'right' });
            if (businessPhone) doc.text(businessPhone, { align: 'right' });
            if (businessAddress) doc.text(businessAddress, { align: 'right' });

            // --- Title (Top Left) ---
            doc.moveUp(3); 
            doc.fontSize(30).font('Helvetica-Bold').fillColor(primaryColor).text('RECEIPT', { align: 'left' });
            if (payment._id) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`Payment ID: #${payment._id.toString().substring(0, 8).toUpperCase()}`, { align: 'left' });
            }
            
            doc.moveDown(2);

            // --- Divider ---
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(2);

            // --- Main Info Grid ---
            const startY = doc.y;
            
            // Column 1: Tenant Info
            doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text('BILLED TO', 50, startY);
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(payment.tenantId?.name || "Unknown Tenant");
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(payment.tenantId?.email || "");
            const unitInfo = typeof payment.unitId === 'object' ? (payment.unitId?.unitNumber || 'N/A') : payment.unitId;
            doc.text(`Unit: ${unitInfo || 'N/A'}`);

            // Column 2: Payment Details
            doc.fontSize(10).font('Helvetica-Bold').fillColor(secondaryColor).text('PAYMENT DETAILS', 300, startY);
            doc.moveDown(0.5);
            
            doc.font('Helvetica').fillColor(secondaryColor).text('Date:', 300);
            doc.font('Helvetica-Bold').fillColor(primaryColor).text(new Date(payment.date || Date.now()).toLocaleDateString(), 400, doc.y - 12);
            
            doc.font('Helvetica').fillColor(secondaryColor).text('Method:', 300);
            const method = payment.method ? payment.method.replace('_', ' ').toUpperCase() : 'UNKNOWN';
            doc.font('Helvetica-Bold').fillColor(primaryColor).text(method, 400, doc.y - 12);

            doc.font('Helvetica').fillColor(secondaryColor).text('Status:', 300);
            const status = payment.status ? payment.status.toUpperCase() : 'UNKNOWN';
            doc.font('Helvetica-Bold').fillColor(status === 'PAID' ? accentColor : '#f59e0b').text(status, 400, doc.y - 12);

            doc.moveDown(3);

            // --- Amount Box ---
            doc.rect(50, doc.y, 495, 80).fill('#f8fafc'); 
            let amountY = doc.y + 15;
            
            doc.fillColor(primaryColor);
            
            // Rent Row
            if (payment.rentAmount > 0) {
                doc.fontSize(10).font('Helvetica').text('Rent Amount', 70, amountY);
                doc.text(`${payment.rentAmount.toLocaleString()}`, 450, amountY, { align: 'right' });
                amountY += 15;
            }

            // Deposit Row
            if (payment.depositAmount > 0) {
                doc.fontSize(10).font('Helvetica').text('Security Deposit', 70, amountY);
                doc.text(`${payment.depositAmount.toLocaleString()}`, 450, amountY, { align: 'right' });
                amountY += 15;
            }

            // Total Row
            doc.fontSize(12).font('Helvetica-Bold').text('TOTAL PAID', 70, amountY + 5);
            const amount = typeof payment.amount === 'number' ? payment.amount.toLocaleString() : '0';
            doc.fontSize(18).font('Helvetica-Bold').fillColor(accentColor).text(`${amount}`, 450, amountY + 2, { align: 'right' });

            doc.moveDown(5);

            // --- Footer ---
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('Thank you for your payment!', { align: 'center' });
            
            doc.end();
        } catch (error) {
            console.error("PDF Generation Logic Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };
