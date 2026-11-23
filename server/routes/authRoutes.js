const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { protect } = require('../middleware/authMiddleware');
const {
  getJwtSecret,
  escapeRegExp,
  authLoginLimiter,
  authOtpLimiter,
  authResetLimiter
} = require('../middleware/securityMiddleware');
const { validatePassword } = require('../utils/passwordPolicy');

const hashOtp = (value) => crypto.createHash('sha256').update(String(value || '').trim()).digest('hex');

// 1. Persistent Auth: 7-day access token + 30-day refresh token + httpOnly secure cookies (with tokenVersion binding)
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tv: Number(tokenVersion || 0) }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

const generateRefreshToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tv: Number(tokenVersion || 0), kind: 'refresh' }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

const setAuthCookies = (res, token, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (token) {
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
};

const clearAuthCookies = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('jwt', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
};

const logActivity = require('../utils/logActivity');
const { logAdminAction } = require('../utils/auditLogger');
const { seedDemoDataForUser, clearDemoDataForUser } = require('../utils/seedDemoData');
const { getOtpEmailBody, getEmailTemplate } = require('../utils/emailTemplates');

// Branded email header — corporate banner, centered layout
const getEmailHeader = () => {
  const logoUrl = 'https://raw.githubusercontent.com/davies-dev404/Rental-Manager/main/client/src/assets/logo.png';
  return `
    <div style="margin-bottom:28px;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(13,34,64,0.12);">
      <!-- Dark navy brand banner -->
      <div style="background:linear-gradient(135deg,#0d2240 0%,#163354 60%,#1a4068 100%);padding:32px 32px 24px 32px;text-align:center;">
        <!-- Circular avatar with teal ring, centered -->
        <div style="display:inline-block;padding:3px;border-radius:50%;background:linear-gradient(135deg,#00a99d,#00c9b8);box-shadow:0 0 0 4px rgba(0,169,157,0.20);margin-bottom:16px;">
          <img
            src="${logoUrl}"
            alt="MakaziFlow"
            width="72"
            height="72"
            style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;background:#fff;border:3px solid #fff;"
            onerror="this.style.display='none'"
          />
        </div>
        <!-- Brand name, centered -->
        <div style="font-size:28px;font-weight:900;letter-spacing:-0.5px;line-height:1;color:#ffffff;margin-bottom:7px;font-family:Georgia,serif;">
          Makazi<span style="color:#00d4c8;">Flow</span>
        </div>
        <!-- Tagline, centered -->
        <div style="font-size:11px;color:#94b8d4;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;font-family:Arial,sans-serif;">
          Manage Properties &nbsp;·&nbsp; Effortlessly
        </div>
      </div>
      <!-- Teal accent stripe -->
      <div style="height:4px;background:linear-gradient(90deg,#00a99d 0%,#00d4c8 50%,#00a99d 100%);"></div>
    </div>
  `;
};

// Cloudflare Turnstile token verification helper (strict, fail-closed in production)
const verifyCloudflareTurnstile = async (token, reqIp) => {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  const secretKey = (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim();
  if (!secretKey) {
    return false;
  }
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
  } catch (err) {
    console.warn('Cloudflare Turnstile verification warning:', err.message);
    return false;
  }
};

// Generate cryptographically random 6-digit OTP code
const generateOtpCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLoginLimiter, async (req, res) => {
  const { email, password, turnstileToken } = req.body;
  const reqIp = req.ip || 'unknown';

  try {
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail || !password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ 
      email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i') 
    });

    if (!user) {
      await logActivity('System', 'Login Failed', `Failed login attempt from ${reqIp}`, 'auth', 'warning');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: user.suspendedReason
          ? `Account suspended: ${user.suspendedReason}`
          : 'Your account has been suspended. Please contact support.'
      });
    }

    if (user.accountStatus === 'deactivated') {
      return res.status(403).json({
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This account has been deactivated. Please contact platform support.'
      });
    }

    // 4. Brute Force Protection: Check if account is temporarily locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({ 
        message: `Account temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        isLocked: true,
        remainingMinutes
      });
    }

    // Cloudflare Turnstile CAPTCHA verification after 3 failed attempts
    if (user.failedLoginAttempts >= 3) {
      const captchaValid = await verifyCloudflareTurnstile(turnstileToken, reqIp);
      if (!captchaValid) {
        return res.status(403).json({
          message: 'Security verification required. Please complete the CAPTCHA.',
          requireCaptcha: true
        });
      }
    }

    const isMatch = user.password ? await user.matchPassword(password) : false;
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        user.failedLoginAttempts = 0;
        await user.save();

        // Send Security Alert Email
        try {
          await sendEmail({
            email: user.email,
            toName: user.name,
            subject: 'Security Alert: MakaziFlow Account Temporarily Locked',
            message: getEmailTemplate(
              'Security Alert',
              `<p style="color:#f8fafc;font-size:15px;font-weight:700;margin:0 0 10px 0;">Hello ${user.name || 'User'},</p>
               <p style="color:#cbd5e1;font-size:13.5px;line-height:1.6;margin:0 0 16px 0;">We detected <strong>5 consecutive failed login attempts</strong> on your MakaziFlow account.</p>
               <div style="background-color:#2a151c;border:1px solid #7f1d1d;border-radius:10px;padding:14px 16px;color:#fecdd3;font-size:12.5px;line-height:1.5;text-align:center;">
                 For your protection, your account has been <strong>temporarily locked for 15 minutes</strong>. If this was not you, please reset your password immediately.
               </div>`,
              { orgName: 'MakaziFlow' },
              { heroTitle: 'Security Alert', heroSubtitle: 'Temporary account protection triggered', heroIcon: '!' }
            )
          });
        } catch (emailErr) {
          console.error('Security alert email failed:', emailErr.message);
        }

        await logActivity(user, 'Account Locked', `Account temporarily locked after 5 failed attempts from ${reqIp}`, 'auth', 'warning');

        return res.status(423).json({
          message: 'Account temporarily locked for 15 minutes due to 5 consecutive failed login attempts. A security alert email was sent to your inbox.',
          isLocked: true
        });
      }

      await user.save();
      await logActivity(user, 'Login Failed', `Failed login attempt for ${user.email}`, 'auth', 'warning');

      return res.status(401).json({
        message: 'Invalid email or password',
        requireCaptcha: user.failedLoginAttempts >= 3
      });
    }

    // Password matched: reset failed login attempts counter
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Generate a 6-digit login OTP (stored hashed in DB, valid for 3 minutes)
    const loginOtp = generateOtpCode();
    user.otp = hashOtp(loginOtp);
    user.otpExpires = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    // Send OTP via email (SHA-style layout with MakaziFlow colors)
    let emailSent = false;
    let emailError = null;
    try {
      await sendEmail({
        email: user.email,
        toName: user.name,
        subject: 'MakaziFlow — Your One-Time Password (OTP)',
        message: getOtpEmailBody({
          name: user.name,
          otp: loginOtp,
          title: 'Your One-Time Password (OTP)',
          subtitle: 'Secure verification for your account',
          instruction: 'Use the verification code below to complete your sign-in securely.',
          expiryMinutes: 3
        })
      });
      emailSent = true;
      console.log(`📧 Login OTP email dispatched to ${user.email}`);
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('Login OTP email failed:', emailErr.message);
    }

    let smsSent = false;
    if (user.phone) {
      try {
        const smsRes = await sendSMS({
          phone: user.phone,
          message: `Your MakaziFlow login verification code is: ${loginOtp}. Expires in 3 minutes.`
        });
        smsSent = Boolean(smsRes?.success);
        if (smsSent) console.log(`📱 Login OTP SMS dispatched via Brevo to ${user.phone}`);
      } catch (smsErr) {
        console.warn('Login OTP SMS dispatch failed (non-fatal):', smsErr.message);
      }
    }

    await logActivity(user, 'Login OTP Sent', `Login OTP sent to ${user.email} (Email: ${emailSent ? 'Sent' : 'Failed'}${smsSent ? ', SMS: Sent' : ''})`, 'auth', (emailSent || smsSent) ? 'info' : 'warning');

    if (!emailSent && !smsSent) {
      return res.status(503).json({
        message: 'Verification code could not be delivered via email or SMS. Please try again shortly.',
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
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Unable to process login request' });
  }
});

router.post('/resend-login-otp', authOtpLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const cleanEmail = String(email || '').trim();
    const user = await User.findOne({ 
      email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i') 
    });
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a new verification code has been sent.'
      });
    }

    // Generate fresh 6-digit OTP (stored hashed, 3 minutes)
    const loginOtp = generateOtpCode();
    user.otp = hashOtp(loginOtp);
    user.otpExpires = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    // Send OTP via email (SHA-style layout with MakaziFlow colors)
    let emailSent = false;
    let emailError = null;
    try {
      await sendEmail({
        email: user.email,
        toName: user.name,
        subject: 'MakaziFlow — Your One-Time Password (OTP)',
        message: getOtpEmailBody({
          name: user.name,
          otp: loginOtp,
          title: 'Your One-Time Password (OTP)',
          subtitle: 'Secure verification for your account',
          instruction: 'Use the verification code below to complete your sign-in securely.',
          expiryMinutes: 3
        })
      });
      emailSent = true;
      console.log(`📧 Login OTP email resent to ${user.email}`);
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('Resend login OTP email failed:', emailErr.message);
    }

    let smsSent = false;
    if (user.phone) {
      try {
        const smsRes = await sendSMS({
          phone: user.phone,
          message: `Your MakaziFlow login verification code is: ${loginOtp}. Expires in 3 minutes.`
        });
        smsSent = Boolean(smsRes?.success);
        if (smsSent) console.log(`📱 Login OTP SMS resent via Brevo to ${user.phone}`);
      } catch (smsErr) {
        console.warn('Resend login OTP SMS failed (non-fatal):', smsErr.message);
      }
    }

    await logActivity(user, 'Login OTP Resent', `Login OTP resent to ${user.email} (Email: ${emailSent ? 'Sent' : 'Failed'}${smsSent ? ', SMS: Sent' : ''})`, 'auth', (emailSent || smsSent) ? 'info' : 'warning');

    if (!emailSent && !smsSent) {
      return res.status(503).json({
        success: false,
        message: 'Verification code delivery failed. Please try again shortly.'
      });
    }

    return res.json({
      success: true,
      message: 'If an account exists for that email, a new verification code has been sent.',
      emailSent,
      smsSent
    });
  } catch (error) {
    console.error('Resend login OTP error:', error.message);
    res.status(500).json({ message: 'Unable to process verification request' });
  }
});

// @desc    Verify login OTP and return token
// @route   POST /api/auth/verify-login-otp
// @access  Public
router.post('/verify-login-otp', authOtpLimiter, async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const cleanEmail = String(email || '').trim();
    const cleanOtp = String(otp || '').trim();
    const hashedInputOtp = hashOtp(cleanOtp);

    const user = await User.findOne({
      email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i'),
      otp: hashedInputOtp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      return res.status(403).json({
        message: user.accountStatus === 'suspended'
          ? (user.suspendedReason ? `Account suspended: ${user.suspendedReason}` : 'Your account is suspended.')
          : 'This account has been deactivated.'
      });
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    if (!user.isVerified) user.isVerified = true;
    user.accountStatus = 'active';
    user.lastLoginAt = new Date();

    // 1. Multi-Device Sessions: access token + Multi-device refresh tokens bound to tokenVersion
    const tv = user.tokenVersion || 0;
    const accessToken = generateToken(user._id, tv);
    const refreshToken = generateRefreshToken(user._id, tv);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const nowMs = Date.now();
    user.refreshTokens = (Array.isArray(user.refreshTokens) ? user.refreshTokens : [])
      .filter(t => !t.expiresAt || new Date(t.expiresAt).getTime() > nowMs);
    user.refreshTokens.push({
      tokenHash,
      createdAt: new Date(),
      expiresAt: new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
    });
    if (user.refreshTokens.length > 10) {
      user.refreshTokens.shift();
    }
    user.refreshToken = tokenHash;
    await user.save();

    // Set httpOnly secure cookies
    setAuthCookies(res, accessToken, refreshToken);

    await logActivity(user, 'User Logged In', `User ${user.name} completed OTP login`, 'auth', 'success');

    const superEmails = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isSuperAdmin = Boolean(user.isSuperAdmin || user.role === 'superadmin' || superEmails.includes((user.email || '').toLowerCase()));

    if (isSuperAdmin) {
      await logAdminAction({
        req,
        admin: user,
        action: 'SUPERADMIN_LOGIN',
        category: 'auth',
        targetType: 'User',
        targetId: String(user._id),
        details: `Super Admin ${user.email} signed in successfully`,
        status: 'success'
      });
    }

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin,
      avatar: user.avatar,
      token: accessToken,
      refreshToken: refreshToken,
      twoFactorEnabled: user.twoFactorEnabled,
      hasCompletedOnboarding: Boolean(user.hasCompletedOnboarding),
      onboardingRole: user.onboardingRole || 'landlord',
      unitsCount: user.unitsCount || 0,
      subscriptionTier: user.subscriptionTier || 'starter',
      isDemoMode: Boolean(user.isDemoMode)
    });
  } catch (error) {
    console.error('Verify login OTP error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Refresh access token (Multi-device concurrent session rotation + reuse detection)
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', authOtpLimiter, async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(incomingToken, getJwtSecret());
    const user = await User.findById(decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session expired or user not found' });
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Account access has been restricted. Please contact support.' });
    }

    if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.tokenVersion || 0)) {
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Session has been revoked. Please sign in again.' });
    }

    const incomingHashed = crypto.createHash('sha256').update(incomingToken).digest('hex');
    const nowMs = Date.now();
    const tokenIndex = (user.refreshTokens || []).findIndex(
      t => t.tokenHash === incomingHashed && (!t.expiresAt || new Date(t.expiresAt).getTime() > nowMs)
    );
    const isLegacyMatch = user.refreshToken === incomingHashed;

    if (tokenIndex === -1 && !isLegacyMatch) {
      // Refresh token reuse / theft mitigation: revoke all active sessions for this user
      user.refreshTokens = [];
      user.refreshToken = undefined;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Session expired on this device. Please sign in again.' });
    }

    // Rotate this specific session token while keeping other device sessions intact
    const tv = user.tokenVersion || 0;
    const newAccessToken = generateToken(user._id, tv);
    const newRefreshToken = generateRefreshToken(user._id, tv);
    const newHashed = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    user.refreshTokens = (Array.isArray(user.refreshTokens) ? user.refreshTokens : [])
      .filter(t => !t.expiresAt || new Date(t.expiresAt).getTime() > nowMs);

    const newEntry = {
      tokenHash: newHashed,
      createdAt: new Date(),
      expiresAt: new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
    };
    if (tokenIndex !== -1 && tokenIndex < user.refreshTokens.length) {
      user.refreshTokens[tokenIndex] = newEntry;
    } else {
      user.refreshTokens.push(newEntry);
    }
    user.refreshToken = newHashed;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
});

// @desc    Logout & revoke session (Multi-device safe)
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', async (req, res) => {
  try {
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
    if (incomingToken) {
      const incomingHashed = crypto.createHash('sha256').update(incomingToken).digest('hex');
      const user = await User.findOne({
        $or: [
          { 'refreshTokens.tokenHash': incomingHashed },
          { 'refreshTokens.tokenHash': incomingToken },
          { refreshToken: incomingHashed },
          { refreshToken: incomingToken }
        ]
      });
      if (user) {
        if (Array.isArray(user.refreshTokens)) {
          user.refreshTokens = user.refreshTokens.filter(t => t.tokenHash !== incomingHashed && t.tokenHash !== incomingToken);
        }
        if (user.refreshToken === incomingHashed || user.refreshToken === incomingToken) {
          user.refreshToken = undefined;
        }
        await user.save();
      }
    }
  } catch (e) {}

  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully, cookies cleared.' });
});

router.post('/register', authOtpLimiter, async (req, res) => {
  const { name, email, phone, password, confirmPassword, role } = req.body;

  try {
      // 1. Validation
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
      }

      if (password && confirmPassword && password !== confirmPassword) {
         return res.status(400).json({ message: 'Passwords do not match' });
      }

      // Password policy validation
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          message: passwordValidation.message,
          errors: passwordValidation.errors 
        });
      }

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const userExists = await User.findOne({ email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i') });
      if (userExists) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // 2. Generate OTP (stored hashed in DB)
      const otp = generateOtpCode();
      const otpExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 mins

      // Security: Never allow self-registering as superadmin via public endpoint
      const safeRole = ['landlord', 'caretaker', 'tenant', 'manager', 'admin'].includes(role)
        ? role
        : 'admin';

      // 3. Create User (Unverified) — NOTE: do NOT pass confirmPassword to Mongoose
      const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : undefined,
        password,
        role: safeRole,
        otp: hashOtp(otp),
        otpExpires,
        isVerified: false,
        accountStatus: 'pending_verification'
      });

      if (user) {
        let emailSent = false;
        try {
            await sendEmail({
              email: user.email,
              toName: user.name,
              subject: 'MakaziFlow — Your Email Verification Code (OTP)',
              message: getOtpEmailBody({
                name: user.name,
                otp,
                title: 'Your One-Time Password (OTP)',
                subtitle: 'Verify your MakaziFlow email address',
                instruction: 'Use the verification code below to verify your email address and activate your account.',
                expiryMinutes: 3,
                warningText: 'If you did not create a MakaziFlow account, please ignore this email or contact support immediately.'
              })
            });
            emailSent = true;
        } catch (emailError) {
            console.error('Email send failed (non-fatal):', emailError.message);
        }

        // 5. Attempt SMS (non-blocking)
        if (user.phone) {
          try {
            await sendSMS({
              phone: user.phone,
              message: `Your MakaziFlow verification code is: ${otp}`
            });
          } catch (smsError) {
            console.error('SMS send failed (non-fatal):', smsError.message);
          }
        }

        res.status(201).json({ 
          message: 'Registration successful. Please verify your email.',
          requiresVerification: true,
          email: user.email,
          emailSent
        });
      } else {
        res.status(400).json({ message: 'Could not create account. Please try again.' });
      }
  } catch (error) {
      console.error('Registration Error:', error);
      // Mongoose duplicate key
      if (error.code === 11000) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
      res.status(500).json({ 
        message: 'Server error during registration. Please try again.'
      });
  }
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', authOtpLimiter, async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
          return res.status(400).json({ message: 'Email and OTP are required' });
        }
        const cleanEmail = String(email).trim();
        const user = await User.findOne({ 
          email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i'), 
          otp: hashOtp(otp), 
          otpExpires: { $gt: Date.now() } 
        });

        if (!user) {
          return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.accountStatus = 'active';
        user.lastLoginAt = new Date();
        user.otp = undefined;
        user.otpExpires = undefined;
        const tv = user.tokenVersion || 0;
        const accessToken = generateToken(user._id, tv);
        const refreshToken = generateRefreshToken(user._id, tv);
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        if (!Array.isArray(user.refreshTokens)) user.refreshTokens = [];
        user.refreshTokens.push({ tokenHash, createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
        if (user.refreshTokens.length > 10) user.refreshTokens.shift();
        user.refreshToken = tokenHash;
        await user.save();

        setAuthCookies(res, accessToken, refreshToken);

        res.json({
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: accessToken,
            refreshToken,
            message: 'Email verified successfully'
        });

    } catch (error) {
        res.status(500).json({ message: 'Email verification failed' });
    }
});

// 2FA Routes

// @desc    Generate 2FA Secret
// @route   POST /api/auth/2fa/enable
// @access  Private
router.post('/2fa/enable', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'MakaziFlow', secret);
        
        user.twoFactorSecret = secret;
        await user.save();
        
        const qrCodeUrl = await QRCode.toDataURL(otpauth);
        
        res.json({
            secret,
            qrCodeUrl
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate 2FA secret" });
    }
});

// @desc    Verify and Enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
router.post('/2fa/verify', protect, async (req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA initialization not found" });
        }

        const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

        if (!isValid) {
            return res.status(400).json({ message: "Invalid Code" });
        }

        user.twoFactorEnabled = true;
        await user.save();

        await logActivity(user, 'Security Update', '2FA Enabled', 'auth', 'success');

        res.json({ message: "2FA Enabled Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Verification failed" });
    }
});

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
router.post('/2fa/disable', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();
        
        await logActivity(user, 'Security Update', '2FA Disabled', 'auth', 'warning');
        
        res.json({ message: "2FA Disabled" });
    } catch (error) {
        res.status(500).json({ message: "Failed to disable 2FA" });
    }
});

// @desc    Forgot Password - Request reset code (anti-enumeration)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', authResetLimiter, async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const cleanEmail = String(email || '').trim();
        const user = await User.findOne({ 
          email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i') 
        });
        if (!user) {
            return res.json({
                message: 'If an account exists for that email, a 3-minute one-time password reset code has been sent.'
            });
        }

        // Generate random code, store hashed with SHA-256 in DB, 3 mins expiry
        const resetCode = generateOtpCode();
        user.resetPasswordToken = hashOtp(resetCode);
        user.resetPasswordExpires = new Date(Date.now() + 3 * 60 * 1000);
        await user.save();

        // Send reset code email (NEVER send plain passwords)
        let emailSent = false;
        let emailError = null;
        try {
            await sendEmail({
                email: user.email,
                toName: user.name,
                subject: 'MakaziFlow — Your Password Reset Code (OTP)',
                message: getOtpEmailBody({
                    name: user.name,
                    otp: resetCode,
                    title: 'Your One-Time Password (OTP)',
                    subtitle: 'Password reset verification',
                    instruction: 'Use the one-time verification code below to reset your password securely.',
                    expiryMinutes: 3,
                    warningText: 'If you did not request a password reset, please ignore this email or contact support immediately.'
                })
            });
            emailSent = true;
            console.log(`📧 Password reset OTP email dispatched to ${user.email}`);
        } catch (emailErr) {
            emailError = emailErr.message;
            console.error('Email send failed for forgot-password:', emailErr.message);
        }

        let smsSent = false;
        if (user.phone) {
            try {
                const smsRes = await sendSMS({
                    phone: user.phone,
                    message: `Your MakaziFlow password reset code is: ${resetCode}. Expires in 3 minutes.`
                });
                smsSent = Boolean(smsRes?.success);
            } catch (smsErr) {
                console.warn('Password reset SMS failed (non-fatal):', smsErr.message);
            }
        }

        await logActivity(user, 'Password Reset Requested', `Password reset code sent to ${user.email} (Email: ${emailSent ? 'Sent' : 'Failed'}${smsSent ? ', SMS: Sent' : ''})`, 'auth', (emailSent || smsSent) ? 'info' : 'warning');

        res.json({
            message: 'If an account exists for that email, a 3-minute one-time password reset code has been sent.',
            emailSent,
            smsSent
        });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ message: 'Server error processing request' });
    }
});

router.post('/reset-password', authResetLimiter, async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }

        // Password policy validation
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ 
                message: passwordValidation.message,
                errors: passwordValidation.errors 
            });
        }

        const cleanEmail = String(email || '').trim();
        const cleanCode = String(code || '').trim();
        const hashedInput = hashOtp(cleanCode);

        // Match strictly against SHA-256 hashed token in DB
        const user = await User.findOne({
          email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i'),
          resetPasswordToken: hashedInput,
          resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
          return res.status(400).json({ message: 'Invalid or expired reset code (codes expire in 3 minutes)' });
        }

        // Update password, clear token (one-time use) & invalidate all active sessions across devices
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.refreshToken = undefined;
        user.refreshTokens = [];
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.passwordChangedAt = new Date();
        await user.save();

        clearAuthCookies(res);

        await logActivity(user, 'Password Reset Successful', `Password changed successfully for ${user.email}`, 'auth', 'success');

        res.json({ message: 'Password has been reset successfully. You can now sign in.' });
    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

router.post('/change-password', protect, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        if (user.password) {
            const isMatch = await user.matchPassword(oldPassword);
            if (!isMatch) {
                await logActivity(user, 'Password Change Failed', 'Incorrect current password provided', 'auth', 'warning');
                return res.status(400).json({ message: 'Incorrect current password' });
            }
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: 'New password cannot be identical to the current password' });
        }

        // Validate new password against policy
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            return res.status(400).json({ 
                message: validation.message,
                errors: validation.errors 
            });
        }

        // Revoke all previous JWTs and refresh tokens across all devices
        user.password = newPassword;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.passwordChangedAt = new Date();
        user.refreshTokens = [];
        user.refreshToken = undefined;
        await user.save();

        // Issue fresh session tokens AFTER bcrypt save finishes so iat >= passwordChangedAt
        const tv = user.tokenVersion;
        const newAccessToken = generateToken(user._id, tv);
        const newRefreshToken = generateRefreshToken(user._id, tv);
        const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        await User.findByIdAndUpdate(user._id, {
            $set: {
                refreshToken: newHash,
                refreshTokens: [{
                    tokenHash: newHash,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }]
            }
        });

        setAuthCookies(res, newAccessToken, newRefreshToken);

        await logActivity(user, 'Password Changed', `User ${user.name} updated account password and rotated active sessions`, 'auth', 'success');

        res.json({
            success: true,
            message: 'Password changed successfully. Other active sessions have been signed out.',
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ message: 'Server error changing password' });
    }
});

// Social OAuth Sign-In Disabled (Google & Apple login removed per security hardening)
router.post('/google', (req, res) => {
  return res.status(410).json({ message: 'Google Sign-In has been disabled. Please sign in using your email and password.' });
});

router.post('/apple', (req, res) => {
  return res.status(410).json({ message: 'Apple Sign-In has been disabled. Please sign in using your email and password.' });
});

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '-password -otp -otpExpires -twoFactorSecret -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokens'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    const superEmails = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const userObj = user.toObject();
    if (superEmails.includes((user.email || '').toLowerCase())) {
      userObj.isSuperAdmin = true;
    }
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// @desc    Update current authenticated user's profile (name, email, phone)
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone } = req.body;
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof phone === 'string') {
      user.phone = phone.trim();
    }
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
      }
      if (cleanEmail !== (user.email || '').toLowerCase()) {
        const existing = await User.findOne({ email: new RegExp(`^${escapeRegExp(cleanEmail)}$`, 'i'), _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ message: 'That email address is already registered to another account.' });
        }
        user.email = cleanEmail;
      }
    }

    await user.save();

    // Sync primary owner details onto Settings if present
    const Settings = require('../models/Settings');
    const settingsUpdates = {};
    if (user.name) settingsUpdates.landlordName = user.name;
    if (user.email) settingsUpdates.orgEmail = user.email;
    if (user.phone) settingsUpdates.orgPhone = user.phone;
    if (Object.keys(settingsUpdates).length > 0) {
      await Settings.findOneAndUpdate({ user: user._id }, { $set: settingsUpdates });
    }

    await logActivity(user, 'Account Profile Updated', `Updated account profile for ${user.name} (${user.email})`, 'auth', 'success');

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.otp;
    delete safeUser.otpExpires;
    delete safeUser.twoFactorSecret;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;
    delete safeUser.refreshToken;
    delete safeUser.refreshTokens;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// @desc    Submit user onboarding questionnaire (Role, Units, Mode)
// @route   POST /api/auth/onboarding
// @access  Private
router.post('/onboarding', protect, async (req, res) => {
  const { role, unitsCount, subscriptionTier, mode } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.hasCompletedOnboarding = true;
    if (role) user.onboardingRole = role;
    if (unitsCount !== undefined) user.unitsCount = Number(unitsCount) || 0;
    if (subscriptionTier) user.subscriptionTier = subscriptionTier;
    user.isDemoMode = mode === 'demo';

    await user.save();

    // Sync onboarding unit & plan selection directly into Billing (14-day trial)
    try {
      const { syncTrialFromOnboarding } = require('../services/subscriptionService');
      await syncTrialFromOnboarding(user._id, {
        unitsCount: user.unitsCount,
        subscriptionTier: user.subscriptionTier,
        mode
      });
    } catch (syncErr) {
      console.warn('Onboarding billing sync warning:', syncErr.message);
    }

    // If demo mode selected, populate with rich Kenyan rental portfolio data (MakaziFlow sample data)
    if (mode === 'demo') {
      await seedDemoDataForUser(user);
    }

    await logActivity(
      user,
      'Onboarding Completed',
      `User completed onboarding as ${user.onboardingRole || 'landlord'} managing ${user.unitsCount} units (${mode === 'demo' ? 'Demo Mode' : 'Live Mode'})`,
      'auth',
      'success'
    );

    const freshUser = await User.findById(user._id);
    const superEmails = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isSuperAdmin = Boolean(freshUser.isSuperAdmin || freshUser.role === 'superadmin' || superEmails.includes((freshUser.email || '').toLowerCase()));

    res.json({
      _id: freshUser._id,
      id: freshUser._id,
      name: freshUser.name,
      email: freshUser.email,
      role: freshUser.role,
      isSuperAdmin,
      avatar: freshUser.avatar,
      authProvider: freshUser.authProvider,
      token: generateToken(freshUser._id, freshUser.tokenVersion || 0),
      twoFactorEnabled: freshUser.twoFactorEnabled,
      hasCompletedOnboarding: freshUser.hasCompletedOnboarding,
      onboardingRole: freshUser.onboardingRole,
      unitsCount: freshUser.unitsCount,
      subscriptionTier: freshUser.subscriptionTier,
      isDemoMode: freshUser.isDemoMode
    });
  } catch (error) {
    console.error('Onboarding save error:', error);
    res.status(500).json({ message: error.message || 'Failed to complete onboarding' });
  }
});

// @desc    Seed demo mode sample data for user
// @route   POST /api/auth/demo-mode/seed
// @access  Private
router.post('/demo-mode/seed', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await seedDemoDataForUser(user);
    user.isDemoMode = true;
    user.hasCompletedOnboarding = true;
    await user.save();

    res.json({
      success: true,
      message: 'Demo mode activated with sample data.',
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isDemoMode: true,
        hasCompletedOnboarding: true
      }
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    res.status(500).json({ message: error.message || 'Failed to seed demo data' });
  }
});

// @desc    Clear demo data and switch user to live mode
// @route   POST /api/auth/demo-mode/clear
// @access  Private
router.post('/demo-mode/clear', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await clearDemoDataForUser(user);
    user.isDemoMode = false;
    await user.save();

    res.json({
      success: true,
      message: 'Demo data cleared. You are now in Live Mode.',
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isDemoMode: false,
        hasCompletedOnboarding: user.hasCompletedOnboarding
      }
    });
  } catch (error) {
    console.error('Demo clear error:', error);
    res.status(500).json({ message: error.message || 'Failed to clear demo data' });
  }
});

module.exports = router;


