const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const nodemailer = require('nodemailer');

const { protect } = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }
    // Return settings
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin)
router.put('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings(req.body);
    } else {
        // Update fields
        if (req.body.orgName) settings.orgName = req.body.orgName;
        if (req.body.orgEmail) settings.orgEmail = req.body.orgEmail;
        if (req.body.orgPhone) settings.orgPhone = req.body.orgPhone;
        if (req.body.orgAddress) settings.orgAddress = req.body.orgAddress;
        if (req.body.taxId) settings.taxId = req.body.taxId;
        
        // App Preferences
        if (req.body.currency) settings.currency = req.body.currency;
        if (req.body.timezone) settings.timezone = req.body.timezone;
        if (req.body.theme) settings.theme = req.body.theme;
        
        if (req.body.notifications) settings.notifications = req.body.notifications;
        
        // Handle Integrations (Deep Merge or Replacement)
        if (req.body.integrations) {
            settings.integrations = req.body.integrations;
        }

        settings.updatedAt = Date.now();
    }
    
    await settings.save();
    if (req.user) {
      await logActivity(req.user, 'Settings Updated', 'General configurations and preferences updated', 'settings', 'success');
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Test SMTP Connection (defaults to Brevo SMTP Relay when omitted)
// @route   POST /api/settings/test-smtp
// @access  Private (Admin)
router.post('/test-smtp', protect, async (req, res) => {
    const body = req.body || {};
    const host = body.host || process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = Number(body.port || process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587);
    const user = body.user || process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
    const pass = body.pass || process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

    if (!user || !pass) {
        return res.status(400).json({ message: 'SMTP Test Failed: Brevo SMTP credentials are missing.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for 587 STARTTLS
            auth: {
                user,
                pass
            }
        });

        await transporter.verify();
        res.json({ message: `SMTP Connection Successful via ${host}:${port}!` });
    } catch (error) {
        console.error('SMTP Test Failed:', error);
        res.status(400).json({ message: 'SMTP Connection Failed: ' + error.message });
    }
});

module.exports = router;
