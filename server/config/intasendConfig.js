/**
 * Centralized IntaSend Payment Gateway Configuration & Environment Validation
 * Uses IntaSend's unified v1 API base URL (`https://api.intasend.com/api/v1`),
 * where environment routing is determined strictly by `_test_` vs `_live_` keys.
 * NEVER falls back between sandbox and production environments or exposes secrets to clients.
 */

const VALID_ENVS = new Set(['sandbox', 'production']);

const DEFAULT_INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';

const INTASEND_ENDPOINTS = {
  sandbox: DEFAULT_INTASEND_BASE_URL,
  production: DEFAULT_INTASEND_BASE_URL
};

function resolveBaseUrl(environment) {
  const custom = (process.env.INTASEND_BASE_URL || '').trim().replace(/\/+$/, '');
  return custom || INTASEND_ENDPOINTS[environment] || DEFAULT_INTASEND_BASE_URL;
}

function resolveEnvironment() {
  const raw = (process.env.INTASEND_ENV || 'sandbox').trim().toLowerCase();
  if (!VALID_ENVS.has(raw)) {
    const err = new Error(
      `FATAL PAYMENT CONFIG: Invalid INTASEND_ENV="${raw}". Allowed values are "sandbox" or "production".`
    );
    err.code = 'INTASEND_INVALID_ENV';
    throw err;
  }
  return raw;
}

function getIntaSendConfig({ requireConfigured = false } = {}) {
  const environment = resolveEnvironment();
  const isSandbox = environment === 'sandbox';
  const baseUrl = resolveBaseUrl(environment);

  const publishableKey = isSandbox
    ? (process.env.INTASEND_SANDBOX_PUBLISHABLE_KEY || '').trim()
    : (process.env.INTASEND_PRODUCTION_PUBLISHABLE_KEY || '').trim();

  const secretKey = isSandbox
    ? (process.env.INTASEND_SANDBOX_SECRET_KEY || '').trim()
    : (process.env.INTASEND_PRODUCTION_SECRET_KEY || '').trim();

  const webhookChallenge = isSandbox
    ? (process.env.INTASEND_SANDBOX_WEBHOOK_CHALLENGE || process.env.INTASEND_WEBHOOK_CHALLENGE || '').trim()
    : (process.env.INTASEND_PRODUCTION_WEBHOOK_CHALLENGE || process.env.INTASEND_WEBHOOK_CHALLENGE || '').trim();

  // Strictly prevent cross-environment key contamination
  if (isSandbox) {
    if (publishableKey.includes('_live_') || secretKey.includes('_live_')) {
      const err = new Error(
        'FATAL PAYMENT CONFIG: Production IntaSend live keys cannot be used when INTASEND_ENV=sandbox.'
      );
      err.code = 'INTASEND_ENV_KEY_MISMATCH';
      throw err;
    }
  } else {
    if (publishableKey.includes('_test_') || secretKey.includes('_test_')) {
      const err = new Error(
        'FATAL PAYMENT CONFIG: Sandbox IntaSend test keys cannot be used when INTASEND_ENV=production.'
      );
      err.code = 'INTASEND_ENV_KEY_MISMATCH';
      throw err;
    }
  }

  const configured = Boolean(
    publishableKey &&
    secretKey &&
    !publishableKey.startsWith('your_') &&
    !secretKey.startsWith('your_')
  );

  if (requireConfigured && !configured) {
    const prefix = isSandbox ? 'INTASEND_SANDBOX' : 'INTASEND_PRODUCTION';
    const err = new Error(
      `IntaSend ${environment} credentials (${prefix}_PUBLISHABLE_KEY and ${prefix}_SECRET_KEY) are not configured on the server.`
    );
    err.code = 'INTASEND_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  const frontendBase = (
    (process.env.NODE_ENV === 'production'
      ? (process.env.PROD_FRONTEND_URL || process.env.FRONTEND_URL)
      : (process.env.FRONTEND_URL || process.env.PROD_FRONTEND_URL)) ||
    'http://localhost:5173'
  ).replace(/\/+$/, '');

  const rawCallbackUrl = (
    process.env.INTASEND_CALLBACK_URL ||
    `${frontendBase}/billing`
  ).trim();
  // IntaSend /api/v1/checkout/ rejects query strings (?...) in redirect_url; strip any query parameters safely
  const callbackUrl = rawCallbackUrl.split('?')[0];

  const ipnUrl = (
    process.env.INTASEND_IPN_URL ||
    process.env.INTASEND_WEBHOOK_URL ||
    ''
  ).trim();

  return {
    provider: 'intasend',
    environment,
    isSandbox,
    baseUrl,
    publishableKey,
    secretKey,
    webhookChallenge,
    frontendUrl: frontendBase,
    callbackUrl,
    ipnUrl,
    isConfigured: configured
  };
}

function validateIntaSendConfig({ strictStartup = false } = {}) {
  const cfg = getIntaSendConfig({ requireConfigured: false });
  const isProdRuntime = process.env.NODE_ENV === 'production';

  if (cfg.environment === 'production' && (isProdRuntime || strictStartup) && !cfg.isConfigured) {
    throw new Error(
      'FATAL PAYMENT CONFIG: INTASEND_ENV=production requires INTASEND_PRODUCTION_PUBLISHABLE_KEY and INTASEND_PRODUCTION_SECRET_KEY.'
    );
  }

  if (strictStartup && !cfg.isConfigured) {
    const prefix = cfg.isSandbox ? 'INTASEND_SANDBOX' : 'INTASEND_PRODUCTION';
    throw new Error(
      `FATAL PAYMENT CONFIG: Missing ${prefix}_PUBLISHABLE_KEY or ${prefix}_SECRET_KEY for INTASEND_ENV=${cfg.environment}.`
    );
  }

  if (cfg.isConfigured && !cfg.webhookChallenge && process.env.NODE_ENV !== 'test') {
    console.warn(
      `⚠️ PAYMENT SECURITY WARNING: IntaSend webhook challenge (${cfg.isSandbox ? 'INTASEND_SANDBOX_WEBHOOK_CHALLENGE' : 'INTASEND_PRODUCTION_WEBHOOK_CHALLENGE'}) is empty; incoming IPN webhooks will be rejected.`
    );
  }

  return cfg;
}

module.exports = {
  VALID_ENVS,
  DEFAULT_INTASEND_BASE_URL,
  INTASEND_ENDPOINTS,
  resolveEnvironment,
  resolveBaseUrl,
  getIntaSendConfig,
  validateIntaSendConfig
};
