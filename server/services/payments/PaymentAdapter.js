/**
 * Base Payment Provider Adapter Interface
 * All payment gateways (Pesaflow, Equity EazzyBiz, KCB Buni, Co-op Bank) implement this contract.
 */
class PaymentAdapter {
  constructor(code, name) {
    this.code = code;
    this.name = name;
  }

  isConfigured() {
    return false;
  }

  getSupportedChannels() {
    return [];
  }

  async initiatePayment(/* params */) {
    throw new Error(`${this.name}: initiatePayment() not implemented`);
  }

  async verifyTransaction(/* params */) {
    throw new Error(`${this.name}: verifyTransaction() not implemented`);
  }

  verifyWebhookSignature(/* payload, headers */) {
    throw new Error(`${this.name}: verifyWebhookSignature() not implemented`);
  }

  parseWebhookPayload(/* payload */) {
    throw new Error(`${this.name}: parseWebhookPayload() not implemented`);
  }
}

module.exports = PaymentAdapter;
