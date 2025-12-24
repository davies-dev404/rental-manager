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
      // Check verification
      if (!user.isVerified && user.role !== 'admin') { 
         // return res.status(401).json({ message: 'Please verify your email first' });
      }

      await logActivity(user, 'User Logged In', `User ${user.name} logged in successfully`, 'auth', 'success');

      res.json({
        _id: user._id, // Keep _id primarily
        id: user._id, // Add id alias for frontend
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token: generateToken(user._id),
        twoFactorEnabled: user.twoFactorEnabled
      });
    } else {
      await logActivity('System', 'Login Failed', `Failed login attempt for ${email}`, 'auth', 'warning');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
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
      if (password && confirmPassword && password !== confirmPassword) {
         return res.status(400).json({ message: 'Passwords do not match' });
      }

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // 2. Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      // 3. Create User (Unverified)
      const user = await User.create({
        name,
        email,
        phone,
        password,
        role,
        otp,
        otpExpires,
        isVerified: false
      });

      if (user) {
        // 4. Send Email
        try {
            await sendEmail({
              email: user.email,
              subject: 'Your Verification Code',
              message: `Your verification code is: ${otp}. It expires in 10 minutes.`
            });

            // Send SMS
            if (user.phone) {
                await sendSMS({
                    phone: user.phone,
                    message: `Your Rental Manager verification code is: ${otp}`
                });
            }
            
            res.status(201).json({ 
                message: 'Registration successful. Please verify your email.',
                requiresVerification: true,
                email: user.email,
                otp: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        } catch (emailError) {
             console.error("Email send failed:", emailError);
             res.status(201).json({ 
                message: 'Account created but email failed.',
                requiresVerification: true, 
                email: user.email
            });
        }
      } else {
        res.status(400).json({ message: 'Invalid user data' });
      }
  } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ message: error.message, stack: error.stack });
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

module.exports = router;
