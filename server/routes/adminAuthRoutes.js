const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const { getOtpEmailBody } = require('../utils/emailTemplates');
const { logAdminAction } = require('../utils/auditLogger');
const {
  getJwtSecret,
  escapeRegExp,
  authLoginLimiter,
  authOtpLimiter
} = require('../middleware/securityMiddleware');
const jwt = require('jsonwebtoken');

const hashOtp = (value) => crypto.createHash('sha256').update(String(value || '').trim()).digest('hex');
const generateOtpCode = () => crypto.randomInt(100000, 1000000).toString();

const generateToken = (id, tokenVersion = 0) =>
  jwt.sign({ id, tv: Number(tokenVersion || 0) }, getJwtSecret(), { expiresIn: '7d' });

const generateRefreshToken = (id, tokenVersion = 0) =>
  jwt.sign({ id, tv: Number(tokenVersion || 0), kind: 'refresh', jti: crypto.randomUUID() }, getJwtSecret(), { expiresIn: '30d' });

const setAuthCookies = (res, token, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (token) {
    res.cookie('msimamizi_jwt', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
  if (refreshToken) {
    res.cookie('msimamizi_refresh', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
};

function isAllowedSuperAdminUser(user) {
  if (!user) return false;
  const superEmails = (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(
    user.role === 'superadmin' ||
    user.isSuperAdmin === true ||
    superEmails.includes((user.email || '').toLowerCase())
  );
}

async function verifyTurnstile(token, reqIp) {
  if (process.env.NODE_ENV === 'test') return true;
  const secretKey = (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim();
  if (!secretKey) return false;
  if (!token || typeof token !== 'string' || token.startsWith('cf-') || token.startsWith('XXXX.DUMMY.TOKEN')) {
    return false;
  }
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (reqIp) formData.append('remoteip', reqIp);
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    const outcome = await result.json();
    return Boolean(outcome?.success);
  } catch {
    return false;
  }
}

// @desc    Standalone Msimamizi Super Admin Login Step 1 (Credentials -> OTP)
// @route   POST /api/admin/auth/login
// @access  Public (Super Admin accounts only)
router.post('/login', authLoginLimiter, async (req, res) => {
  const { email, password, turnstileToken } = req.body || {};
  const reqIp = req.ip || 'unknown';

  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Administrator email and password are required.' });
    }

    const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i') });
    if (!user || !isAllowedSuperAdminUser(user)) {
      await logAdminAction({
        req,
        admin: user || { email: cleanEmail, name: 'Unknown', role: 'anonymous' },
        action: 'MSIMAMIZI_UNAUTHORIZED_LOGIN_ATTEMPT',
        category: 'auth',
        details: `Denied Msimamizi login attempt for ${cleanEmail} from ${reqIp}`,
        status: 'warning'
      });
      return res.status(401).json({ message: 'Invalid administrator credentials.' });
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      return res.status(403).json({ message: 'This administrator account is currently disabled.' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        message: `Administrator account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
        isLocked: true,
        remainingMinutes
      });
    }

    if (user.failedLoginAttempts >= 3) {
      const ok = await verifyTurnstile(turnstileToken, reqIp);
      if (!ok) {
        return res.status(403).json({
          message: 'Security verification required. Complete the CAPTCHA.',
          requireCaptcha: true
        });
      }
    }

    const isMatch = user.password ? await user.matchPassword(password) : false;
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await logAdminAction({
        req,
        admin: user,
        action: 'MSIMAMIZI_LOGIN_FAILED',
        category: 'auth',
        targetType: 'User',
        targetId: String(user._id),
        details: `Incorrect password entered for Msimamizi (${user.email})`,
        status: 'warning'
      });
      return res.status(401).json({
        message: 'Invalid administrator credentials.',
        requireCaptcha: user.failedLoginAttempts >= 3
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    const otp = generateOtpCode();
    user.otp = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    let emailSent = false;
    try {
      await sendEmail({
        email: user.email,
        toName: user.name,
        subject: 'Msimamizi Admin — Your One-Time Password (OTP)',
        message: getOtpEmailBody({
          name: user.name,
          otp,
          title: 'Msimamizi Admin Verification',
          subtitle: 'MakaziFlow Owner Administration Portal',
          instruction: 'Use the verification code below to access Msimamizi.',
          expiryMinutes: 3,
          orgName: 'MakaziFlow · Msimamizi'
        })
      });
      emailSent = true;
    } catch (err) {
      console.error('Msimamizi OTP email failed:', err.message);
    }

    let smsSent = false;
    if (user.phone) {
      try {
        const smsRes = await sendSMS({
          phone: user.phone,
          message: `Your Msimamizi Admin verification code is: ${otp}. Expires in 3 minutes.`
        });
        smsSent = Boolean(smsRes?.success);
      } catch {}
    }

    if (!emailSent && !smsSent) {
      return res.status(503).json({
        message: 'Verification code could not be delivered via email or SMS. Please verify Brevo configuration.',
        emailSent: false,
        smsSent: false
      });
    }

    return res.json({
      requiresOTP: true,
      email: user.email,
      name: user.name,
      emailSent,
      smsSent
    });
  } catch (err) {
    return res.status(500).json({ message: 'Unable to process administrator login.' });
  }
});

// @desc    Standalone Msimamizi Super Admin Login Step 2 (Verify OTP -> Session)
// @route   POST /api/admin/auth/verify-otp
// @access  Public (OTP required, Super Admin accounts only)
router.post('/verify-otp', authOtpLimiter, async (req, res) => {
  const { email, otp } = req.body || {};
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required.' });
    }
    const cleanEmail = String(email).trim();
    const user = await User.findOne({
      email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i'),
      otp: hashOtp(otp),
      otpExpires: { $gt: Date.now() }
    });

    if (!user || !isAllowedSuperAdminUser(user)) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }
    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      return res.status(403).json({ message: 'Administrator account is disabled.' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    user.accountStatus = 'active';
    user.lastLoginAt = new Date();

    const tv = user.tokenVersion || 0;
    const accessToken = generateToken(user._id, tv);
    const refreshToken = generateRefreshToken(user._id, tv);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const nowMs = Date.now();
    user.refreshTokens = (Array.isArray(user.refreshTokens) ? user.refreshTokens : [])
      .filter((t) => !t.expiresAt || new Date(t.expiresAt).getTime() > nowMs);
    user.refreshTokens.push({
      tokenHash,
      createdAt: new Date(),
      expiresAt: new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
    });
    if (user.refreshTokens.length > 10) user.refreshTokens.shift();
    user.refreshToken = tokenHash;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    await logAdminAction({
      req,
      admin: user,
      action: 'MSIMAMIZI_ADMIN_LOGIN',
      category: 'auth',
      targetType: 'User',
      targetId: String(user._id),
      details: `Super Admin ${user.email} authenticated via Msimamizi`,
      status: 'success'
    });

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'superadmin',
      isSuperAdmin: true,
      avatar: user.avatar,
      token: accessToken,
      refreshToken,
      hasCompletedOnboarding: true
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify administrator OTP.' });
  }
});

// @desc    Resend Msimamizi Login OTP
// @route   POST /api/admin/auth/resend-otp
router.post('/resend-otp', authOtpLimiter, async (req, res) => {
  const { email } = req.body || {};
  try {
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(String(email).trim())}$`, 'i') });
    if (!user || !isAllowedSuperAdminUser(user)) {
      return res.json({ success: true, message: 'If an administrator account exists, a new code has been sent.' });
    }

    const otp = generateOtpCode();
    user.otp = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    let emailSent = false;
    try {
      await sendEmail({
        email: user.email,
        toName: user.name,
        subject: 'Msimamizi Admin — Your One-Time Password (OTP)',
        message: getOtpEmailBody({
          name: user.name,
          otp,
          title: 'Msimamizi Admin Verification',
          subtitle: 'MakaziFlow Owner Administration Portal',
          instruction: 'Use the fresh verification code below to access Msimamizi.',
          expiryMinutes: 3,
          orgName: 'MakaziFlow · Msimamizi'
        })
      });
      emailSent = true;
    } catch {}

    let smsSent = false;
    if (user.phone) {
      try {
        const r = await sendSMS({ phone: user.phone, message: `Your Msimamizi Admin code is: ${otp}` });
        smsSent = Boolean(r?.success);
      } catch {}
    }

    res.json({ success: true, emailSent, smsSent });
  } catch {
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
});

router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('msimamizi_jwt', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  res.clearCookie('msimamizi_refresh', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  res.json({ success: true });
});

module.exports = router;
