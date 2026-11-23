const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { getBullMQConnection, disconnectRedis } = require('./config/redisClient');
const { recordDeadLetter } = require('./services/dlqService');
const logger = require('./utils/logger');

let Worker = null;
try {
  ({ Worker } = require('bullmq'));
} catch {
  Worker = null;
}

const JOB_PROCESSORS = {
  notifications: async (job) => {
    if (job.name === 'send_email') {
      const sendEmail = require('./utils/sendEmail');
      return await sendEmail(job.data);
    }
    if (job.name === 'send_sms') {
      const sendSMS = require('./utils/sendSMS');
      return await sendSMS(job.data);
    }
  },
  reconciliation: async (job) => {
    const PaymentService = require('./services/payments/PaymentService');
    if (job.name === 'verify_transaction' && job.data?.transactionId) {
      return await PaymentService.verifyTransactionStatus(job.data.transactionId);
    }
  }
};

async function startWorkers() {
  const conn = getBullMQConnection();
  if (!conn || !Worker) {
    logger.error('worker_requires_redis', { message: 'REDIS_URL and bullmq are required to start persistent background workers.' });
    process.exit(1);
  }

  if (process.env.MONGODB_URI && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 5, minPoolSize: 1 });
  }

  const workers = [];
  for (const [queueName, processor] of Object.entries(JOB_PROCESSORS)) {
    const w = new Worker(queueName, processor, {
      connection: conn,
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5)
    });

    w.on('failed', async (job, err) => {
      if (job && job.attemptsMade >= (job.opts?.attempts || 1)) {
        await recordDeadLetter({
          queueName,
          jobName: job.name,
          jobId: String(job.id),
          landlordId: job.data?.landlordId || null,
          payload: job.data,
          error: err,
          attempts: job.attemptsMade
        }).catch(() => {});
      }
    });

    workers.push(w);
  }

  logger.info('bullmq_workers_started', { queues: Object.keys(JOB_PROCESSORS) });

  const shutdown = async (signal) => {
    logger.info('worker_shutdown_started', { signal });
    await Promise.allSettled(workers.map((w) => w.close()));
    await disconnectRedis();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close().catch(() => {});
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startWorkers().catch((err) => {
    logger.error('worker_boot_failed', { error: err.message });
    process.exit(1);
  });
}

module.exports = { startWorkers, JOB_PROCESSORS };
