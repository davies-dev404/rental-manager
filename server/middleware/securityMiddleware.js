const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { validateIntaSendConfig } = require('../config/intasendConfig');
const { validatePesapalConfig } = require('../config/pesapalConfig');

const IS_TEST = () => process.env.NODE_ENV === 'test';
const IS_HOSTED_OR_PROD = () =>
  Boolean(
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

/**
 * Centralized JWT secret accessor — never falls back to a hardcoded default.
 */
function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret || secret === 'makaziflow_secret') {
    throw new Error('FATAL SECURITY CONFIG: JWT_SECRET is missing or uses an insecure default.');
  }
  if (IS_HOSTED_OR_PROD() && secret.length < 24) {
    throw new Error('FATAL SECURITY CONFIG: JWT_SECRET must be at least 24 characters in production.');
  }
  return secret;
}

/**
 * Validates critical security environment configuration at server boot.
 */
function validateSecurityConfig() {
  getJwtSecret();
  validateIntaSendConfig();
  validatePesapalConfig();

  const mongoUri = (process.env.MONGODB_URI || '').trim();
  if (IS_HOSTED_OR_PROD()) {
    if (!mongoUri) {
      throw new Error('FATAL SECURITY CONFIG: MONGODB_URI must be configured in production.');
    }
    const usesSrv = mongoUri.startsWith('mongodb+srv://');
    const usesTlsParam = /[?&](tls|ssl)=true/i.test(mongoUri);
    if (!usesSrv && !usesTlsParam) {
      console.warn('⚠️ SECURITY WARNING: MONGODB_URI does not specify mongodb+srv:// or tls=true.');
    }
    if (!(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim()) {
      console.warn('⚠️ SECURITY WARNING: CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured; CAPTCHA enforcement will fail closed after 3 failed logins.');
    }
  }
}

/**
 * Checks whether a value is a strict 24-hex MongoDB ObjectId string.
 */
function isValidObjectId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-fA-F0-9]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Express middleware validating :id (or custom param name) is a valid MongoDB ObjectId.
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params?.[paramName];
    if (!isValidObjectId(val)) {
      return res.status(400).json({ message: 'Invalid resource identifier' });
    }
    next();
  };
}

/**
 * Recursively strips MongoDB query operator keys (`$*`), dotted keys (`a.b`),
 * and prototype-pollution keys (`__proto__`, `constructor`, `prototype`) in-place.
 */
function sanitizeInPlace(target, depth = 0) {
  if (!target || typeof target !== 'object' || depth > 12) return target;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      if (target[i] && typeof target[i] === 'object') {
        sanitizeInPlace(target[i], depth + 1);
      }
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    if (
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype' ||
      key.startsWith('$') ||
      key.includes('.')
    ) {
      delete target[key];
      continue;
    }
    const val = target[key];
    if (val && typeof val === 'object') {
      sanitizeInPlace(val, depth + 1);
    }
  }
  return target;
}

/**
 * Express 5-compatible NoSQL injection & prototype pollution sanitization middleware.
 */
function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') sanitizeInPlace(req.body);
  if (req.params && typeof req.params === 'object') sanitizeInPlace(req.params);
  if (req.query && typeof req.query === 'object') sanitizeInPlace(req.query);
  next();
}

/**
 * Whitelist-pick allowed fields from untrusted input objects to prevent mass assignment.
 */
function pickAllowed(source, allowedFields) {
  const out = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return out;
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      out[field] = source[field];
    }
  }
  return out;
}

/**
 * Escapes user strings before creating RegExp queries (prevents ReDoS / regex injection).
 */
function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapes HTML special characters for user strings embedded into HTML emails.
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates image inputs (`orgLogo`, `Property.image`):
 * - Allows empty string
 * - Allows safe HTTPS URLs (no javascript:/data: injection, <= 2048 chars)
 * - Allows base64 PNG/JPEG/WEBP/GIF data URIs up to maxBytes, verifying magic bytes (blocks SVG/XSS)
 */
function validateSafeImageInput(rawValue, { maxBytes = 1500 * 1024 } = {}) {
  if (rawValue === undefined || rawValue === null) return { valid: true, value: '' };
  const val = String(rawValue).trim();
  if (!val) return { valid: true, value: '' };

  if (/^https:\/\//i.test(val)) {
    if (val.length > 2048 || /[\s"'<>]/.test(val)) {
      return { valid: false, message: 'Invalid HTTPS image URL.' };
    }
    return { valid: true, value: val };
  }

  const dataMatch = val.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!dataMatch) {
    return {
      valid: false,
      message: 'Only HTTPS image URLs or PNG/JPEG/WEBP/GIF images are permitted.'
    };
  }

  const mimeSubtype = dataMatch[1].toLowerCase();
  const base64Clean = dataMatch[2].replace(/\s+/g, '');
  const buf = Buffer.from(base64Clean, 'base64');

  if (buf.length === 0 || buf.length > maxBytes) {
    return {
      valid: false,
      message: `Image exceeds maximum allowed size (${Math.round(maxBytes / 1024)} KB).`
    };
  }

  // Magic-byte signature verification
  const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isGif = buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8';
  const isWebp = buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';

  const matchesDeclared =
    (mimeSubtype === 'png' && isPng) ||
    ((mimeSubtype === 'jpeg' || mimeSubtype === 'jpg') && isJpeg) ||
    (mimeSubtype === 'gif' && isGif) ||
    (mimeSubtype === 'webp' && isWebp);

  if (!matchesDeclared) {
    return { valid: false, message: 'Image file content does not match its declared image type.' };
  }

  return { valid: true, value: `data:image/${mimeSubtype === 'jpg' ? 'jpeg' : mimeSubtype};base64,${base64Clean}` };
}

/**
 * Executes multi-document financial operations inside a MongoDB ACID transaction
 * when running on a replica set (e.g., MongoDB Atlas), with graceful fallback on standalone dev instances.
 */
async function runWithOptionalTransaction(work) {
  const topologyType = mongoose.connection?.client?.topology?.description?.type;
  // Standalone MongoDB instances (e.g., local dev/test) do not support multi-document transactions or retryable transaction writes.
  if (topologyType === 'Single') {
    return await work(null);
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    const msg = String(err?.message || '');
    const isNoReplicaSet =
      err?.code === 20 ||
      err?.code === 263 ||
      msg.includes('Transaction numbers are only allowed on a replica set member') ||
      msg.includes('Sessions are not supported') ||
      msg.includes('does not support retryable writes') ||
      msg.includes('replica set');
    if (isNoReplicaSet) {
      return await work(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS',
  message: { message: 'Too many login attempts from this IP. Please try again in 15 minutes.' }
});

const authOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS',
  message: { message: 'Too many verification requests. Please wait before trying again.' }
});

const authResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS',
  message: { message: 'Too many password reset attempts. Please try again later.' }
});

const paymentCheckoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS',
  message: { message: 'Too many payment requests. Please wait a few minutes and try again.' }
});

const paymentWebhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => IS_TEST() || req.method === 'OPTIONS',
  message: { message: 'Webhook rate limit exceeded.' }
});

module.exports = {
  getJwtSecret,
  validateSecurityConfig,
  isValidObjectId,
  validateObjectId,
  sanitizeRequest,
  pickAllowed,
  escapeRegExp,
  escapeHtml,
  validateSafeImageInput,
  runWithOptionalTransaction,
  authLoginLimiter,
  authOtpLimiter,
  authResetLimiter,
  paymentCheckoutLimiter,
  paymentWebhookLimiter
};
