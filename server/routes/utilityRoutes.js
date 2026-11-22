const express = require('express');
const router = express.Router();
const UtilityReading = require('../models/UtilityReading');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Invoice = require('../models/Invoice');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectId, isValidObjectId, escapeRegExp } = require('../middleware/securityMiddleware');
const { createStructuredInvoice } = require('../services/invoiceService');
const logActivity = require('../utils/logActivity');

function mapInvoiceItemCategory(item = '') {
  const clean = String(item || '').trim().toLowerCase();
  if (clean === 'water') return 'water';
  if (clean === 'electricity' || clean === 'power') return 'electricity';
  if (clean === 'service_charge' || clean === 'service charge') return 'service_charge';
  return 'other';
}

function normalizeUnitLookupKey(val = '') {
  return String(val || '').replace(/^unit\s+/i, '').trim().toLowerCase();
}

async function persistUtilityEntries({
  user,
  entries = [],
  defaultPropertyId = '',
  defaultItem = 'water',
  defaultDate = new Date(),
  source = 'manual',
  generateInvoices = true
}) {
  const userId = user._id || user.id;
  const parsedDate = defaultDate ? new Date(defaultDate) : new Date();
  const billingPeriod = !isNaN(parsedDate.getTime())
    ? parsedDate.toISOString().slice(0, 7)
    : new Date().toISOString().slice(0, 7);

  const [ownedProperties, ownedUnits, activeTenants] = await Promise.all([
    Property.find({ user: userId }).select('_id name').lean(),
    Unit.find({ user: userId }).select('_id unitNumber propertyId').lean(),
    Tenant.find({ user: userId, status: 'active' }).select('_id name email phone kraPin unitId').lean()
  ]);

  const propById = new Map(ownedProperties.map((p) => [String(p._id), p]));
  const propByName = new Map(ownedProperties.map((p) => [String(p.name || '').trim().toLowerCase(), p]));

  const createdReadings = [];
  const errors = [];
  let invoicesCreated = 0;

  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i] || {};
    const propIdCandidate = String(raw.propertyId || defaultPropertyId || '').trim();
    const propNameCandidate = String(raw.propertyName || raw.property || '').trim().toLowerCase();

    let resolvedProp = propIdCandidate && propById.has(propIdCandidate) ? propById.get(propIdCandidate) : null;
    if (!resolvedProp && propNameCandidate && propByName.has(propNameCandidate)) {
      resolvedProp = propByName.get(propNameCandidate);
    }
    if (!resolvedProp && ownedProperties.length === 1) {
      resolvedProp = ownedProperties[0];
    }

    const rawUnitNumber = String(raw.unitNumber || raw.unit || '').trim();
    if (!rawUnitNumber && !raw.unitId) {
      errors.push({ row: i + 1, message: 'Unit number is required' });
      continue;
    }

    const unitKey = normalizeUnitLookupKey(rawUnitNumber);
    let resolvedUnit = null;
    if (raw.unitId) {
      resolvedUnit = ownedUnits.find((u) => String(u._id) === String(raw.unitId)) || null;
    }
    if (!resolvedUnit && unitKey) {
      resolvedUnit = ownedUnits.find((u) => {
        if (resolvedProp && String(u.propertyId) !== String(resolvedProp._id)) return false;
        return normalizeUnitLookupKey(u.unitNumber) === unitKey;
      }) || ownedUnits.find((u) => normalizeUnitLookupKey(u.unitNumber) === unitKey) || null;
    }

    if (!resolvedProp && resolvedUnit?.propertyId) {
      resolvedProp = propById.get(String(resolvedUnit.propertyId)) || null;
    }

    const itemName = String(raw.item || raw.utilityType || defaultItem || 'water').trim().toLowerCase();
    const prev = Number(raw.previous ?? raw.previousReading ?? 0);
    const curr = Number(raw.current ?? raw.currentReading ?? 0);
    const rate = Number(raw.rate ?? 0);
    const consumed = Number.isFinite(curr - prev) && curr >= prev ? Number((curr - prev).toFixed(2)) : 0;

    let total = raw.total !== undefined && raw.total !== '' && raw.total !== null
      ? Number(raw.total)
      : Number((consumed * (Number.isFinite(rate) ? rate : 0)).toFixed(2));
    if (!Number.isFinite(total) || total < 0) total = 0;

    // Skip rows with zero current reading AND zero total unless explicitly entered with readings
    const hasCurrentInput = raw.current !== undefined && raw.current !== '' && raw.current !== null;
    if (!hasCurrentInput && total === 0 && raw.forceRecord !== true) {
      continue;
    }

    const rowDate = raw.date ? new Date(raw.date) : parsedDate;
    const finalDate = !isNaN(rowDate.getTime()) ? rowDate : new Date();
    const displayUnitNumber = resolvedUnit?.unitNumber || rawUnitNumber || 'Unit';
    const tenant = resolvedUnit
      ? activeTenants.find((t) => String(t.unitId) === String(resolvedUnit._id))
      : null;

    let invoice = null;
    if (generateInvoices && tenant && total > 0) {
      invoice = await createStructuredInvoice({
        invoiceCategory: 'rental',
        landlordId: userId,
        tenantId: tenant._id,
        propertyId: resolvedProp?._id || undefined,
        unitId: resolvedUnit?._id || undefined,
        billingPeriod,
        items: [{
          description: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} Utility (${displayUnitNumber}${consumed > 0 ? `: ${prev} → ${curr}` : ''})`,
          category: mapInvoiceItemCategory(itemName),
          unitPrice: total
        }],
        vatRate: 0,
        customerName: tenant.name,
        customerEmail: tenant.email || '',
        customerPhone: tenant.phone || '',
        customerKraPin: tenant.kraPin || ''
      });
      invoicesCreated++;
    }

    const doc = await UtilityReading.create({
      user: userId,
      propertyId: resolvedProp?._id || undefined,
      propertyName: resolvedProp?.name || raw.propertyName || 'General Property',
      unitId: resolvedUnit?._id || undefined,
      unitNumber: displayUnitNumber,
      tenantId: tenant?._id || undefined,
      item: itemName,
      previous: Number.isFinite(prev) ? prev : 0,
      current: Number.isFinite(curr) ? curr : 0,
      consumed,
      rate: Number.isFinite(rate) ? rate : 0,
      total,
      invoiceId: invoice?._id || undefined,
      invoiceNumber: invoice?.invoiceNumber || '',
      date: finalDate,
      billingPeriod,
      source
    });
    createdReadings.push(doc);
  }

  return { createdReadings, invoicesCreated, errors };
}

// @desc    Get recorded utilities for the authenticated landlord
// @route   GET /api/utilities
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const filter = { user: userId };

    if (req.query.propertyId && req.query.propertyId !== 'all' && isValidObjectId(String(req.query.propertyId))) {
      filter.propertyId = req.query.propertyId;
    }
    if (req.query.item && req.query.item !== 'all') {
      filter.item = String(req.query.item).trim().toLowerCase();
    }
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const readings = await UtilityReading.find(filter)
      .populate('propertyId', 'name')
      .populate('unitId', 'unitNumber')
      .populate('tenantId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();

    const normalized = readings.map((r) => ({
      ...r,
      propertyIdStr: r.propertyId?._id ? String(r.propertyId._id) : (r.propertyId ? String(r.propertyId) : ''),
      propertyName: r.propertyId?.name || r.propertyName || 'General Property',
      unit: r.unitId?.unitNumber || r.unitNumber || '—'
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Record one or many utility meter readings & optionally generate invoices
// @route   POST /api/utilities/batch
// @access  Private (Admin/Landlord)
router.post('/batch', protect, admin, async (req, res) => {
  try {
    const {
      entries = [],
      propertyId = '',
      item = 'water',
      date = new Date(),
      source = 'manual',
      generateInvoices = true
    } = req.body || {};

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'At least one utility reading entry is required.' });
    }

    const { createdReadings, invoicesCreated, errors } = await persistUtilityEntries({
      user: req.user,
      entries,
      defaultPropertyId: propertyId,
      defaultItem: item,
      defaultDate: date,
      source,
      generateInvoices
    });

    if (createdReadings.length === 0) {
      return res.status(400).json({
        message: errors[0]?.message || 'Please enter valid readings or totals for at least one unit.',
        errors
      });
    }

    await logActivity(
      req.user,
      'Utilities Recorded',
      `Recorded ${createdReadings.length} ${String(item).toUpperCase()} utility entry(ies) (${invoicesCreated} invoice(s) generated).`,
      'property',
      'success'
    );

    res.status(201).json({
      success: true,
      count: createdReadings.length,
      invoicesCreated,
      readings: createdReadings,
      errors
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to record utility readings' });
  }
});

// @desc    Bulk upload utility readings from parsed CSV/spreadsheet rows
// @route   POST /api/utilities/bulk
// @access  Private (Admin/Landlord)
router.post('/bulk', protect, admin, async (req, res) => {
  try {
    const {
      rows = [],
      propertyId = '',
      propertyName = '',
      item = 'water',
      date = new Date(),
      generateInvoices = true
    } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No utility rows found in uploaded file.' });
    }

    const normalizedRows = rows.map((r) => ({
      ...r,
      propertyName: r.propertyName || propertyName || ''
    }));

    const { createdReadings, invoicesCreated, errors } = await persistUtilityEntries({
      user: req.user,
      entries: normalizedRows,
      defaultPropertyId: propertyId,
      defaultItem: item,
      defaultDate: date,
      source: 'bulk_upload',
      generateInvoices
    });

    if (createdReadings.length === 0) {
      return res.status(400).json({
        message: errors[0]?.message || 'No valid utility readings could be imported from file.',
        errors
      });
    }

    await logActivity(
      req.user,
      'Bulk Utilities Uploaded',
      `Imported ${createdReadings.length} bulk ${String(item).toUpperCase()} reading(s) (${invoicesCreated} invoice(s) generated).`,
      'property',
      'success'
    );

    res.status(201).json({
      success: true,
      count: createdReadings.length,
      invoicesCreated,
      readings: createdReadings,
      errors
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Bulk utility upload failed' });
  }
});

// @desc    Reset / clear utility readings for selected property / units / item
// @route   POST /api/utilities/reset
// @access  Private (Admin/Landlord)
router.post('/reset', protect, admin, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { propertyId = '', unitSelection = '', item = 'all' } = req.body || {};

    const filter = { user: userId };
    if (propertyId && propertyId !== 'all' && isValidObjectId(String(propertyId))) {
      filter.propertyId = propertyId;
    }
    if (item && item !== 'all' && String(item).trim()) {
      filter.item = String(item).trim().toLowerCase();
    }
    if (unitSelection && String(unitSelection).trim()) {
      const units = String(unitSelection)
        .split(',')
        .map((u) => normalizeUnitLookupKey(u))
        .filter(Boolean);
      if (units.length > 0) {
        filter.unitNumber = {
          $in: units.map((u) => new RegExp(`^(unit\\s+)?${escapeRegExp(u)}$`, 'i'))
        };
      }
    }

    const existing = await UtilityReading.find(filter).select('_id invoiceId').lean();
    const invoiceIds = existing.map((x) => x.invoiceId).filter(Boolean);

    const delRes = await UtilityReading.deleteMany(filter);
    if (invoiceIds.length > 0) {
      await Invoice.deleteMany({ _id: { $in: invoiceIds }, landlordId: userId, status: { $in: ['open', 'draft'] } });
    }

    await logActivity(
      req.user,
      'Utilities Reset',
      `Cleared ${delRes.deletedCount || 0} utility reading(s).`,
      'property',
      'warning'
    );

    res.json({
      success: true,
      deletedCount: delRes.deletedCount || 0,
      message: `Cleared ${delRes.deletedCount || 0} utility reading(s).`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete single utility reading
// @route   DELETE /api/utilities/:id
// @access  Private (Admin/Landlord)
router.delete('/:id', protect, admin, validateObjectId('id'), async (req, res) => {
  try {
    const doc = await UtilityReading.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Utility reading not found' });
    res.json({ success: true, message: 'Utility reading removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
