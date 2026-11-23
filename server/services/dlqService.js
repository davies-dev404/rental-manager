const DeadLetterJob = require('../models/DeadLetterJob');
const logger = require('../utils/logger');

const REPLAY_HANDLERS = new Map();

function registerDeadLetterHandler(jobKey, fn) {
  REPLAY_HANDLERS.set(jobKey, fn);
}

async function recordDeadLetter({
  queueName,
  jobName,
  jobId = '',
  landlordId = null,
  payload = {},
  error,
  attempts = 1,
  retryHistory = []
}) {
  const errMsg = String(error?.message || error || 'Unknown background failure');
  const doc = await DeadLetterJob.create({
    queueName,
    jobName,
    jobId: String(jobId || ''),
    landlordId: landlordId || undefined,
    payload,
    errorMessage: errMsg,
    errorCode: String(error?.code || ''),
    attempts,
    retryHistory: Array.isArray(retryHistory) && retryHistory.length > 0
      ? retryHistory
      : [{ attempt: attempts, error: errMsg, failedAt: new Date() }],
    status: 'dead'
  });

  logger.error('dead_letter_recorded', {
    dlqId: String(doc._id),
    queueName,
    jobName,
    attempts,
    error: errMsg
  });
  return doc;
}

async function replayDeadLetter(dlqId, actorId = null) {
  const job = await DeadLetterJob.findById(dlqId);
  if (!job) {
    const err = new Error('Dead letter job not found');
    err.statusCode = 404;
    throw err;
  }

  const handler = REPLAY_HANDLERS.get(`${job.queueName}:${job.jobName}`) || REPLAY_HANDLERS.get(job.jobName);
  if (!handler) {
    const err = new Error(`No replay handler registered for ${job.queueName}:${job.jobName}`);
    err.statusCode = 400;
    throw err;
  }

  try {
    const result = await handler(job.payload || {});
    job.status = 'replayed';
    job.replayedAt = new Date();
    if (actorId) job.replayedBy = actorId;
    job.resolutionNotes = 'Successfully replayed by administrator';
    await job.save();
    return { job, result };
  } catch (err) {
    job.attempts += 1;
    job.errorMessage = err.message;
    job.retryHistory.push({ attempt: job.attempts, error: err.message, failedAt: new Date() });
    await job.save();
    throw err;
  }
}

module.exports = {
  registerDeadLetterHandler,
  recordDeadLetter,
  replayDeadLetter
};
