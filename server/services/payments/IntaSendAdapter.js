const axios = require('axios');
const crypto = require('crypto');
const PaymentAdapter = require('./PaymentAdapter');
const { getIntaSendConfig } = require('../../config/intasendConfig');

/**
 * IntaSend API v1/3.0 Payment Adapter (Sandbox + Production)
 * Official Endpoints:
 * - Sandbox base:    https://sandbox.intasend.com/api/v1
 * - Production base: https://payment.intasend.com/api/v1
 * - Checkout:        POST /checkout/
 * - M-Pesa STK Push: POST /payment/mpesa-stk-push/
 * - Payment Status:  POST /payment/status/
 */
class IntaSendAdapter extends PaymentAdapter {
  constructor() {
    super('intasend', 'IntaSend Payment Gateway');
  }

  getConfig(options = {}) {
    return getIntaSendConfig(options);
  }

  isConfigured() {
    try {
      return this.getConfig().isConfigured;
    } catch {
      return false;
    }
  }

  getSupportedChannels() {
    return ['hosted_checkout', 'mpesa_stk', 'card', 'bank_transfer'];
  }

  normalizeKenyanPhone(phone = '') {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('254') && digits.length >= 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `254${digits}`;
    return digits;
  }

  splitCustomerName(fullName = '') {
    const clean = String(fullName || 'MakaziFlow Customer').trim();
    const parts = clean.split(/\s+/);
    const first_name = parts[0] || 'MakaziFlow';
    const last_name = parts.slice(1).join(' ') || 'User';
    return { first_name, last_name };
  }

  timingSafeEqualStr(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(String(a), 'utf8');
    const bufB = Buffer.from(String(b), 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  buildRedirectUrl(cfg) {
    // IntaSend rejects '?' or '&' query parameters in redirect_url and appends checkout_id/tracking_id/signature automatically
    return String(cfg.callbackUrl || `${cfg.frontendUrl}/billing`).split('?')[0];
  }

  /**
   * Initiate payment via IntaSend Hosted Checkout or Direct M-Pesa STK Push.
   * Amount and currency MUST already be computed strictly by the backend.
   */
  async initiatePayment({
    internalTransactionId,
    accountReference,
    amount,
    currency = 'KES',
    paymentChannel = 'hosted_checkout',
    description = 'MakaziFlow Payment',
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    transactionDbId = ''
  }) {
    const cfg = this.getConfig({ requireConfigured: true });
    const cleanCurrency = String(currency || 'KES').toUpperCase();
    if (cleanCurrency !== 'KES') {
      const err = new Error('IntaSend checkout is configured strictly for KES.');
      err.statusCode = 400;
      throw err;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      const err = new Error('Valid positive payment amount in KES is required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedPhone = this.normalizeKenyanPhone(customerPhone);
    const { first_name, last_name } = this.splitCustomerName(customerName);
    const email = (customerEmail || '').trim() || `${accountReference.toLowerCase()}@makaziflow.afrinextech.co.ke`;

    const headers = {
      Authorization: `Bearer ${cfg.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    // 1. Direct M-Pesa STK Push if explicitly selected and phone number provided
    if (paymentChannel === 'mpesa_stk') {
      if (!normalizedPhone || !/^254[17]\d{8}$/.test(normalizedPhone)) {
        const err = new Error('Valid Kenyan M-Pesa phone number (e.g. 07XXXXXXXX or 2547XXXXXXXX) is required for M-Pesa STK Push.');
        err.statusCode = 400;
        throw err;
      }

      try {
        const stkPayload = {
          public_key: cfg.publishableKey,
          amount: Math.ceil(numericAmount),
          currency: 'KES',
          phone_number: normalizedPhone,
          api_ref: accountReference,
          narrative: String(`Afrinex Tech - MakaziFlow ${description || accountReference}`).slice(0, 100),
          first_name,
          last_name,
          email
        };

        const response = await axios.post(`${cfg.baseUrl}/payment/mpesa-stk-push/`, stkPayload, {
          headers,
          timeout: 20000
        });

        const data = response.data || {};
        const inv = data.invoice || data;
        const trackingId = inv?.invoice_id || data.invoice_id || data.id || '';

        return {
          provider: 'intasend',
          environment: cfg.environment,
          isSandbox: cfg.isSandbox,
          paymentChannel: 'mpesa_stk',
          status: 'pending',
          trackingId,
          checkoutId: data.id || '',
          gatewayInvoiceNumber: trackingId,
          checkoutUrl: '',
          rawResponse: data
        };
      } catch (apiErr) {
        const errMsg =
          apiErr.response?.data?.errors?.[0]?.detail ||
          apiErr.response?.data?.detail ||
          apiErr.response?.data?.message ||
          apiErr.message;
        const err = new Error(`M-Pesa STK Push failed: ${errMsg}`);
        err.statusCode = apiErr.response?.status >= 400 && apiErr.response?.status < 500 ? 400 : 502;
        err.code = 'INTASEND_STK_ERROR';
        throw err;
      }
    }

    // 2. Hosted Checkout (Visa, Mastercard, M-Pesa, Bank / PesaLink)
    // NOTE: IntaSend /api/v1/checkout/ authenticates via X-IntaSend-Public-API-Key + public_key in body.
    // Sending Authorization: Bearer secretKey to /checkout/ triggers "Session expired" (400).
    const checkoutHeaders = {
      'X-IntaSend-Public-API-Key': cfg.publishableKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    try {
      const redirectUrl = this.buildRedirectUrl(cfg);
      const baseCheckoutPayload = {
        public_key: cfg.publishableKey,
        amount: Number(numericAmount.toFixed(2)),
        currency: 'KES',
        email,
        first_name,
        last_name,
        ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
        host: cfg.frontendUrl,
        redirect_url: redirectUrl,
        api_ref: accountReference,
        comment: String(description || accountReference).slice(0, 120)
      };

      const methodHint = paymentChannel === 'card'
        ? 'CARD-PAYMENT'
        : (paymentChannel === 'bank_transfer' ? 'PESALINK' : null);
      const checkoutPayload = methodHint
        ? { ...baseCheckoutPayload, method: methodHint }
        : baseCheckoutPayload;

      let response;
      try {
        response = await axios.post(`${cfg.baseUrl}/checkout/`, checkoutPayload, {
          headers: checkoutHeaders,
          timeout: 20000
        });
      } catch (firstErr) {
        // If merchant account does not support restricting by `method`, retry with all enabled checkout methods
        if (methodHint && firstErr.response?.status === 400) {
          response = await axios.post(`${cfg.baseUrl}/checkout/`, baseCheckoutPayload, {
            headers: checkoutHeaders,
            timeout: 20000
          });
        } else {
          throw firstErr;
        }
      }

      const data = response.data || {};
      const checkoutUrl = data.url || data.checkout_url || '';
      const checkoutId = data.id || data.checkout_id || '';
      const trackingId = data.tracking_id || data.invoice_id || '';

      return {
        provider: 'intasend',
        environment: cfg.environment,
        isSandbox: cfg.isSandbox,
        paymentChannel: paymentChannel === 'card' ? 'card' : (paymentChannel === 'bank_transfer' ? 'bank_transfer' : 'hosted_checkout'),
        status: 'pending',
        trackingId,
        checkoutId,
        checkoutSignature: data.signature || '',
        gatewayInvoiceNumber: trackingId,
        checkoutUrl,
        rawResponse: { id: checkoutId, url: checkoutUrl, methods: data.methods || [] }
      };
    } catch (apiErr) {
      const errMsg =
        apiErr.response?.data?.errors?.[0]?.detail ||
        apiErr.response?.data?.detail ||
        apiErr.response?.data?.message ||
        apiErr.message;
      const err = new Error(`Checkout initiation failed: ${errMsg}`);
      err.statusCode = apiErr.response?.status >= 400 && apiErr.response?.status < 500 ? 400 : 502;
      err.code = 'INTASEND_CHECKOUT_ERROR';
      throw err;
    }
  }

  /**
   * Directly query IntaSend Payment Status API (`POST /payment/status/`)
   * Enforces environment isolation (never verifies sandbox txn with production keys or vice versa).
   */
  async verifyTransaction({
    accountReference = '',
    gatewayInvoiceNumber = '',
    trackingId = '',
    checkoutId = '',
    signature = '',
    expectedEnvironment = null
  }) {
    const cfg = this.getConfig({ requireConfigured: true });

    if (expectedEnvironment && expectedEnvironment !== cfg.environment) {
      const err = new Error(
        `Environment mismatch: cannot verify ${expectedEnvironment} transaction while configured for ${cfg.environment}.`
      );
      err.code = 'ENVIRONMENT_MISMATCH';
      err.statusCode = 403;
      throw err;
    }

    const cleanTrackingId = String(trackingId || gatewayInvoiceNumber || '').trim();
    const cleanCheckoutId = String(checkoutId || '').trim();
    const invoiceId = (cleanTrackingId && cleanTrackingId !== cleanCheckoutId) ? cleanTrackingId : '';

    if (!invoiceId && !cleanCheckoutId) {
      const err = new Error('Transaction tracking reference is required to verify payment status.');
      err.code = 'MISSING_TRACKING_ID';
      err.statusCode = 400;
      throw err;
    }

    const headers = {
      Authorization: `Bearer ${cfg.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    const body = {
      public_key: cfg.publishableKey,
      ...(invoiceId ? { invoice_id: invoiceId } : {}),
      ...(cleanCheckoutId ? { checkout_id: cleanCheckoutId } : {}),
      ...(signature ? { signature } : {})
    };

    try {
      const response = await axios.post(`${cfg.baseUrl}/payment/status/`, body, {
        headers,
        timeout: 15000
      });

      const parsed = this.parseWebhookPayload(response.data || {});
      return {
        ...parsed,
        environment: cfg.environment,
        isSandbox: cfg.isSandbox,
        verifiedReferenceMatch: !accountReference || !parsed.accountReference || parsed.accountReference === accountReference
      };
    } catch (apiErr) {
      const errMsg =
        apiErr.response?.data?.detail ||
        apiErr.response?.data?.message ||
        apiErr.message;
      const err = new Error(`IntaSend status verification failed: ${errMsg}`);
      err.statusCode = apiErr.response?.status === 404 ? 404 : 502;
      err.code = 'INTASEND_STATUS_ERROR';
      throw err;
    }
  }

  /**
   * Verify IntaSend Webhook Challenge strictly in constant time.
   */
  verifyWebhookSignature(payload = {}, headers = {}) {
    try {
      const cfg = this.getConfig({ requireConfigured: false });
      const expectedChallenge = cfg.webhookChallenge;
      if (!expectedChallenge || expectedChallenge.startsWith('your_')) {
        return false;
      }

      const incomingChallenge =
        payload?.challenge ||
        headers['x-intasend-challenge'] ||
        '';

      if (!incomingChallenge) return false;
      return this.timingSafeEqualStr(String(incomingChallenge).trim(), expectedChallenge);
    } catch {
      return false;
    }
  }

  /**
   * Normalize IntaSend webhook OR status API response into MakaziFlow payment shape.
   */
  parseWebhookPayload(payload = {}) {
    const inv = (payload && typeof payload.invoice === 'object' && payload.invoice !== null)
      ? payload.invoice
      : payload;

    const rawState = String(inv?.state || inv?.status || payload?.state || '').toUpperCase().trim();

    let normalizedStatus = 'processing';
    if (['COMPLETE', 'COMPLETED', 'PAID', 'SETTLED', 'SUCCESS'].includes(rawState)) {
      normalizedStatus = 'paid';
    } else if (['FAILED', 'ERROR', 'DECLINED', 'REJECTED'].includes(rawState)) {
      normalizedStatus = 'failed';
    } else if (['CANCELLED', 'CANCELED', 'EXPIRED', 'ABANDONED'].includes(rawState)) {
      normalizedStatus = 'cancelled';
    } else if (['REVERSED', 'REFUNDED', 'CHARGEBACK'].includes(rawState)) {
      normalizedStatus = 'reversed';
    } else if (['PENDING', 'PROCESSING', 'RETRY', 'IN_PROGRESS'].includes(rawState)) {
      normalizedStatus = 'processing';
    }

    const rawProviderMethod = String(inv?.provider || payload?.provider || '').toUpperCase().trim();
    let paymentChannel = 'hosted_checkout';
    if (rawProviderMethod.includes('M-PESA') || rawProviderMethod.includes('MPESA')) {
      paymentChannel = 'mpesa_stk';
    } else if (rawProviderMethod.includes('CARD') || rawProviderMethod.includes('VISA') || rawProviderMethod.includes('MASTERCARD')) {
      paymentChannel = 'card';
    } else if (rawProviderMethod.includes('PESALINK') || rawProviderMethod.includes('BANK')) {
      paymentChannel = 'bank_transfer';
    }

    const trackingId = String(inv?.invoice_id || payload?.invoice_id || payload?.tracking_id || '').trim();
    const checkoutId = String(payload?.checkout_id || inv?.checkout_id || '').trim();
    const accountReference = String(inv?.api_ref || payload?.api_ref || '').trim();
    const mpesaRef = String(inv?.mpesa_reference || payload?.mpesa_reference || '').trim();
    const clearingRef = String(inv?.clearing_status_ref || inv?.host_reference || '').trim();
    const providerReference = mpesaRef || clearingRef || trackingId || checkoutId;

    const amountPaid = Number(inv?.value ?? inv?.amount ?? payload?.value ?? payload?.amount ?? 0);
    const currency = String(inv?.currency || payload?.currency || 'KES').toUpperCase();
    const paidAt = inv?.updated_at ? new Date(inv.updated_at) : new Date();

    return {
      rawStatus: rawState || 'UNKNOWN',
      status: normalizedStatus,
      trackingId,
      checkoutId,
      gatewayInvoiceNumber: trackingId || checkoutId,
      accountReference,
      providerReference,
      amountPaid: Number.isFinite(amountPaid) ? amountPaid : 0,
      currency,
      paymentChannel,
      paymentMethodDetail: rawProviderMethod || 'IntaSend',
      customerPhone: String(inv?.account || payload?.account || '').trim(),
      failureReason: String(inv?.failed_reason || payload?.failed_reason || inv?.failed_code || '').trim(),
      paidAt: isNaN(paidAt.getTime()) ? new Date() : paidAt,
      rawPayload: payload
    };
  }
}

module.exports = IntaSendAdapter;
