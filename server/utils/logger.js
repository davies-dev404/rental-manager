const { AsyncLocalStorage } = require('async_hooks');

const requestContextStorage = new AsyncLocalStorage();

const SENSITIVE_KEY_PATTERN =
  /^(password|pass|pwd|secret|token|accessToken|refreshToken|jwt|msimamizi_jwt|msimamizi_refresh|apiKey|api_key|authorization|cookie|set-cookie|otp|twoFactorSecret|nationalId|kraPin|consumerKey|consumerSecret|webhookChallenge|challenge|privateKey|dsn)$/i;

function redactValue(val, depth = 0) {
  if (val === null || val === undefined) return val;
  if (depth > 6) return '[Truncated]';
  if (val instanceof Error) {
    return {
      name: val.name,
      message: val.message,
      code: val.code,
      statusCode: val.statusCode
    };
  }
  if (Array.isArray(val)) {
    return val.slice(0, 50).map((item) => redactValue(item, depth + 1));
  }
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactValue(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof val === 'string' && /^Bearer\s+/i.test(val)) {
    return 'Bearer [REDACTED]';
  }
  return val;
}

function getContextMeta() {
  const store = requestContextStorage.getStore();
  if (!store) return {};
  return {
    correlationId: store.correlationId,
    userId: store.userId,
    method: store.method,
    path: store.path
  };
}

function emit(level, message, meta = {}) {
  const isTestQuiet = process.env.NODE_ENV === 'test' && process.env.LOG_IN_TEST !== 'true';
  if (isTestQuiet && level === 'debug') return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'makaziflow-api',
    env: process.env.NODE_ENV || 'development',
    message: String(message || ''),
    ...getContextMeta(),
    ...redactValue(meta)
  };

  if (process.env.NODE_ENV === 'test' && process.env.LOG_IN_TEST !== 'true') {
    return;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  requestContextStorage,
  redactValue,
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta)
};

module.exports = logger;
