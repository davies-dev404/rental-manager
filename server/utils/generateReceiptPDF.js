const PDFDocument = require('pdfkit');

/**
 * Generates a professional, corporate-branded PDF Receipt for a payment
 * @param {Object} payment - Populated payment object (tenantId, unitId populated)
 * @param {Object} settings - System settings for business info
 * @param {String} propertyName - Property name (optional, for branding)
 * @returns {Promise<Buffer>} - PDF Buffer
 */
const generateReceiptPDF = (payment, settings, propertyName) => {
    return new Promise((resolve, reject) => {
        try {
            console.log("Generating PDF for payment:", payment._id);
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

            // --- Brand Colors ---
            const primaryColor = '#0f172a';
            const secondaryColor = '#64748b';
            const accentColor = '#10b981';
            const borderColor = '#e2e8f0';
            const lightBg = '#f8fafc';
            const successBg = '#f0fdf4';

            // --- Business Info ---
            const businessName = propertyName || settings?.orgName || "MakaaziHub";
            const businessEmail = settings?.orgEmail || "";
            const businessPhone = settings?.orgPhone || "";
            const businessAddress = settings?.orgAddress || "";
            const taxId = settings?.taxId || "";
            const currency = settings?.currency || "KES";

            // --- Watermark ---
            doc.save();
            doc.rotate(-45, { origin: [300, 400] });
            doc.fontSize(70).font('Helvetica-Bold').fillColor('#f1f5f9').opacity(0.35)
               .text(businessName.toUpperCase(), 0, 400, { align: 'center', width: 600 });
            doc.restore();

            // =====================================================
            // HEADER SECTION
            // =====================================================
            let yPos = 50;

            // Logo attempt
            const logoPath = require('path').join(__dirname, '../assets/logo.png');
            try {
                doc.image(logoPath, 50, yPos, { width: 70 }); 
            } catch (e) {
                // Fallback: styled text logo
                doc.fontSize(22).font('Helvetica-Bold').fillColor(accentColor).text('●', 50, yPos + 5);
                doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor).text(businessName, 68, yPos + 8);
            }

            // Company Info (Right Aligned)
            doc.fontSize(15).font('Helvetica-Bold').fillColor(primaryColor)
               .text(businessName, 280, yPos, { align: 'right', width: 265 });
            yPos += 20;
            if (businessEmail) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(businessEmail, 280, yPos, { align: 'right', width: 265 });
                yPos += 13;
            }
            if (businessPhone) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(businessPhone, 280, yPos, { align: 'right', width: 265 });
                yPos += 13;
            }
            if (businessAddress) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(businessAddress, 280, yPos, { align: 'right', width: 265 });
                yPos += 13;
            }
            if (taxId) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(`Tax ID: ${taxId}`, 280, yPos, { align: 'right', width: 265 });
                yPos += 13;
            }

            // =====================================================
            // ACCENT STRIPE
            // =====================================================
            yPos = 135;
            doc.rect(50, yPos, 495, 4).fill(accentColor);
            yPos += 15;

            // =====================================================
            // RECEIPT TITLE & RECEIPT NUMBER
            // =====================================================
            doc.fontSize(22).font('Helvetica-Bold').fillColor(primaryColor)
               .text('PAYMENT RECEIPT', 50, yPos, { characterSpacing: 1.5 });
            
            const receiptNo = payment._id ? `#${payment._id.toString().substring(0, 8).toUpperCase()}` : '#--------';
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
               .text(`Receipt No: ${receiptNo}`, 350, yPos + 5, { align: 'right', width: 195 });
            
            const receiptDate = new Date(payment.date || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
               .text(`Date: ${receiptDate}`, 350, yPos + 20, { align: 'right', width: 195 });

            yPos += 50;

            // Thin divider
            doc.strokeColor(borderColor).lineWidth(1).moveTo(50, yPos).lineTo(545, yPos).stroke();
            yPos += 20;

            // =====================================================
            // TWO-COLUMN INFO GRID
            // =====================================================
            const col1X = 50;
            const col2X = 320;

            // ── Left Column: BILLED TO ──
            doc.fontSize(9).font('Helvetica-Bold').fillColor(accentColor).text('BILLED TO', col1X, yPos);
            let leftY = yPos + 16;
            doc.fontSize(13).font('Helvetica-Bold').fillColor(primaryColor)
               .text(payment.tenantId?.name || "Unknown Tenant", col1X, leftY);
            leftY += 18;
            if (payment.tenantId?.email) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(payment.tenantId.email, col1X, leftY);
                leftY += 13;
            }
            const unitInfo = typeof payment.unitId === 'object' 
                ? (payment.unitId?.unitNumber || 'N/A') 
                : (payment.unitId || 'N/A');
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
               .text(`Unit: ${unitInfo}`, col1X, leftY);
            leftY += 13;
            if (propertyName) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
                   .text(`Property: ${propertyName}`, col1X, leftY);
                leftY += 13;
            }

            // ── Right Column: PAYMENT DETAILS ──
            doc.fontSize(9).font('Helvetica-Bold').fillColor(accentColor).text('PAYMENT DETAILS', col2X, yPos);
            let rightY = yPos + 16;

            const drawDetailRow = (label, value, color = primaryColor) => {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor).text(label, col2X, rightY);
                doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(value, col2X + 90, rightY);
                rightY += 16;
            };

            drawDetailRow('Date:', receiptDate);
            drawDetailRow('Time:', new Date(payment.date || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            drawDetailRow('Method:', payment.method ? payment.method.replace('_', ' ').toUpperCase() : 'CASH');
            if (payment.reference) {
                drawDetailRow('Reference:', payment.reference);
            }
            if (payment.monthCovered) {
                drawDetailRow('Month:', payment.monthCovered);
            }
            const status = payment.status ? payment.status.toUpperCase() : 'UNKNOWN';
            const statusColor = ['PAID', 'COMPLETED'].includes(status) ? accentColor : '#f59e0b';
            drawDetailRow('Status:', status, statusColor);

            // =====================================================
            // PAYMENT BREAKDOWN TABLE
            // =====================================================
            yPos = Math.max(leftY, rightY) + 30;

            // Table header background
            doc.rect(50, yPos, 495, 30).fill('#f1f5f9');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569')
               .text('DESCRIPTION', 70, yPos + 10)
               .text('AMOUNT', 430, yPos + 10, { align: 'right', width: 80 });
            yPos += 30;

            // Table rows
            const drawTableRow = (description, amount, isBold = false) => {
                doc.strokeColor(borderColor).lineWidth(0.5)
                   .moveTo(50, yPos).lineTo(545, yPos).stroke();
                
                doc.fontSize(10).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fillColor(isBold ? primaryColor : '#475569')
                   .text(description, 70, yPos + 8);
                doc.fontSize(10).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fillColor(isBold ? accentColor : primaryColor)
                   .text(`${currency} ${Number(amount).toLocaleString()}`, 430, yPos + 8, { align: 'right', width: 80 });
                yPos += 28;
            };

            if (payment.rentAmount > 0) {
                drawTableRow('Rent Payment', payment.rentAmount);
            }
            if (payment.depositAmount > 0) {
                drawTableRow('Security Deposit', payment.depositAmount);
            }
            // Individual utility breakdown
            if (payment.utilities && Array.isArray(payment.utilities) && payment.utilities.length > 0) {
                payment.utilities.forEach(u => {
                    if (u.amount > 0) {
                        drawTableRow(`Utility - ${u.name || 'Other'}`, u.amount);
                    }
                });
            } else if (payment.utilityAmount > 0) {
                drawTableRow('Utilities', payment.utilityAmount);
            }

            // If only total amount available and no breakdown rows were drawn
            if ((!payment.rentAmount || payment.rentAmount <= 0) && 
                (!payment.depositAmount || payment.depositAmount <= 0) && 
                (!payment.utilityAmount || payment.utilityAmount <= 0)) {
                drawTableRow(payment.type || 'Payment', payment.amount);
            }

            // Total row
            yPos += 5;
            doc.rect(50, yPos, 495, 40).fill(successBg);
            doc.rect(50, yPos, 495, 40).strokeColor(accentColor).lineWidth(1).stroke();
            doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
               .text('TOTAL PAID', 70, yPos + 13);
            const amount = typeof payment.amount === 'number' ? payment.amount.toLocaleString() : '0';
            doc.fontSize(18).font('Helvetica-Bold').fillColor(accentColor)
               .text(`${currency} ${amount}`, 380, yPos + 10, { align: 'right', width: 130 });

            // =====================================================
            // AMOUNT IN WORDS (optional nice touch)
            // =====================================================
            yPos += 55;
            doc.fontSize(8).font('Helvetica').fillColor(secondaryColor)
               .text(`Amount: ${currency} ${amount}`, 50, yPos);

            // =====================================================
            // FOOTER
            // =====================================================
            const footerY = 720;
            
            // Footer divider
            doc.strokeColor(borderColor).lineWidth(1)
               .moveTo(50, footerY - 15).lineTo(545, footerY - 15).stroke();

            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
               .text(`Thank you for choosing ${businessName}!`, 50, footerY, { align: 'center', width: 495 });
            doc.fontSize(8).font('Helvetica').fillColor(secondaryColor)
               .text('This is a computer-generated receipt. No signature is required.', 50, footerY + 16, { align: 'center', width: 495 });
            doc.fontSize(7).font('Helvetica').fillColor('#cbd5e1')
               .text(`Generated on ${new Date().toLocaleString()} | ${businessName}`, 50, footerY + 32, { align: 'center', width: 495 });

            doc.end();
        } catch (error) {
            console.error("PDF Generation Logic Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };
