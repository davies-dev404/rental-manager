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
 * Resolves registered landlord M-Pesa settings strictly from General Settings:
 * - Till: shows Till Number ONLY (no Account Number)
 * - Paybill: shows Paybill Number + Account Number configured by the landlord in General Settings
 *   (never substituting the tenant's unit number as the Paybill Account Number).
 */
function resolveMpesaPaymentDetails(settings = {}) {
  const mpesaType = settings?.mpesaType === 'Till' ? 'Till' : 'Paybill';
  const shortcode = String(settings?.integrations?.mpesa?.shortcode || settings?.paybillNumber || '').trim();
  if (mpesaType === 'Till') {
    return {
      mpesaType: 'Till',
      shortcode,
      showAccountNumber: false,
      accountNumber: ''
    };
  }
  const rawSettingsAcct = String(settings?.paybillAccount || '').trim();
  const isDefaultHint = /^unit\s+number\b/i.test(rawSettingsAcct);
  const resolvedAcct = isDefaultHint ? '' : rawSettingsAcct;
  return {
    mpesaType: 'Paybill',
    shortcode,
    showAccountNumber: Boolean(resolvedAcct),
    accountNumber: resolvedAcct
  };
}

function classifyTextPurpose(raw = '') {
  const s = String(raw || '').toLowerCase();
  if (!s) return '';
  if (/maint|mainat|mantain|repair|plumb|paint|clean|renovat|fix|carpentry|roof|gate|lift|pest|fumigat|handyman|electrician|drain|leak|lock|window|door|tile|tap|sink|pipe|bulb|socket|switch|toilet|shower|cistern|geyser|heater|fence|wall|floor|ceiling|glass|hinge|broken|damage|replace|welding|masonry|unblock/.test(s)) return 'Maintenance';
  if (/utilit|\butil\b|water|electr|power|kplc|garbage|trash|refuse|sewer|sewage|\bgas\b|borehole|generator|wifi|wi-fi|internet|meter/.test(s)) return 'Utilities';
  if (/service\s*charge|estate\s*fee|common\s*area/.test(s)) return 'Service Charge';
  if (/penalt|late\s*fee|late\s*payment|\bfine\b|surcharge/.test(s)) return 'Late Payment Penalty';
  if (/deposit/.test(s)) return 'Security Deposit';
  if (/\brent\b|rental|lease\s*payment/.test(s)) return 'Rent';
  return '';
}

function normalizeCategoryTag(cat = '', desc = '') {
  const c = String(cat || '').toLowerCase().trim();
  if (c === 'maintenance' || c === 'repair') return 'Maintenance';
  if (c === 'water' || c === 'electricity' || c === 'utilities' || c === 'garbage' || c === 'sewer' || c === 'gas' || c === 'generator') return 'Utilities';
  if (c === 'service_charge') return 'Service Charge';
  if (c === 'penalty') return 'Late Payment Penalty';
  if (c === 'deposit') return 'Security Deposit';
  if (c === 'subscription') return 'Subscription';
  // If category is generic 'rent', 'other', or empty, still inspect description for explicit non-rent signals
  const descSignal = classifyTextPurpose(desc);
  if (descSignal && descSignal !== 'Rent' && (c === '' || c === 'other' || c === 'combined')) {
    return descSignal;
  }
  if (c === 'rent') return descSignal || 'Rent';
  return descSignal || '';
}

function formatExplicitPurposeLabel(purposeText = 'Rent', { asInvoice = false } = {}) {
  const p = String(purposeText || 'Rent').trim();
  if (!p || /^rent$/i.test(p)) return asInvoice ? 'Rent Invoice' : 'Rent';
  if (/^maintenance$/i.test(p)) return asInvoice ? 'Invoice for Maintenance' : 'Maintenance';
  if (/^utilities$/i.test(p)) return asInvoice ? 'Invoice for Utilities' : 'Utilities';
  if (/^service charge$/i.test(p)) return asInvoice ? 'Invoice for Service Charge' : 'Service Charge';
  if (/^late payment penalty$/i.test(p)) return asInvoice ? 'Invoice for Late Payment Penalty' : 'Late Payment Penalty';
  if (/^security deposit$/i.test(p)) return asInvoice ? 'Invoice for Security Deposit' : 'Security Deposit';
  return asInvoice ? `Invoice for ${p}` : p;
}

/**
 * Resolves specifically what a payment / invoice receipt is for (e.g. Rent, Utilities, Maintenance)
 * and produces consistent summary line items for both PDF and email receipts.
 */
function resolvePaymentPurpose(payment = {}, invoiceOverride = null) {
  const invObj = invoiceOverride || (typeof payment.invoiceId === 'object' ? payment.invoiceId : null);
  const invItems = Array.isArray(invObj?.items) ? invObj.items : [];
  const unitInfo = typeof payment.unitId === 'object'
    ? (payment.unitId?.unitNumber || '')
    : (payment.unitNumber || '');
  const unitSuffix = unitInfo ? ` (Unit ${unitInfo})` : '';
  const invoiceRef = String(payment.invoiceNumber || invObj?.invoiceNumber || '').trim();

  const rawType = String(payment.type || '').trim();
  const rawCategory = String(payment.category || '').trim().toLowerCase();
  const rawNotes = String(payment.notes || invObj?.notes || '').trim();

  // Detect explicit single-purpose non-rent classification (prevents mislabeling Maintenance/Utilities
  // records whose amount was previously placed in rentAmount by default).
  const explicitCategoryTag =
    rawCategory && !['rent', 'combined', 'other'].includes(rawCategory)
      ? normalizeCategoryTag(rawCategory, '')
      : '';
  const textSignalTag = classifyTextPurpose(`${rawType} ${rawNotes}`);
  const hasOtherSplitBuckets =
    Number(payment.depositAmount || 0) > 0 ||
    Number(payment.utilityAmount || 0) > 0 ||
    (Array.isArray(payment.utilities) && payment.utilities.some((u) => Number(u?.amount) > 0)) ||
    Number(payment.serviceChargeAmount || 0) > 0 ||
    Number(payment.penaltyAmount || 0) > 0;
  const nonRentOverrideTag =
    !hasOtherSplitBuckets
      ? (explicitCategoryTag || (textSignalTag && textSignalTag !== 'Rent' ? textSignalTag : ''))
      : '';

  const tags = [];
  const pushTag = (t) => {
    if (t && !tags.includes(t)) tags.push(t);
  };
  const lineItems = [];

  if (Number(payment.rentAmount || 0) > 0 && !nonRentOverrideTag) {
    pushTag('Rent');
    lineItems.push({ desc: `Rent Payment${unitSuffix}`, amt: Number(payment.rentAmount), categoryLabel: 'Rent' });
  }
  if (Number(payment.depositAmount || 0) > 0) {
    pushTag('Security Deposit');
    lineItems.push({ desc: `Security Deposit${unitSuffix}`, amt: Number(payment.depositAmount), categoryLabel: 'Security Deposit' });
  }
  if (Array.isArray(payment.utilities) && payment.utilities.length > 0) {
    const validUtils = payment.utilities.filter((u) => Number(u?.amount) > 0);
    if (validUtils.length > 0) {
      pushTag('Utilities');
      validUtils.forEach((u) => {
        lineItems.push({
          desc: `Utilities - ${u.name || 'Utility'}${unitSuffix}`,
          amt: Number(u.amount),
          categoryLabel: 'Utilities'
        });
      });
    }
  } else if (Number(payment.utilityAmount || 0) > 0) {
    pushTag('Utilities');
    const utilHint = classifyTextPurpose(`${rawNotes} ${rawType}`) === 'Utilities' && rawType && !/^(utilities|utility|combined|rent)$/i.test(rawType)
      ? rawType
      : 'Utility Charges';
    lineItems.push({ desc: `Utilities - ${utilHint}${unitSuffix}`, amt: Number(payment.utilityAmount), categoryLabel: 'Utilities' });
  }
  if (Number(payment.serviceChargeAmount || 0) > 0) {
    pushTag('Service Charge');
    lineItems.push({ desc: `Service Charge${unitSuffix}`, amt: Number(payment.serviceChargeAmount), categoryLabel: 'Service Charge' });
  }
  if (Number(payment.penaltyAmount || 0) > 0) {
    pushTag('Late Payment Penalty');
    lineItems.push({ desc: `Late Payment Penalty${unitSuffix}`, amt: Number(payment.penaltyAmount), categoryLabel: 'Late Payment Penalty' });
  }

  // If explicit payment buckets were empty (e.g., Maintenance or structured Invoice items)
  if (lineItems.length === 0 && invItems.length > 0) {
    invItems.forEach((it) => {
      const amt = Number(it.totalAmount ?? it.unitPrice ?? payment.amount ?? 0);
      const tag = nonRentOverrideTag || normalizeCategoryTag(it.category, it.description) || classifyTextPurpose(`${rawType} ${rawNotes}`) || 'Rent';
      pushTag(tag);
      const descText = String(it.description || tag).trim();
      lineItems.push({
        desc: descText.toLowerCase().includes(tag.toLowerCase()) ? descText : `${tag} — ${descText}`,
        amt,
        categoryLabel: tag
      });
    });
  } else if (invItems.length > 0) {
    invItems.forEach((it) => {
      const tag = normalizeCategoryTag(it.category, it.description);
      if (tag) pushTag(tag);
    });
  }

  if (lineItems.length === 0) {
    const detected =
      nonRentOverrideTag ||
      normalizeCategoryTag(rawCategory, `${rawType} ${rawNotes}`) ||
      classifyTextPurpose(`${rawType} ${rawNotes}`);
    const fallbackLabel =
      detected ||
      (rawType && !/^(combined|rental payment|invoice payment|rent)$/i.test(rawType) ? rawType : 'Rent');
    pushTag(fallbackLabel);

    const detail = rawNotes && !rawNotes.toLowerCase().includes(fallbackLabel.toLowerCase())
      ? `${fallbackLabel} — ${rawNotes}`
      : (rawType && rawType.toLowerCase() !== fallbackLabel.toLowerCase() && !/^(combined|rental payment|rent)$/i.test(rawType)
          ? `${fallbackLabel} (${rawType})`
          : fallbackLabel);
    lineItems.push({
      desc: `${detail}${unitSuffix}`,
      amt: Number(payment.amount || 0),
      categoryLabel: fallbackLabel
    });
  }

  if (invoiceRef && lineItems.length > 0 && !lineItems[0].desc.includes(invoiceRef)) {
    lineItems[0].desc = `${lineItems[0].desc} · Invoice #${invoiceRef}`;
  }

  let purposeText = 'Rent';
  if (tags.length === 1) {
    purposeText = tags[0];
  } else if (tags.length === 2) {
    purposeText = `${tags[0]} & ${tags[1]}`;
  } else if (tags.length > 2) {
    purposeText = `${tags.slice(0, -1).join(', ')} & ${tags[tags.length - 1]}`;
  }

  return {
    purposeText,
    explicitLabel: formatExplicitPurposeLabel(purposeText, { asInvoice: false }),
    invoiceExplicitLabel: formatExplicitPurposeLabel(purposeText, { asInvoice: true }),
    tags,
    lineItems
  };
}

/**
 * Resolves what an Invoice document itself is specifically for (Rent, Utilities, Maintenance, etc.).
 */
function resolveInvoicePurposeLabel(invoice = {}) {
  if (invoice.invoiceCategory === 'subscription') return 'MakaziFlow Subscription';
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const tags = [];
  const pushTag = (t) => {
    if (t && !tags.includes(t)) tags.push(t);
  };

  // Explicit invoice-level non-rent category takes priority
  const topCat = String(invoice.category || '').trim().toLowerCase();
  if (topCat && !['rent', 'combined', 'other'].includes(topCat)) {
    const topTag = normalizeCategoryTag(topCat, '');
    if (topTag) pushTag(topTag);
  }

  items.forEach((it) => {
    const t = normalizeCategoryTag(it.category, it.description);
    if (t) pushTag(t);
  });

  // Also inspect invoiceType & notes if items only produced generic 'Rent' or nothing
  const metaHint = classifyTextPurpose(`${invoice.invoiceType || ''} ${invoice.notes || ''}`);
  if (metaHint && metaHint !== 'Rent' && (tags.length === 0 || (tags.length === 1 && tags[0] === 'Rent' && topCat !== 'rent'))) {
    tags.length = 0;
    pushTag(metaHint);
  } else if (tags.length === 0) {
    if (metaHint) pushTag(metaHint);
    else if (invoice.invoiceType && !/^(rent|combined|rental payment)$/i.test(String(invoice.invoiceType).trim())) {
      pushTag(String(invoice.invoiceType).trim());
    }
  }

  if (tags.length === 0) return 'Rent';
  if (tags.length === 1) return tags[0];
  if (tags.length === 2) return `${tags[0]} & ${tags[1]}`;
  return `${tags.slice(0, -1).join(', ')} & ${tags[tags.length - 1]}`;
}

module.exports = {
  SHA_PALETTE,
  drawTopGradientBar,
  drawRightOrgHeader,
  drawColHeader,
  drawColField,
  resolveMpesaPaymentDetails,
  classifyTextPurpose,
  normalizeCategoryTag,
  formatExplicitPurposeLabel,
  resolvePaymentPurpose,
  resolveInvoicePurposeLabel
};
