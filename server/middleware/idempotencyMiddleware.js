const crypto = require('crypto');
const IdempotencyRecord = require('../models/IdempotencyRecord');

function hashRequestBody(body) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(body || {}))
    .digest('hex');
}

/**
 * Enforces optional/mandatory Idempotency-Key persistence for critical state-changing routes.
 * When `Idempotency-Key` header (or body.idempotencyKey) is supplied:
 * - Replays exact stored statusCode + responseBody if already completed with matching payload hash.
 * - Returns 409 if an identical request is currently in-flight or if key was reused with a different payload.
 */
function idempotencyMiddleware(scope, { required = false } = {}) {
  return async (req, res, next) => {
    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
    const cleanKey = String(rawKey || '').trim().slice(0, 128);

    if (!cleanKey) {
      if (required) {
        return res.status(400).json({ message: 'Idempotency-Key header is required for this operation.' });
      }
      return next();
    }

    const userPart = req.user?._id ? String(req.user._id) : 'anon';
    const compositeKey = `${scope}:${userPart}:${cleanKey}`;
    const requestHash = hashRequestBody(req.body);

    try {
      const existing = await IdempotencyRecord.findOne({ compositeKey }).lean();
      if (existing) {
        if (existing.requestHash !== requestHash) {
          return res.status(409).json({
            code: 'IDEMPOTENCY_KEY_MISMATCH',
            message: 'Idempotency-Key was already used with a different request payload.'
          });
        }
        if (existing.status === 'processing') {
          return res.status(409).json({
            code: 'IDEMPOTENCY_IN_FLIGHT',
            message: 'Duplicate request is currently being processed. Please wait.'
          });
        }
        if (existing.status === 'completed') {
          res.setHeader('X-Idempotent-Replay', 'true');
          return res.status(existing.statusCode || 200).json(existing.responseBody);
        }
      }

      await IdempotencyRecord.findOneAndUpdate(
        { compositeKey },
        {
          $setOnInsert: {
            compositeKey,
            idempotencyKey: cleanKey,
            scope,
            userId: req.user?._id || undefined,
            requestHash,
            status: 'processing',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          code: 'IDEMPOTENCY_CONCURRENT',
          message: 'Concurrent duplicate request detected.'
        });
      }
      return next(err);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      const isSuccess = statusCode < 500;
      IdempotencyRecord.updateOne(
        { compositeKey },
        isSuccess
          ? { $set: { status: 'completed', statusCode, responseBody: body } }
          : { $set: { status: 'failed', statusCode, responseBody: body } }
      ).catch(() => {});
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  idempotencyMiddleware
};
