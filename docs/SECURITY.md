# Security Architecture & Controls

## 1. Authentication & Session Governance
- **Access & Refresh Tokens**: Signed with `JWT_SECRET` (`server/middleware/securityMiddleware.js` enforces >= 24 chars in production and forbids insecure defaults). Every refresh token carries a unique `jti` (`crypto.randomUUID()`), `tokenVersion` (`tv`), and SHA-256 digest stored in `User.refreshTokens`.
- **Token Rotation & Theft Detection**: `/api/auth/refresh` rotates refresh tokens on every use. Replaying an already-rotated token wipes all stored refresh tokens for the account and forces re-authentication.
- **Session Revocation**: Changing password, resetting password, or Super Admin account suspension increments `tokenVersion` / sets `passwordChangedAt`, immediately invalidating active Bearer and Socket.IO tokens.
- **Portal Cookie Separation**: Standard portal uses `jwt` / `refreshToken`; Msimamizi Admin portal uses `msimamizi_jwt` / `msimamizi_refresh` (`httpOnly`, `secure` in prod, `sameSite`).
- **Bot & Brute-Force Defense**: `authLoginLimiter`, `authOtpLimiter`, `authResetLimiter`, `paymentCheckoutLimiter`, `paymentWebhookLimiter`, and Cloudflare Turnstile verification (`verifyCloudflareTurnstile`).

## 2. Multi-Tenant Isolation
- All portfolio queries (`Property`, `Unit`, `Tenant`, `Payment`, `Expense`, `Invoice`, `UtilityReading`) derive ownership from authenticated `req.user._id` / validated caretaker assignments (`resolveLandlordId` in `server/middleware/subscriptionMiddleware.js` rejects unassigned `propertyId` tampering with `403`).
- Landlord cache keys are strictly prefixed (`mf:v1:landlord:<landlordId>:<resource>`).
- Socket.IO handshakes authenticate JWTs and reject unauthorized cross-landlord `subscribe:landlord` room requests.
- ODPP Data Minimization: Super Admin (`msimamizi`) tenant monitoring reports anonymized tenant counts/statuses without exposing private tenant contact PII.

## 3. Input, Injection & Payment Security
- `sanitizeRequest` recursively removes `$*`, dotted keys, and prototype pollution keys (`__proto__`, `constructor`, `prototype`).
- `validateObjectId` rejects malformed IDs (`400`); `pickAllowed` whitelists updatable fields.
- Image uploads (`validateSafeImageInput`) check HTTPS URL syntax or inspect PNG/JPEG/GIF/WEBP magic bytes (blocking SVG/XSS payloads).
- Payment webhooks enforce cryptographic signature/challenge verification (`crypto.timingSafeEqual`), optional replay timestamps (`X-Webhook-Timestamp`), cross-environment isolation (`sandbox` vs `production`), and server-to-server status verification before settlement.
- Production CORS (`server/server.js`) enforces trusted origins (`afrinextech.co.ke`, `.vercel.app`, `.onrender.com`, `CORS_EXTRA_ORIGINS`).

## 4. Secrets Hygiene & Logging Redaction
- `server/utils/logger.js` recursively redacts `password`, `token`, `refreshToken`, `secret`, `apiKey`, `authorization`, `cookie`, `otp`, `nationalId`, `kraPin`, `consumerSecret`, and `webhookChallenge`.
- `.env` files are excluded from Git; `.env.example` contains placeholders only.
