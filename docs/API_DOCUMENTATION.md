# API Documentation

Base URL: `/api` (Production: `https://rental-manager-1-7jmg.onrender.com/api`)  
All responses include `X-Correlation-Id`. Critical state-changing `POST` endpoints support the `Idempotency-Key` header.

## Health & Probes
- `GET /api/live` — Liveness probe (`200`, process uptime & PID).
- `GET /api/ready` — Readiness probe (`200` when MongoDB `readyState === 1`, `503` otherwise).
- `GET /api/health` — Diagnostic overview (`database`, `memoryMB`, `paymentGateway`, `capabilities`).

## Authentication (`/api/auth` & `/api/admin/auth`)
- `POST /api/auth/register` — Register landlord (`201`, sends verification OTP).
- `POST /api/auth/login` — Step 1 password/Turnstile verification (`authLoginLimiter`).
- `POST /api/auth/verify-login-otp` — Complete OTP challenge, sets cookies & returns `token` + `refreshToken`.
- `POST /api/auth/refresh` — Rotate refresh token & issue new access token.
- `POST /api/auth/logout` — Revoke current session and clear cookies.
- `POST /api/admin/auth/login` & `/verify-otp` — Isolated Msimamizi Super Admin authentication.

## Portfolio & Financials (JWT Protected + Active Subscription Lock)
- `GET/POST/PUT/DELETE /api/properties` — Landlord property portfolio CRUD.
- `GET/POST/PUT/DELETE /api/units` — Unit CRUD (`POST` uses atomic `reserveUnitSlot` + `Idempotency-Key`).
- `GET/POST/PUT/DELETE /api/tenants` — Tenant CRUD (`POST`/`PUT` enforce atomic `status: 'vacant'` unit claim returning `409` on race; supports optional `?page=&limit=`).
- `GET/POST /api/payments` — Rental payments (`GET` supports `?page=&limit=`; `POST` supports `Idempotency-Key`).
- `GET /api/dashboard/stats` — Landlord financial & occupancy summary (cached 45s per `landlord:<id>`, auto-invalidated on writes).
- `POST /api/mpesa/stk-push`, `POST /api/v2/payments/initiate`, `POST|GET /api/v2/payments/webhooks/:provider` — Payment gateway checkout & verified webhooks.

## Msimamizi Super Admin (`/api/admin/*`, Requires SuperAdmin Auth)
- `GET /api/admin/dashboard` — Platform-wide KPIs & analytics.
- `GET/PATCH /api/admin/users*`, `/properties*`, `/tenants*`, `/payments*`, `/subscriptions*`, `/reports*`, `/support*`, `/settings*`, `/activity-logs`.
- `GET /api/admin/system-health` — Live DB ping latency, P50/P95/P99 latency, error rates, Redis/queue/Socket.IO status, Circuit Breakers, DLQ count, and security counters.
- `GET /api/admin/metrics` — Prometheus exposition format metrics.
- `GET/PATCH /api/admin/feature-flags*` — Safe feature rollout toggles.
- `GET /api/admin/dlq`, `POST /api/admin/dlq/:id/replay`, `PATCH /api/admin/dlq/:id/resolve` — Dead Letter Queue inspection & replay.

## Real-Time Channels
- **Socket.IO**: Authenticated via handshake `auth: { token }`; joins `user:<id>`, `landlord:<id>` (ownership-verified), or `superadmin:global`. Emits `payment:settled`, `admin:payment_settled`.
- **SSE**: `GET /api/support/stream` & `GET /api/admin/support/stream` for real-time Support ticket chat.
