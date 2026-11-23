# Backup & Disaster Recovery Runbook

## Recovery Objectives
- **MongoDB Atlas M10+ (Continuous Cloud Backups / Point-in-Time Recovery)**: Target RPO <= 5 minutes, RTO <= 30 minutes.
- **MongoDB Atlas M0 / Free Tier (Scheduled Logical Exports via `mongodump`)**: Target RPO <= 24 hours, RTO <= 60 minutes.

## Backup Security Rules
- Never store `.archive`, `.bson`, or `.gz` database dumps inside `client/public/`, `client/dist/`, or any git-tracked directory (`db-backup/` is excluded via `.gitignore`).
- Encrypt logical backups at rest (private encrypted S3/R2 bucket or offline encrypted vault) with minimum 30-day retention for financial compliance.

## Logical Backup Command (`mongodump`)
```bash
mongodump --uri="$MONGODB_URI" --archive="./db-backup/makaziflow_$(date +%Y%m%d_%H%M).archive.gz" --gzip
```

## Integrity Verification (Periodic Test Restore)
Every backup schedule should restore into an isolated staging/test database monthly and verify document counts across `users`, `properties`, `units`, `tenants`, `payments`, `paymenttransactions`, `invoices`, and `financialauditentries`:
```bash
mongorestore --uri="$MONGODB_STAGING_URI" --archive="./db-backup/latest.archive.gz" --gzip --nsFrom="rental_manager.*" --nsTo="rental_manager_restore_verify.*"
```

## Production Disaster Recovery Procedure
1. **Enable Maintenance Mode**: Activate Maintenance Mode in **Msimamizi -> Platform Settings** (returns HTTP `503` on regular mutation/workspace traffic while preserving Super Admin access).
2. **Restore Database**:
   - **Atlas M10+**: Trigger Atlas Cloud Backup restore / Point-in-Time restore cleanly to target cluster.
   - **Logical Archive**: Run `mongorestore --uri="$MONGODB_URI" --archive="<verified_archive>.gz" --gzip --drop`.
3. **Verify Integrity & Migrations**: Confirm `GET /api/ready` returns `200`, inspect `PaymentTransaction` vs `FinancialAuditEntry` totals, and verify recent webhooks in `PaymentCallback` / `DeadLetterJob`.
4. **Disable Maintenance Mode**: Turn off Maintenance Mode in Msimamizi and inspect `GET /api/admin/system-health`.
