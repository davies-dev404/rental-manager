const os = require('os');
const crypto = require('crypto');
const CronLock = require('../models/CronLock');
const { getCacheRedisClient, isRedisHealthy } = require('../config/redisClient');
const logger = require('../utils/logger');

const HOST_TAG = `${os.hostname()}-${process.pid}`;
let indexPromise = null;

async function ensureLockIndex() {
  if (!indexPromise) {
    indexPromise = CronLock.collection
      .createIndex({ jobName: 1 }, { unique: true, background: false })
      .catch(() => {
        indexPromise = null;
      });
  }
  await indexPromise;
}

function resetLockIndexCache() {
  indexPromise = null;
}

function generateLockToken() {
  return `${HOST_TAG}-${crypto.randomBytes(8).toString('hex')}`;
}

async function acquireLock(jobName, ttlMs = 60000) {
  const lockToken = generateLockToken();
  const redis = getCacheRedisClient();
  if (redis && isRedisHealthy()) {
    try {
      const ok = await redis.set(`mf:lock:${jobName}`, lockToken, 'PX', ttlMs, 'NX');
      if (ok === 'OK') return { backend: 'redis', acquired: true, lockToken };
      return { backend: 'redis', acquired: false, lockToken };
    } catch (err) {
      logger.warn('distributed_lock_redis_fallback', { jobName, error: err.message });
    }
  }

  await ensureLockIndex();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  try {
    const claimed = await CronLock.findOneAndUpdate(
      {
        jobName,
        expiresAt: { $lte: now }
      },
      { $set: { ownerId: lockToken, lockedAt: now, expiresAt } },
      { upsert: true, returnDocument: 'after' }
    );
    return {
      backend: 'mongodb',
      acquired: Boolean(claimed && claimed.ownerId === lockToken),
      lockToken
    };
  } catch (err) {
    if (err?.code === 11000) {
      return { backend: 'mongodb', acquired: false, lockToken };
    }
    throw err;
  }
}

async function releaseLock(jobName, backend, lockToken) {
  if (backend === 'redis') {
    const redis = getCacheRedisClient();
    if (redis && isRedisHealthy()) {
      const current = await redis.get(`mf:lock:${jobName}`).catch(() => null);
      if (current === lockToken) {
        await redis.del(`mf:lock:${jobName}`).catch(() => {});
      }
      return;
    }
  }
  await CronLock.deleteOne({ jobName, ownerId: lockToken }).catch(() => {});
}

async function withDistributedLock(jobName, ttlMs, fn) {
  const lock = await acquireLock(jobName, ttlMs);
  if (!lock.acquired) {
    return { skipped: true, reason: 'lock_held_by_another_instance' };
  }
  try {
    const result = await fn();
    return { skipped: false, backend: lock.backend, result };
  } finally {
    await releaseLock(jobName, lock.backend, lock.lockToken);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  withDistributedLock,
  resetLockIndexCache
};
