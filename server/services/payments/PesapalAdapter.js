const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');
const { getPesapalConfig } = require('../../config/pesapalConfig');

/**
 * Pesapal API 3.0 Payment Adapter (Sandbox + Production)
 * Official Endpoints:
 * - Auth Token:         POST /api/Auth/RequestToken
 * - Register IPN:       POST /api/URLSetup/RegisterIPN
 * - List IPNs:          GET  /api/URLSetup/GetIpnList
 * - Submit Order:       POST /api/Transactions/SubmitOrderRequest
 * - Transaction Status: GET  /api/Transactions/GetTransactionStatus?orderTrackingId=...
 * - Cancel Order:       POST /api/Transactions/CancelOrder
 * - Refund Request:     POST /api/Transactions/RefundRequest
 */
class PesapalAdapter extends PaymentAdapter {
  constructor() {
    super('pesapal', 'Pesapal API 3.0 Gateway');
    this.tokenCache = new Map();
    this.ipnCache = new Map();
  }

  getConfig(options = {}) {
    return getPesapalConfig(options);
  }

  isConfigured() {
    try {
      return this.getConfig().isConfigured;
    } catch {
      return false;
    }
  }

  getSupportedChannels() {
    return ['hosted_checkout', 'mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer'];
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

  sanitizeMerchantReference(ref = '') {
    const cleaned = String(ref || '')
      .replace(/[^A-Za-z0-9-_.:]/g, '-')
      .slice(0, 50);
    return cleaned || `MF-${Date.now().toString(36).toUpperCase()}`;
  }

  clearCaches() {
    this.tokenCache.clear();
    this.ipnCache.clear();
  }

  extractErrorDetail(err, data) {
    const obj = data || err?.response?.data;
    if (obj && typeof obj === 'object') {
      return (
        obj?.error?.message ||
        obj?.error?.code ||
        obj?.message ||
        obj?.detail ||
        JSON.stringify(obj).slice(0, 180)
      );
    }
    if (typeof obj === 'string' && obj.trim()) {
      const cfTitle = obj.match(/<title>([^<]+)<\/title>/i)?.[1];
      if (/cloudflare|attention required|just a moment/i.test(obj)) {
        return `Upstream firewall blocked request (${err?.response?.status || 403}${cfTitle ? `: ${cfTitle.trim()}` : ''})`;
      }
      return obj.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    }
    return err?.message || 'Pesapal gateway request failed';
  }

  classifyGatewayError(apiErr, contextLabel, fallbackCode = 'PESAPAL_ERROR') {
    const status = apiErr?.response?.status;
    const headers = apiErr?.response?.headers || {};
    const data = apiErr?.response?.data;
    const cfRay = String(headers['cf-ray'] || '').trim();
    const isTimeout =
      apiErr?.code === 'ECONNABORTED' ||
      apiErr?.code === 'ETIMEDOUT' ||
      /timeout|aborted/i.test(String(apiErr?.message || ''));

    if (isTimeout && !status) {
      const err = new Error(`${contextLabel} timed out waiting for Pesapal. Please wait briefly and click Refresh Status.`);
      err.statusCode = 504;
      err.code = 'GATEWAY_TIMEOUT';
      err.retryable = true;
      return err;
    }

    const detail = this.extractErrorDetail(apiErr, data);

    if (status === 401 || /invalid_consumer_key|unauthorized|invalid access credentials/i.test(detail)) {
      const err = new Error(`${contextLabel} failed: Pesapal authentication failed. Verify Consumer Key & Consumer Secret for this environment.`);
      err.statusCode = 502;
      err.code = 'PESAPAL_AUTH_FAILED';
      err.retryable = false;
      return err;
    }

    if (status === 403) {
      const rayNote = cfRay ? ` Ray ID: ${cfRay}.` : '';
      const err = new Error(`${contextLabel} rejected by gateway firewall (403): ${detail}${rayNote}`);
      err.statusCode = 503;
      err.code = 'PESAPAL_FORBIDDEN';
      err.retryable = true;
      if (cfRay) err.details = { upstreamStatus: 403, cfRay };
      return err;
    }

    if (status === 400 || status === 422 || /invalid|required|missing/i.test(String(data?.error?.code || ''))) {
      const err = new Error(`${contextLabel} rejected by Pesapal: ${detail}`);
      err.statusCode = 400;
      err.code = 'PESAPAL_VALIDATION_ERROR';
      err.retryable = false;
      return err;
    }

    const err = new Error(`${contextLabel} failed: ${detail}`);
    err.statusCode = 502;
    err.code = apiErr?.code || fallbackCode;
    err.retryable = !status || status >= 500;
    return err;
  }

  /**
   * Request and cache Pesapal API 3.0 Bearer Token (max validity 5 minutes).
   * Scoped by (environment + consumerKey) so sandbox/production switching takes effect immediately.
   */
  async getAccessToken(cfg, forceRefresh = false) {
    const cacheKey = `${cfg.environment}:${cfg.consumerKey}`;
    const cached = this.tokenCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      return cached.token;
    }

    try {
      const response = await axios.post(
        `${cfg.baseUrl}/api/Auth/RequestToken`,
        {
          consumer_key: cfg.consumerKey,
          consumer_secret: cfg.consumerSecret
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data || {};
      if (data.error || !data.token) {
        const err = new Error(data?.error?.message || data?.message || 'Pesapal authentication token missing');
        err.response = { status: 401, data };
        throw err;
      }

      const parsedExpiry = data.expiryDate ? Date.parse(data.expiryDate) : NaN;
      // Refresh 45s prior to expiry (Pesapal tokens expire after 5 minutes)
      const safeExpiresAt = Number.isFinite(parsedExpiry)
        ? Math.max(Date.now() + 30000, parsedExpiry - 45000)
        : Date.now() + 240000;

      this.tokenCache.set(cacheKey, { token: data.token, expiresAt: safeExpiresAt });
      return data.token;
    } catch (apiErr) {
      console.warn(
        `[Pesapal Auth Error] env=${cfg.environment} status=${apiErr?.response?.status || apiErr?.code || 'ERR'} detail=${this.extractErrorDetail(apiErr)}`
      );
      throw this.classifyGatewayError(apiErr, 'Pesapal authentication', 'PESAPAL_AUTH_FAILED');
    }
  }

  async listRegisteredIpns(cfg) {
    const token = await this.getAccessToken(cfg);
    const response = await axios.get(`${cfg.baseUrl}/api/URLSetup/GetIpnList`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async registerIpn(cfg, ipnUrl, notificationType = 'POST') {
    const cleanUrl = String(ipnUrl || cfg.ipnUrl || '').trim();
    if (!cleanUrl) {
      const err = new Error('PESAPAL_IPN_URL is required to register a Pesapal IPN endpoint.');
      err.statusCode = 503;
      err.code = 'PESAPAL_IPN_NOT_CONFIGURED';
      throw err;
    }

    const token = await this.getAccessToken(cfg);
    const response = await axios.post(
      `${cfg.baseUrl}/api/URLSetup/RegisterIPN`,
      {
        url: cleanUrl,
        ipn_notification_type: String(notificationType || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const data = response.data || {};
    if (data.error || !data.ipn_id) {
      const err = new Error(data?.error?.message || data?.message || 'Failed to register Pesapal IPN URL');
      err.response = { status: 400, data };
      throw err;
    }

    const cacheKey = `${cfg.environment}:${cleanUrl}`;
    this.ipnCache.set(cacheKey, data.ipn_id);
    return data;
  }

  async ensureIpnId(cfg) {
    if (cfg.ipnId && !cfg.ipnId.startsWith('your_')) {
      return cfg.ipnId;
    }

    if (!cfg.ipnUrl) {
      const err = new Error('PESAPAL_IPN_URL or PESAPAL_IPN_ID must be configured for Pesapal API 3.0.');
      err.statusCode = 503;
      err.code = 'PESAPAL_IPN_NOT_CONFIGURED';
      throw err;
    }

    const cacheKey = `${cfg.environment}:${cfg.ipnUrl}`;
    if (this.ipnCache.has(cacheKey)) {
      return this.ipnCache.get(cacheKey);
    }

    try {
      const existing = await this.listRegisteredIpns(cfg);
      const match = existing.find((item) => item?.url === cfg.ipnUrl && item?.ipn_id);
      if (match?.ipn_id) {
        this.ipnCache.set(cacheKey, match.ipn_id);
        return match.ipn_id;
      }
    } catch (listErr) {
      console.warn(`[Pesapal GetIpnList Warning] env=${cfg.environment} detail=${this.extractErrorDetail(listErr)}`);
    }

    const registered = await this.registerIpn(cfg, cfg.ipnUrl, 'POST');
    return registered.ipn_id;
  }

  /**
   * Submit Pesapal API 3.0 Hosted Checkout Order (`POST /api/Transactions/SubmitOrderRequest`).
   * Supports M-Pesa, Airtel Money, Visa, Mastercard, and PesaLink/other methods enabled on merchant account.
   * Amount and currency MUST already be computed strictly by the backend.
   */
  async initiatePayment({
    internalTransactionId,
    accountReference,
    amount,
    currency = 'KES',
    paymentChannel = 'hosted_checkout',
    description = 'MakaziFlow Subscription Payment',
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    enableRecurring = false,
    subscriptionDetails = null
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

    const merchantRef = this.sanitizeMerchantReference(accountReference || internalTransactionId);
    const normalizedPhone = this.normalizeKenyanPhone(customerPhone);
    const { first_name, last_name } = this.splitCustomerName(customerName);
    const email = (customerEmail || '').trim() || `${merchantRef.toLowerCase()}@makaziflow.afrinextech.co.ke`;

    try {
      const [token, notificationId] = await Promise.all([
        this.getAccessToken(cfg),
        this.ensureIpnId(cfg)
      ]);

      const orderPayload = {
        id: merchantRef,
        currency: 'KES',
        amount: Number(numericAmount.toFixed(2)),
        description: String(description || `MakaziFlow Payment (${merchantRef})`).slice(0, 100),
        redirect_mode: 'TOP_WINDOW',
        callback_url: cfg.callbackUrl,
        cancellation_url: cfg.cancellationUrl,
        notification_id: notificationId,
        branch: 'MakaziFlow HQ',
        billing_address: {
          email_address: email,
          ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
          country_code: 'KE',
          first_name,
          middle_name: '',
          last_name,
          line_1: '',
          line_2: '',
          city: '',
          state: '',
          postal_code: '',
          zip_code: ''
        }
      };

      // Automatic recurring card billing ONLY when explicitly enabled & customer-consented (never assumed for M-Pesa)
      if (enableRecurring && subscriptionDetails && paymentChannel !== 'mpesa_stk') {
        orderPayload.account_number = merchantRef;
        orderPayload.subscription_details = {
          start_date: subscriptionDetails.start_date,
          end_date: subscriptionDetails.end_date,
          frequency: subscriptionDetails.frequency
        };
      }

      const response = await axios.post(
        `${cfg.baseUrl}/api/Transactions/SubmitOrderRequest`,
        orderPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data || {};
      if (data.error || !data.order_tracking_id || !data.redirect_url) {
        const err = new Error(data?.error?.message || data?.message || 'Pesapal order submission failed');
        err.response = { status: 400, data };
        throw err;
      }

      const channelNormalized = ['mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer'].includes(paymentChannel)
        ? paymentChannel
        : 'hosted_checkout';

      return {
        provider: 'pesapal',
        environment: cfg.environment,
        isSandbox: cfg.isSandbox,
        paymentChannel: channelNormalized,
        status: 'pending',
        trackingId: data.order_tracking_id,
        checkoutId: data.order_tracking_id,
        gatewayInvoiceNumber: data.merchant_reference || merchantRef,
        checkoutUrl: data.redirect_url,
        rawResponse: {
          order_tracking_id: data.order_tracking_id,
          merchant_reference: data.merchant_reference || merchantRef,
          redirect_url: data.redirect_url
        }
      };
    } catch (apiErr) {
      if (apiErr?.code?.startsWith('PESAPAL_') || apiErr?.code === 'GATEWAY_TIMEOUT') {
        throw apiErr;
      }
      console.warn(
        `[Pesapal SubmitOrder Error] env=${cfg.environment} ref=${merchantRef} status=${apiErr?.response?.status || apiErr?.code || 'ERR'} detail=${this.extractErrorDetail(apiErr)}`
      );
      throw this.classifyGatewayError(apiErr, 'Pesapal checkout initiation', 'PESAPAL_ORDER_ERROR');
    }
  }

  /**
   * Authoritative server-to-server transaction verification via Pesapal GetTransactionStatus API.
   * Per Pesapal API 3.0 documentation, callbacks and IPNs do NOT carry payment status —
   * status MUST always be fetched directly from GetTransactionStatus.
   */
  async verifyTransaction({
    accountReference = '',
    trackingId = '',
    checkoutId = '',
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

    const orderTrackingId = String(trackingId || checkoutId || '').trim();
    if (!orderTrackingId) {
      const err = new Error('Pesapal OrderTrackingId is required to verify transaction status.');
      err.code = 'MISSING_TRACKING_ID';
      err.statusCode = 400;
      throw err;
    }

    try {
      const token = await this.getAccessToken(cfg);
      const response = await axios.get(
        `${cfg.baseUrl}/api/Transactions/GetTransactionStatus`,
        {
          params: { orderTrackingId },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data || {};
      const statusDesc = String(data.payment_status_description || '').toUpperCase().trim();
      const statusCodeNum = Number(data.status_code);

      // Pesapal status_code: 0 = INVALID (also returned for newly created unpaid orders), 1 = COMPLETED, 2 = FAILED, 3 = REVERSED
      let normalizedStatus = 'processing';
      if (statusCodeNum === 1 || ['COMPLETED', 'COMPLETE', 'PAID', 'SUCCESS'].includes(statusDesc)) {
        normalizedStatus = 'paid';
      } else if (statusCodeNum === 2 || ['FAILED', 'DECLINED', 'REJECTED'].includes(statusDesc)) {
        normalizedStatus = 'failed';
      } else if (statusCodeNum === 3 || ['REVERSED', 'REFUNDED'].includes(statusDesc)) {
        normalizedStatus = 'reversed';
      } else if (['CANCELLED', 'CANCELED'].includes(statusDesc)) {
        normalizedStatus = 'cancelled';
      }

      const rawMethod = String(data.payment_method || '').toUpperCase().trim();
      let paymentChannel = 'hosted_checkout';
      if (rawMethod.includes('MPESA') || rawMethod.includes('M-PESA') || rawMethod.includes('AIRTEL')) {
        paymentChannel = 'mpesa_stk';
      } else if (rawMethod.includes('VISA') || rawMethod.includes('MASTER') || rawMethod.includes('CARD')) {
        paymentChannel = 'card';
      } else if (rawMethod.includes('PESALINK') || rawMethod.includes('BANK')) {
        paymentChannel = 'bank_transfer';
      }

      const merchantRef = String(data.merchant_reference || '').trim();
      const confirmationCode = String(data.confirmation_code || '').trim();
      const amountPaid = Number(data.amount ?? 0);
      const currency = String(data.currency || 'KES').toUpperCase();
      const paidAt = data.created_date ? new Date(data.created_date) : new Date();

      return {
        rawStatus: statusDesc || `CODE_${data.status_code}`,
        status: normalizedStatus,
        trackingId: orderTrackingId,
        checkoutId: orderTrackingId,
        gatewayInvoiceNumber: merchantRef || orderTrackingId,
        accountReference: merchantRef,
        providerReference: confirmationCode || (normalizedStatus === 'paid' ? orderTrackingId : ''),
        amountPaid: Number.isFinite(amountPaid) ? amountPaid : 0,
        currency,
        paymentChannel,
        paymentMethodDetail: String(data.payment_method || 'Pesapal').trim(),
        customerPhone: String(data.payment_account || '').trim(),
        failureReason: normalizedStatus === 'failed'
          ? String(data.description || data?.error?.message || data.message || 'Payment failed at Pesapal').trim()
          : '',
        subscriptionInfo: data.subscription_transaction_info || null,
        paidAt: isNaN(paidAt.getTime()) ? new Date() : paidAt,
        environment: cfg.environment,
        isSandbox: cfg.isSandbox,
        verifiedReferenceMatch: !accountReference || !merchantRef || merchantRef === accountReference,
        rawPayload: data
      };
    } catch (apiErr) {
      console.warn(
        `[Pesapal Status Error] env=${cfg.environment} trackingId=${orderTrackingId} status=${apiErr?.response?.status || apiErr?.code || 'ERR'} detail=${this.extractErrorDetail(apiErr)}`
      );
      throw this.classifyGatewayError(apiErr, 'Pesapal payment verification', 'PESAPAL_STATUS_ERROR');
    }
  }

  async cancelOrder(orderTrackingId) {
    const cfg = this.getConfig({ requireConfigured: true });
    const token = await this.getAccessToken(cfg);
    const response = await axios.post(
      `${cfg.baseUrl}/api/Transactions/CancelOrder`,
      { order_tracking_id: String(orderTrackingId || '').trim() },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return response.data;
  }

  async requestRefund({ confirmationCode, amount, username, remarks }) {
    const cfg = this.getConfig({ requireConfigured: true });
    const token = await this.getAccessToken(cfg);
    const response = await axios.post(
      `${cfg.baseUrl}/api/Transactions/RefundRequest`,
      {
        confirmation_code: String(confirmationCode || '').trim(),
        amount: Number(amount).toFixed(2),
        username: String(username || 'SuperAdmin').trim(),
        remarks: String(remarks || 'Subscription refund request').trim()
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return response.data;
  }

  /**
   * Pesapal IPN payloads contain OrderTrackingId + OrderMerchantReference + OrderNotificationType (no status).
   * Structural validation ensures non-empty tracking + reference IDs; authoritative status verification
   * is strictly performed server-to-server via GetTransactionStatus inside PaymentService.processWebhook().
   */
  verifyWebhookSignature(payload = {}) {
    const trackingId = String(payload?.OrderTrackingId || payload?.orderTrackingId || '').trim();
    const merchantRef = String(payload?.OrderMerchantReference || payload?.orderMerchantReference || '').trim();
    const notifType = String(payload?.OrderNotificationType || payload?.orderNotificationType || 'IPNCHANGE').toUpperCase().trim();
    if (!trackingId || !merchantRef) return false;
    return ['IPNCHANGE', 'RECURRING', 'CALLBACKURL'].includes(notifType);
  }

  parseWebhookPayload(payload = {}) {
    const trackingId = String(payload?.OrderTrackingId || payload?.orderTrackingId || '').trim();
    const merchantReference = String(payload?.OrderMerchantReference || payload?.orderMerchantReference || '').trim();
    const notificationType = String(payload?.OrderNotificationType || payload?.orderNotificationType || 'IPNCHANGE').toUpperCase().trim();

    return {
      rawStatus: notificationType,
      status: 'processing', // Never trust incoming notification directly; always query GetTransactionStatus
      trackingId,
      checkoutId: trackingId,
      gatewayInvoiceNumber: merchantReference || trackingId,
      accountReference: merchantReference,
      providerReference: '',
      amountPaid: 0,
      currency: 'KES',
      paymentChannel: 'hosted_checkout',
      paymentMethodDetail: 'Pesapal',
      customerPhone: '',
      failureReason: '',
      notificationType,
      paidAt: new Date(),
      rawPayload: payload
    };
  }
}

module.exports = PesapalAdapter;
