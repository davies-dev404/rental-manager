const PDFDocument = require('pdfkit');
const {
  SHA_PALETTE,
  drawTopGradientBar,
  drawRightOrgHeader,
  drawColHeader,
  drawColField,
  resolveMpesaPaymentDetails,
  resolvePaymentPurpose
} = require('./shaPdfHelpers');

/**
 * Generates an official, SHA-style corporate PDF Receipt in MakaziFlow Colors (Deep Navy + Signature Teal):
 * - Top full-width Navy -> Teal gradient accent bar
 * - Top-right organization logo & property/landlord branding
 * - Centered bold "PAYMENT RECEIPT" / "INVOICE PAYMENT RECEIPT" title
 * - 3-column metadata block with teal left bars (TENANT DETAILS | RECEIPT DETAILS | PAYMENT DETAILS)
 * - Full-width bold teal PAID banner bar
 * - PAYMENT SUMMARY section with royal-navy table header & itemized breakdown
 * - Centered footer with business name & receipt reference
 */
const generateReceiptPDF = (payment, settings, propertyName) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Generating PDF for payment:', payment._id);
      const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      doc.on('error', (err) => {
        console.error('PDFKit Error:', err);
        reject(err);
      });

      const { greenAccent, paidBannerGreen, royalBlue, darkText, mutedText, borderColor } = SHA_PALETTE;

      // Business & Property Info
      const companyName = (settings?.companyName || settings?.orgName || '').trim();
      const landlordName = (settings?.landlordName || '').trim();
      const businessName = companyName || propertyName || landlordName || 'Property Management';
      const businessEmail = (settings?.orgEmail || '').trim();
      const businessPhone = (settings?.orgPhone || '').trim();
      const taxId = (settings?.taxId || '').trim();
      const currency = settings?.currency || 'KES';

      const receiptRef = payment.reference || (payment._id ? payment._id.toString().substring(0, 8).toUpperCase() : 'REF-000000');
      const invoiceRef = (
        payment.invoiceNumber ||
        (typeof payment.invoiceId === 'object' ? payment.invoiceId?.invoiceNumber : '') ||
        ''
      ).trim();
      const dt = new Date(payment.date || Date.now());
      const pad = (n) => String(n).padStart(2, '0');
      const formattedDateTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
      const billingPeriod = payment.monthCovered || `${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
      const formattedAmount = Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const tenantName = payment.tenantId?.name || 'Tenant';
      const unitInfo = typeof payment.unitId === 'object'
        ? (payment.unitId?.unitNumber || 'N/A')
        : (payment.unitId || 'N/A');
      const purpose = resolvePaymentPurpose(payment);

      // 1. TOP GRADIENT BAR
      drawTopGradientBar(doc);

      // 2. TOP-RIGHT BRAND LOGO & PROPERTY / COMPANY HEADER
      const headerY = drawRightOrgHeader(doc, {
        businessName,
        propertyName,
        landlordName,
        businessPhone,
        businessEmail,
        logoDataUrl: settings?.orgLogo
      });

      // 3. CENTERED "PAYMENT RECEIPT" / "INVOICE PAYMENT RECEIPT" TITLE
      let yPos = Math.max(96, headerY + 12);
      doc.fontSize(14).font('Helvetica-Bold').fillColor(darkText)
        .text(invoiceRef ? 'INVOICE PAYMENT RECEIPT' : 'PAYMENT RECEIPT', 36, yPos, { align: 'center', width: 523, characterSpacing: 1.5 });
      yPos += 19;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(greenAccent)
        .text(
          invoiceRef
            ? `RECEIPT FOR INVOICE #${invoiceRef} — ${purpose.purposeText.toUpperCase()}`
            : `PAYMENT FOR: ${purpose.purposeText.toUpperCase()}`,
          36,
          yPos,
          { align: 'center', width: 523, characterSpacing: 0.8 }
        );
      yPos += 22;

      // 4. THREE-COLUMN METADATA GRID
      const col1X = 36;
      const col2X = 216;
      const col3X = 396;
      const colW = 164;

      // Col 1: TENANT DETAILS
      drawColHeader(doc, col1X, yPos, 'TENANT DETAILS');
      let c1Y = yPos + 18;
      c1Y = drawColField(doc, col1X, c1Y, colW, 'NAME:', tenantName.toUpperCase());
      c1Y = drawColField(doc, col1X, c1Y, colW, 'PROPERTY / UNIT:', propertyName ? `${propertyName} — Unit ${unitInfo}` : `Unit ${unitInfo}`);
      if (payment.tenantId?.email) {
        c1Y = drawColField(doc, col1X, c1Y, colW, 'EMAIL:', payment.tenantId.email);
      }
      if (payment.tenantId?.phone) {
        c1Y = drawColField(doc, col1X, c1Y, colW, 'PHONE:', payment.tenantId.phone);
      }

      // Col 2: RECEIPT DETAILS
      drawColHeader(doc, col2X, yPos, 'RECEIPT DETAILS');
      let c2Y = yPos + 18;
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Receipt Number:', receiptRef);
      if (invoiceRef) {
        c2Y = drawColField(doc, col2X, c2Y, colW, 'Receipt For:', `Invoice #${invoiceRef}`);
        c2Y = drawColField(doc, col2X, c2Y, colW, 'Invoice For:', purpose.purposeText);
      } else {
        c2Y = drawColField(doc, col2X, c2Y, colW, 'Payment For:', purpose.purposeText);
      }
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Period Covered:', billingPeriod);
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Total Amount:', `${currency}. ${formattedAmount}`);
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Date Generated:', formattedDateTime);

      // Col 3: PAYMENT DETAILS (includes registered Paybill Account # or Till #)
      drawColHeader(doc, col3X, yPos, 'PAYMENT DETAILS');
      let c3Y = yPos + 18;
      c3Y = drawColField(doc, col3X, c3Y, colW, 'Organisation:', businessName);
      c3Y = drawColField(doc, col3X, c3Y, colW, 'Payment Mode:', String(payment.method || 'CASH').replace(/_/g, ' ').toUpperCase());

      const acctFallback = payment.accountNumber || payment.tenantId?.accountNumber || settings?.paybillAccount || '';
      const mpesa = resolveMpesaPaymentDetails(settings, acctFallback);
      if (mpesa.mpesaType === 'Till') {
        if (mpesa.shortcode) {
          c3Y = drawColField(doc, col3X, c3Y, colW, 'Till Number:', mpesa.shortcode);
        }
      } else {
        if (mpesa.shortcode) {
          c3Y = drawColField(doc, col3X, c3Y, colW, 'Paybill Number:', mpesa.shortcode);
        }
        if (mpesa.showAccountNumber && mpesa.accountNumber) {
          c3Y = drawColField(doc, col3X, c3Y, colW, 'Account Number:', mpesa.accountNumber);
        }
      }

      c3Y = drawColField(doc, col3X, c3Y, colW, 'Payer:', tenantName);
      c3Y = drawColField(doc, col3X, c3Y, colW, 'Amount Paid:', `${currency} ${formattedAmount}`);
      if (taxId) {
        c3Y = drawColField(doc, col3X, c3Y, colW, 'KRA / Tax PIN:', taxId);
      }

      // 5. FULL-WIDTH BOLD STATUS BANNER BAR
      yPos = Math.max(c1Y, c2Y, c3Y) + 10;
      const rawStatus = String(payment.status || 'PAID').toUpperCase();
      const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);
      const bannerText = isPaid ? 'PAID' : rawStatus;
      const bannerColor = isPaid ? paidBannerGreen : (rawStatus === 'PARTIAL' ? '#d97706' : '#dc2626');

      doc.rect(36, yPos, 523, 32).fill(bannerColor);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text(bannerText, 36, yPos + 10, { align: 'center', width: 523, characterSpacing: 1.5 });
      yPos += 48;

      // 6. PAYMENT SUMMARY SECTION & ROYAL-NAVY TABLE
      drawColHeader(doc, 36, yPos, 'PAYMENT SUMMARY');
      yPos += 18;

      doc.rect(36, yPos, 523, 24).fill(royalBlue);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
        .text('BILLING PERIOD', 46, yPos + 8, { width: 95 })
        .text('DESCRIPTION', 148, yPos + 8, { width: 170 })
        .text('TOTAL PAID', 325, yPos + 8, { width: 105, align: 'right' })
        .text('DATE GENERATED', 440, yPos + 8, { width: 110, align: 'right' });
      yPos += 24;

      const rows = purpose.lineItems.length > 0
        ? purpose.lineItems
        : [{ desc: `${purpose.purposeText} (Unit ${unitInfo})`, amt: payment.amount }];

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

      // 7. CLEAN CENTERED FOOTER
      const footerY = Math.max(yPos + 34, 480);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText)
        .text(`Thank you for being a valued resident | ${businessName} | Ref # ${receiptRef}`, 36, footerY, { align: 'center', width: 523 });

      doc.end();
    } catch (error) {
      console.error('PDF Generation Logic Error:', error);
      reject(error);
    }
  });
};

module.exports = { generateReceiptPDF };
