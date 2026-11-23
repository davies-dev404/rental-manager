let promClient = null;
try {
  promClient = require('prom-client');
} catch {
  promClient = null;
}

const MAX_LATENCY_SAMPLES = 1000;
const latencySamples = [];

const counters = {
  totalRequests: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0,
  authFailures: 0,
  rateLimited: 0,
  startedAt: new Date().toISOString()
};

let httpDurationHistogram = null;
let promRegister = null;

if (promClient && process.env.PROMETHEUS_ENABLED !== 'false') {
  promRegister = new promClient.Registry();
  if (process.env.NODE_ENV !== 'test') {
    promClient.collectDefaultMetrics({ register: promRegister, prefix: 'makaziflow_' });
  }
  httpDurationHistogram = new promClient.Histogram({
    name: 'makaziflow_http_request_duration_ms',
    help: 'HTTP request latency in milliseconds',
    labelNames: ['method', 'status_class'],
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [promRegister]
  });
}

function recordRequestMetric({ durationMs, statusCode, method = 'GET', path = '' }) {
  if (path === '/api/live') return;

  counters.totalRequests += 1;
  if (statusCode >= 500) counters.status5xx += 1;
  else if (statusCode >= 400) counters.status4xx += 1;
  else counters.status2xx += 1;

  if (statusCode === 401 || statusCode === 403) counters.authFailures += 1;
  if (statusCode === 429) counters.rateLimited += 1;

  const cleanMs = Number(durationMs || 0);
  if (Number.isFinite(cleanMs) && cleanMs >= 0) {
    latencySamples.push(cleanMs);
    if (latencySamples.length > MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }
    if (httpDurationHistogram) {
      const statusClass = `${Math.floor(statusCode / 100)}xx`;
      httpDurationHistogram.observe({ method, status_class: statusClass }, cleanMs);
    }
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx].toFixed(2));
}

function getTelemetrySnapshot() {
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const errorRatePct =
    counters.totalRequests > 0
      ? Number((((counters.status5xx) / counters.totalRequests) * 100).toFixed(2))
      : 0;

  return {
    ...counters,
    sampleCount: sorted.length,
    errorRate5xxPct: errorRatePct,
    latencyMs: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted.length > 0 ? Number(sorted[sorted.length - 1].toFixed(2)) : 0
    }
  };
}

async function getPrometheusMetricsText() {
  if (!promRegister) return '# Prometheus metrics disabled or prom-client unavailable\n';
  return await promRegister.metrics();
}

module.exports = {
  recordRequestMetric,
  getTelemetrySnapshot,
  getPrometheusMetricsText
};
