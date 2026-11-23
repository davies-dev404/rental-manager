const { validateSecurityConfig } = require('../middleware/securityMiddleware');
const logger = require('../utils/logger');

function isValidUrlOptional(val) {
  if (!val) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates critical and optional runtime configuration at boot.
 * Fails closed on critical security gaps in production, logs clear warnings for optional infra.
 */
function validateEnvironment() {
  validateSecurityConfig();

  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`FATAL CONFIG: PORT "${process.env.PORT}" must be a valid TCP port (1-65535).`);
  }

  const frontendUrl = (process.env.FRONTEND_URL || '').trim();
  if (frontendUrl && !isValidUrlOptional(frontendUrl)) {
    throw new Error(`FATAL CONFIG: FRONTEND_URL "${frontendUrl}" is not a valid HTTP/HTTPS URL.`);
  }

  const isProd = Boolean(
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER ||
    process.env.VERCEL
  );

  if (isProd && process.env.NODE_ENV !== 'test') {
    if (!(process.env.REDIS_URL || '').trim()) {
      logger.warn('REDIS_URL not configured; running with graceful in-memory/MongoDB fallbacks.');
    }
    if (!(process.env.SENTRY_DSN || '').trim()) {
      logger.info('SENTRY_DSN not configured; Sentry error reporting is inactive.');
    }
  }

  return getRuntimeCapabilities();
}

function getRuntimeCapabilities() {
  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 5000),
    redisConfigured: Boolean((process.env.REDIS_URL || '').trim()),
    bullmqWorkersEnabled: process.env.ENABLE_BULLMQ_WORKERS === 'true' && Boolean((process.env.REDIS_URL || '').trim()),
    sentryConfigured: Boolean((process.env.SENTRY_DSN || '').trim()),
    socketIoEnabled: process.env.ENABLE_SOCKET_IO !== 'false',
    prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
    turnstileConfigured: Boolean((process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim()),
    brevoConfigured: Boolean((process.env.BREVO_API_KEY || '').trim())
  };
}

module.exports = {
  validateEnvironment,
  getRuntimeCapabilities
};
