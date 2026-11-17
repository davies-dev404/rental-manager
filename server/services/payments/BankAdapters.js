const PaymentAdapter = require('./PaymentAdapter');

/**
 * Direct Bank Adapter Scaffolding (Requires explicit official merchant authorization & credentials).
 * Primary processing remains centralized on Pesaflow unless authorized & enabled in .env.
 */
class BankIntegrationAdapter extends PaymentAdapter {
  constructor({ code, name, envPrefix, supportedChannels }) {
    super(code, name);
    this.envPrefix = envPrefix;
    this.supportedChannels = supportedChannels;
  }

  isConfigured() {
    const enabled = String(process.env[`${this.envPrefix}_ENABLED`] || 'false').toLowerCase() === 'true';
    const baseUrl = (process.env[`${this.envPrefix}_BASE_URL`] || '').trim();
    return Boolean(enabled && baseUrl);
  }

  getSupportedChannels() {
    return this.supportedChannels;
  }

  async initiatePayment() {
    if (!this.isConfigured()) {
      const err = new Error(
        `${this.name} direct API is not authorized/enabled. Please use Pesaflow primary gateway or complete ${this.name} merchant API onboarding.`
      );
      err.statusCode = 503;
      err.code = 'BANK_PROVIDER_NOT_ENABLED';
      throw err;
    }
    throw new Error(`${this.name}: Configure official merchant endpoint transport before live execution.`);
  }

  async verifyTransaction() {
    throw new Error(`${this.name}: Direct verification requires live merchant credentials.`);
  }

  verifyWebhookSignature() {
    return false;
  }

  parseWebhookPayload(payload = {}) {
    return {
      status: 'pending',
      accountReference: String(payload.accountReference || payload.billRef || ''),
      providerReference: String(payload.transactionReference || ''),
      amountPaid: Number(payload.amount || 0),
      currency: String(payload.currency || 'KES').toUpperCase()
    };
  }
}

class EquityEazzyBizAdapter extends BankIntegrationAdapter {
  constructor() {
    super({
      code: 'equity_eazzybiz',
      name: 'Equity Bank EazzyBiz',
      envPrefix: 'EQUITY_EAZZYBIZ',
      supportedChannels: ['bank_transfer']
    });
  }
}

class KcbBuniAdapter extends BankIntegrationAdapter {
  constructor() {
    super({
      code: 'kcb_buni',
      name: 'KCB Buni Connect',
      envPrefix: 'KCB_BUNI',
      supportedChannels: ['bank_transfer', 'mpesa_paybill']
    });
  }
}

class CoopBankAdapter extends BankIntegrationAdapter {
  constructor() {
    super({
      code: 'coop_bank',
      name: 'Co-operative Bank API',
      envPrefix: 'COOP_BANK',
      supportedChannels: ['bank_transfer']
    });
  }
}

module.exports = {
  EquityEazzyBizAdapter,
  KcbBuniAdapter,
  CoopBankAdapter
};
