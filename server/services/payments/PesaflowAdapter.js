const crypto = require('crypto');
const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');

/**
 * Pesaflow Payment Adapter (Primary Gateway)
 * Follows official Pesaflow / eCitizen Merchant API & iFrame v2.1 specifications:
 * - Sandbox: https://test.pesaflow.com
 * - Production: https://payments.ecitizen.go.ke (or merchant-configured URL)
 * - Signature: base64(lowercase_hex(HMAC-SHA256(data, apiSecret)))
 */
class PesaflowAdapter extends PaymentAdapter {
  constructor() {
    super('pesaflow', 'Pesaflow (Primary Gateway)');
  }

  getConfig() {
    const env = (process.env.PESAFLOW_ENVIRONMENT || 'sandbox').toLowerCase();
    const defaultBase = env === 'production'
      ? 'https://payments.ecitizen.go.ke'
      : 'https://test.pesaflow.com';

    const baseUrl = (process.env.PESAFLOW_API_BASE_URL || defaultBase).replace(/\/+$/, '');
    const checkoutUrl = process.env.PESAFLOW_CHECKOUT_URL || `${baseUrl}/PaymentAPI/iframev2.1.php`;
    const statusUrl = process.env.PESAFLOW_STATUS_URL || `${baseUrl}/api/invoice/payment/status`;

    return {
      environment: env,
      baseUrl,
      checkoutUrl,
      statusUrl,
      apiClientID: (process.env.PESAFLOW_API_CLIENT_ID || '').trim(),
      apiKey: (process.env.PESAFLOW_API_KEY || '').trim(),
      apiSecret: (process.env.PESAFLOW_API_SECRET || '').trim(),
      serviceID: (process.env.PESAFLOW_SERVICE_ID || '').trim(),
      webhookSecret: (process.env.PESAFLOW_WEBHOOK_SECRET || process.env.PESAFLOW_API_SECRET || '').trim(),
      callbackUrl: (process.env.PESAFLOW_CALLBACK_URL || '').trim(),
      successRedirectUrl: (process.env.PESAFLOW_SUCCESS_REDIRECT_URL || '').trim(),
      failRedirectUrl: (process.env.PESAFLOW_FAIL_REDIRECT_URL || '').trim(),
      paybillNumber: (process.env.PESAFLOW_PAYBILL_NUMBER || '').trim()
    };
  }

  isConfigured() {
    const cfg = this.getConfig();
    const isPlaceholder = (v) => !v || v.startsWith('your_') || v.includes('replace_with');
    return Boolean(
      !isPlaceholder(cfg.apiClientID) &&
      !isPlaceholder(cfg.apiKey) &&
      !isPlaceholder(cfg.apiSecret) &&
      !isPlaceholder(cfg.serviceID)
    );
  }

  getSupportedChannels() {
    return ['hosted_checkout', 'mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer', 'ussd'];
  }

  /**
   * Pesaflow Wire Parity HMAC-SHA256 Hash Generator:
   * secureHash = base64(lowercase_hex(HMAC-SHA256(dataString, secret)))
   */
  generateSecureHash(dataString, secretOverride = null) {
    const cfg = this.getConfig();
    const secret = secretOverride || cfg.apiSecret;
    if (!secret) {
      throw new Error('Pesaflow API secret is not configured.');
    }
    const hexDigest = crypto
      .createHmac('sha256', secret)
      .update(String(dataString))
      .digest('hex')
      .toLowerCase();
    return Buffer.from(hexDigest, 'utf8').toString('base64');
  }

  /**
   * Constant-time signature verification
   */
  timingSafeEqualStr(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(String(a), 'utf8');
    const bufB = Buffer.from(String(b), 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Build signed checkout payload matching Pesaflow iFrame / Checkout parameters
   */
  buildSignedCheckoutPayload({
    billRefNumber,
    amountExpected,
    currency = 'KES',
    billDesc,
    clientName,
    clientEmail,
    clientMSISDN,
    clientIDNumber = '',
    notificationURL,
    callBackURLOnSuccess,
    callBackURLOnFail
  }) {
    const cfg = this.getConfig();
    const amountStr = Number(amountExpected).toFixed(0);
    const dataString = [
      cfg.apiClientID,
      amountStr,
      cfg.serviceID,
      clientIDNumber || billRefNumber,
      currency,
      billRefNumber,
      billDesc,
      clientName,
      cfg.apiSecret
    ].join('');

    const secureHash = this.generateSecureHash(dataString);

    return {
      apiClientID: cfg.apiClientID,
      serviceID: cfg.serviceID,
      billDesc,
      billRefNumber,
      currency,
      amountExpected: amountStr,
      clientIDNumber: clientIDNumber || billRefNumber,
      clientName,
      clientEmail,
      clientMSISDN,
      notificationURL: notificationURL || cfg.callbackUrl,
      callBackURLOnSuccess: callBackURLOnSuccess || cfg.successRedirectUrl,
      callBackURLOnFail: callBackURLOnFail || cfg.failRedirectUrl,
      pictureURL: '',
      secureHash,
      format: 'json'
    };
  }

  /**
   * Initiate Payment via Pesaflow Official Hosted Checkout / iFrame or Paybill instructions.
   * Never generates card storage; never fakes paid status.
   */
  async initiatePayment({
    internalTransactionId,
    accountReference,
    amount,
    currency = 'KES',
    paymentChannel = 'hosted_checkout',
    description,
    customerName,
    customerEmail,
    customerPhone,
    customerIdNumber = '',
    callbackUrl,
    successRedirectUrl,
    failRedirectUrl
  }) {
    const cfg = this.getConfig();

    if (!this.isConfigured()) {
      const err = new Error(
        'Pesaflow merchant credentials (PESAFLOW_API_CLIENT_ID, PESAFLOW_API_KEY, PESAFLOW_API_SECRET, PESAFLOW_SERVICE_ID) are not configured on the server.'
      );
      err.statusCode = 503;
      err.code = 'PESAFLOW_NOT_CONFIGURED';
      throw err;
    }

    const signedPayload = this.buildSignedCheckoutPayload({
      billRefNumber: accountReference,
      amountExpected: amount,
      currency,
      billDesc: description || `MakaziFlow Payment ${accountReference}`,
      clientName: customerName || 'Customer',
      clientEmail: customerEmail || '',
      clientMSISDN: customerPhone || '',
      clientIDNumber: customerIdNumber || '',
      notificationURL: callbackUrl || cfg.callbackUrl,
      callBackURLOnSuccess: successRedirectUrl || cfg.successRedirectUrl,
      callBackURLOnFail: failRedirectUrl || cfg.failRedirectUrl
    });

    // If Paybill workflow is selected and business paybill number is configured
    if (paymentChannel === 'mpesa_paybill') {
      return {
        provider: 'pesaflow',
        environment: cfg.environment,
        paymentChannel: 'mpesa_paybill',
        status: 'pending',
        checkoutUrl: cfg.checkoutUrl,
        paybillInstructions: {
          businessNumber: cfg.paybillNumber || cfg.serviceID,
          accountReference,
          amount: Number(amount),
          currency
        },
        checkoutParams: signedPayload
      };
    }

    // Attempt server-to-server iframe session initiation when Pesaflow endpoint returns JSON/request_id
    try {
      const formBody = new URLSearchParams(signedPayload).toString();
      const response = await axios.post(cfg.checkoutUrl, formBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });

      const respData = response.data || {};
      const requestId = respData.request_id || respData.invoice_number || null;
      const redirectLocation = response.headers?.location || respData.checkout_url || respData.url;
      const resolvedCheckoutUrl = redirectLocation
        || (requestId ? `${cfg.baseUrl}/checkout?request_id=${encodeURIComponent(requestId)}` : cfg.checkoutUrl);

      return {
        provider: 'pesaflow',
        environment: cfg.environment,
        paymentChannel,
        status: 'pending',
        gatewayInvoiceNumber: respData.invoice_number || requestId || '',
        checkoutUrl: resolvedCheckoutUrl,
        checkoutParams: signedPayload,
        rawResponse: typeof respData === 'object' ? respData : { htmlInitiated: true }
      };
    } catch (apiErr) {
      // If Pesaflow returns an HTML form page or redirect instead of JSON, return signed form params for frontend iframe POST
      if (apiErr.response && apiErr.response.status >= 200 && apiErr.response.status < 400) {
        return {
          provider: 'pesaflow',
          environment: cfg.environment,
          paymentChannel,
          status: 'pending',
          checkoutUrl: cfg.checkoutUrl,
          checkoutParams: signedPayload,
          requiresFormPost: true
        };
      }
      const errMsg = apiErr.response?.data?.message || apiErr.message;
      throw new Error(`Pesaflow initiation failed: ${errMsg}`);
    }
  }

  /**
   * Verify transaction status directly against Pesaflow server status endpoint
   */
  async verifyTransaction({ accountReference, gatewayInvoiceNumber }) {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      const err = new Error('Pesaflow credentials are not configured on the server.');
      err.code = 'PESAFLOW_NOT_CONFIGURED';
      throw err;
    }

    const ref = gatewayInvoiceNumber || accountReference;
    const dataString = `${cfg.apiClientID}${ref}${cfg.apiSecret}`;
    const secureHash = this.generateSecureHash(dataString);

    const response = await axios.post(
      cfg.statusUrl,
      {
        api_client_id: cfg.apiClientID,
        apiClientID: cfg.apiClientID,
        ref_no: accountReference,
        invoice_number: gatewayInvoiceNumber || undefined,
        secure_hash: secureHash,
        secureHash
      },
      {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 15000
      }
    );

    const data = response.data || {};
    return this.parseWebhookPayload(data);
  }

  /**
   * Verify incoming Pesaflow IPN Callback Signature
   * Supports documented `secure_hash` / `secureHash` (HMAC-SHA256) and `x-pesaflow-signature` header.
   */
  verifyWebhookSignature(payload, headers = {}) {
    const cfg = this.getConfig();
    const secret = cfg.webhookSecret;
    if (!secret || secret.startsWith('your_')) {
      return false;
    }

    const incomingHash =
      payload?.secure_hash ||
      payload?.secureHash ||
      headers['x-pesaflow-signature'] ||
      headers['x-signature'];

    if (!incomingHash) return false;

    const invNo = payload?.invoice_number || payload?.invoiceNumber || '';
    const billRef = payload?.client_invoice_ref || payload?.billRefNumber || payload?.bill_ref_number || '';
    const amountPaid = payload?.amount_paid ?? payload?.amountPaid ?? '';
    const payRef = payload?.payment_reference || payload?.paymentReference || '';
    const status = payload?.status || payload?.payment_status || '';

    // Candidate official Pesaflow IPN hash concatenation formats
    const candidateStrings = [
      `${cfg.apiClientID}${invNo}${billRef}${amountPaid}${payRef}${secret}`,
      `${invNo}${billRef}${amountPaid}${payRef}${secret}`,
      `${billRef}${amountPaid}${payRef}${secret}`,
      `${invNo}${amountPaid}${status}${secret}`,
      JSON.stringify(payload)
    ];

    for (const dataStr of candidateStrings) {
      const expectedBase64 = this.generateSecureHash(dataStr, secret);
      const expectedHex = crypto.createHmac('sha256', secret).update(dataStr).digest('hex').toLowerCase();
      if (this.timingSafeEqualStr(incomingHash, expectedBase64) || this.timingSafeEqualStr(String(incomingHash).toLowerCase(), expectedHex)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize Pesaflow IPN or Status response into unified transaction structure
   */
  parseWebhookPayload(payload = {}) {
    const rawStatus = String(
      payload.payment_status ||
      payload.status ||
      payload.Status ||
      ''
    ).toLowerCase().trim();

    let normalizedStatus = 'pending';
    if (['paid', 'settled', 'completed', 'success', 'succeeded', '1'].includes(rawStatus)) {
      normalizedStatus = 'paid';
    } else if (['failed', 'error', 'declined', 'rejected'].includes(rawStatus)) {
      normalizedStatus = 'failed';
    } else if (['cancelled', 'canceled', 'abandoned'].includes(rawStatus)) {
      normalizedStatus = 'cancelled';
    } else if (['reversed', 'refunded', 'chargeback'].includes(rawStatus)) {
      normalizedStatus = 'reversed';
    } else if (['processing', 'partial'].includes(rawStatus)) {
      normalizedStatus = 'processing';
    }

    const paymentRefRaw = payload.payment_reference || payload.paymentReference || payload.mpesa_receipt || '';
    const providerReference = Array.isArray(paymentRefRaw)
      ? (paymentRefRaw[0]?.payment_reference || paymentRefRaw[0] || '')
      : String(paymentRefRaw || '');

    return {
      status: normalizedStatus,
      rawStatus,
      accountReference: String(payload.client_invoice_ref || payload.billRefNumber || payload.bill_ref_number || payload.account_reference || '').trim(),
      gatewayInvoiceNumber: String(payload.invoice_number || payload.invoiceNumber || '').trim(),
      providerReference: providerReference.trim(),
      amountPaid: Number(payload.amount_paid ?? payload.amountPaid ?? payload.amount ?? 0),
      currency: String(payload.currency || 'KES').toUpperCase(),
      paymentChannel: String(payload.payment_channel || payload.channel || 'hosted_checkout').toLowerCase(),
      paidAt: payload.payment_date ? new Date(payload.payment_date) : new Date(),
      failureReason: payload.reason || payload.failure_reason || ''
    };
  }
}

module.exports = PesaflowAdapter;
