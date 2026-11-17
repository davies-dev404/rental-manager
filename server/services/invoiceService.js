const crypto = require('crypto');
const Invoice = require('../models/Invoice');

/**
 * Generates sequential/unique invoice numbers strictly distinguishing
 * SaaS Subscription Invoices (SUB-YYYY-...) from Tenant Rental Invoices (RNT-YYYY-...).
 */
async function generateInvoiceNumber(invoiceCategory) {
  const year = new Date().getFullYear();
  const prefix = invoiceCategory === 'subscription' ? `SUB-${year}` : `RNT-${year}`;
  const count = await Invoice.countDocuments({ invoiceCategory });
  const seq = String(count + 1).padStart(4, '0');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${seq}-${suffix}`;
}

/**
 * Create a structured Invoice document with tax breakdown
 */
async function createStructuredInvoice({
  invoiceCategory,
  landlordId,
  tenantId = null,
  propertyId = null,
  unitId = null,
  subscriptionId = null,
  billingPeriod = '',
  items = [],
  vatRate = 0,
  dueDate = new Date(),
  notes = '',
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  customerKraPin = '',
  status = 'open'
}) {
  const invoiceNumber = await generateInvoiceNumber(invoiceCategory);

  let subtotal = 0;
  let taxAmount = 0;
  const computedItems = items.map((it) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unitPrice || it.amount || 0);
    const lineSupply = Number((qty * unitPrice).toFixed(2));
    const itemRate = Number(it.taxRate ?? vatRate ?? 0);
    const lineTax = itemRate > 0 ? Number(((lineSupply * itemRate) / 100).toFixed(2)) : 0;
    const lineTotal = Number((lineSupply + lineTax).toFixed(2));

    subtotal += lineSupply;
    taxAmount += lineTax;

    return {
      description: it.description || 'Charge',
      category: it.category || (invoiceCategory === 'subscription' ? 'subscription' : 'rent'),
      itemCode: it.itemCode || (invoiceCategory === 'subscription' ? 'MF-SAAS-001' : 'MF-RENT-001'),
      itemClassCode: it.itemClassCode || '80131500',
      quantity: qty,
      unitPrice,
      taxRate: itemRate,
      taxableAmount: lineSupply,
      taxAmount: lineTax,
      totalAmount: lineTotal
    };
  });

  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const invoice = await Invoice.create({
    invoiceNumber,
    invoiceCategory,
    landlordId,
    tenantId: tenantId || undefined,
    propertyId: propertyId || undefined,
    unitId: unitId || undefined,
    subscriptionId: subscriptionId || undefined,
    billingPeriod,
    items: computedItems,
    subtotal: Number(subtotal.toFixed(2)),
    vatRate: Number(vatRate || 0),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount,
    amountPaid: 0,
    balanceDue: totalAmount,
    currency: 'KES',
    status,
    dueDate,
    notes,
    customerName,
    customerEmail,
    customerPhone,
    customerKraPin,
    etimsStatus: 'not_submitted'
  });

  return invoice;
}

module.exports = {
  generateInvoiceNumber,
  createStructuredInvoice
};
