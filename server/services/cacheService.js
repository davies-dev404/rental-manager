const { getCacheRedisClient, isRedisHealthy } = require('../config/redisClient');
const logger = require('../utils/logger');

const CACHE_VERSION = 'v1';
const MEMORY_MAX_ENTRIES = 500;
const memoryCache = new Map();

const telemetry = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
  errors: 0
};

function buildLandlordCacheKey(resource, landlordId, suffix = '') {
  if (!landlordId) {
    throw new Error('Strict cache isolation requires a non-empty landlordId.');
  }
  const cleanRes = String(resource).replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanLandlord = String(landlordId).replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanSuffix = suffix ? `:${String(suffix).replace(/[^a-zA-Z0-9_.:-]/g, '_')}` : '';
  return `mf:${CACHE_VERSION}:landlord:${cleanLandlord}:${cleanRes}${cleanSuffix}`;
}

function pruneMemoryCache() {
  const now = Date.now();
  for (const [k, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) memoryCache.delete(k);
  }
  while (memoryCache.size > MEMORY_MAX_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryCache.delete(oldestKey);
  }
}

async function getCached(key) {
  const redis = getCacheRedisClient();
  if (redis && isRedisHealthy()) {
    try {
      const raw = await redis.get(key);
      if (raw !== null) {
        telemetry.hits += 1;
        return JSON.parse(raw);
      }
      telemetry.misses += 1;
      return null;
    } catch (err) {
      telemetry.errors += 1;
      logger.warn('cache_redis_get_fallback', { key, error: err.message });
    }
  }

  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    telemetry.hits += 1;
    return entry.value;
  }
  if (entry) memoryCache.delete(key);
  telemetry.misses += 1;
  return null;
}

async function setCached(key, value, ttlSeconds = 60) {
  const ttl = Math.max(5, Number(ttlSeconds) || 60);
  telemetry.sets += 1;

  pruneMemoryCache();
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000
  });

  const redis = getCacheRedisClient();
  if (redis && isRedisHealthy()) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      telemetry.errors += 1;
      logger.warn('cache_redis_set_fallback', { key, error: err.message });
    }
  }
}

async function invalidateLandlordCache(landlordId) {
  if (!landlordId) return;
  telemetry.invalidations += 1;
  const prefix = `mf:${CACHE_VERSION}:landlord:${String(landlordId)}:`;

  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) memoryCache.delete(k);
  }

  const redis = getCacheRedisClient();
  if (redis && isRedisHealthy()) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      telemetry.errors += 1;
      logger.warn('cache_redis_invalidate_warn', { landlordId: String(landlordId), error: err.message });
    }
  }
}

function getCacheTelemetry() {
  return {
    ...telemetry,
    memoryEntries: memoryCache.size,
    backend: isRedisHealthy() ? 'redis+memory' : 'memory_fallback'
  };
}

module.exports = {
  buildLandlordCacheKey,
  getCached,
  setCached,
  invalidateLandlordCache,
  getCacheTelemetry
};
