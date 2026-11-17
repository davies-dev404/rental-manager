const axios = require('axios');
const TaxSubmission = require('../../models/TaxSubmission');
const Invoice = require('../../models/Invoice');
const logActivity = require('../../utils/logActivity');

/**
 * KRA eTIMS OSCU / VSCU Integration Service
 * Implements official KRA eTIMS OSCU endpoints:
 * - Sandbox: https://etims-api-sbx.kra.go.ke/etims-api
 * - Production: https://etims-api.kra.go.ke/etims-api
 * - Handshake: POST /selectInitOsdcInfo
 * - Sales Transmission: POST /trnsSales/saveSales (TrnsSalesSaveReq)
 *
 * IMPORTANT: Never fakes eTIMS validation or marks PDF invoices compliant without confirmed eTIMS response.
 */
class EtimsService {
  getConfig(override = {}) {
    const environment = (override.environment || process.env.ETIMS_ENVIRONMENT || 'sandbox').toLowerCase();
    const defaultUrl = environment === 'production'
      ? 'https://etims-api.kra.go.ke/etims-api'
      : 'https://etims-api-sbx.kra.go.ke/etims-api';

    return {
      environment,
      mode: (override.mode || process.env.ETIMS_MODE || 'oscu').toLowerCase(),
      apiUrl: (override.apiUrl || process.env.ETIMS_API_URL || defaultUrl).replace(/\/+$/, ''),
      apiKey: (override.apiKey || process.env.ETIMS_API_KEY || '').trim(),
      tin: (override.tin || process.env.ETIMS_TIN || '').trim(),
      bhfId: (override.bhfId || process.env.ETIMS_BHF_ID || '00').trim(),
      dvcSrlNo: (override.dvcSrlNo || process.env.ETIMS_DEVICE_SERIAL_NO || '').trim(),
      cmcKey: (override.cmcKey || process.env.ETIMS_CMC_KEY || '').trim(),
      defaultVatRate: Number(override.vatRate ?? process.env.ETIMS_DEFAULT_VAT_RATE ?? 16)
    };
  }

  isConfigured(cfgOverride = {}) {
    const cfg = this.getConfig(cfgOverride);
    const isPlaceholder = (v) => !v || v.startsWith('your_') || v === 'P000000000Z';
    return Boolean(!isPlaceholder(cfg.tin) && !isPlaceholder(cfg.cmcKey) && cfg.apiUrl);
  }

  /**
   * Step 1: Initialize OSCU/VSCU device to obtain cmcKey
   * POST /selectInitOsdcInfo
   */
  async initializeDevice({ tin, bhfId = '00', dvcSrlNo, environment } = {}) {
    const cfg = this.getConfig({ tin, bhfId, dvcSrlNo, environment });
    if (!cfg.tin || !cfg.dvcSrlNo) {
      throw new Error('KRA TIN and Device Serial Number (dvcSrlNo) are required for eTIMS initialization.');
    }

    const endpoint = cfg.mode === 'vscu'
      ? `${cfg.apiUrl}/selectInitInfo`
      : `${cfg.apiUrl}/selectInitOsdcInfo`;

    const headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey && !cfg.apiKey.startsWith('your_')) {
      headers['x-api-key'] = cfg.apiKey;
    }

    const response = await axios.post(
      endpoint,
      {
        tin: cfg.tin,
        bhfId: cfg.bhfId,
        dvcSrlNo: cfg.dvcSrlNo
      },
      { headers, timeout: 15000 }
    );

    return response.data;
  }

  /**
   * Build KRA TrnsSalesSaveReq payload strictly following eTIMS OSCU specification
   */
  buildSaveSalesPayload(invoice, cfg, sequentialInvcNo) {
    const items = Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items
      : [{
          description: invoice.invoiceCategory === 'subscription' ? 'MakaziFlow SaaS Subscription' : 'Rental Charge',
          itemCode: invoice.invoiceCategory === 'subscription' ? 'MF-SAAS-001' : 'MF-RENT-001',
          itemClassCode: '80131500',
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.totalAmount,
          taxRate: invoice.vatRate || 0,
          taxableAmount: invoice.subtotal || invoice.totalAmount,
          taxAmount: invoice.taxAmount || 0,
          totalAmount: invoice.totalAmount
        }];

    // Categorize tax buckets: A = Exempt (0%), B = Standard VAT (16%)
    let taxblAmtA = 0; // Exempt / Zero
    let taxAmtA = 0;
    let taxblAmtB = 0; // Standard 16% VAT
    let taxAmtB = 0;

    const itemList = items.map((it, idx) => {
      const rate = Number(it.taxRate ?? invoice.vatRate ?? 0);
      const qty = Number(it.quantity || 1);
      const unitPrc = Number(it.unitPrice || it.totalAmount || 0);
      const splyAmt = Number((qty * unitPrc).toFixed(2));
      const taxTyCd = rate > 0 ? 'B' : 'A';
      const taxblAmt = Number((it.taxableAmount || splyAmt).toFixed(2));
      const taxAmt = Number((it.taxAmount ?? (rate > 0 ? (taxblAmt * rate) / 100 : 0)).toFixed(2));
      const totAmt = Number((it.totalAmount || (taxblAmt + taxAmt)).toFixed(2));

      if (taxTyCd === 'B') {
        taxblAmtB += taxblAmt;
        taxAmtB += taxAmt;
      } else {
        taxblAmtA += taxblAmt;
        taxAmtA += taxAmt;
      }

      return {
        itemSeq: idx + 1,
        itemCd: it.itemCode || `MF-ITEM-${idx + 1}`,
        itemClsCd: it.itemClassCode || '80131500',
        itemNm: it.description || 'Rental Service',
        bcd: null,
        pkgUnitCd: 'NT',
        pkg: qty,
        qtyUnitCd: 'U',
        qty,
        prc: unitPrc,
        splyAmt,
        dcRt: 0,
        dcAmt: 0,
        isrccCd: null,
        isrccNm: null,
        isrcRt: 0,
        isrcAmt: 0,
        taxTyCd,
        taxblAmt,
        taxAmt,
        totAmt
      };
    });

    const nowStr = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const salesDate = nowStr.slice(0, 8);

    return {
      tin: cfg.tin,
      bhfId: cfg.bhfId,
      trdInvcNo: invoice.invoiceNumber,
      invcNo: sequentialInvcNo,
      orgInvcNo: 0,
      custTin: invoice.customerKraPin || null,
      custNm: invoice.customerName || 'Tenant / Customer',
      salesTyCd: 'N', // Normal Sale
      rcptTyCd: invoice.status === 'credit_note' ? 'R' : 'S', // Sale or Credit Note after Sale
      pmtTyCd: '06', // Mobile Money / Electronic
      salesSttsCd: '02', // Approved
      cfmDt: nowStr,
      salesDt: salesDate,
      stockRlsDt: nowStr,
      cnclReqDt: null,
      cnclDt: null,
      rfdDt: null,
      rfdRsnCd: null,
      totItemCnt: itemList.length,
      taxblAmtA: Number(taxblAmtA.toFixed(2)),
      taxblAmtB: Number(taxblAmtB.toFixed(2)),
      taxblAmtC: 0,
      taxblAmtD: 0,
      taxblAmtE: 0,
      taxRtA: 0,
      taxRtB: 16,
      taxRtC: 0,
      taxRtD: 0,
      taxRtE: 0,
      taxAmtA: Number(taxAmtA.toFixed(2)),
      taxAmtB: Number(taxAmtB.toFixed(2)),
      taxAmtC: 0,
      taxAmtD: 0,
      taxAmtE: 0,
      totTaxblAmt: Number((taxblAmtA + taxblAmtB).toFixed(2)),
      totTaxAmt: Number((taxAmtA + taxAmtB).toFixed(2)),
      totAmt: Number(invoice.totalAmount.toFixed(2)),
      prchrAcptcYn: 'N',
      remark: invoice.notes || `MakaziFlow ${invoice.invoiceCategory} invoice`,
      regrId: 'MakaziFlow',
      regrNm: 'MakaziFlow System',
      modrId: 'MakaziFlow',
      modrNm: 'MakaziFlow System',
      receipt: {
        custTin: invoice.customerKraPin || null,
        custMblNo: invoice.customerPhone || null,
        rptNo: sequentialInvcNo,
        rcptPbctDt: nowStr,
        trdeNm: 'MakaziFlow',
        adrs: 'Nairobi, Kenya',
        topMsg: invoice.invoiceCategory === 'subscription' ? 'Subscription Tax Invoice' : 'Rental Invoice',
        btmMsg: 'Thank you',
        prchrAcptcYn: 'N'
      },
      itemList
    };
  }

  /**
   * Transmit an invoice to KRA eTIMS OSCU (/trnsSales/saveSales)
   * Explicitly records TaxSubmission & keeps failed submissions retryable.
   * NEVER marks an invoice as validated unless KRA returns resultCd === '000'.
   */
  async submitInvoiceToEtims({ invoiceId, actorUser = null, overrideConfig = {} }) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.etimsStatus === 'validated') {
      const existing = await TaxSubmission.findById(invoice.etimsSubmissionId);
      return { invoice, submission: existing, alreadyValidated: true };
    }

    const cfg = this.getConfig(overrideConfig);
    const sequentialNo = (await TaxSubmission.countDocuments({ landlordId: invoice.landlordId })) + 1;
    const payload = this.buildSaveSalesPayload(invoice, cfg, sequentialNo);

    const submission = await TaxSubmission.create({
      invoiceId: invoice._id,
      landlordId: invoice.landlordId,
      environment: cfg.environment,
      integrationMode: cfg.mode,
      tin: cfg.tin || 'UNCONFIGURED',
      bhfId: cfg.bhfId,
      trdInvcNo: invoice.invoiceNumber,
      invcNo: sequentialNo,
      taxableAmount: invoice.subtotal,
      vatRate: invoice.vatRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: 'pending',
      requestPayload: payload
    });

    if (!this.isConfigured(overrideConfig)) {
      submission.status = 'failed';
      submission.lastError = 'KRA eTIMS credentials (ETIMS_TIN, ETIMS_CMC_KEY, ETIMS_DEVICE_SERIAL_NO) are not configured. Submission saved as failed for retry once onboarded.';
      submission.updatedAt = new Date();
      await submission.save();

      invoice.etimsStatus = 'failed';
      invoice.etimsSubmissionId = submission._id;
      await invoice.save();

      await logActivity(actorUser || 'System', 'eTIMS Submission Failed', `Invoice ${invoice.invoiceNumber}: missing KRA eTIMS credentials`, 'tax', 'warning');
      return { invoice, submission, configured: false };
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        tin: cfg.tin,
        bhfId: cfg.bhfId,
        cmcKey: cfg.cmcKey
      };
      if (cfg.apiKey && !cfg.apiKey.startsWith('your_')) {
        headers['x-api-key'] = cfg.apiKey;
      }

      submission.submittedAt = new Date();
      const response = await axios.post(`${cfg.apiUrl}/trnsSales/saveSales`, payload, {
        headers,
        timeout: 20000
      });

      const resp = response.data || {};
      submission.responsePayload = resp;

      if (resp.resultCd === '000' && resp.data) {
        submission.status = 'validated';
        submission.etimsReceiptNo = String(resp.data.curRcptNo || resp.data.rcptNo || '');
        submission.intrlData = String(resp.data.intrlData || '');
        submission.rcptSign = String(resp.data.rcptSign || '');
        submission.sdcDateTime = String(resp.data.sdcDateTime || '');
        submission.qrCodeData = resp.data.qrCodeData || `${cfg.tin}${cfg.bhfId}${submission.rcptSign}`;
        submission.validatedAt = new Date();

        invoice.etimsStatus = 'validated';
        invoice.etimsSubmissionId = submission._id;
        invoice.etimsReceiptNo = submission.etimsReceiptNo;
        invoice.etimsSignature = submission.rcptSign;
        invoice.etimsQrData = submission.qrCodeData;
        invoice.etimsSubmittedAt = submission.validatedAt;
      } else {
        submission.status = 'failed';
        submission.lastError = resp.resultMsg || `KRA returned code ${resp.resultCd || 'unknown'}`;
        invoice.etimsStatus = 'failed';
        invoice.etimsSubmissionId = submission._id;
      }

      submission.updatedAt = new Date();
      await submission.save();
      await invoice.save();

      await logActivity(
        actorUser || 'System',
        submission.status === 'validated' ? 'eTIMS Invoice Validated' : 'eTIMS Submission Failed',
        `Invoice ${invoice.invoiceNumber} -> ${submission.status} (${submission.etimsReceiptNo || submission.lastError})`,
        'tax',
        submission.status === 'validated' ? 'success' : 'error'
      );

      return { invoice, submission, configured: true };
    } catch (err) {
      submission.status = 'failed';
      submission.lastError = err.response?.data?.resultMsg || err.message;
      submission.responsePayload = err.response?.data || { error: err.message };
      submission.updatedAt = new Date();
      await submission.save();

      invoice.etimsStatus = 'failed';
      invoice.etimsSubmissionId = submission._id;
      await invoice.save();

      await logActivity(actorUser || 'System', 'eTIMS Submission Error', `Invoice ${invoice.invoiceNumber}: ${submission.lastError}`, 'tax', 'error');
      return { invoice, submission, configured: true };
    }
  }

  /**
   * Retry a failed TaxSubmission cleanly
   */
  async retrySubmission({ submissionId, actorUser = null }) {
    const prev = await TaxSubmission.findById(submissionId);
    if (!prev) throw new Error('Tax submission record not found');
    const result = await this.submitInvoiceToEtims({
      invoiceId: prev.invoiceId,
      actorUser
    });
    if (result.submission) {
      result.submission.retryCount = (prev.retryCount || 0) + 1;
      await result.submission.save();
    }
    return result;
  }
}

module.exports = new EtimsService();
