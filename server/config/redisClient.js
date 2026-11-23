const logger = require('../utils/logger');

let Redis = null;
try {
  Redis = require('ioredis');
} catch {
  Redis = null;
}

let cacheClient = null;
let bullConnection = null;
let lastRedisError = null;
let redisStatus = 'disabled';

function getRedisUrl() {
  return String(process.env.REDIS_URL || '').trim();
}

function getCacheRedisClient() {
  const url = getRedisUrl();
  if (!url || !Redis || process.env.NODE_ENV === 'test') {
    return null;
  }
  if (cacheClient) return cacheClient;

  try {
    cacheClient = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      }
    });

    cacheClient.on('ready', () => {
      redisStatus = 'connected';
      lastRedisError = null;
      logger.info('redis_cache_connected');
    });
    cacheClient.on('error', (err) => {
      redisStatus = 'degraded';
      lastRedisError = err.message;
      logger.warn('redis_cache_error', { error: err.message });
    });
    cacheClient.on('end', () => {
      redisStatus = 'disconnected';
    });

    cacheClient.connect().catch((err) => {
      redisStatus = 'degraded';
      lastRedisError = err.message;
    });
    return cacheClient;
  } catch (err) {
    redisStatus = 'degraded';
    lastRedisError = err.message;
    return null;
  }
}

function getBullMQConnection() {
  const url = getRedisUrl();
  if (!url || !Redis || process.env.NODE_ENV === 'test') {
    return null;
  }
  if (bullConnection) return bullConnection;

  bullConnection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 5000
  });
  bullConnection.on('error', (err) => {
    logger.warn('redis_bullmq_error', { error: err.message });
  });
  return bullConnection;
}

function isRedisHealthy() {
  if (!getRedisUrl()) return false;
  return Boolean(cacheClient && cacheClient.status === 'ready');
}

function getRedisTelemetry() {
  const urlConfigured = Boolean(getRedisUrl());
  return {
    configured: urlConfigured,
    status: urlConfigured ? (cacheClient?.status || redisStatus) : 'not_configured',
    healthy: isRedisHealthy(),
    lastError: lastRedisError
  };
}

async function disconnectRedis() {
  const tasks = [];
  if (cacheClient) {
    tasks.push(cacheClient.quit().catch(() => cacheClient.disconnect?.()));
    cacheClient = null;
  }
  if (bullConnection) {
    tasks.push(bullConnection.quit().catch(() => bullConnection.disconnect?.()));
    bullConnection = null;
  }
  if (tasks.length > 0) await Promise.allSettled(tasks);
}

module.exports = {
  getCacheRedisClient,
  getBullMQConnection,
  isRedisHealthy,
  getRedisTelemetry,
  disconnectRedis
};
