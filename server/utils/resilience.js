const logger = require('./logger');

const BREAKER_REGISTRY = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies whether an upstream HTTP / network error is transient and safe to retry.
 * Never retries 4xx validation, auth, or bad-request errors (except 408 / 429).
 */
function isDefaultRetryableError(err) {
  if (!err) return false;
  if (err.retryable === false) return false;
  if (err.retryable === true) return true;

  const status = err.statusCode || err.response?.status;
  if (status) {
    if (status === 408 || status === 429 || status >= 500) return true;
    return false;
  }

  const code = String(err.code || '').toUpperCase();
  if (['ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'GATEWAY_TIMEOUT', 'PIPE'].includes(code)) {
    return true;
  }

  return /timeout|socket hang up|network|temporarily unavailable/i.test(String(err.message || ''));
}

/**
 * Exponential backoff with full/decorrelated jitter to prevent thundering herds.
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 2,
    baseDelayMs = 250,
    maxDelayMs = 5000,
    jitter = true,
    isRetryable = isDefaultRetryableError,
    label = 'external_operation'
  } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const shouldRetry = attempt < maxRetries && isRetryable(err);
      if (!shouldRetry) {
        throw err;
      }

      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const delayMs = jitter ? Math.round(expDelay * (0.5 + Math.random() * 0.5)) : expDelay;

      logger.warn('operation_retry_scheduled', {
        label,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        error: err.message,
        code: err.code
      });

      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw lastError;
}

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = Math.max(2, Number(options.failureThreshold || 5));
    this.cooldownMs = Math.max(5000, Number(options.cooldownMs || 30000));
    this.state = 'CLOSED';
    this.failures = 0;
    this.openedAt = 0;
    this.lastFailure = null;
    this.lastSuccessAt = null;
    this.halfOpenInFlight = false;
    BREAKER_REGISTRY.set(name, this);
  }

  snapshot() {
    this.evaluateTransition();
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      failureThreshold: this.failureThreshold,
      cooldownMs: this.cooldownMs,
      lastFailure: this.lastFailure,
      lastSuccessAt: this.lastSuccessAt
    };
  }

  evaluateTransition() {
    if (this.state === 'OPEN' && Date.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'HALF-OPEN';
      this.halfOpenInFlight = false;
      logger.info('circuit_breaker_half_open', { breaker: this.name });
    }
  }

  onSuccess() {
    const prev = this.state;
    this.failures = 0;
    this.state = 'CLOSED';
    this.halfOpenInFlight = false;
    this.lastSuccessAt = new Date().toISOString();
    if (prev !== 'CLOSED') {
      logger.info('circuit_breaker_closed', { breaker: this.name, previousState: prev });
    }
  }

  onFailure(err, countFailure = true) {
    this.halfOpenInFlight = false;
    if (!countFailure) return;

    this.failures += 1;
    this.lastFailure = {
      message: String(err?.message || 'Failure'),
      at: new Date().toISOString()
    };

    if (this.state === 'HALF-OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      logger.error('circuit_breaker_opened', {
        breaker: this.name,
        failures: this.failures,
        cooldownMs: this.cooldownMs,
        error: err?.message
      });
    }
  }

  async exec(fn, { shouldTrip = isDefaultRetryableError } = {}) {
    this.evaluateTransition();

    if (this.state === 'OPEN') {
      const err = new Error(`Service temporarily unavailable (${this.name} circuit is OPEN). Please retry shortly.`);
      err.statusCode = 503;
      err.code = 'CIRCUIT_OPEN';
      err.retryable = true;
      throw err;
    }

    if (this.state === 'HALF-OPEN') {
      if (this.halfOpenInFlight) {
        const err = new Error(`Service recovery probe in progress (${this.name} HALF-OPEN).`);
        err.statusCode = 503;
        err.code = 'CIRCUIT_HALF_OPEN_BUSY';
        err.retryable = true;
        throw err;
      }
      this.halfOpenInFlight = true;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err, shouldTrip(err));
      throw err;
    }
  }
}

function getAllBreakersStatus() {
  return Array.from(BREAKER_REGISTRY.values()).map((b) => b.snapshot());
}

module.exports = {
  withRetry,
  isDefaultRetryableError,
  CircuitBreaker,
  getAllBreakersStatus
};
