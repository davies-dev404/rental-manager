# Deployment & Hosting Guide

## 1. Frontend — Vercel (`client/`)
- **Config**: [vercel.json](../vercel.json) builds `client/package.json` (`dist`) and rewrites SPA routes to `/index.html`.
- **Environment Variables**: Never store database URIs, JWT secrets, or payment keys in `VITE_*` variables. Set `VITE_API_URL` if overriding default backend API target.
- **WebSockets / Background Workers**: Vercel serverless functions (`api/index.js`) cannot hold long-lived Socket.IO connections or persistent BullMQ workers; Socket.IO and API traffic connect directly to the Render backend.

## 2. Backend — Render (`server/`)
- **Entrypoint**: `npm start` (`node server/server.js`) after `npm install`.
- **Proxy & Timeouts**: `app.set('trust proxy', 1)` trusts Render's reverse proxy IP headers; HTTP `keepAliveTimeout = 65000` and `headersTimeout = 66000` avoid Nginx/Render `502 Bad Gateway` keepalive race errors.
- **Health Checks**: Point Render Health Check Path to `/api/ready` (or `/api/live` for basic process liveness).
- **Render Free Tier Compatibility**:
  - Render Free spins down after 15 min idle and lacks a dedicated persistent worker dyno.
  - MakaziFlow handles this cleanly: `REDIS_URL` and `ENABLE_BULLMQ_WORKERS` are **optional**. When absent, caching degrades safely to bounded per-landlord in-memory TTL cache, cron locks use MongoDB `CronLock`, and failed jobs still persist to `DeadLetterJob`.
- **Production Upgrade Path**:
  1. Provision Render Starter (always-on, zero cold spin-down) + Managed Redis (Upstash free tier or Render Key Value).
  2. Set `REDIS_URL` + `ENABLE_BULLMQ_WORKERS=true` and add a Render Background Worker service running `node server/worker.js`.

## 3. Local Containerized Development (`docker-compose.yml`)
Run `docker compose up --build` to start MongoDB, Redis, API server (`:5000`), and Nginx frontend (`:5173`). Add `--profile worker` to run the BullMQ worker container alongside the API.
