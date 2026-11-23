const crypto = require('crypto');
const FeatureFlag = require('../models/FeatureFlag');

const DEFAULT_FLAGS = [
  {
    key: 'realtime_socket_updates',
    name: 'Real-Time Socket.IO Updates',
    description: 'Push authenticated live payment and unit availability updates over WebSockets.',
    enabled: true,
    rolloutPercentage: 100,
    category: 'realtime'
  },
  {
    key: 'payment_multi_gateway_failover',
    name: 'Payment Multi-Gateway Controls',
    description: 'Controls optional bank adapter and backup gateway toggles.',
    enabled: true,
    rolloutPercentage: 100,
    category: 'payments'
  },
  {
    key: 'advanced_portfolio_analytics',
    name: 'Advanced Portfolio Analytics',
    description: 'Enable predictive arrears and occupancy insights for landlords.',
    enabled: true,
    rolloutPercentage: 100,
    category: 'analytics'
  },
  {
    key: 'automated_sms_dunning',
    name: 'Automated Overdue SMS Reminders',
    description: 'Enable scheduled overdue rent SMS notifications.',
    enabled: false,
    rolloutPercentage: 0,
    category: 'notifications'
  }
];

const flagCache = new Map();
let cacheExpiresAt = 0;

async function seedDefaultFeatureFlags() {
  for (const def of DEFAULT_FLAGS) {
    await FeatureFlag.findOneAndUpdate(
      { key: def.key },
      { $setOnInsert: def },
      { upsert: true }
    );
  }
}

async function listFeatureFlags() {
  await seedDefaultFeatureFlags();
  return await FeatureFlag.find({}).sort({ category: 1, key: 1 }).lean();
}

function deterministicBucket(flagKey, landlordId) {
  const hash = crypto.createHash('sha256').update(`${flagKey}:${landlordId}`).digest();
  return hash.readUInt16BE(0) % 100;
}

async function isFeatureEnabled(key, landlordId = null) {
  const cleanKey = String(key || '').trim().toLowerCase();
  if (!cleanKey) return false;

  if (Date.now() > cacheExpiresAt) {
    const flags = await FeatureFlag.find({}).lean();
    flagCache.clear();
    for (const f of flags) flagCache.set(f.key, f);
    cacheExpiresAt = Date.now() + 15000;
  }

  const flag = flagCache.get(cleanKey);
  if (!flag || !flag.enabled) return false;

  if (landlordId && Array.isArray(flag.targetLandlordIds) && flag.targetLandlordIds.length > 0) {
    if (flag.targetLandlordIds.some((id) => String(id) === String(landlordId))) return true;
  }

  const pct = Number(flag.rolloutPercentage ?? 100);
  if (pct >= 100) return true;
  if (pct <= 0 || !landlordId) return false;

  return deterministicBucket(cleanKey, String(landlordId)) < pct;
}

function invalidateFlagCache() {
  cacheExpiresAt = 0;
  flagCache.clear();
}

module.exports = {
  seedDefaultFeatureFlags,
  listFeatureFlags,
  isFeatureEnabled,
  invalidateFlagCache
};
