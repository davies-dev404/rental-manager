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


            // --- Watermark (Background) ---
            doc.save();
            doc.rotate(-45, { origin: [300, 400] });
            doc.fontSize(100).fillColor('#f1f5f9').opacity(0.5).text('DWELLO', 100, 400, { align: 'center', width: 400 });
            doc.restore();

            // --- Header With Logo ---
            const logoPath = require('path').join(__dirname, '../assets/logo.png');
            try {
                doc.image(logoPath, 50, 45, { width: 80 }); 
            } catch (e) {
                console.warn("Logo not found:", e.message);
                // Fallback text if logo missing
                 doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text('Dwello', 50, 55);
            }

            // --- Business Info (Top Right) ---
            const businessName = settings?.orgName || "Dwello"; // Default to Dwello
            const businessEmail = settings?.orgEmail || "support@dwello.com";
            const businessPhone = settings?.orgPhone || "";
            const businessAddress = settings?.orgAddress || "";

            doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text(businessName, { align: 'right' });
            if (businessEmail) doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(businessEmail, { align: 'right' });
            if (businessPhone) doc.text(businessPhone, { align: 'right' });
            if (businessAddress) doc.text(businessAddress, { align: 'right' });

            // --- Title ---
            doc.moveDown(4); // Move past logo
            doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('PAYMENT RECEIPT', 50, doc.y, { align: 'left', characterSpacing: 2 });
            
            if (payment._id) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`#${payment._id.toString().substring(0, 8).toUpperCase()}`, { align: 'left' });
            }
            
            doc.moveDown(1.5);

            // --- Divider ---
            doc.strokeColor('#e2e8f0').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
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
            doc.rect(50, doc.y, 495, 100).fill('#f8fafc'); 
            let amountY = doc.y + 20;
            
            doc.fillColor(primaryColor);
            
            // Rent Row
            if (payment.rentAmount > 0) {
                doc.fontSize(10).font('Helvetica').text('Rent Payment', 70, amountY);
                doc.text(`${payment.rentAmount.toLocaleString()}`, 450, amountY, { align: 'right' });
                amountY += 20;
            }

            // Deposit Row
            if (payment.depositAmount > 0) {
                doc.fontSize(10).font('Helvetica').text('Security Deposit', 70, amountY);
                doc.text(`${payment.depositAmount.toLocaleString()}`, 450, amountY, { align: 'right' });
                amountY += 20;
            }

            // Total Row
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(70, amountY + 5).lineTo(525, amountY + 5).stroke();
            doc.fontSize(14).font('Helvetica-Bold').text('TOTAL PAID', 70, amountY + 15);
            const amount = typeof payment.amount === 'number' ? payment.amount.toLocaleString() : '0';
            doc.fontSize(20).font('Helvetica-Bold').fillColor(accentColor).text(`${amount}`, 450, amountY + 10, { align: 'right' });

            // Ensure we don't overflow
            const footerY = 750; // Fixed position near bottom of A4 (approx 842 height)
            
            // --- Footer ---
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('Thank you for choosing Dwello!', 50, footerY, { align: 'center', width: 500 });
            doc.fontSize(8).text('Computer generated receipt, no signature required.', 50, footerY + 15, { align: 'center', width: 500 });
            
            doc.end();
        } catch (error) {
            console.error("PDF Generation Logic Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };
