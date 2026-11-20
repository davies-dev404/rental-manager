const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const { protect } = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');
const { getUserBusinessProfile } = require('../utils/getUserBusinessProfile');

// Helper to resolve optional authenticated user for GET /api/settings
async function resolveOptionalUser(req) {
  let token = req.cookies?.jwt;
  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select('-password');
  } catch {
    return null;
  }
}

// @desc    Get user's settings (never leaks another company's orgName/branding)
// @route   GET /api/settings
// @access  Private (safe non-PII fallback if unauthenticated)
router.get('/', async (req, res) => {
  try {
    const user = req.user || (await resolveOptionalUser(req));
    if (!user) {
      return res.json({
        currency: 'KES',
        timezone: 'Africa/Nairobi'
      });
    }

    let settings = await Settings.findOne({ user: user._id });
    if (!settings) {
      const profile = await getUserBusinessProfile(user);
      settings = await Settings.create({
        user: user._id,
        orgName: profile.orgName,
        landlordName: profile.landlordName,
        orgLogo: profile.orgLogo,
        orgEmail: profile.orgEmail,
        orgPhone: profile.orgPhone,
        orgAddress: profile.orgAddress,
        taxId: profile.taxId,
        currency: profile.currency,
        timezone: profile.timezone
      });
    } else {
      // Merge fallback user contact details when settings fields are still empty
      const obj = settings.toObject();
      if (!obj.landlordName && user.name) obj.landlordName = user.name;
      if (!obj.orgEmail && user.email) obj.orgEmail = user.email;
      if (!obj.orgPhone && user.phone) obj.orgPhone = user.phone;
      return res.json(obj);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update settings for authenticated user
// @route   PUT /api/settings
// @access  Private
router.put('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user.id });
    if (!settings) {
      const profile = await getUserBusinessProfile(req.user);
      settings = new Settings({
        user: req.user.id,
        orgName: profile.orgName,
        landlordName: profile.landlordName,
        orgLogo: profile.orgLogo,
        orgEmail: profile.orgEmail,
        orgPhone: profile.orgPhone,
        orgAddress: profile.orgAddress,
        taxId: profile.taxId,
        ...req.body,
        user: req.user.id
      });
    } else {
      if (req.body.orgName !== undefined) settings.orgName = req.body.orgName;
      if (req.body.landlordName !== undefined) settings.landlordName = req.body.landlordName;
      if (req.body.abbreviatedName !== undefined) settings.abbreviatedName = req.body.abbreviatedName;
      if (req.body.orgLogo !== undefined) settings.orgLogo = req.body.orgLogo;
      if (req.body.orgEmail !== undefined) settings.orgEmail = req.body.orgEmail;
      if (req.body.orgPhone !== undefined) settings.orgPhone = req.body.orgPhone;
      if (req.body.orgAddress !== undefined) settings.orgAddress = req.body.orgAddress;
      if (req.body.taxId !== undefined) settings.taxId = req.body.taxId;
      if (req.body.invoiceTitle !== undefined) settings.invoiceTitle = req.body.invoiceTitle;
      if (req.body.invoiceFootnote !== undefined) settings.invoiceFootnote = req.body.invoiceFootnote;

      if (req.body.currency) settings.currency = req.body.currency;
      if (req.body.timezone) settings.timezone = req.body.timezone;
      if (req.body.theme) settings.theme = req.body.theme;
      if (req.body.mpesaType !== undefined) settings.mpesaType = req.body.mpesaType;
      if (req.body.paybillAccount !== undefined) settings.paybillAccount = req.body.paybillAccount;
      if (req.body.accountType !== undefined) settings.accountType = req.body.accountType;

      if (req.body.notifications && typeof req.body.notifications === 'object') {
        settings.notifications = {
          ...(settings.notifications?.toObject ? settings.notifications.toObject() : settings.notifications || {}),
          ...req.body.notifications
        };
      }

      if (req.body.preferences && typeof req.body.preferences === 'object') {
        settings.preferences = {
          ...(settings.preferences?.toObject ? settings.preferences.toObject() : settings.preferences || {}),
          ...req.body.preferences
        };
      }

      if (req.body.alerts && typeof req.body.alerts === 'object') {
        settings.alerts = {
          ...(settings.alerts?.toObject ? settings.alerts.toObject() : settings.alerts || {}),
          ...req.body.alerts
        };
      }

      if (req.body.messageTemplates && typeof req.body.messageTemplates === 'object') {
        settings.messageTemplates = {
          ...(settings.messageTemplates?.toObject ? settings.messageTemplates.toObject() : settings.messageTemplates || {}),
          ...req.body.messageTemplates
        };
      }

      if (Array.isArray(req.body.customFields)) {
        settings.customFields = req.body.customFields;
      }

      if (Array.isArray(req.body.teamMembers)) {
        settings.teamMembers = req.body.teamMembers;
      }

      if (req.body.integrations && typeof req.body.integrations === 'object') {
        const existingInt = settings.integrations?.toObject ? settings.integrations.toObject() : settings.integrations || {};
        settings.integrations = {
          ...existingInt,
          ...req.body.integrations,
          mpesa: {
            ...(existingInt.mpesa || {}),
            ...(req.body.integrations.mpesa || {})
          }
        };
      }

      settings.updatedAt = Date.now();
    }

    await settings.save();

    // Sync primary company/tax details back onto User profile
    const userUpdates = {};
    if (typeof req.body.orgName === 'string') {
      userUpdates.companyName = req.body.orgName.trim();
    }
    if (typeof req.body.orgAddress === 'string') {
      userUpdates.address = req.body.orgAddress.trim();
    }
    if (typeof req.body.taxId === 'string') {
      userUpdates.kraPin = req.body.taxId.trim();
    }
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user.id, { $set: userUpdates });
    }

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
