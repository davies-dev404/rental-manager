# Monitoring & Observability Guide

## 1. Structured JSON Logging & Correlation IDs
- Handled by `server/utils/logger.js` and `server/middleware/requestContextMiddleware.js`.
- Every HTTP request receives or propagates `X-Correlation-Id` across `AsyncLocalStorage` logs and echoes `X-Correlation-Id` in the response headers.
- Sensitive fields (`password`, `token`, `secret`, `apiKey`, `otp`, `nationalId`, `kraPin`, `consumerSecret`, etc.) are automatically replaced with `[REDACTED]`.

## 2. Health, Readiness & Liveness Endpoints
- `GET /api/live` -> `200 { status: "alive", uptime, pid }` (fast container/Render probe).
- `GET /api/ready` -> `200` when `mongoose.connection.readyState === 1`, otherwise `503`.
- `GET /api/health` -> JSON overview including memory RSS/heap, DB state, email config, payment gateway config, and runtime capabilities.

## 3. SRE System Health Dashboard (Msimamizi)
Authorized Super Admins can inspect **Msimamizi -> System Health** (`/system-health`, backed by `GET /api/admin/system-health`):
- **Application**: Up/degraded status, uptime, Node version, RSS/heap memory.
- **Database**: Live MongoDB `admin().ping()` latency in milliseconds & connection state.
- **Reliability & Latency**: Real rolling `P50`, `P95`, `P99`, max response latency, 5xx error percentage, and pending Dead Letter Jobs.
- **Infrastructure**: Live `Redis` status, cache hit/miss telemetry, BullMQ queue counts/fallback mode, active `Socket.IO` client count, and `CircuitBreaker` state (`CLOSED` / `OPEN` / `HALF-OPEN`).
- **Security**: Auth failure counters (`401`/`403`), rate-limit triggers (`429`), and 24h security audit log count.

## 4. Prometheus & Sentry Integration
- `GET /api/admin/metrics` exposes Prometheus-formatted `makaziflow_http_request_duration_ms` and Node runtime metrics (Super Admin protected).
- Setting `SENTRY_DSN` enables unhandled exception capture automatically in non-test environments.
