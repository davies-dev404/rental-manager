const PDFDocument = require('pdfkit');

/**
 * Generates an official corporate PDF statement of a landlord's subscription payment history
 * using MakaziFlow brand palette (Deep Navy #0d2240 + Signature Teal #00a99d).
 */
function generateSubscriptionStatementPDF({ user, transactions = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const navy = '#0d2240';
      const teal = '#00a99d';
      const darkText = '#0f172a';
      const muted = '#475569';
      const border = '#e2e8f0';

      const drawHeaderBar = () => {
        const grad = doc.linearGradient(24, 24, 571, 24);
        grad.stop(0, '#0a1e35').stop(0.45, navy).stop(0.75, teal).stop(1, '#00d4c8');
        doc.rect(24, 24, 547, 10).fill(grad);
      };

      const drawTableHeader = (yPos) => {
        doc.rect(36, yPos, 523, 20).fill(navy);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        doc.text('DATE', 42, yPos + 6, { width: 82 });
        doc.text('REFERENCE', 126, yPos + 6, { width: 122 });
        doc.text('PLAN / CYCLE', 250, yPos + 6, { width: 88 });
        doc.text('METHOD', 340, yPos + 6, { width: 78 });
        doc.text('AMOUNT (KES)', 420, yPos + 6, { width: 68, align: 'right' });
        doc.text('STATUS', 494, yPos + 6, { width: 60, align: 'right' });
        return yPos + 20;
      };

      drawHeaderBar();

      // Top company & landlord header
      doc.font('Helvetica-Bold').fontSize(13).fillColor(navy)
        .text('MakaziFlow — Afrinex Tech', 36, 46);
      doc.font('Helvetica').fontSize(8.5).fillColor(muted)
        .text('Tel: 0790264792 | info@afrinextech.co.ke', 36, 62);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(navy)
        .text(user?.name || 'Account Holder', 320, 46, { width: 239, align: 'right' });
      if (user?.email) {
        doc.font('Helvetica').fontSize(8.5).fillColor(muted)
          .text(user.email, 320, 59, { width: 239, align: 'right' });
      }
      doc.font('Helvetica').fontSize(8).fillColor(muted)
        .text(`Generated: ${new Date().toLocaleString('en-KE')}`, 320, 72, { width: 239, align: 'right' });

      // Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor(darkText)
        .text('SUBSCRIPTION PAYMENT HISTORY STATEMENT', 36, 94, { width: 523, align: 'center' });

      // Summary Box
      const paidTxns = transactions.filter((t) => t.status === 'paid');
      const totalPaid = paidTxns.reduce((sum, t) => sum + Number(t.amountPaid || t.amount || 0), 0);
      const pendingCount = transactions.filter((t) => ['pending', 'processing'].includes(t.status)).length;
      const failedCount = transactions.filter((t) => ['failed', 'cancelled', 'reversed'].includes(t.status)).length;

      let y = 122;
      doc.rect(36, y, 523, 42).fillAndStroke('#f8fafc', border);
      doc.rect(36, y, 4, 42).fill(teal);

      const cols = [
        { label: 'TOTAL PAID', value: `KES ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x: 50 },
        { label: 'TOTAL TRANSACTIONS', value: String(transactions.length), x: 205 },
        { label: 'SETTLED PAYMENTS', value: String(paidTxns.length), x: 340 },
        { label: 'PENDING / FAILED', value: `${pendingCount} / ${failedCount}`, x: 460 }
      ];
      cols.forEach((c) => {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(muted).text(c.label, c.x, y + 8);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(navy).text(c.value, c.x, y + 21);
      });

      y += 56;
      y = drawTableHeader(y);

      if (transactions.length === 0) {
        doc.rect(36, y, 523, 30).stroke(border);
        doc.font('Helvetica').fontSize(9).fillColor(muted)
          .text('No subscription payment transactions recorded yet.', 36, y + 10, { width: 523, align: 'center' });
        y += 30;
      } else {
        transactions.forEach((t, idx) => {
          if (y > 760) {
            doc.addPage();
            drawHeaderBar();
            y = drawTableHeader(46);
          }

          const rowH = 26;
          if (idx % 2 === 1) {
            doc.rect(36, y, 523, rowH).fill('#f8fafc');
          }
          doc.rect(36, y, 523, rowH).stroke(border);

          const dtStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-KE') : '—';
          const refMain = String(t.accountReference || t.internalTransactionId || '—').slice(0, 24);
          const conf = t.providerReference ? `Conf: ${String(t.providerReference).slice(0, 16)}` : '';
          const planLabel = `${(t.planCode || 'Plan').toUpperCase()} (${t.billingCycle || 'monthly'})`;
          const methodLabel = String(t.paymentMethodDetail || t.paymentChannel || t.provider || 'Online').slice(0, 16);
          const amtStr = Number(t.amountPaid || t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const stStr = String(t.status || 'pending').toUpperCase();
          const stColor = stStr === 'PAID' ? teal : (['FAILED', 'CANCELLED', 'REVERSED'].includes(stStr) ? '#b91c1c' : '#b45309');

          doc.font('Helvetica').fontSize(8).fillColor(darkText).text(dtStr, 42, y + 8, { width: 82 });
          doc.font('Helvetica-Bold').fontSize(7.8).fillColor(darkText).text(refMain, 126, y + 5, { width: 122 });
          if (conf) {
            doc.font('Helvetica').fontSize(6.8).fillColor(muted).text(conf, 126, y + 15, { width: 122 });
          }
          doc.font('Helvetica').fontSize(7.8).fillColor(darkText).text(planLabel, 250, y + 8, { width: 88 });
          doc.font('Helvetica').fontSize(7.8).fillColor(muted).text(methodLabel, 340, y + 8, { width: 78 });
          doc.font('Helvetica-Bold').fontSize(8).fillColor(darkText).text(amtStr, 420, y + 8, { width: 68, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(stColor).text(stStr, 494, y + 8, { width: 60, align: 'right' });

          y += rowH;
        });
      }

      doc.font('Helvetica').fontSize(7.5).fillColor(muted)
        .text('MakaziFlow SaaS Billing Statement · Afrinex Tech · Generated electronically', 36, Math.min(y + 18, 795), {
          width: 523,
          align: 'center'
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSubscriptionStatementPDF };
