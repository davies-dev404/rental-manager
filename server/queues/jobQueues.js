const { getBullMQConnection } = require('../config/redisClient');
const { recordDeadLetter } = require('../services/dlqService');
const logger = require('../utils/logger');

let Queue = null;
try {
  ({ Queue } = require('bullmq'));
} catch {
  Queue = null;
}

const QUEUE_NAMES = ['notifications', 'invoices', 'reconciliation', 'reports'];
const activeQueues = new Map();
const inlineHandlers = new Map();

function getQueue(name) {
  const conn = getBullMQConnection();
  if (!conn || !Queue || process.env.ENABLE_BULLMQ_WORKERS !== 'true') {
    return null;
  }
  if (!activeQueues.has(name)) {
    const q = new Queue(name, {
      connection: conn,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 }
      }
    });
    activeQueues.set(name, q);
  }
  return activeQueues.get(name);
}

function registerInlineJobHandler(queueName, jobName, handler) {
  inlineHandlers.set(`${queueName}:${jobName}`, handler);
}

/**
 * Enqueues a background job onto BullMQ when Redis+Worker mode is active,
 * otherwise executes safely asynchronously with DLQ capture on failure.
 */
async function enqueueBackgroundJob(queueName, jobName, payload = {}, opts = {}) {
  const q = getQueue(queueName);
  if (q) {
    const job = await q.add(jobName, payload, {
      priority: opts.priority || 5,
      jobId: opts.jobId || undefined
    });
    return { mode: 'bullmq', queueName, jobId: String(job.id) };
  }

  const handler = inlineHandlers.get(`${queueName}:${jobName}`);
  if (!handler) {
    logger.warn('queue_no_handler_registered', { queueName, jobName });
    return { mode: 'noop', queueName };
  }

  setImmediate(async () => {
    try {
      await handler(payload);
    } catch (err) {
      await recordDeadLetter({
        queueName,
        jobName,
        landlordId: payload?.landlordId || null,
        payload,
        error: err,
        attempts: 1
      }).catch(() => {});
    }
  });

  return { mode: 'inline_async_fallback', queueName };
}

async function getQueuesTelemetry() {
  const conn = getBullMQConnection();
  const enabled = Boolean(conn && Queue && process.env.ENABLE_BULLMQ_WORKERS === 'true');
  if (!enabled) {
    return {
      mode: 'inline_fallback',
      bullmqEnabled: false,
      queues: QUEUE_NAMES.map((name) => ({ name, waiting: 0, active: 0, failed: 0 }))
    };
  }

  const summaries = [];
  for (const name of QUEUE_NAMES) {
    try {
      const q = getQueue(name);
      const counts = await q.getJobCounts('waiting', 'active', 'failed', 'delayed');
      summaries.push({ name, ...counts });
    } catch (err) {
      summaries.push({ name, error: err.message });
    }
  }
  return { mode: 'bullmq', bullmqEnabled: true, queues: summaries };
}

async function closeQueues() {
  for (const q of activeQueues.values()) {
    await q.close().catch(() => {});
  }
  activeQueues.clear();
}

module.exports = {
  QUEUE_NAMES,
  getQueue,
  registerInlineJobHandler,
  enqueueBackgroundJob,
  getQueuesTelemetry,
  closeQueues
};
