# Database Architecture (MongoDB Atlas + Mongoose)

## Connection Pooling & Resilience
Configured in `server/server.js`:
- `mongoose.set('bufferCommands', false)` ensures fast failure instead of hanging requests when disconnected.
- Cached `global._mongooseConnection` reuses the pool across invocations.
- Pool sizing: `maxPoolSize: 5`, `minPoolSize: 1` (serverless/Render) and `maxPoolSize: 10`, `minPoolSize: 2` (standard Node), `socketTimeoutMS: 45000`, `heartbeatFrequencyMS: 10000`.

## Core Collections & Key Indexes
- `User`: unique `email`, `{ role, accountStatus, createdAt }`.
- `Property`: `{ user, createdAt }`, `{ location, type }`, `status`, `isFlagged`, `isDemo`.
- `Unit`: `{ user, status, createdAt }`, `{ propertyId, status }`, `{ propertyId, unitNumber }`, `isDemo`.
- `Tenant`: `{ user, status, createdAt }`, `{ unitId, status }`, `{ user, email }`, `{ user, phone }`, `isDemo`.
- `Payment`: `{ user, date }`, `{ user, status, date }`, `{ unitId, date }`, `{ tenantId, monthCovered }`, sparse `reference`, unique sparse `paymentTransactionId`.
- `PaymentTransaction`: unique `internalTransactionId`, unique sparse `idempotencyKey`, unique sparse `{ provider, providerReference }`, unique `{ provider, gatewayEnvironment, accountReference }`, `{ landlordId, paymentCategory, status, createdAt }`.
- `Invoice`: unique `invoiceNumber`, `{ landlordId, invoiceCategory, createdAt }`, `{ tenantId, billingPeriod }`.
- `Expense`: `{ user, date }`, `{ propertyId, date }`.
- `IdempotencyRecord`: unique `compositeKey`, TTL index `expiresAt` (`expireAfterSeconds: 0` for 24h auto-purge).
- `Counter`: monotonic atomic invoice/document sequence generator (`_id`, `seq`).
- `FinancialAuditEntry`: immutable append-only financial transition ledger (`landlordId`, `transactionId`, `entryType`, `amount`, `direction`, `createdAt`).
- `DeadLetterJob`, `CronLock`, `FeatureFlag`, `Migration`.

## Transactions & Concurrency Control
- `runWithOptionalTransaction` (`server/middleware/securityMiddleware.js`) executes multi-document financial operations (`PaymentService.finalizeVerifiedSettlement`, `PaymentService.handleReversal`) inside MongoDB ACID transactions on replica sets (MongoDB Atlas), automatically falling back to sequential execution on standalone dev servers (`topology.type === 'Single'`).
- Concurrent unit assignment uses conditional atomic claim `{ _id, user, status: 'vacant' }` (`409 Conflict` if already occupied).
- Subscription unit quotas use atomic `UnitEntitlement` reservations (`reserveUnitSlot`).

## Schema & Data Migrations
Managed in `server/services/migrationService.js` backed by the `Migration` collection (`version`, `name`, `checksum`, `status`). Forward-only migrations run automatically at non-test server boot without mutating or deleting valid production records.
