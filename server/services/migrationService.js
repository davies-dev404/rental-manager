const crypto = require('crypto');
const Migration = require('../models/Migration');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Property = require('../models/Property');
const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const logger = require('../utils/logger');

const MIGRATIONS = [
  {
    version: 1,
    name: '2026_11_24_001_normalize_empty_payment_references',
    description: 'Convert blank string Payment.reference values to undefined so sparse indexes remain conflict-free without deleting payment records.',
    up: async () => {
      const res = await Payment.updateMany(
        { reference: '' },
        { $unset: { reference: 1 } }
      );
      return { modifiedCount: res.modifiedCount || 0 };
    }
  },
  {
    version: 2,
    name: '2026_11_24_002_sync_core_collection_indexes',
    description: 'Non-destructively ensure compound indexes on Tenant, Unit, Payment, Expense, Property, Invoice, and PaymentTransaction.',
    up: async () => {
      const models = [Tenant, Unit, Payment, Expense, Property, Invoice, PaymentTransaction];
      const results = {};
      for (const m of models) {
        try {
          await m.createIndexes();
          results[m.modelName] = 'synced';
        } catch (err) {
          results[m.modelName] = `warn: ${err.message}`;
        }
      }
      return results;
    }
  }
];

async function runPendingMigrations() {
  const summary = [];
  for (const m of MIGRATIONS) {
    const checksum = crypto.createHash('sha256').update(`${m.version}:${m.name}:${m.description}`).digest('hex').slice(0, 16);
    const existing = await Migration.findOne({ name: m.name }).lean();
    if (existing && existing.status === 'applied') {
      summary.push({ name: m.name, version: m.version, status: 'skipped_already_applied' });
      continue;
    }

    try {
      const meta = await m.up();
      await Migration.findOneAndUpdate(
        { name: m.name },
        {
          $set: {
            version: m.version,
            description: m.description,
            checksum,
            status: 'applied',
            metadata: meta,
            appliedAt: new Date()
          }
        },
        { upsert: true }
      );
      summary.push({ name: m.name, version: m.version, status: 'applied', metadata: meta });
      logger.info('migration_applied', { name: m.name, version: m.version });
    } catch (err) {
      logger.error('migration_failed', { name: m.name, version: m.version, error: err.message });
      await Migration.findOneAndUpdate(
        { name: m.name },
        {
          $set: {
            version: m.version,
            description: m.description,
            checksum,
            status: 'failed',
            metadata: { error: err.message },
            appliedAt: new Date()
          }
        },
        { upsert: true }
      ).catch(() => {});
      throw err;
    }
  }
  return summary;
}

module.exports = {
  MIGRATIONS,
  runPendingMigrations
};
