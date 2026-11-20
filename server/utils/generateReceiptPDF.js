const PDFDocument = require('pdfkit');
const { decodeLogoDataUrl } = require('./getUserBusinessProfile');

/**
 * Generates an official, SHA-style corporate PDF Receipt for a payment:
 * - Top full-width green-to-blue gradient accent bar
 * - Top-right organization logo & property/landlord branding
 * - Centered bold "PAYMENT RECEIPT" title
 * - 3-column metadata block with green left bars (TENANT DETAILS | RECEIPT DETAILS | PAYMENT DETAILS)
 * - Full-width bold green PAID banner bar
 * - PAYMENT SUMMARY section with royal-blue table header & itemized breakdown
 * - Centered footer with business name & receipt reference
 */
const generateReceiptPDF = (payment, settings, propertyName) => {
    return new Promise((resolve, reject) => {
        try {
            console.log("Generating PDF for payment:", payment._id);
            const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
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

            // --- Brand Palette (SHA Style) ---
            const greenAccent = '#15803d';
            const paidBannerGreen = '#038a0c';
            const royalBlue = '#0b5394';
            const labelBlue = '#1e40af';
            const darkText = '#1e293b';
            const mutedText = '#475569';
            const borderColor = '#e2e8f0';

            // --- Business & Property Info ---
            const companyName = (settings?.companyName || settings?.orgName || "").trim();
            const landlordName = (settings?.landlordName || "").trim();
            const businessName = companyName || propertyName || landlordName || "Property Management";
            const businessEmail = (settings?.orgEmail || "").trim();
            const businessPhone = (settings?.orgPhone || "").trim();
            const taxId = (settings?.taxId || "").trim();
            const currency = settings?.currency || "KES";
            const customLogoBuffer = decodeLogoDataUrl(settings?.orgLogo);

            const receiptRef = payment.reference || (payment._id ? payment._id.toString().substring(0, 8).toUpperCase() : 'REF-000000');
            const dt = new Date(payment.date || Date.now());
            const pad = (n) => String(n).padStart(2, '0');
            const formattedDateTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
            const billingPeriod = payment.monthCovered || `${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
            const formattedAmount = Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const tenantName = payment.tenantId?.name || "Tenant";
            const unitInfo = typeof payment.unitId === 'object'
                ? (payment.unitId?.unitNumber || 'N/A')
                : (payment.unitId || 'N/A');

            // =====================================================
            // 1. TOP GRADIENT BAR (Green -> Teal -> Royal Blue)
            // =====================================================
            const grad = doc.linearGradient(24, 24, 571, 24);
            grad.stop(0, '#4ade80')
                .stop(0.35, '#0ea5e9')
                .stop(0.75, '#1d4ed8')
                .stop(1, '#1e3a8a');
            doc.rect(24, 24, 547, 10).fill(grad);

            // =====================================================
            // 2. TOP-RIGHT BRAND LOGO & PROPERTY / COMPANY HEADER
            // =====================================================
            let headerY = 42;
            const rightBlockX = 290;
            const rightBlockW = 269;

            if (customLogoBuffer) {
                try {
                    doc.image(customLogoBuffer, 505, headerY, { fit: [54, 34] });
                    doc.fontSize(11).font('Helvetica-Bold').fillColor(royalBlue)
                       .text(businessName, rightBlockX, headerY + 2, { align: 'right', width: 206 });
                    headerY += 16;
                    if (companyName && propertyName && propertyName.toLowerCase() !== companyName.toLowerCase()) {
                        doc.fontSize(8).font('Helvetica').fillColor(mutedText)
                           .text(`Property: ${propertyName}`, rightBlockX, headerY, { align: 'right', width: 206 });
                        headerY += 11;
                    }
                } catch {
                    doc.fontSize(12).font('Helvetica-Bold').fillColor(royalBlue)
                       .text(businessName, rightBlockX, headerY, { align: 'right', width: rightBlockW });
                    headerY += 16;
                }
            } else {
                doc.fontSize(12).font('Helvetica-Bold').fillColor(royalBlue)
                   .text(businessName, rightBlockX, headerY, { align: 'right', width: rightBlockW });
                headerY += 16;
                if (companyName && propertyName && propertyName.toLowerCase() !== companyName.toLowerCase()) {
                    doc.fontSize(8).font('Helvetica-Bold').fillColor(mutedText)
                       .text(`Property: ${propertyName}`, rightBlockX, headerY, { align: 'right', width: rightBlockW });
                    headerY += 11;
                }
            }

            if (landlordName && landlordName.toLowerCase() !== businessName.toLowerCase()) {
                doc.fontSize(8).font('Helvetica').fillColor(mutedText)
                   .text(`Landlord: ${landlordName}`, rightBlockX, headerY, { align: 'right', width: customLogoBuffer ? 206 : rightBlockW });
                headerY += 11;
            }
            if (businessPhone || businessEmail) {
                const contactLine = [businessPhone, businessEmail].filter(Boolean).join(' | ');
                doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
                   .text(contactLine, rightBlockX, headerY, { align: 'right', width: customLogoBuffer ? 206 : rightBlockW });
                headerY += 11;
            }

            // =====================================================
            // 3. CENTERED "PAYMENT RECEIPT" TITLE
            // =====================================================
            let yPos = Math.max(96, headerY + 12);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(darkText)
               .text('PAYMENT RECEIPT', 36, yPos, { align: 'center', width: 523, characterSpacing: 1.5 });
            yPos += 34;

            // =====================================================
            // 4. THREE-COLUMN METADATA GRID (with Green Left Bars)
            // =====================================================
            const drawColHeader = (x, y, titleText) => {
                doc.rect(x, y, 2.5, 11).fill(greenAccent);
                doc.fontSize(8.5).font('Helvetica-Bold').fillColor(greenAccent)
                   .text(titleText, x + 7, y + 1);
            };

            const drawColField = (x, y, colWidth, label, value) => {
                doc.fontSize(8).font('Helvetica-Bold').fillColor(labelBlue)
                   .text(label, x, y, { width: colWidth });
                const valStr = String(value || 'N/A');
                const valY = y + 10;
                doc.fontSize(8.5).font('Helvetica').fillColor(darkText)
                   .text(valStr, x, valY, { width: colWidth });
                const valHeight = doc.heightOfString(valStr, { width: colWidth });
                return valY + Math.max(12, valHeight) + 6;
            };

            const col1X = 36;
            const col2X = 216;
            const col3X = 396;
            const colW = 164;

            // Col 1: TENANT DETAILS
            drawColHeader(col1X, yPos, 'TENANT DETAILS');
            let c1Y = yPos + 18;
            c1Y = drawColField(col1X, c1Y, colW, 'NAME:', tenantName.toUpperCase());
            c1Y = drawColField(col1X, c1Y, colW, 'PROPERTY / UNIT:', propertyName ? `${propertyName} — Unit ${unitInfo}` : `Unit ${unitInfo}`);
            if (payment.tenantId?.email) {
                c1Y = drawColField(col1X, c1Y, colW, 'EMAIL:', payment.tenantId.email);
            }
            if (payment.tenantId?.phone) {
                c1Y = drawColField(col1X, c1Y, colW, 'PHONE:', payment.tenantId.phone);
            }

            // Col 2: RECEIPT DETAILS
            drawColHeader(col2X, yPos, 'RECEIPT DETAILS');
            let c2Y = yPos + 18;
            c2Y = drawColField(col2X, c2Y, colW, 'Receipt Number:', receiptRef);
            c2Y = drawColField(col2X, c2Y, colW, 'Period Covered:', billingPeriod);
            c2Y = drawColField(col2X, c2Y, colW, 'Total Amount:', `${currency}. ${formattedAmount}`);
            c2Y = drawColField(col2X, c2Y, colW, 'Date Generated:', formattedDateTime);

            // Col 3: PAYMENT DETAILS
            drawColHeader(col3X, yPos, 'PAYMENT DETAILS');
            let c3Y = yPos + 18;
            c3Y = drawColField(col3X, c3Y, colW, 'Organisation:', businessName);
            c3Y = drawColField(col3X, c3Y, colW, 'Payment Mode:', String(payment.method || 'CASH').replace(/_/g, ' ').toUpperCase());
            c3Y = drawColField(col3X, c3Y, colW, 'Payer:', tenantName);
            c3Y = drawColField(col3X, c3Y, colW, 'Amount Paid:', `${currency} ${formattedAmount}`);
            if (taxId) {
                c3Y = drawColField(col3X, c3Y, colW, 'KRA / Tax PIN:', taxId);
            }

            // =====================================================
            // 5. FULL-WIDTH BOLD STATUS BANNER BAR (PAID / PENDING)
            // =====================================================
            yPos = Math.max(c1Y, c2Y, c3Y) + 10;
            const rawStatus = String(payment.status || 'PAID').toUpperCase();
            const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);
            const bannerText = isPaid ? 'PAID' : rawStatus;
            const bannerColor = isPaid ? paidBannerGreen : (rawStatus === 'PARTIAL' ? '#d97706' : '#dc2626');

            doc.rect(36, yPos, 523, 32).fill(bannerColor);
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
               .text(bannerText, 36, yPos + 10, { align: 'center', width: 523, characterSpacing: 1.5 });
            yPos += 48;

            // =====================================================
            // 6. PAYMENT SUMMARY SECTION & ROYAL-BLUE TABLE
            // =====================================================
            drawColHeader(36, yPos, 'PAYMENT SUMMARY');
            yPos += 18;

            // Royal-Blue Header Bar
            doc.rect(36, yPos, 523, 24).fill(royalBlue);
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
               .text('BILLING PERIOD', 46, yPos + 8, { width: 95 })
               .text('DESCRIPTION', 148, yPos + 8, { width: 170 })
               .text('TOTAL PAID', 325, yPos + 8, { width: 105, align: 'right' })
               .text('DATE GENERATED', 440, yPos + 8, { width: 110, align: 'right' });
            yPos += 24;

            const rows = [];
            if (payment.rentAmount > 0) {
                rows.push({ desc: `Rent Payment (Unit ${unitInfo})`, amt: payment.rentAmount });
            }
            if (payment.depositAmount > 0) {
                rows.push({ desc: 'Security Deposit', amt: payment.depositAmount });
            }
            if (payment.utilities && Array.isArray(payment.utilities) && payment.utilities.length > 0) {
                payment.utilities.forEach(u => {
                    if (Number(u.amount) > 0) {
                        rows.push({ desc: `Utility - ${u.name || 'Other'}`, amt: u.amount });
                    }
                });
            } else if (payment.utilityAmount > 0) {
                rows.push({ desc: 'Utility Charges', amt: payment.utilityAmount });
            }
            if (rows.length === 0) {
                rows.push({ desc: `${payment.type || 'Rental Payment'} (Unit ${unitInfo})`, amt: payment.amount });
            }

            rows.forEach((r) => {
                const rowAmt = Number(r.amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                doc.rect(36, yPos, 523, 24).fill('#ffffff');
                doc.strokeColor(borderColor).lineWidth(0.5)
                   .moveTo(36, yPos + 24).lineTo(559, yPos + 24).stroke();

                doc.fontSize(8.5).font('Helvetica').fillColor(darkText)
                   .text(billingPeriod, 46, yPos + 8, { width: 95 })
                   .text(r.desc, 148, yPos + 8, { width: 170 })
                   .text(`${currency} ${rowAmt}`, 325, yPos + 8, { width: 105, align: 'right' })
                   .text(formattedDateTime, 440, yPos + 8, { width: 110, align: 'right' });
                yPos += 24;
            });

            // =====================================================
            // 7. CLEAN CENTERED FOOTER
            // =====================================================
            const footerY = Math.max(yPos + 34, 480);
            doc.fontSize(8).font('Helvetica').fillColor(mutedText)
               .text(`Thank you for your business | ${businessName} | Ref # ${receiptRef}`, 36, footerY, { align: 'center', width: 523 });

            doc.end();
        } catch (error) {
            console.error("PDF Generation Logic Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };
