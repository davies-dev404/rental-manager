const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { protect } = require('../middleware/authMiddleware'); // Import protect!
const { validatePassword } = require('../utils/passwordPolicy');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const logActivity = require('../utils/logActivity');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Generate a 6-digit login OTP (valid for 10 minutes)
      const loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = loginOtp;
      user.otpExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
      await user.save();
      console.log(`🔑 [OTP] Login verification code for ${user.email}: ${loginOtp}`);

      // Send OTP via email
      let emailSent = false;
      let emailError = null;
      try {
        await sendEmail({
          email: user.email,
          subject: 'MakaziFlow — Your Login Verification Code',
          message: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
              <div style="text-align:center;margin-bottom:20px;">
                <h1 style="color:#0d2240;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Makazi<span style="color:#00a99d;">Flow</span></h1>
                <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">Manage Rentals. Effortlessly.</p>
              </div>
              <h2 style="color:#1e293b;font-size:18px;margin-bottom:8px;text-align:center;">Two-Factor Verification</h2>
              <p style="color:#475569;font-size:14px;line-height:1.5;text-align:center;margin-bottom:20px;">
                Use the verification code below to complete your sign-in to your MakaziFlow account. This code expires in <strong>3 minutes</strong>.
              </p>
              <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0d2240;text-align:center;padding:18px 0;background:#f0fafa;border:1px dashed #5eead4;border-radius:8px;margin-bottom:20px;font-family:monospace;">
                ${loginOtp}
              </div>
              <p style="color:#64748b;font-size:12px;line-height:1.4;text-align:center;margin:0;">
                If you did not attempt to sign in to MakaziFlow, please ignore this email or change your password immediately.
              </p>
            </div>`
        });
        emailSent = true;
        console.log(`📧 Login OTP email dispatched to ${user.email}`);
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error('Login OTP email failed:', emailErr.message);
      }

      await logActivity(user, 'Login OTP Sent', `Login OTP sent to ${user.email} (Status: ${emailSent ? 'Sent' : 'Failed'})`, 'auth', emailSent ? 'info' : 'warning');

      return res.json({
        requiresOTP: true,
        email: user.email,
        name: user.name,
        emailSent,
        emailError: emailSent ? undefined : emailError
      });
    } else {
      await logActivity('System', 'Login Failed', `Failed login attempt for ${email}`, 'auth', 'warning');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Resend login OTP
// @route   POST /api/auth/resend-login-otp
// @access  Public
router.post('/resend-login-otp', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate fresh 6-digit OTP (3 minutes)
    const loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = loginOtp;
    user.otpExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    await user.save();
    console.log(`🔑 [OTP] Resent login verification code for ${user.email}: ${loginOtp}`);

    // Send OTP via email
    let emailSent = false;
    let emailError = null;
    try {
      await sendEmail({
        email: user.email,
        subject: 'MakaziFlow — Your Login Verification Code',
        message: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="color:#0d2240;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Makazi<span style="color:#00a99d;">Flow</span></h1>
              <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">Manage Rentals. Effortlessly.</p>
            </div>
            <h2 style="color:#1e293b;font-size:18px;margin-bottom:8px;text-align:center;">Two-Factor Verification</h2>
            <p style="color:#475569;font-size:14px;line-height:1.5;text-align:center;margin-bottom:20px;">
              Use the verification code below to complete your sign-in to your MakaziFlow account. This code expires in <strong>3 minutes</strong>.
            </p>
            <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0d2240;text-align:center;padding:18px 0;background:#f0fafa;border:1px dashed #5eead4;border-radius:8px;margin-bottom:20px;font-family:monospace;">
              ${loginOtp}
            </div>
            <p style="color:#64748b;font-size:12px;line-height:1.4;text-align:center;margin:0;">
              If you did not attempt to sign in to MakaziFlow, please ignore this email or change your password immediately.
            </p>
          </div>`
      });
      emailSent = true;
      console.log(`📧 Login OTP email resent to ${user.email}`);
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('Resend login OTP email failed:', emailErr.message);
    }

    await logActivity(user, 'Login OTP Resent', `Login OTP resent to ${user.email}`, 'auth', emailSent ? 'info' : 'warning');

    return res.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      emailSent,
      emailError: emailSent ? undefined : emailError
    });
  } catch (error) {
    console.error('Resend login OTP error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify login OTP and return token
// @route   POST /api/auth/verify-login-otp
// @access  Public
router.post('/verify-login-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    await logActivity(user, 'User Logged In', `User ${user.name} completed OTP login`, 'auth', 'success');

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    console.error('Verify login OTP error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Register a new user (admin/caretaker)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
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

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // 2. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 mins
      console.log(`🔑 [OTP] Registration verification code for ${email}: ${otp}`);

      // 3. Create User (Unverified) — NOTE: do NOT pass confirmPassword to Mongoose
      const user = await User.create({
        name,
        email,
        phone: phone || undefined,
        password,
        role: role || 'admin',
        otp,
        otpExpires,
        isVerified: false
      });

      if (user) {
        // 4. Attempt to send OTP via email (non-blocking failure)
        try {
            await sendEmail({
              email: user.email,
              subject: 'MakaziFlow — Your Email Verification Code',
              message: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
                  <div style="text-align:center;margin-bottom:20px;">
                    <h1 style="color:#0d2240;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Makazi<span style="color:#00a99d;">Flow</span></h1>
                    <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">Manage Rentals. Effortlessly.</p>
                  </div>
                  <h2 style="color:#1e293b;font-size:18px;margin-bottom:8px;text-align:center;">Verify Your Email</h2>
                  <p style="color:#475569;font-size:14px;line-height:1.5;text-align:center;margin-bottom:20px;">
                    Welcome to MakaziFlow! Use the code below to verify your email address. This code expires in <strong>3 minutes</strong>.
                  </p>
                  <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0d2240;text-align:center;padding:18px 0;background:#f0fafa;border:1px dashed #5eead4;border-radius:8px;margin-bottom:20px;font-family:monospace;">
                    ${otp}
                  </div>
                  <p style="color:#64748b;font-size:12px;line-height:1.4;text-align:center;margin:0;">
                    If you did not create a MakaziFlow account, please ignore this email.
                  </p>
                </div>`
            });
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
          email: user.email
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
        message: error.message || 'Server error during registration. Please try again.',
        details: error.name || 'ServerError'
      });
  }
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ 
            email, 
            otp, 
            otpExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            message: 'Email verified successfully'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2FA Routes

// @desc    Generate 2FA Secret
// @route   POST /api/auth/2fa/enable
// @access  Private
router.post('/2fa/enable', protect, async (req, res) => {
    try {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(req.user.email, 'RentalManager', secret);
        
        // Save temporarily or check verify step to save?
        // Usually, we save the secret but keep Enabled = false until verify
        req.user.twoFactorSecret = secret;
        await req.user.save();
        
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
        if (!req.user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA initialization not found" });
        }

        const isValid = authenticator.verify({ token, secret: req.user.twoFactorSecret });

        if (!isValid) {
            return res.status(400).json({ message: "Invalid Code" });
        }

        req.user.twoFactorEnabled = true;
        await req.user.save();

        await logActivity(req.user, 'Security Update', '2FA Enabled', 'auth', 'success');

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
        req.user.twoFactorEnabled = false;
        req.user.twoFactorSecret = undefined;
        await req.user.save();
        
        await logActivity(req.user, 'Security Update', '2FA Disabled', 'auth', 'warning');
        
        res.json({ message: "2FA Disabled" });
    } catch (error) {
        res.status(500).json({ message: "Failed to disable 2FA" });
    }
});

// @desc    Forgot Password - Request reset code
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Generate 6-digit OTP code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();
        console.log(`🔑 [OTP] Password reset verification code for ${user.email}: ${resetCode}`);

        // Send reset code email
        let emailSent = false;
        let emailError = null;
        try {
            await sendEmail({
                email: user.email,
                subject: 'MakaziFlow — Your Password Reset Code',
                message: `
                  <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
                    <div style="text-align:center;margin-bottom:20px;">
                      <h1 style="color:#0d2240;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Makazi<span style="color:#00a99d;">Flow</span></h1>
                      <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">Manage Rentals. Effortlessly.</p>
                    </div>
                    <h2 style="color:#1e293b;font-size:18px;margin-bottom:8px;text-align:center;">Password Reset Request</h2>
                    <p style="color:#475569;font-size:14px;line-height:1.5;text-align:center;margin-bottom:20px;">
                      You requested a password reset for your MakaziFlow account. Use the 6-digit verification code below to reset your password. This code expires in <strong>15 minutes</strong>.
                    </p>
                    <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0d2240;text-align:center;padding:18px 0;background:#f0fafa;border:1px dashed #5eead4;border-radius:8px;margin-bottom:20px;font-family:monospace;">
                      ${resetCode}
                    </div>
                    <p style="color:#64748b;font-size:12px;line-height:1.4;text-align:center;margin:0;">
                      If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access.
                    </p>
                  </div>`
            });
            emailSent = true;
            console.log(`📧 Password reset OTP email dispatched to ${user.email}`);
        } catch (emailErr) {
            emailError = emailErr.message;
            console.error('Email send failed for forgot-password:', emailErr.message);
        }

        await logActivity(user, 'Password Reset Requested', `Password reset code sent to ${user.email} (Status: ${emailSent ? 'Sent' : 'Failed'})`, 'auth', emailSent ? 'info' : 'warning');

        res.json({
            message: 'Password reset code has been sent to your email.',
            email: user.email,
            emailSent,
            emailError: emailSent ? undefined : emailError
        });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ message: 'Server error processing request' });
    }
});

// @desc    Reset Password with code
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
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

        const user = await User.findOne({
            email,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await logActivity(user, 'Password Reset Successful', `Password changed successfully for ${user.email}`, 'auth', 'success');

        res.json({ message: 'Password has been reset successfully. You can now sign in.' });
    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

// @desc    Change password (Authenticated user)
// @route   POST /api/auth/change-password
// @access  Private
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

        user.password = newPassword;
        await user.save();

        await logActivity(user, 'Password Changed', `User ${user.name} successfully updated account password`, 'auth', 'success');

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ message: error.message || 'Server error changing password' });
    }
});

// Helper to decode JWT payload safely (used for Google / Apple ID tokens)
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse token payload:', err);
    return null;
  }
};

// @desc    Google OAuth Login / Sign-Up
// @route   POST /api/auth/google
// @access  Public
router.post('/google', async (req, res) => {
  const { credential, accessToken, role } = req.body;

  try {
    let email = null;
    let name = null;
    let googleId = null;
    let picture = null;

    // 1. Try decoding standard Google ID Token (from Google Identity Services credential)
    if (credential) {
      const payload = decodeJwtPayload(credential);
      if (payload && payload.email) {
        email = payload.email.toLowerCase();
        name = payload.name || payload.given_name || email.split('@')[0];
        googleId = payload.sub;
        picture = payload.picture;
      }
    }

    // 2. Fallback: If access token was provided or decoding didn't yield email, fetch from Google userinfo API
    if (!email && (accessToken || credential)) {
      const tokenToUse = accessToken || credential;
      try {
        const axios = require('axios');
        const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        });
        if (googleRes.data && googleRes.data.email) {
          email = googleRes.data.email.toLowerCase();
          name = googleRes.data.name || email.split('@')[0];
          googleId = googleRes.data.sub;
          picture = googleRes.data.picture;
        }
      } catch (gErr) {
        console.warn('Google userinfo fetch fallback skipped/failed:', gErr.message);
      }
    }

    // 3. Fallback: Direct payload if user provided email directly in sandbox/demo mode
    if (!email && req.body.email) {
      email = req.body.email.toLowerCase();
      name = req.body.name || email.split('@')[0];
      googleId = req.body.googleId || req.body.sub;
      picture = req.body.picture;
    }

    if (!email) {
      return res.status(400).json({ message: 'Invalid Google authentication credential. Email not found.' });
    }

    // 4. Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Existing user: link googleId and update avatar if missing
      if (!user.googleId && googleId) user.googleId = googleId;
      if (picture && (!user.avatar || user.avatar.includes('shadcn.png'))) user.avatar = picture;
      if (!user.isVerified) user.isVerified = true; // Google verifies emails
      await user.save();
      await logActivity(user, 'Google Sign-In', `User signed in with Google`, 'auth', 'success');
    } else {
      // New user registration
      user = await User.create({
        name: name || 'Google User',
        email,
        authProvider: 'google',
        googleId: googleId || undefined,
        role: role === 'caretaker' ? 'caretaker' : 'admin',
        avatar: picture || 'https://github.com/shadcn.png',
        isVerified: true
      });
      await logActivity(user, 'Google Account Created', `New user registered via Google`, 'auth', 'success');
    }

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      authProvider: user.authProvider || 'google',
      token: generateToken(user._id),
      twoFactorEnabled: user.twoFactorEnabled
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: error.message || 'Google authentication failed' });
  }
});

// @desc    Apple OAuth Login / Sign-Up
// @route   POST /api/auth/apple
// @access  Public
router.post('/apple', async (req, res) => {
  const { id_token, token, user: appleUserData, role } = req.body;

  try {
    let email = null;
    let name = null;
    let appleId = null;

    const tokenToDecode = id_token || token;
    if (tokenToDecode) {
      const payload = decodeJwtPayload(tokenToDecode);
      if (payload) {
        email = payload.email ? payload.email.toLowerCase() : null;
        appleId = payload.sub;
      }
    }

    // Apple only sends the user's name on first authorization in req.body.user
    if (appleUserData) {
      const parsedUser = typeof appleUserData === 'string' ? JSON.parse(appleUserData) : appleUserData;
      if (parsedUser.name) {
        const first = parsedUser.name.firstName || '';
        const last = parsedUser.name.lastName || '';
        name = `${first} ${last}`.trim();
      }
      if (!email && parsedUser.email) {
        email = parsedUser.email.toLowerCase();
      }
    }

    // Direct fallback from payload
    if (!email && req.body.email) {
      email = req.body.email.toLowerCase();
      name = req.body.name || email.split('@')[0];
      appleId = req.body.appleId || req.body.sub;
    }

    if (!email && !appleId) {
      return res.status(400).json({ message: 'Invalid Apple authorization token' });
    }

    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (appleId) {
      user = await User.findOne({ appleId });
    }

    if (user) {
      if (!user.appleId && appleId) user.appleId = appleId;
      if (!user.isVerified) user.isVerified = true;
      await user.save();
      await logActivity(user, 'Apple Sign-In', `User signed in with Apple`, 'auth', 'success');
    } else {
      user = await User.create({
        name: name || (email ? email.split('@')[0] : 'Apple User'),
        email: email || `${appleId.slice(0, 10)}@privaterelay.appleid.com`,
        authProvider: 'apple',
        appleId: appleId || undefined,
        role: role === 'caretaker' ? 'caretaker' : 'admin',
        isVerified: true
      });
      await logActivity(user, 'Apple Account Created', `New user registered via Apple`, 'auth', 'success');
    }

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      authProvider: user.authProvider || 'apple',
      token: generateToken(user._id),
      twoFactorEnabled: user.twoFactorEnabled
    });

  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ message: error.message || 'Apple authentication failed' });
  }
});

module.exports = router;

