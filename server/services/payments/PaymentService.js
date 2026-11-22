const crypto = require('crypto');
const PaymentProvider = require('../../models/PaymentProvider');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentCallback = require('../../models/PaymentCallback');
const PaymentAllocation = require('../../models/PaymentAllocation');
const PaymentReceipt = require('../../models/PaymentReceipt');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Tenant = require('../../models/Tenant');
const User = require('../../models/User');
const Unit = require('../../models/Unit');
const IntaSendAdapter = require('./IntaSendAdapter');
const PesaflowAdapter = require('./PesaflowAdapter');
const { getIntaSendConfig } = require('../../config/intasendConfig');
const { EquityEazzyBizAdapter, KcbBuniAdapter, CoopBankAdapter } = require('./BankAdapters');
const { activatePaidSubscription } = require('../subscriptionService');
const { sendPaymentReceipt } = require('../../utils/sendPaymentReceipt');
const logActivity = require('../../utils/logActivity');

class PaymentService {
  constructor() {
    this.adapters = {
      intasend: new IntaSendAdapter(),
      pesaflow: new PesaflowAdapter(),
      equity_eazzybiz: new EquityEazzyBizAdapter(),
      kcb_buni: new KcbBuniAdapter(),
      coop_bank: new CoopBankAdapter()
    };
  }

  resolveDefaultProvider() {
    const explicit = (process.env.PAYMENT_DEFAULT_PROVIDER || '').trim().toLowerCase();
    if (explicit && this.adapters[explicit]) return explicit;
    if (this.adapters.intasend.isConfigured()) return 'intasend';
    if (this.adapters.pesaflow.isConfigured()) return 'pesaflow';
    return 'intasend';
  }

  getAdapter(providerCode) {
    const code = (providerCode || this.resolveDefaultProvider()).toLowerCase();
    const adapter = this.adapters[code];
    if (!adapter) {
      throw new Error(`Unsupported payment provider: ${code}`);
    }
    return adapter;
  }

  async seedProviders() {
    const intasendCfg = getIntaSendConfig({ requireConfigured: false });
    const defaultProvider = this.resolveDefaultProvider();
    const defs = [
      {
        code: 'intasend',
        name: 'IntaSend Payment Gateway',
        isPrimary: defaultProvider === 'intasend',
        enabled: intasendCfg.isConfigured,
        environment: intasendCfg.environment,
        supportedChannels: ['hosted_checkout', 'mpesa_stk', 'card'],
        accountPrefix: 'MF',
        requiresMerchantAuthorization: false,
        notes: 'Primary payment gateway supporting M-Pesa STK Push, Visa, and Mastercard Hosted Checkout.'
      },
      {
        code: 'pesaflow',
        name: 'Pesaflow Payment Gateway',
        isPrimary: defaultProvider === 'pesaflow',
        enabled: this.adapters.pesaflow.isConfigured(),
        environment: (process.env.PESAFLOW_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox',
        supportedChannels: ['hosted_checkout', 'mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer', 'ussd'],
        paybillBusinessNumber: process.env.PESAFLOW_PAYBILL_NUMBER || '',
        accountPrefix: 'MF',
        requiresMerchantAuthorization: true,
        notes: 'Secondary government/eCitizen payment gateway adapter.'
      },
      {
        code: 'equity_eazzybiz',
        name: 'Equity Bank EazzyBiz',
        isPrimary: false,
        enabled: this.adapters.equity_eazzybiz.isConfigured(),
        environment: 'sandbox',
        supportedChannels: ['bank_transfer'],
        requiresMerchantAuthorization: true,
        notes: 'Direct bank adapter available when Equity EazzyBiz merchant credentials are configured.'
      },
      {
        code: 'kcb_buni',
        name: 'KCB Buni Connect',
        isPrimary: false,
        enabled: this.adapters.kcb_buni.isConfigured(),
        environment: 'sandbox',
        supportedChannels: ['bank_transfer', 'mpesa_paybill'],
        requiresMerchantAuthorization: true,
        notes: 'Direct bank adapter available when KCB Buni credentials are configured.'
      },
      {
        code: 'coop_bank',
        name: 'Co-operative Bank API',
        isPrimary: false,
        enabled: this.adapters.coop_bank.isConfigured(),
        environment: 'sandbox',
        supportedChannels: ['bank_transfer'],
        requiresMerchantAuthorization: true,
        notes: 'Direct bank adapter available when Co-op Bank credentials are configured.'
      }
    ];

    for (const def of defs) {
      await PaymentProvider.findOneAndUpdate(
        { code: def.code },
        { $set: { ...def, updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );
    }
    return await PaymentProvider.find().sort({ isPrimary: -1, code: 1 });
  }

  generateInternalId(prefix = 'TXN-MF') {
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }

  /**
   * Create a pending transaction and initiate gateway checkout through the selected adapter (default: Pesaflow).
   * Enforces idempotency, currency='KES', and never activates subscriptions prematurely.
   */
  async initiateTransaction({
    idempotencyKey = null,
    providerCode = null,
    paymentChannel = 'hosted_checkout',
    paymentCategory,
    landlordId,
    tenantId = null,
    propertyId = null,
    unitId = null,
    subscriptionId = null,
    invoiceId = null,
    planCode = '',
    billingCycle = '',
    amount,
    currency = 'KES',
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    description = '',
    chargeBreakdown = {},
    metadata = {}
  }) {
    if (!amount || Number(amount) <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }
    const cleanCurrency = String(currency || 'KES').toUpperCase();
    if (cleanCurrency !== 'KES') {
      throw new Error('Unsupported currency. Transactions must be denominated in KES.');
    }

    // Idempotency Check
    if (idempotencyKey) {
      const existing = await PaymentTransaction.findOne({ idempotencyKey });
      if (existing) {
        return {
          transaction: existing,
          gateway: {
            provider: existing.provider,
            environment: existing.gatewayEnvironment || 'sandbox',
            isSandbox: Boolean(existing.isSandbox),
            checkoutUrl: existing.checkoutUrl || '',
            trackingId: existing.trackingId || '',
            checkoutId: existing.checkoutId || ''
          },
          deduplicated: true
        };
      }
    }

    const resolvedProvider = (providerCode || this.resolveDefaultProvider()).toLowerCase();
    const adapter = this.getAdapter(resolvedProvider);

    let gatewayEnv = 'sandbox';
    if (resolvedProvider === 'intasend') {
      gatewayEnv = getIntaSendConfig({ requireConfigured: true }).environment;
    } else if (resolvedProvider === 'pesaflow') {
      gatewayEnv = (process.env.PESAFLOW_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
    }
    const isSandbox = gatewayEnv === 'sandbox';

    const internalTransactionId = this.generateInternalId('TXN-MF');
    const shortRand = crypto.randomBytes(2).toString('hex').toUpperCase();
    const shortTime = Date.now().toString(36).slice(-4).toUpperCase();
    const isSubCat = paymentCategory.startsWith('subscription') || paymentCategory === 'unit_upgrade';
    const accountReference = resolvedProvider === 'intasend'
      ? `MakaziFlow-${shortTime}${shortRand}`
      : `${isSubCat ? 'MFSUB' : 'MFRNT'}-${Date.now().toString(36).toUpperCase()}-${shortRand}`;

    const txn = await PaymentTransaction.create({
      internalTransactionId,
      idempotencyKey: idempotencyKey || undefined,
      landlordId,
      tenantId: tenantId || undefined,
      propertyId: propertyId || undefined,
      unitId: unitId || undefined,
      subscriptionId: subscriptionId || undefined,
      invoiceId: invoiceId || undefined,
      provider: resolvedProvider,
      gatewayEnvironment: gatewayEnv,
      isSandbox,
      paymentChannel,
      paymentCategory,
      planCode: planCode || '',
      billingCycle: billingCycle || '',
      amount: Number(amount),
      currency: cleanCurrency,
      accountReference,
      merchantReference: accountReference,
      customerName,
      customerEmail,
      customerPhone,
      status: 'pending',
      reconciliationStatus: 'pending',
      chargeBreakdown,
      metadata: { ...metadata, environment: gatewayEnv }
    });

    try {
      const gatewayResult = await adapter.initiatePayment({
        transactionDbId: String(txn._id),
        internalTransactionId,
        accountReference,
        amount: Number(amount),
        currency: cleanCurrency,
        paymentChannel,
        description,
        customerName,
        customerEmail,
        customerPhone
      });

      txn.gatewayInvoiceNumber = gatewayResult.gatewayInvoiceNumber || gatewayResult.trackingId || '';
      txn.trackingId = gatewayResult.trackingId || gatewayResult.gatewayInvoiceNumber || '';
      txn.checkoutId = gatewayResult.checkoutId || '';
      txn.checkoutSignature = gatewayResult.checkoutSignature || '';
      txn.checkoutUrl = gatewayResult.checkoutUrl || '';
      txn.paybillBusinessNumber = gatewayResult.paybillInstructions?.businessNumber || '';
      txn.gatewayEnvironment = gatewayResult.environment || gatewayEnv;
      txn.isSandbox = txn.gatewayEnvironment === 'sandbox';
      txn.metadata = {
        ...txn.metadata,
        environment: txn.gatewayEnvironment,
        trackingId: txn.trackingId,
        checkoutId: txn.checkoutId,
        paybillInstructions: gatewayResult.paybillInstructions || null,
        checkoutParams: gatewayResult.checkoutParams ? { ...gatewayResult.checkoutParams, secureHash: '[SIGNED]' } : null,
        requiresFormPost: Boolean(gatewayResult.requiresFormPost)
      };
      txn.updatedAt = new Date();
      await txn.save();

      return {
        transaction: txn,
        gateway: {
          provider: resolvedProvider,
          environment: txn.gatewayEnvironment,
          isSandbox: txn.isSandbox,
          trackingId: txn.trackingId,
          checkoutId: txn.checkoutId,
          checkoutUrl: txn.checkoutUrl,
          checkoutParams: gatewayResult.checkoutParams || null,
          paybillInstructions: gatewayResult.paybillInstructions || null,
          requiresFormPost: Boolean(gatewayResult.requiresFormPost)
        },
        deduplicated: false
      };
    } catch (err) {
      txn.status = 'failed';
      txn.failureReason = err.message;
      txn.updatedAt = new Date();
      await txn.save();
      throw err;
    }
  }

  /**
   * Authoritative Webhook / IPN Processor:
   * - Verifies gateway HMAC/hash signature strictly before any state change
   * - Guards against duplicate callbacks and replay attacks
   * - Validates currency & expected amount
   * - Handles unmatched Paybill receipts cleanly for Admin reconciliation
   * - Triggers Subscription Activation OR Tenant Rental Allocation & Receipt generation
   */
  async processWebhook({ providerCode = 'pesaflow', payload, headers = {}, sourceIp = '' }) {
    const cleanProvider = String(providerCode || 'pesaflow').toLowerCase();
    const adapter = this.getAdapter(cleanProvider);
    const signatureValid = adapter.verifyWebhookSignature(payload, headers);
    const parsed = adapter.parseWebhookPayload(payload);
    const activeEnv = cleanProvider === 'intasend'
      ? getIntaSendConfig({ requireConfigured: false }).environment
      : ((process.env.PESAFLOW_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox');

    // Log callback receipt immediately for auditability
    const callbackRecord = await PaymentCallback.create({
      provider: cleanProvider,
      gatewayEnvironment: activeEnv,
      accountReference: parsed.accountReference,
      trackingId: parsed.trackingId || '',
      providerReference: parsed.providerReference,
      gatewayInvoiceNumber: parsed.gatewayInvoiceNumber,
      signatureValid,
      amountReceived: parsed.amountPaid,
      currencyReceived: parsed.currency,
      payload,
      headers: {
        'x-pesaflow-signature': headers['x-pesaflow-signature'] || undefined,
        'x-intasend-challenge': headers['x-intasend-challenge'] || undefined,
        'content-type': headers['content-type'] || undefined
      },
      sourceIp
    });

    if (!signatureValid) {
      callbackRecord.processingStatus = 'rejected_signature';
      callbackRecord.processingMessage = 'Invalid or missing gateway webhook signature/challenge';
      await callbackRecord.save();
      const err = new Error('Invalid payment callback signature');
      err.statusCode = 401;
      throw err;
    }

    // Find matching PaymentTransaction (scoped to matching provider & environment for IntaSend)
    const orClauses = [];
    if (parsed.accountReference) orClauses.push({ accountReference: parsed.accountReference });
    if (parsed.trackingId) orClauses.push({ trackingId: parsed.trackingId });
    if (parsed.checkoutId) orClauses.push({ checkoutId: parsed.checkoutId });
    if (parsed.gatewayInvoiceNumber) orClauses.push({ gatewayInvoiceNumber: parsed.gatewayInvoiceNumber });
    if (parsed.providerReference) orClauses.push({ providerReference: parsed.providerReference });

    let txn = orClauses.length > 0
      ? await PaymentTransaction.findOne({ provider: cleanProvider, $or: orClauses })
      : null;

    if (!txn) {
      callbackRecord.processingStatus = 'unmatched';
      callbackRecord.processingMessage = 'No matching pending transaction found for reference';
      await callbackRecord.save();
      return { status: 'unmatched', callback: callbackRecord, message: 'Callback logged as unmatched for manual reconciliation' };
    }

    callbackRecord.transactionId = txn._id;
    callbackRecord.internalTransactionId = txn.internalTransactionId;

    // Cross-environment isolation check (never allow sandbox callback to affect production txn or vice versa)
    const txnEnv = txn.gatewayEnvironment || (txn.isSandbox ? 'sandbox' : 'sandbox');
    if (cleanProvider === 'intasend' && txnEnv !== activeEnv) {
      callbackRecord.processingStatus = 'environment_mismatch';
      callbackRecord.processingMessage = `Blocked cross-environment webhook: txn is ${txnEnv}, server is ${activeEnv}`;
      await callbackRecord.save();
      const err = new Error(callbackRecord.processingMessage);
      err.statusCode = 403;
      throw err;
    }

    // Duplicate & Idempotency Guard
    if (txn.status === 'paid' && parsed.status === 'paid') {
      callbackRecord.isDuplicate = true;
      callbackRecord.processingStatus = 'ignored_duplicate';
      callbackRecord.processingMessage = 'Transaction already settled and verified; duplicate IPN safely ignored';
      await callbackRecord.save();
      return { status: 'duplicate_ignored', transaction: txn, callback: callbackRecord };
    }

    // Authoritative 10-step Verification: For IntaSend, ALWAYS verify status directly from IntaSend API before trusting webhook state!
    let verifiedState = parsed;
    if (cleanProvider === 'intasend') {
      const trackingToVerify = parsed.trackingId || txn.trackingId || txn.gatewayInvoiceNumber || parsed.checkoutId || txn.checkoutId;
      verifiedState = await adapter.verifyTransaction({
        accountReference: txn.accountReference,
        gatewayInvoiceNumber: txn.gatewayInvoiceNumber,
        trackingId: trackingToVerify,
        checkoutId: parsed.checkoutId || txn.checkoutId,
        signature: txn.checkoutSignature || undefined,
        expectedEnvironment: txnEnv
      });
      if (!verifiedState.verifiedReferenceMatch) {
        callbackRecord.processingStatus = 'rejected_signature';
        callbackRecord.processingMessage = `Reference mismatch: expected ${txn.accountReference}, gateway returned ${verifiedState.accountReference}`;
        await callbackRecord.save();
        const err = new Error(callbackRecord.processingMessage);
        err.statusCode = 400;
        throw err;
      }
      if (trackingToVerify && !txn.trackingId) {
        txn.trackingId = trackingToVerify;
      }
    }

    // Handle Failed / Cancelled / Reversed states
    if (verifiedState.status === 'failed' || verifiedState.status === 'cancelled') {
      txn.status = verifiedState.status;
      txn.failureReason = verifiedState.failureReason || `Gateway reported status: ${verifiedState.rawStatus}`;
      txn.verifiedAt = new Date();
      txn.updatedAt = new Date();
      await txn.save();
      callbackRecord.processingStatus = 'failed_status';
      callbackRecord.processingMessage = txn.failureReason;
      await callbackRecord.save();
      return { status: verifiedState.status, transaction: txn, callback: callbackRecord };
    }

    if (verifiedState.status === 'reversed') {
      await this.handleReversal({
        transactionId: txn._id,
        reason: verifiedState.failureReason || 'Gateway reversal / chargeback callback'
      });
      callbackRecord.processingStatus = 'processed';
      callbackRecord.processingMessage = 'Payment reversal processed';
      await callbackRecord.save();
      return { status: 'reversed', transaction: await PaymentTransaction.findById(txn._id), callback: callbackRecord };
    }

    if (verifiedState.status !== 'paid') {
      txn.status = 'processing';
      txn.updatedAt = new Date();
      await txn.save();
      return { status: 'processing', transaction: txn, callback: callbackRecord };
    }

    // Currency & Amount Validation before settlement
    if (verifiedState.currency !== txn.currency) {
      txn.reconciliationStatus = 'amount_mismatch';
      txn.failureReason = `Currency mismatch: expected ${txn.currency}, received ${verifiedState.currency}`;
      await txn.save();
      callbackRecord.processingStatus = 'currency_mismatch';
      callbackRecord.processingMessage = txn.failureReason;
      await callbackRecord.save();
      return { status: 'currency_mismatch', transaction: txn, callback: callbackRecord };
    }

    if (Number(verifiedState.amountPaid) < Number(txn.amount)) {
      txn.amountPaid = Number(verifiedState.amountPaid);
      txn.reconciliationStatus = 'amount_mismatch';
      txn.failureReason = `Underpayment: expected ${txn.currency} ${txn.amount}, received ${verifiedState.currency} ${verifiedState.amountPaid}`;
      await txn.save();
      callbackRecord.processingStatus = 'amount_mismatch';
      callbackRecord.processingMessage = txn.failureReason;
      await callbackRecord.save();
      return { status: 'amount_mismatch', transaction: txn, callback: callbackRecord };
    }

    const settled = await this.finalizeVerifiedSettlement({
      transaction: txn,
      providerReference: verifiedState.providerReference || txn.accountReference,
      amountPaid: Number(verifiedState.amountPaid),
      paymentChannel: verifiedState.paymentChannel || txn.paymentChannel,
      paymentMethodDetail: verifiedState.paymentMethodDetail || '',
      trackingId: verifiedState.trackingId || txn.trackingId || '',
      paidAt: verifiedState.paidAt
    });

    callbackRecord.processingStatus = 'processed';
    callbackRecord.processingMessage = 'Payment independently verified with gateway, reconciled, and settled';
    await callbackRecord.save();

    return { status: 'paid', ...settled, callback: callbackRecord };
  }

  /**
   * Completes settlement cleanly after verification:
   * - Updates PaymentTransaction
   * - Allocates either Subscription Activation OR Tenant Rent Collection
   * - Updates Invoice & creates PaymentReceipt
   */
  async finalizeVerifiedSettlement({
    transaction,
    providerReference,
    amountPaid,
    paymentChannel,
    paymentMethodDetail = '',
    trackingId = '',
    paidAt = new Date(),
    actorId = null
  }) {
    // Prevent duplicate settlement
    if (transaction.status === 'paid') {
      return { transaction, alreadySettled: true };
    }

    // Ensure unique immutable provider reference
    if (providerReference) {
      const dupRef = await PaymentTransaction.findOne({
        provider: transaction.provider,
        providerReference,
        _id: { $ne: transaction._id },
        status: 'paid'
      });
      if (dupRef) {
        throw new Error(`Duplicate provider reference detected: ${providerReference}`);
      }
    }

    const nextChannel = (paymentChannel && ['mpesa_stk', 'mpesa_paybill', 'card', 'bank_transfer', 'ussd', 'hosted_checkout', 'manual'].includes(paymentChannel))
      ? paymentChannel
      : transaction.paymentChannel;

    // Atomic status transition guard against simultaneous webhook + pull-verify race conditions
    const claimed = await PaymentTransaction.findOneAndUpdate(
      { _id: transaction._id, status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          amountPaid: Number(amountPaid || transaction.amount),
          providerReference: providerReference || transaction.internalTransactionId,
          ...(trackingId ? { trackingId, gatewayInvoiceNumber: trackingId } : {}),
          ...(paymentMethodDetail ? { paymentMethodDetail } : {}),
          paymentChannel: nextChannel,
          reconciliationStatus: 'reconciled',
          paidAt,
          verifiedAt: new Date(),
          reconciledAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    if (!claimed) {
      const current = await PaymentTransaction.findById(transaction._id);
      return { transaction: current || transaction, alreadySettled: true };
    }
    transaction = claimed;

    let activationResult = null;
    let rentPaymentRecord = null;
    let invoiceRecord = null;

    const isSubCategory = ['subscription', 'unit_upgrade', 'subscription_renewal'].includes(transaction.paymentCategory);

    // 1. Update Invoice if attached
    if (transaction.invoiceId) {
      invoiceRecord = await Invoice.findById(transaction.invoiceId);
      if (invoiceRecord) {
        invoiceRecord.amountPaid = Number(invoiceRecord.amountPaid || 0) + Number(transaction.amountPaid);
        invoiceRecord.balanceDue = Math.max(0, Number(invoiceRecord.totalAmount) - invoiceRecord.amountPaid);
        invoiceRecord.status = invoiceRecord.balanceDue === 0 ? 'paid' : 'partial';
        if (invoiceRecord.status === 'paid') invoiceRecord.paidAt = new Date();
        invoiceRecord.updatedAt = new Date();
        await invoiceRecord.save();
      }
    }

    if (isSubCategory && transaction.subscriptionId) {
      // SaaS Subscription Activation / Upgrade / Renewal
      activationResult = await activatePaidSubscription({
        subscriptionId: transaction.subscriptionId,
        paymentTransaction: transaction,
        actorId
      });

      await PaymentAllocation.findOneAndUpdate(
        { transactionId: transaction._id, invoiceId: transaction.invoiceId || undefined, category: 'subscription' },
        {
          $setOnInsert: {
            transactionId: transaction._id,
            invoiceId: transaction.invoiceId || undefined,
            landlordId: transaction.landlordId,
            category: 'subscription',
            allocatedAmount: transaction.amountPaid,
            currency: transaction.currency
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } else if (transaction.tenantId) {
      // Tenant Rent / Utility / Penalty Collection (Strictly separate from SaaS Subscription!)
      const tenant = await Tenant.findById(transaction.tenantId).populate('unitId');
      const unitId = transaction.unitId || tenant?.unitId?._id || tenant?.unitId;
      const propId = transaction.propertyId || tenant?.unitId?.propertyId;
      const bd = transaction.chargeBreakdown || {};
      const rAmt = Number(bd.rent || 0) || (transaction.paymentCategory === 'rent' ? transaction.amountPaid : 0);
      const uAmt = Number(bd.water || 0) + Number(bd.electricity || 0);
      const sAmt = Number(bd.serviceCharge || 0);
      const pAmt = Number(bd.penalty || 0);
      const dAmt = Number(bd.deposit || 0);
      const providerLabel = transaction.provider === 'intasend' ? 'IntaSend' : 'Pesaflow';

      rentPaymentRecord = await Payment.create({
        tenantId: transaction.tenantId,
        propertyId: propId || undefined,
        unitId: unitId || undefined,
        invoiceId: transaction.invoiceId || undefined,
        paymentTransactionId: transaction._id,
        user: transaction.landlordId,
        amount: transaction.amountPaid,
        currency: transaction.currency,
        rentAmount: rAmt > 0 ? rAmt : (uAmt + sAmt + pAmt + dAmt === 0 ? transaction.amountPaid : 0),
        depositAmount: dAmt,
        utilityAmount: uAmt,
        serviceChargeAmount: sAmt,
        penaltyAmount: pAmt,
        date: paidAt,
        method: `${providerLabel} (${transaction.paymentChannel})`,
        status: 'paid',
        monthCovered: `${new Date(paidAt).getFullYear()}-${String(new Date(paidAt).getMonth() + 1).padStart(2, '0')}`,
        type: transaction.paymentCategory === 'combined' ? 'Combined' : transaction.paymentCategory,
        category: ['rent', 'water', 'electricity', 'service_charge', 'penalty', 'deposit', 'combined'].includes(transaction.paymentCategory)
          ? transaction.paymentCategory
          : 'rent',
        reference: transaction.providerReference,
        reconciled: true
      });

      await PaymentAllocation.findOneAndUpdate(
        { transactionId: transaction._id, invoiceId: transaction.invoiceId || undefined, category: rentPaymentRecord.category },
        {
          $setOnInsert: {
            transactionId: transaction._id,
            invoiceId: transaction.invoiceId || undefined,
            paymentId: rentPaymentRecord._id,
            landlordId: transaction.landlordId,
            tenantId: transaction.tenantId,
            unitId: unitId || undefined,
            category: rentPaymentRecord.category,
            allocatedAmount: transaction.amountPaid,
            currency: transaction.currency
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Dispatch strict email PDF receipt to tenant
      sendPaymentReceipt(rentPaymentRecord._id).catch((err) => {
        console.warn('Tenant email receipt warning:', err.message);
      });
    }

    // Create Official PaymentReceipt record
    const landlord = await User.findById(transaction.landlordId).select('name email');
    const receiptNumber = `RCT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const receipt = await PaymentReceipt.create({
      receiptNumber,
      receiptCategory: isSubCategory ? 'subscription' : 'rental',
      transactionId: transaction._id,
      paymentId: rentPaymentRecord?._id,
      invoiceId: transaction.invoiceId,
      landlordId: transaction.landlordId,
      tenantId: transaction.tenantId,
      subscriptionId: transaction.subscriptionId,
      recipientName: transaction.customerName || landlord?.name || 'Customer',
      recipientEmail: transaction.customerEmail || landlord?.email || '',
      amount: transaction.amountPaid,
      currency: transaction.currency,
      paymentMethod: `${transaction.provider} (${transaction.paymentChannel})`,
      providerReference: transaction.providerReference,
      description: isSubCategory
        ? `MakaziFlow Subscription Payment (${transaction.accountReference})`
        : `Rental Payment (${transaction.accountReference})`,
      emailedTo: transaction.customerEmail || landlord?.email || '',
      emailedAt: new Date()
    });

    await logActivity(
      landlord || 'System',
      'Payment Verified & Reconciled',
      `${isSubCategory ? 'Subscription' : 'Tenant'} payment of KES ${transaction.amountPaid.toLocaleString()} verified via ${transaction.provider} [${transaction.gatewayEnvironment || 'sandbox'}] (${transaction.providerReference})`,
      'payment',
      'success'
    );

    return {
      transaction,
      activationResult,
      rentPaymentRecord,
      invoiceRecord,
      receipt,
      alreadySettled: false
    };
  }

  /**
   * Reconcile a single transaction directly by querying IntaSend / provider status API.
   * Never marks paid on client-supplied flags; always checks server-to-server gateway status.
   */
  async verifyTransactionStatus(transactionId, gatewayHints = {}) {
    const txn = await PaymentTransaction.findById(transactionId);
    if (!txn) throw new Error('Transaction not found');
    if (txn.status === 'paid') return { transaction: txn, alreadySettled: true };

    const adapter = this.getAdapter(txn.provider);
    const trackingId = String(gatewayHints.trackingId || gatewayHints.invoiceId || txn.trackingId || txn.gatewayInvoiceNumber || '').trim();
    const checkoutId = String(gatewayHints.checkoutId || txn.checkoutId || '').trim();
    const signature = String(gatewayHints.signature || txn.checkoutSignature || '').trim();

    const verified = await adapter.verifyTransaction({
      accountReference: txn.accountReference,
      gatewayInvoiceNumber: txn.gatewayInvoiceNumber,
      trackingId,
      checkoutId,
      signature,
      expectedEnvironment: txn.gatewayEnvironment || (txn.isSandbox ? 'sandbox' : 'sandbox')
    });

    if (verified.verifiedReferenceMatch === false) {
      const err = new Error(`Transaction reference mismatch: expected ${txn.accountReference}, gateway returned ${verified.accountReference}`);
      err.statusCode = 400;
      throw err;
    }

    if (verified.trackingId && !txn.trackingId) {
      txn.trackingId = verified.trackingId;
      txn.gatewayInvoiceNumber = verified.trackingId;
    }

    if (verified.status === 'paid') {
      if (verified.currency !== txn.currency) {
        txn.reconciliationStatus = 'amount_mismatch';
        txn.failureReason = `Currency mismatch: expected ${txn.currency}, received ${verified.currency}`;
        await txn.save();
        return { transaction: txn, gatewayStatus: verified };
      }
      if (Number(verified.amountPaid) < Number(txn.amount)) {
        txn.amountPaid = Number(verified.amountPaid);
        txn.reconciliationStatus = 'amount_mismatch';
        txn.failureReason = `Underpayment: expected ${txn.currency} ${txn.amount}, received ${verified.currency} ${verified.amountPaid}`;
        await txn.save();
        return { transaction: txn, gatewayStatus: verified };
      }

      return await this.finalizeVerifiedSettlement({
        transaction: txn,
        providerReference: verified.providerReference || txn.accountReference,
        amountPaid: verified.amountPaid,
        paymentChannel: verified.paymentChannel || txn.paymentChannel,
        paymentMethodDetail: verified.paymentMethodDetail || '',
        trackingId: verified.trackingId || trackingId,
        paidAt: verified.paidAt
      });
    }

    if (verified.status === 'failed' || verified.status === 'cancelled') {
      txn.status = verified.status;
      txn.failureReason = verified.failureReason || 'Verified failed/cancelled by gateway';
      txn.verifiedAt = new Date();
      txn.updatedAt = new Date();
      await txn.save();
    } else if (verified.status === 'processing' && txn.status !== 'processing') {
      txn.status = 'processing';
      txn.updatedAt = new Date();
      await txn.save();
    }

    return { transaction: txn, gatewayStatus: verified };
  }

  /**
   * Handle payment reversal / refund safely
   */
  async handleReversal({ transactionId, reason = 'Payment reversed', actorId = null }) {
    const txn = await PaymentTransaction.findById(transactionId);
    if (!txn) throw new Error('Transaction not found');

    txn.status = 'reversed';
    txn.reconciliationStatus = 'reversed';
    txn.reversalReason = reason;
    txn.reversedAt = new Date();
    txn.updatedAt = new Date();
    await txn.save();

    // Reverse linked rent payment record if exists
    await Payment.updateMany(
      { paymentTransactionId: txn._id },
      { $set: { status: 'reversed', reconciled: false } }
    );

    // Reopen invoice balance if it was paid by this transaction
    if (txn.invoiceId) {
      const inv = await Invoice.findById(txn.invoiceId);
      if (inv) {
        inv.amountPaid = Math.max(0, Number(inv.amountPaid || 0) - Number(txn.amountPaid || txn.amount));
        inv.balanceDue = Math.max(0, Number(inv.totalAmount) - inv.amountPaid);
        inv.status = inv.amountPaid > 0 ? 'partial' : 'open';
        inv.paidAt = undefined;
        inv.updatedAt = new Date();
        await inv.save();
      }
    }

    await logActivity(
      actorId ? { _id: actorId } : 'System',
      'Payment Reversed',
      `Transaction ${txn.internalTransactionId} (KES ${txn.amount}) reversed: ${reason}`,
      'payment',
      'warning'
    );

    return txn;
  }
}

module.exports = new PaymentService();
