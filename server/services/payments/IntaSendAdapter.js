const axios = require('axios');
const crypto = require('crypto');
const PaymentAdapter = require('./PaymentAdapter');
const { getIntaSendConfig } = require('../../config/intasendConfig');

/**
 * IntaSend API v1 Payment Adapter (Sandbox + Production)
 * Official Unified Endpoint: https://api.intasend.com/api/v1
 * (Sandbox vs Production is determined by `_test_` vs `_live_` keys and enforced by INTASEND_ENV)
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
    if (digits.startsWith('2540') && digits.length === 13) return `254${digits.slice(4)}`;
    if (digits.startsWith('254') && digits.length === 12) return digits;
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

  buildGatewayHeaders(authMode, cfg) {
    // Use clean official API headers — avoid spoofed browser User-Agents that mismatch Node's TLS fingerprint on Cloudflare
    const baseHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (authMode === 'checkout') {
      return {
        ...baseHeaders,
        'X-IntaSend-Public-API-Key': cfg.publishableKey
      };
    }
    return {
      ...baseHeaders,
      Authorization: `Bearer ${cfg.secretKey}`
    };
  }

  extractGatewayError(apiErr) {
    const status = apiErr?.response?.status;
    const data = apiErr?.response?.data;
    if (data && typeof data === 'object') {
      const msg =
        data?.errors?.[0]?.detail ||
        data?.detail ||
        data?.message ||
        JSON.stringify(data).slice(0, 180);
      return msg || apiErr.message;
    }
    if (typeof data === 'string' && data.trim()) {
      const cfTitle = data.match(/<title>([^<]+)<\/title>/i)?.[1];
      if (/cloudflare|attention required|just a moment/i.test(data)) {
        return `Cloudflare blocked server request (${status || 403}${cfTitle ? `: ${cfTitle.trim()}` : ''}).`;
      }
      return data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    }
    if (status === 403) {
      return 'Gateway returned 403 Forbidden. Check IntaSend API permissions or server IP allowlisting.';
    }
    return apiErr?.message || 'Gateway request failed';
  }

  classifyGatewayError(apiErr, contextLabel, fallbackCode) {
    const status = apiErr?.response?.status;
    const headers = apiErr?.response?.headers || {};
    const data = apiErr?.response?.data;
    const cfRay = String(headers['cf-ray'] || '').trim();
    const serverHdr = String(headers.server || '').trim().toLowerCase();
    const isTimeout =
      apiErr?.code === 'ECONNABORTED' ||
      apiErr?.code === 'ETIMEDOUT' ||
      /timeout|aborted/i.test(String(apiErr?.message || ''));

    if (isTimeout && !status) {
      const err = new Error(`${contextLabel} timed out waiting for IntaSend. Please wait a moment and click Verify / Refresh Status before retrying.`);
      err.statusCode = 504;
      err.code = 'GATEWAY_TIMEOUT';
      err.retryable = true;
      return err;
    }

    if (status === 401) {
      const err = new Error(`${contextLabel} failed: Gateway authentication rejected (401). Verify active IntaSend API keys on the server.`);
      err.statusCode = 502;
      err.code = 'INTASEND_AUTH_FAILED';
      err.retryable = false;
      return err;
    }

    const isCloudflareBlock =
      status === 403 &&
      (
        (typeof data === 'string' && /cloudflare|attention required|just a moment/i.test(data)) ||
        Boolean(headers['cf-mitigated']) ||
        serverHdr === 'cloudflare'
      );

    if (isCloudflareBlock) {
      const rayNote = cfRay ? ` Ray ID: ${cfRay}.` : '';
      const err = new Error(
        `${contextLabel} blocked by IntaSend's Cloudflare firewall (403) for this server's outbound IP.${rayNote} Contact IntaSend support to allowlist Render outbound IPs.`
      );
      err.statusCode = 503;
      err.code = 'INTASEND_CLOUDFLARE_BLOCK';
      err.retryable = true;
      err.details = { upstreamStatus: 403, server: serverHdr || 'cloudflare', ...(cfRay ? { cfRay } : {}) };
      return err;
    }

    if (status === 403) {
      const err = new Error(`${contextLabel} rejected (403): ${this.extractGatewayError(apiErr)}`);
      err.statusCode = 503;
      err.code = 'INTASEND_FORBIDDEN';
      err.retryable = false;
      return err;
    }

    if (status === 400 || status === 422) {
      const err = new Error(`${contextLabel} rejected by gateway validation: ${this.extractGatewayError(apiErr)}`);
      err.statusCode = 400;
      err.code = 'INTASEND_VALIDATION_ERROR';
      err.retryable = false;
      return err;
    }

    if (status === 404) {
      const err = new Error(`${contextLabel} failed: Transaction reference not found on IntaSend (404).`);
      err.statusCode = 404;
      err.code = 'INTASEND_NOT_FOUND';
      err.retryable = false;
      return err;
    }

    const err = new Error(`${contextLabel} failed: ${this.extractGatewayError(apiErr)}`);
    err.statusCode = 502;
    err.code = status >= 500 ? 'INTASEND_UPSTREAM_ERROR' : fallbackCode;
    err.retryable = status >= 500;
    return err;
  }

  async postGateway(path, payload, { authMode = 'secret', cfg, timeout = 30000, ref = '' }) {
    const headers = this.buildGatewayHeaders(authMode, cfg);
    const primaryUrl = `${cfg.baseUrl}${path}`;
    try {
      return await axios.post(primaryUrl, payload, { headers, timeout });
    } catch (primaryErr) {
      const status = primaryErr?.response?.status;
      const cfRay = primaryErr?.response?.headers?.['cf-ray'] || '';
      const cfMitigated = primaryErr?.response?.headers?.['cf-mitigated'] || '';
      const serverHdr = primaryErr?.response?.headers?.server || '';
      const detail = this.extractGatewayError(primaryErr);
      // Never log Authorization headers, secret keys, or customer PII; preserve diagnostic telemetry cleanly
      console.warn(
        `[IntaSend Gateway Error] endpoint=${path} ref=${ref || 'none'} status=${status || primaryErr?.code || 'ERR'} server=${serverHdr || 'unknown'} cfRay=${cfRay || 'none'} cfMitigated=${cfMitigated || 'none'} detail=${JSON.stringify(detail)}`
      );
      throw primaryErr;
    }
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
      const err = new Error('Payment checkout is configured strictly for KES.');
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

    // 1. Direct M-Pesa STK Push if explicitly selected and phone number provided
    if (paymentChannel === 'mpesa_stk') {
      if (!normalizedPhone || !/^254[17]\d{8}$/.test(normalizedPhone)) {
        const err = new Error('Valid Kenyan M-Pesa phone number (e.g. 07XXXXXXXX or 2547XXXXXXXX) is required for M-Pesa STK Push.');
        err.statusCode = 400;
        throw err;
      }

      try {
        const stkPayload = {
          amount: Math.ceil(numericAmount),
          phone_number: normalizedPhone,
          api_ref: accountReference
        };

        const response = await this.postGateway('/payment/mpesa-stk-push/', stkPayload, {
          authMode: 'secret',
          cfg,
          timeout: 30000,
          ref: accountReference
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
        throw this.classifyGatewayError(apiErr, 'M-Pesa STK Push', 'INTASEND_STK_ERROR');
      }
    }

    // 2. Hosted Checkout (Visa, Mastercard, M-Pesa, Bank / PesaLink)
    // NOTE: IntaSend /api/v1/checkout/ authenticates via X-IntaSend-Public-API-Key + public_key in body.
    // Sending Authorization: Bearer secretKey to /checkout/ triggers "Session expired" (400).
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
        response = await this.postGateway('/checkout/', checkoutPayload, {
          authMode: 'checkout',
          cfg,
          timeout: 30000,
          ref: accountReference
        });
      } catch (firstErr) {
        // If merchant account does not support restricting by `method`, retry with all enabled checkout methods
        if (methodHint && firstErr.response?.status === 400) {
          response = await this.postGateway('/checkout/', baseCheckoutPayload, {
            authMode: 'checkout',
            cfg,
            timeout: 30000,
            ref: accountReference
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
      throw this.classifyGatewayError(apiErr, 'Checkout initiation', 'INTASEND_CHECKOUT_ERROR');
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

    const body = {
      public_key: cfg.publishableKey,
      ...(invoiceId ? { invoice_id: invoiceId } : {}),
      ...(cleanCheckoutId ? { checkout_id: cleanCheckoutId } : {}),
      ...(signature ? { signature } : {})
    };

    try {
      const response = await this.postGateway('/payment/status/', body, {
        authMode: 'secret',
        cfg,
        timeout: 30000,
        ref: accountReference || invoiceId || cleanCheckoutId
      });

      const parsed = this.parseWebhookPayload(response.data || {});
      return {
        ...parsed,
        environment: cfg.environment,
        isSandbox: cfg.isSandbox,
        verifiedReferenceMatch: !accountReference || !parsed.accountReference || parsed.accountReference === accountReference
      };
    } catch (apiErr) {
      throw this.classifyGatewayError(apiErr, 'Payment status verification', 'INTASEND_STATUS_ERROR');
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
