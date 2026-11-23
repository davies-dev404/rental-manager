const crypto = require('crypto');
const logger = require('../utils/logger');
const { recordRequestMetric } = require('../services/metricsService');

const DEFAULT_TIMEOUT_MS = Math.max(5000, Number(process.env.REQUEST_TIMEOUT_MS) || 30000);
const REPORT_TIMEOUT_MS = Math.max(DEFAULT_TIMEOUT_MS, Number(process.env.REPORT_TIMEOUT_MS) || 45000);

function sanitizeCorrelationId(raw) {
  const clean = String(raw || '').trim().replace(/[^A-Za-z0-9-_.:]/g, '').slice(0, 64);
  return clean || crypto.randomUUID();
}

function resolveRequestTimeoutMs(req) {
  const url = req.originalUrl || req.path || '';
  // Never kill SSE streams via request timeout middleware
  if (url.includes('/stream')) return 0;
  // Webhooks get tighter timeout (15s) to respond promptly to gateway retries
  if (url.includes('/webhooks/') || url.includes('/c2b/') || url.includes('/callback')) return 20000;
  // Reports / PDF exports can take slightly longer
  if (url.includes('/reports') || url.includes('/pdf') || url.includes('/export')) return REPORT_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Attaches correlation ID, AsyncLocalStorage logging scope, HTTP timeout guard,
 * and structured request completion logging.
 */
function requestContextMiddleware(req, res, next) {
  const correlationId = sanitizeCorrelationId(req.headers['x-correlation-id'] || req.headers['x-request-id']);
  const startedAt = process.hrtime.bigint();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const store = {
    correlationId,
    method: req.method,
    path: req.originalUrl || req.url,
    userId: null
  };

  const timeoutMs = resolveRequestTimeoutMs(req);
  let timer = null;
  let timedOut = false;

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      if (!res.headersSent) {
        logger.warn('HTTP request timed out', {
          method: req.method,
          path: req.originalUrl || req.url,
          timeoutMs
        });
        res.status(504).json({
          message: 'Request timed out. Please try again shortly.',
          correlationId
        });
      }
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
  }

  res.on('finish', () => {
    if (timer) clearTimeout(timer);
    if (req.user?._id) store.userId = String(req.user._id);

    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const path = req.originalUrl || req.url || '';
    recordRequestMetric({
      durationMs: elapsedMs,
      statusCode: res.statusCode,
      method: req.method,
      path
    });
    const isNoiseProbe = path === '/api/live' || path === '/';

    if (!isNoiseProbe || res.statusCode >= 400) {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('http_request', {
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: Number(elapsedMs.toFixed(2)),
        timedOut,
        ip: req.ip
      });
    }
  });

  res.on('close', () => {
    if (timer) clearTimeout(timer);
  });

  logger.requestContextStorage.run(store, () => next());
}

module.exports = {
  requestContextMiddleware,
  DEFAULT_TIMEOUT_MS,
  REPORT_TIMEOUT_MS
};
