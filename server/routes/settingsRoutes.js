const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const nodemailer = require('nodemailer');

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
router.put('/', async (req, res) => {
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
        
        if (req.body.notifications) settings.notifications = req.body.notifications;
        
        // Handle Integrations (Deep Merge or Replacement)
        if (req.body.integrations) {
            settings.integrations = req.body.integrations;
        }

        settings.updatedAt = Date.now();
    }
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Test SMTP Connection
// @route   POST /api/settings/test-smtp
// @access  Private (Admin)
router.post('/test-smtp', async (req, res) => {
    const { host, port, user, pass } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: {
                user,
                pass
            }
        });

        await transporter.verify();
        res.json({ message: 'SMTP Connection Successful!' });
    } catch (error) {
        console.error('SMTP Test Failed:', error);
        res.status(400).json({ message: 'SMTP Connection Failed: ' + error.message });
    }
});

module.exports = router;
