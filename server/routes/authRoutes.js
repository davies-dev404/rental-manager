const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

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
      // OPTIONAL: Uncomment to Block login for unverified users
      if (!user.isVerified && user.role !== 'admin') { 
         // For now, allow admin login even if not verified to avoid lockout during development
         // return res.status(401).json({ message: 'Please verify your email first' });
      }

      await logActivity(user, 'User Logged In', `User ${user.name} logged in successfully`, 'auth', 'success');

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token: generateToken(user._id),
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
  const { name, email, password, confirmPassword, role } = req.body;

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
            
            res.status(201).json({ 
                message: 'Registration successful. Please verify your email.',
                requiresVerification: true,
                email: user.email,
                // DEV HELPER: Return OTP to client in dev mode for easy testing
                otp: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        } catch (emailError) {
             console.error("Email send failed:", emailError);
             // Return success but warn about email
             res.status(201).json({ 
                message: 'Account created but email failed. Contact support or check console logs.',
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

module.exports = router;
