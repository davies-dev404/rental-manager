/**
 * Centralized Pesapal API 3.0 Configuration & Environment Validation
 * Strictly separates Sandbox (`https://cybqa.pesapal.com/pesapalv3`) and Production (`https://pay.pesapal.com/v3`).
 * Switching environments requires backend env configuration ONLY (PESAPAL_ENV=sandbox|production + credentials).
 * NEVER falls back between sandbox and production or exposes secrets to frontend code.
 */

const VALID_ENVS = new Set(['sandbox', 'production']);

const PESAPAL_ENDPOINTS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  production: 'https://pay.pesapal.com/v3'
};

function resolvePesapalEnvironment() {
  const raw = (process.env.PESAPAL_ENV || 'sandbox').trim().toLowerCase();
  if (!VALID_ENVS.has(raw)) {
    const err = new Error(
      `FATAL PAYMENT CONFIG: Invalid PESAPAL_ENV="${raw}". Allowed values are "sandbox" or "production".`
    );
    err.code = 'PESAPAL_INVALID_ENV';
    throw err;
  }
  return raw;
}

function appendQueryParams(url, params = {}) {
  const base = String(url || '').trim();
  if (!base) return '';
  try {
    const u = new URL(base);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && !u.searchParams.has(k)) {
        u.searchParams.set(k, String(v));
      }
    });
    return u.toString();
  } catch {
    return base;
  }
}

function getPesapalConfig({ requireConfigured = false } = {}) {
  const environment = resolvePesapalEnvironment();
  const isSandbox = environment === 'sandbox';
  const baseUrl = PESAPAL_ENDPOINTS[environment];

  const consumerKey = isSandbox
    ? (process.env.PESAPAL_SANDBOX_CONSUMER_KEY || '').trim()
    : (process.env.PESAPAL_PRODUCTION_CONSUMER_KEY || '').trim();

  const consumerSecret = isSandbox
    ? (process.env.PESAPAL_SANDBOX_CONSUMER_SECRET || '').trim()
    : (process.env.PESAPAL_PRODUCTION_CONSUMER_SECRET || '').trim();

  // Optional pre-registered IPN GUID override; when omitted, PesapalAdapter resolves/registers via GetIpnList + RegisterIPN
  const ipnId = (
    (isSandbox ? process.env.PESAPAL_SANDBOX_IPN_ID : process.env.PESAPAL_PRODUCTION_IPN_ID) ||
    process.env.PESAPAL_IPN_ID ||
    ''
  ).trim();

  const frontendBase = (
    (process.env.NODE_ENV === 'production'
      ? (process.env.PROD_FRONTEND_URL || process.env.FRONTEND_URL)
      : (process.env.FRONTEND_URL || process.env.PROD_FRONTEND_URL)) ||
    'http://localhost:5173'
  ).replace(/\/+$/, '');

  const rawCallbackUrl = (
    process.env.PESAPAL_CALLBACK_URL ||
    `${frontendBase}/billing`
  ).trim();
  const callbackUrl = appendQueryParams(rawCallbackUrl, { payment_return: '1', provider: 'pesapal' });

  const rawCancellationUrl = (
    process.env.PESAPAL_CANCELLATION_URL ||
    `${frontendBase}/billing`
  ).trim();
  const cancellationUrl = appendQueryParams(rawCancellationUrl, { payment_cancelled: '1', provider: 'pesapal' });

  const renderExternal = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
  const ipnUrl = (
    process.env.PESAPAL_IPN_URL ||
    (renderExternal ? `${renderExternal}/api/v2/payments/webhooks/pesapal` : '')
  ).trim();

  const configured = Boolean(
    consumerKey &&
    consumerSecret &&
    !consumerKey.startsWith('your_') &&
    !consumerSecret.startsWith('your_')
  );

  if (requireConfigured && !configured) {
    const prefix = isSandbox ? 'PESAPAL_SANDBOX' : 'PESAPAL_PRODUCTION';
    const err = new Error(
      `Pesapal ${environment} credentials (${prefix}_CONSUMER_KEY and ${prefix}_CONSUMER_SECRET) are not configured on the server.`
    );
    err.code = 'PESAPAL_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  return {
    provider: 'pesapal',
    environment,
    isSandbox,
    baseUrl,
    consumerKey,
    consumerSecret,
    ipnId,
    ipnUrl,
    frontendUrl: frontendBase,
    callbackUrl,
    cancellationUrl,
    isConfigured: configured
  };
}

function validatePesapalConfig({ strictStartup = false } = {}) {
  const cfg = getPesapalConfig({ requireConfigured: false });
  const isProdRuntime = process.env.NODE_ENV === 'production';
  const isPrimaryProvider = (process.env.PAYMENT_DEFAULT_PROVIDER || '').trim().toLowerCase() === 'pesapal';

  if (cfg.environment === 'production' && (isProdRuntime || strictStartup) && isPrimaryProvider && !cfg.isConfigured) {
    throw new Error(
      'FATAL PAYMENT CONFIG: PESAPAL_ENV=production requires PESAPAL_PRODUCTION_CONSUMER_KEY and PESAPAL_PRODUCTION_CONSUMER_SECRET.'
    );
  }

  if ((strictStartup || isPrimaryProvider) && isProdRuntime && !cfg.isConfigured) {
    const prefix = cfg.isSandbox ? 'PESAPAL_SANDBOX' : 'PESAPAL_PRODUCTION';
    throw new Error(
      `FATAL PAYMENT CONFIG: Missing ${prefix}_CONSUMER_KEY or ${prefix}_CONSUMER_SECRET for PESAPAL_ENV=${cfg.environment}.`
    );
  }

  if (cfg.isConfigured && !cfg.ipnUrl && !cfg.ipnId && process.env.NODE_ENV !== 'test') {
    console.warn(
      '⚠️ PAYMENT CONFIG WARNING: Neither PESAPAL_IPN_URL nor PESAPAL_IPN_ID is set; SubmitOrderRequest will require one of them.'
    );
  }

  return cfg;
}

module.exports = {
  VALID_ENVS,
  PESAPAL_ENDPOINTS,
  resolvePesapalEnvironment,
  getPesapalConfig,
  validatePesapalConfig
};
