# Engineering & Architecture Decisions (ADRs)

## ADR-001: Keep Modular Monolith on Render + Vercel + MongoDB Atlas
- **Context**: The SaaS serves landlords, tenants, and Msimamizi admins with transactional financial integrity.
- **Decision**: Retain the Express modular monolith on Render, React/Vite static SPA on Vercel, and MongoDB Atlas as the single financial source of truth; defer microservices and Kubernetes (`k8s-manifest.yaml` kept informational only).
- **Rationale**: Eliminates premature network hops, distributed 2PC overhead, and monthly cluster orchestration costs while supporting horizontal scaling via stateless JWTs, `CronLock`, and optional Redis adapter.

## ADR-002: Progressive / Optional Redis & BullMQ Architecture
- **Context**: Render Free Tier does not include persistent free Redis or dedicated background worker dynos.
- **Decision**: Make `ioredis` and `bullmq` optional via `REDIS_URL` and `ENABLE_BULLMQ_WORKERS`. Provide bounded per-landlord in-memory TTL caching (`cacheService.js`), MongoDB atomic `CronLock`, and persistent `DeadLetterJob` records whenever Redis is absent.
- **Rationale**: Zero paid dependencies during development/early launch, with instant zero-code-change upgrade to Redis + `node server/worker.js` when scaling.

## ADR-003: Atomic Vacancy Claim & Transaction Fallback (`runWithOptionalTransaction`)
- **Context**: MongoDB Atlas supports multi-document ACID transactions, while local standalone MongoDB dev/test instances do not.
- **Decision**: Enforce conditional atomic updates (`{ status: 'vacant' }` unit allocation, `Counter.nextSequence` invoices, `PaymentTransaction` status transitions) and wrap multi-document settlements inside `runWithOptionalTransaction` (detecting `Single` topology / error codes `20` & `263`).
- **Rationale**: Full ACID atomicity in production on Atlas while keeping local development and CI fast and deterministic.

## ADR-004: Strict `jti` on Refresh Tokens & Portal Cookie Separation
- **Decision**: Include `crypto.randomUUID()` `jti` in every refresh token and isolate cookies (`jwt` vs `msimamizi_jwt`) so concurrent landlord and Super Admin tabs never collide and same-second refresh token rotations remain strictly unique for reuse-theft detection.
