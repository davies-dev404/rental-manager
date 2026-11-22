const { decodeLogoDataUrl } = require('./getUserBusinessProfile');

const SHA_PALETTE = {
  greenAccent: '#00a99d',
  paidBannerGreen: '#00a99d',
  royalBlue: '#0d2240',
  labelBlue: '#0d2240',
  darkText: '#0f172a',
  mutedText: '#475569',
  borderColor: '#e2e8f0'
};

/**
 * Draws the full-width MakaziFlow Navy -> Signature Teal gradient bar at top of SHA-style documents.
 */
function drawTopGradientBar(doc) {
  const grad = doc.linearGradient(24, 24, 571, 24);
  grad.stop(0, '#0a1e35')
    .stop(0.45, '#0d2240')
    .stop(0.75, '#00a99d')
    .stop(1, '#00d4c8');
  doc.rect(24, 24, 547, 10).fill(grad);
}

/**
 * Draws top-right business/property/landlord branding + optional decoded logo.
 * Returns the bottom Y coordinate of the header block.
 */
function drawRightOrgHeader(doc, {
  businessName = 'Property Management',
  propertyName = '',
  landlordName = '',
  businessPhone = '',
  businessEmail = '',
  businessAddress = '',
  logoDataUrl = ''
} = {}) {
  let headerY = 42;
  const rightBlockX = 290;
  const rightBlockW = 269;
  const customLogoBuffer = decodeLogoDataUrl(logoDataUrl);
  const textWidth = customLogoBuffer ? 206 : rightBlockW;

  if (customLogoBuffer) {
    try {
      doc.image(customLogoBuffer, 505, headerY, { fit: [54, 34] });
      doc.fontSize(11).font('Helvetica-Bold').fillColor(SHA_PALETTE.royalBlue)
        .text(businessName, rightBlockX, headerY + 2, { align: 'right', width: textWidth });
      headerY += 16;
      if (propertyName && propertyName.toLowerCase() !== businessName.toLowerCase()) {
        doc.fontSize(8).font('Helvetica').fillColor(SHA_PALETTE.mutedText)
          .text(`Property: ${propertyName}`, rightBlockX, headerY, { align: 'right', width: textWidth });
        headerY += 11;
      }
    } catch {
      doc.fontSize(12).font('Helvetica-Bold').fillColor(SHA_PALETTE.royalBlue)
        .text(businessName, rightBlockX, headerY, { align: 'right', width: rightBlockW });
      headerY += 16;
    }
  } else {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(SHA_PALETTE.royalBlue)
      .text(businessName, rightBlockX, headerY, { align: 'right', width: rightBlockW });
    headerY += 16;
    if (propertyName && propertyName.toLowerCase() !== businessName.toLowerCase()) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(SHA_PALETTE.mutedText)
        .text(`Property: ${propertyName}`, rightBlockX, headerY, { align: 'right', width: rightBlockW });
      headerY += 11;
    }
  }

  if (landlordName && landlordName.toLowerCase() !== businessName.toLowerCase()) {
    doc.fontSize(8).font('Helvetica').fillColor(SHA_PALETTE.mutedText)
      .text(`Landlord: ${landlordName}`, rightBlockX, headerY, { align: 'right', width: textWidth });
    headerY += 11;
  }
  if (businessPhone || businessEmail) {
    const contactLine = [businessPhone, businessEmail].filter(Boolean).join(' | ');
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
      .text(contactLine, rightBlockX, headerY, { align: 'right', width: textWidth });
    headerY += 11;
  }
  if (businessAddress) {
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
      .text(businessAddress, rightBlockX, headerY, { align: 'right', width: textWidth });
    headerY += 11;
  }

  return headerY;
}

function drawColHeader(doc, x, y, titleText) {
  doc.rect(x, y, 2.5, 11).fill(SHA_PALETTE.greenAccent);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(SHA_PALETTE.greenAccent)
    .text(titleText, x + 7, y + 1);
}

function drawColField(doc, x, y, colWidth, label, value) {
  doc.fontSize(8).font('Helvetica-Bold').fillColor(SHA_PALETTE.labelBlue)
    .text(label, x, y, { width: colWidth });
  const valStr = String(value || 'N/A');
  const valY = y + 10;
  doc.fontSize(8.5).font('Helvetica').fillColor(SHA_PALETTE.darkText)
    .text(valStr, x, valY, { width: colWidth });
  const valHeight = doc.heightOfString(valStr, { width: colWidth });
  return valY + Math.max(12, valHeight) + 6;
}

/**
 * Resolves registered landlord M-Pesa settings cleanly:
 * - Till: shows Till Number ONLY (no Account Number)
 * - Paybill: shows Paybill Number + Account Number
 */
function resolveMpesaPaymentDetails(settings = {}, accountFallback = '') {
  const mpesaType = settings?.mpesaType === 'Till' ? 'Till' : 'Paybill';
  const shortcode = String(settings?.integrations?.mpesa?.shortcode || '').trim();
  if (mpesaType === 'Till') {
    return {
      mpesaType: 'Till',
      shortcode,
      showAccountNumber: false,
      accountNumber: ''
    };
  }
  const resolvedAcct = String(accountFallback || settings?.paybillAccount || '').trim();
  return {
    mpesaType: 'Paybill',
    shortcode,
    showAccountNumber: Boolean(resolvedAcct),
    accountNumber: resolvedAcct
  };
}

module.exports = {
  SHA_PALETTE,
  drawTopGradientBar,
  drawRightOrgHeader,
  drawColHeader,
  drawColField,
  resolveMpesaPaymentDetails
};
