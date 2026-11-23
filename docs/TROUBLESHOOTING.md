# Operations & Troubleshooting Guide

## 1. `/api/ready` Returns 503 (`not_ready`)
- **Cause**: `mongoose.connection.readyState !== 1` (Atlas IP whitelist, wrong `MONGODB_URI`, or transient DNS/network outage).
- **Fix**: Verify `MONGODB_URI` in Render/env, confirm Atlas Network Access allows Render outbound IPs (`0.0.0.0/0` with strong credentials + TLS), and check logs for `Initial DB connect error`.

## 2. Gateway Circuit Breaker State is `OPEN` (HTTP `503 CIRCUIT_OPEN`)
- **Cause**: Pesapal, IntaSend, or Brevo returned >= 5 consecutive transient `5xx`/timeout failures within the active window.
- **Fix**: Inspect **Msimamizi -> System Health** (`External Service Circuit Breakers`). The breaker automatically enters `HALF-OPEN` after `30s` cooldown and recovers to `CLOSED` once an upstream probe succeeds. Check gateway status pages if failures persist.

## 3. Dead Letter Jobs Accumulating in Msimamizi (`pending > 0`)
- **Cause**: Transient webhook verification or background notification jobs exhausted retries.
- **Fix**: Go to **Msimamizi -> System Health -> Dead Letter Queue**, inspect `errorMessage`, fix underlying config/outage, and click **Replay** (or **Resolve** if superseded).

## 4. Duplicate Unit Assignment Error (`409 UNIT_ALREADY_OCCUPIED`)
- **Cause**: Concurrent tenant creation/swap targeted a unit already claimed as `occupied`.
- **Fix**: Expected race protection! Refresh unit list on the UI and select a `vacant` unit.

## 5. Redis Unavailable / Degraded
- **Behavior**: MongoDB and API requests keep operating cleanly via in-memory/MongoDB fallback (`cache.backend: "memory_fallback"`, `CronLock` in MongoDB).
- **Fix**: Check `REDIS_URL` connectivity/TLS (`rediss://` for Upstash) or quota limits on your Redis provider.

## 6. CORS Origin Blocked in Production Logs (`cors_origin_blocked`)
- **Cause**: Frontend hosted on a custom domain not listed in `ALLOWED_CORS_ORIGINS`.
- **Fix**: Add the origin to `CORS_EXTRA_ORIGINS` (comma-separated) in backend environment variables.
