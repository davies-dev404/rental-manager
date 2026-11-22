const PDFDocument = require('pdfkit');
const BUSINESS_CONFIG = require('../config/businessConfig');
const {
  SHA_PALETTE,
  drawTopGradientBar,
  drawRightOrgHeader,
  drawColHeader,
  drawColField,
  resolveMpesaPaymentDetails
} = require('./shaPdfHelpers');

/**
 * Generates an official SHA-style corporate Invoice PDF in MakaziFlow Colors (Deep Navy + Signature Teal):
 * - Top full-width Navy -> Teal gradient accent bar
 * - Top-right organization logo & property/landlord branding
 * - Centered bold "RENTAL INVOICE" / "SUBSCRIPTION INVOICE" title
 * - 3-column SHA metadata grid (BILL TO | INVOICE DETAILS | PAYMENT DETAILS with Paybill/Account # or Till)
 * - Full-width bold status banner bar (PAID / PARTIAL / DUE / OVERDUE)
 * - INVOICE SUMMARY section with royal-navy table header & itemized breakdown
 * - Payment instructions footnote, KRA eTIMS fiscal box & centered footer
 */
const generateInvoicePDF = (invoice, settings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const { greenAccent, paidBannerGreen, royalBlue, darkText, mutedText, borderColor } = SHA_PALETTE;
      const isSub = invoice.invoiceCategory === 'subscription';
      const customTitle = !isSub && settings?.invoiceTitle ? String(settings.invoiceTitle).toUpperCase() : '';
      const docTitle = isSub ? 'SUBSCRIPTION INVOICE' : (customTitle || 'RENTAL INVOICE');

      const companyName = isSub ? BUSINESS_CONFIG.name : (settings?.companyName || settings?.orgName || '').trim();
      const landlordName = isSub ? '' : (settings?.landlordName || '').trim();
      const propName = isSub ? '' : (invoice.propertyName || '').trim();
      const businessName = isSub
        ? BUSINESS_CONFIG.name
        : (companyName || propName || landlordName || 'Property Management');
      const businessEmail = isSub ? BUSINESS_CONFIG.email : (settings?.orgEmail || '').trim();
      const businessPhone = isSub ? BUSINESS_CONFIG.phone : (settings?.orgPhone || '').trim();
      const businessAddress = isSub ? BUSINESS_CONFIG.address : (settings?.orgAddress || '').trim();
      const taxId = (settings?.taxId || '').trim();
      const currency = settings?.currency || invoice.currency || 'KES';

      const invRef = String(invoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
      const issuedDt = new Date(invoice.issuedAt || invoice.createdAt || Date.now());
      const dueDt = new Date(invoice.dueDate || Date.now());
      const fmtDate = (d) => (!isNaN(d.getTime()) ? d.toLocaleDateString('en-KE') : 'N/A');
      const billingPeriod = invoice.billingPeriod || `${String(issuedDt.getMonth() + 1).padStart(2, '0')}/${issuedDt.getFullYear()}`;
      const formattedTotal = Number(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unitInfo = String(invoice.unitNumber || invoice.unitId?.unitNumber || '').trim();

      // 1. TOP GRADIENT BAR
      drawTopGradientBar(doc);

      // 2. TOP-RIGHT BRAND LOGO & PROPERTY / COMPANY HEADER
      const headerY = drawRightOrgHeader(doc, {
        businessName,
        propertyName: propName,
        landlordName,
        businessPhone,
        businessEmail,
        businessAddress,
        logoDataUrl: isSub ? '' : settings?.orgLogo
      });

      // 3. CENTERED DOCUMENT TITLE
      let yPos = Math.max(96, headerY + 12);
      doc.fontSize(14).font('Helvetica-Bold').fillColor(darkText)
        .text(docTitle, 36, yPos, { align: 'center', width: 523, characterSpacing: 1.5 });
      yPos += 19;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(greenAccent)
        .text(`INVOICE #${invRef}`, 36, yPos, { align: 'center', width: 523, characterSpacing: 0.8 });
      yPos += 22;

      // 4. THREE-COLUMN SHA METADATA GRID
      const col1X = 36;
      const col2X = 216;
      const col3X = 396;
      const colW = 164;

      // Col 1: BILL TO
      drawColHeader(doc, col1X, yPos, 'BILL TO');
      let c1Y = yPos + 18;
      c1Y = drawColField(doc, col1X, c1Y, colW, 'NAME:', String(invoice.customerName || 'Valued Customer').toUpperCase());
      if (!isSub && (propName || unitInfo)) {
        c1Y = drawColField(
          doc,
          col1X,
          c1Y,
          colW,
          'PROPERTY / UNIT:',
          propName && unitInfo ? `${propName} — Unit ${unitInfo}` : (propName || `Unit ${unitInfo}`)
        );
      }
      if (invoice.customerEmail) {
        c1Y = drawColField(doc, col1X, c1Y, colW, 'EMAIL:', invoice.customerEmail);
      }
      if (invoice.customerPhone) {
        c1Y = drawColField(doc, col1X, c1Y, colW, 'PHONE:', invoice.customerPhone);
      }
      if (invoice.customerKraPin) {
        c1Y = drawColField(doc, col1X, c1Y, colW, 'KRA PIN:', invoice.customerKraPin);
      }

      // Col 2: INVOICE DETAILS
      drawColHeader(doc, col2X, yPos, 'INVOICE DETAILS');
      let c2Y = yPos + 18;
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Invoice Number:', invRef);
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Billing Period:', billingPeriod);
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Issued Date:', fmtDate(issuedDt));
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Due Date:', fmtDate(dueDt));
      c2Y = drawColField(doc, col2X, c2Y, colW, 'Total Amount:', `${currency} ${formattedTotal}`);

      // Col 3: PAYMENT DETAILS (Registered by Landlord)
      drawColHeader(doc, col3X, yPos, 'PAYMENT DETAILS');
      let c3Y = yPos + 18;
      c3Y = drawColField(doc, col3X, c3Y, colW, 'Organisation:', businessName);
      if (!isSub) {
        const acctFallback = invoice.accountNumber || settings?.paybillAccount || (unitInfo ? unitInfo : invRef);
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
        if (businessPhone) {
          c3Y = drawColField(doc, col3X, c3Y, colW, 'Contact Phone:', businessPhone);
        }
      }
      if (taxId) {
        c3Y = drawColField(doc, col3X, c3Y, colW, 'KRA / Tax PIN:', taxId);
      }

      // 5. FULL-WIDTH BOLD STATUS BANNER BAR
      yPos = Math.max(c1Y, c2Y, c3Y) + 10;
      const rawStatus = String(invoice.status || 'OPEN').toUpperCase();
      const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);
      const bannerColor = isPaid
        ? paidBannerGreen
        : rawStatus === 'PARTIAL'
        ? '#d97706'
        : rawStatus === 'OVERDUE'
        ? '#dc2626'
        : royalBlue;
      const bannerLabel = isPaid ? 'PAID' : (rawStatus === 'OPEN' ? 'PAYMENT DUE' : rawStatus);

      doc.rect(36, yPos, 523, 32).fill(bannerColor);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text(bannerLabel, 36, yPos + 10, { align: 'center', width: 523, characterSpacing: 1.5 });
      yPos += 48;

      // 6. INVOICE SUMMARY SECTION & ROYAL-NAVY TABLE
      drawColHeader(doc, 36, yPos, 'INVOICE SUMMARY');
      yPos += 18;

      doc.rect(36, yPos, 523, 24).fill(royalBlue);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
        .text('DESCRIPTION', 46, yPos + 8, { width: 255 })
        .text('VAT %', 310, yPos + 8, { width: 55, align: 'right' })
        .text('TAX', 375, yPos + 8, { width: 70, align: 'right' })
        .text(`TOTAL (${currency})`, 455, yPos + 8, { width: 95, align: 'right' });
      yPos += 24;

      const items = Array.isArray(invoice.items) ? invoice.items : [];
      items.forEach((it) => {
        const lineTotal = Number(it.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const lineTax = Number(it.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.rect(36, yPos, 523, 24).fill('#ffffff');
        doc.strokeColor(borderColor).lineWidth(0.5)
          .moveTo(36, yPos + 24).lineTo(559, yPos + 24).stroke();

        doc.fontSize(8.5).font('Helvetica').fillColor(darkText)
          .text(it.description || 'Item', 46, yPos + 8, { width: 255 })
          .text(`${Number(it.taxRate || 0)}%`, 310, yPos + 8, { width: 55, align: 'right' })
          .text(lineTax, 375, yPos + 8, { width: 70, align: 'right' })
          .text(lineTotal, 455, yPos + 8, { width: 95, align: 'right' });
        yPos += 24;
      });

      // Totals Summary Block
      yPos += 14;
      const fmtMoney = (v) => `${currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.fontSize(8.5).font('Helvetica').fillColor(mutedText)
        .text('Subtotal:', 360, yPos, { width: 85, align: 'right' })
        .text(fmtMoney(invoice.subtotal), 455, yPos, { width: 95, align: 'right' });
      yPos += 15;
      doc.text(`VAT (${Number(invoice.vatRate || 0)}%):`, 360, yPos, { width: 85, align: 'right' })
        .text(fmtMoney(invoice.taxAmount), 455, yPos, { width: 95, align: 'right' });
      yPos += 17;
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(royalBlue)
        .text('TOTAL:', 360, yPos, { width: 85, align: 'right' })
        .text(fmtMoney(invoice.totalAmount), 455, yPos, { width: 95, align: 'right' });
      yPos += 26;

      // Landlord Payment Footnote
      if (!isSub && settings?.invoiceFootnote) {
        doc.rect(36, yPos, 523, 28).fill('#f8fafc');
        doc.rect(36, yPos, 2.5, 28).fill(greenAccent);
        doc.fontSize(8).font('Helvetica').fillColor(darkText)
          .text(String(settings.invoiceFootnote).trim(), 46, yPos + 9, { width: 503 });
        yPos += 36;
      }

      // KRA eTIMS Fiscal Status Block
      if (invoice.etimsStatus === 'validated' && invoice.etimsReceiptNo) {
        doc.rect(36, yPos, 523, 48).fill('#f0fdf4');
        doc.rect(36, yPos, 2.5, 48).fill('#16a34a');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#166534')
          .text('KRA eTIMS VALIDATED FISCAL INVOICE', 46, yPos + 8);
        doc.fontSize(8).font('Helvetica').fillColor('#15803d')
          .text(`CU Receipt No: ${invoice.etimsReceiptNo}  |  Signature: ${invoice.etimsSignature || 'Confirmed'}`, 46, yPos + 22)
          .text(`Verification Data: ${invoice.etimsQrData || ''}`, 46, yPos + 34);
        yPos += 56;
      } else {
        doc.rect(36, yPos, 523, 26).fill('#f8fafc');
        doc.fontSize(8).font('Helvetica').fillColor(mutedText)
          .text(`eTIMS Submission Status: ${String(invoice.etimsStatus || 'not_submitted').toUpperCase()} (Not yet KRA eTIMS validated)`, 46, yPos + 9);
        yPos += 34;
      }

      // 7. CLEAN CENTERED FOOTER
      const footerY = Math.max(yPos + 16, 720);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText)
        .text(`Thank you for your business | ${businessName} | Invoice # ${invRef}`, 36, Math.min(footerY, 780), { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
