const PDFDocument = require('pdfkit');
const BUSINESS_CONFIG = require('../config/businessConfig');

/**
 * Generates an official Invoice PDF (distinguishes Subscription vs Rental Invoice,
 * and ONLY prints eTIMS fiscal stamp/CU receipt when confirmed validated by KRA eTIMS).
 */
const generateInvoicePDF = (invoice, settings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const primaryColor = '#0f172a';
      const secondaryColor = '#64748b';
      const accentColor = '#2546e8';

      const businessName = settings?.orgName || BUSINESS_CONFIG.name;
      const businessEmail = settings?.orgEmail || BUSINESS_CONFIG.email;
      const businessPhone = settings?.orgPhone || BUSINESS_CONFIG.phone;
      const businessAddress = settings?.orgAddress || BUSINESS_CONFIG.address;

      const isSub = invoice.invoiceCategory === 'subscription';
      const docTitle = isSub ? 'SUBSCRIPTION INVOICE' : 'RENTAL INVOICE';

      doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text(businessName, 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
        .text(`${businessEmail} | Tel: ${businessPhone}`, 50, 74)
        .text(businessAddress, 50, 88);

      doc.fontSize(18).font('Helvetica-Bold').fillColor(accentColor)
        .text(docTitle, 310, 50, { align: 'right', width: 235 });
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
        .text(`Invoice #: ${invoice.invoiceNumber}`, 310, 74, { align: 'right', width: 235 });
      doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
        .text(`Issued: ${new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('en-KE')}`, 310, 89, { align: 'right', width: 235 })
        .text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-KE')}`, 310, 102, { align: 'right', width: 235 });

      doc.rect(50, 125, 495, 3).fill(accentColor);

      let y = 145;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(accentColor).text('BILL TO', 50, y);
      y += 14;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(invoice.customerName || 'Valued Customer', 50, y);
      y += 16;
      if (invoice.customerEmail) {
        doc.fontSize(9).font('Helvetica').fillColor(secondaryColor).text(invoice.customerEmail, 50, y);
        y += 13;
      }
      if (invoice.customerPhone) {
        doc.fontSize(9).font('Helvetica').fillColor(secondaryColor).text(`Tel: ${invoice.customerPhone}`, 50, y);
        y += 13;
      }
      if (invoice.customerKraPin) {
        doc.fontSize(9).font('Helvetica').fillColor(secondaryColor).text(`KRA PIN: ${invoice.customerKraPin}`, 50, y);
        y += 13;
      }

      y += 18;
      doc.rect(50, y, 495, 26).fill('#f1f5f9');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569')
        .text('DESCRIPTION', 60, y + 8)
        .text('VAT %', 310, y + 8, { width: 55, align: 'right' })
        .text('TAX', 375, y + 8, { width: 70, align: 'right' })
        .text('TOTAL (KES)', 455, y + 8, { width: 80, align: 'right' });
      y += 28;

      const items = Array.isArray(invoice.items) ? invoice.items : [];
      items.forEach((it) => {
        doc.fontSize(9.5).font('Helvetica').fillColor(primaryColor)
          .text(it.description || 'Item', 60, y + 6, { width: 240 })
          .text(`${Number(it.taxRate || 0)}%`, 310, y + 6, { width: 55, align: 'right' })
          .text(Number(it.taxAmount || 0).toLocaleString(), 375, y + 6, { width: 70, align: 'right' })
          .text(Number(it.totalAmount || 0).toLocaleString(), 455, y + 6, { width: 80, align: 'right' });
        y += 26;
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke();
      });

      y += 16;
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
        .text('Subtotal:', 350, y, { width: 95, align: 'right' })
        .text(`KES ${Number(invoice.subtotal || 0).toLocaleString()}`, 455, y, { width: 80, align: 'right' });
      y += 16;
      doc.text(`VAT (${Number(invoice.vatRate || 0)}%):`, 350, y, { width: 95, align: 'right' })
        .text(`KES ${Number(invoice.taxAmount || 0).toLocaleString()}`, 455, y, { width: 80, align: 'right' });
      y += 20;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
        .text('TOTAL:', 350, y, { width: 95, align: 'right' })
        .text(`KES ${Number(invoice.totalAmount || 0).toLocaleString()}`, 455, y, { width: 80, align: 'right' });

      y += 38;
      // Only show validated eTIMS metadata if actually confirmed by KRA eTIMS API
      if (invoice.etimsStatus === 'validated' && invoice.etimsReceiptNo) {
        doc.rect(50, y, 495, 58).fill('#f0fdf4');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#166534')
          .text('KRA eTIMS VALIDATED FISCAL INVOICE', 60, y + 10);
        doc.fontSize(8.5).font('Helvetica').fillColor('#15803d')
          .text(`CU Receipt No: ${invoice.etimsReceiptNo}  |  Signature: ${invoice.etimsSignature || 'Confirmed'}`, 60, y + 26)
          .text(`Verification Data: ${invoice.etimsQrData || ''}`, 60, y + 40);
      } else {
        doc.rect(50, y, 495, 34).fill('#f8fafc');
        doc.fontSize(8.5).font('Helvetica').fillColor(secondaryColor)
          .text(`eTIMS Submission Status: ${String(invoice.etimsStatus || 'not_submitted').toUpperCase()} (Not yet KRA eTIMS validated)`, 60, y + 12);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
