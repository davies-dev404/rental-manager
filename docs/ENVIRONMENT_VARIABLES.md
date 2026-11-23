# Environment Variables Reference

All variables belong in `server/.env` (or Render / Vercel project dashboards). Never commit real `.env` files or expose secrets via `VITE_*` variables.

## Required Backend Variables
- `NODE_ENV`: `development`, `test`, or `production`.
- `PORT`: HTTP listen port (default `5000`; injected automatically by Render).
- `MONGODB_URI`: MongoDB Atlas SRV connection string (`mongodb+srv://...` or TLS-enabled URI).
- `JWT_SECRET`: Cryptographically random string (>= 24 chars required in production; >= 32 chars recommended).

## Frontend & CORS Origins
- `FRONTEND_URL`: Local dev origin (`http://localhost:5173`).
- `PROD_FRONTEND_URL`: Production origin (`https://makaziflow.afrinextech.co.ke`).
- `CORS_EXTRA_ORIGINS`: Comma-separated extra allowed origins appended in production.

## Payment Gateways
- `PAYMENT_DEFAULT_PROVIDER`: `pesapal`, `intasend`, or `pesaflow`.
- `PESAPAL_ENV`: `sandbox` or `production`.
- `PESAPAL_SANDBOX_CONSUMER_KEY`, `PESAPAL_SANDBOX_CONSUMER_SECRET`, `PESAPAL_SANDBOX_IPN_ID`.
- `PESAPAL_PRODUCTION_CONSUMER_KEY`, `PESAPAL_PRODUCTION_CONSUMER_SECRET`, `PESAPAL_PRODUCTION_IPN_ID`.
- `PESAPAL_CALLBACK_URL`, `PESAPAL_IPN_URL`.
- `INTASEND_ENV`: `sandbox` or `production`.
- `INTASEND_SANDBOX_PUBLISHABLE_KEY`, `INTASEND_SANDBOX_SECRET_KEY`, `INTASEND_SANDBOX_WEBHOOK_CHALLENGE`.
- `INTASEND_PRODUCTION_PUBLISHABLE_KEY`, `INTASEND_PRODUCTION_SECRET_KEY`, `INTASEND_PRODUCTION_WEBHOOK_CHALLENGE`.

## Security & Notifications
- `SUPERADMIN_EMAILS`: Comma-separated Super Admin allowlist for Msimamizi portal access.
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`: Turnstile verification secret (fail-closed after repeated failed logins).
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SMS_SENDER`: Transactional email/SMS delivery.

## Reliability, Caching, Workers & Observability (Optional)
- `REQUEST_TIMEOUT_MS`: Default HTTP timeout (`30000`).
- `REPORT_TIMEOUT_MS`: Timeout for export/PDF routes (`45000`).
- `LOG_FORMAT`: `json` for structured logs.
- `REDIS_URL`: Redis / Upstash TLS URI (optional; falls back cleanly if empty).
- `ENABLE_BULLMQ_WORKERS`: Set `true` only when a persistent Redis + worker process is running.
- `ENABLE_SOCKET_IO`: Set `false` to disable Socket.IO server (default `true`).
- `PROMETHEUS_ENABLED`: `true` by default for `/api/admin/metrics` histogram collection.
- `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`: Optional Sentry error reporting.

## Frontend Variables (`client/.env` / Vercel)
- `VITE_API_URL`: Backend API URL override (public browser value only; **never secrets**).
