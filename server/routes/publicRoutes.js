const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Settings = require('../models/Settings');
const SupportTicket = require('../models/SupportTicket');
const PlatformSetting = require('../models/PlatformSetting');
const sendEmail = require('../utils/sendEmail');
const { getLiveMaintenanceStatus } = require('../services/maintenanceService');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many contact submissions. Please wait a few minutes and try again.' }
});

/**
 * @desc    Public Maintenance Mode & Scheduled Window Status for Landing Page & App Top Banner
 * @route   GET /api/public/maintenance-status
 * @access  Public
 */
router.get('/maintenance-status', async (req, res) => {
  try {
    const status = await getLiveMaintenanceStatus();
    return res.json(status);
  } catch (error) {
    console.warn('Public maintenance-status warning:', error.message);
    return res.json({
      active: false,
      manualEnabled: false,
      scheduled: false,
      isUpcoming: false,
      bannerVisible: false,
      message: ''
    });
  }
});

let reviewsCache = {
  key: null,
  expiresAt: 0,
  data: null
};

/**
 * @desc    Fetch public Google Business Profile ratings & reviews via Google Places API
 * @route   GET /api/public/google-reviews
 * @access  Public
 */
router.get('/google-reviews', async (req, res) => {
  try {
    let settingsDoc = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      settingsDoc = await Settings.findOne().maxTimeMS(1500).lean();
    }

    const googleCfg = settingsDoc?.integrations?.googleReviews || {};
    const enabled = googleCfg.enabled !== false;

    const placeId = (process.env.GOOGLE_PLACE_ID || googleCfg.placeId || '').trim();
    const apiKey = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
    const customWriteUrl = (process.env.GOOGLE_REVIEW_URL || googleCfg.writeReviewUrl || '').trim();

    const writeReviewUrl =
      customWriteUrl ||
      (placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : '');

    const mapsFallbackUrl = placeId
      ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
      : '';

    if (!enabled) {
      return res.json({
        enabled: false,
        configured: false,
        rating: null,
        userRatingCount: 0,
        reviews: [],
        writeReviewUrl,
        googleMapsUri: mapsFallbackUrl
      });
    }

    const cacheKey = `${placeId}:${Boolean(apiKey)}`;
    if (reviewsCache.data && reviewsCache.key === cacheKey && reviewsCache.expiresAt > Date.now()) {
      return res.json(reviewsCache.data);
    }

    if (placeId && apiKey) {
      try {
        const response = await axios.get(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
          {
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews,googleMapsUri'
            },
            timeout: 8000
          }
        );

        const place = response.data || {};
        const normalizedReviews = Array.isArray(place.reviews)
          ? place.reviews
              .map((r) => ({
                authorName: r.authorAttribution?.displayName || 'Verified Google Reviewer',
                authorUrl: r.authorAttribution?.uri || '',
                profilePhotoUrl: r.authorAttribution?.photoUri || '',
                rating: Number(r.rating || 5),
                relativeTimeDescription: r.relativePublishTimeDescription || 'Recently',
                text: r.text?.text || r.originalText?.text || '',
                publishTime: r.publishTime || null
              }))
              .filter((r) => r.text || r.rating)
          : [];

        const payload = {
          enabled: true,
          configured: true,
          source: 'google_places',
          placeName: place.displayName?.text || 'MakaziFlow',
          rating: typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : null,
          userRatingCount: Number(place.userRatingCount || 0),
          reviews: normalizedReviews,
          googleMapsUri: place.googleMapsUri || mapsFallbackUrl,
          writeReviewUrl
        };

        reviewsCache = {
          key: cacheKey,
          expiresAt: Date.now() + 15 * 60 * 1000,
          data: payload
        };

        return res.json(payload);
      } catch (apiErr) {
        console.warn('Google Places fetch warning:', apiErr.response?.data?.error?.message || apiErr.message);
      }
    }

    const fallbackPayload = {
      enabled: true,
      configured: Boolean(placeId || writeReviewUrl),
      source: placeId ? 'place_link_only' : 'unconfigured',
      placeName: 'MakaziFlow',
      rating: null,
      userRatingCount: 0,
      reviews: [],
      googleMapsUri: mapsFallbackUrl || writeReviewUrl,
      writeReviewUrl
    };

    reviewsCache = {
      key: cacheKey,
      expiresAt: Date.now() + 2 * 60 * 1000,
      data: fallbackPayload
    };

    return res.json(fallbackPayload);
  } catch (error) {
    console.error('Public Google Reviews error:', error.message);
    return res.status(500).json({ message: 'Unable to load Google reviews at this time.' });
  }
});

/**
 * @desc    Submit Landing Page Contact / Demo Inquiry -> Persists as SupportTicket for Msimamizi Admin
 * @route   POST /api/public/contact
 * @access  Public
 */
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role = '',
      units = '',
      subject = '',
      message = '',
      category = 'landing_inquiry'
    } = req.body || {};

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const cleanMessage = String(message || '').trim();

    if (!cleanName || !cleanEmail || !cleanPhone) {
      return res.status(400).json({ message: 'Name, email, and phone number are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const roleLabel = role ? String(role).trim() : 'Prospective Customer';
    const unitsLabel = units ? String(units).trim() : '';
    const derivedSubject = String(subject || '').trim() ||
      `Landing Inquiry (${roleLabel}${unitsLabel ? ` · ${unitsLabel} units` : ''})`;
    const derivedBody = cleanMessage ||
      `Requested a live demo/callback from the MakaziFlow landing page.\nRole: ${roleLabel}\nPortfolio Size: ${unitsLabel || 'Unspecified'}\nPhone: ${cleanPhone}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: derivedSubject,
      category: category === 'demo_request' ? 'demo_request' : 'landing_inquiry',
      source: 'landing_page',
      organizationRole: roleLabel,
      unitsEstimate: unitsLabel,
      priority: 'high',
      status: 'open',
      message: derivedBody
    });

    // Optional alert to configured platform admin alert email (non-blocking)
    if (process.env.NODE_ENV !== 'test') {
      PlatformSetting.findOne({ key: 'global' }).lean().then((ps) => {
        const alertEmail = ps?.notifications?.adminAlertEmail || process.env.BUSINESS_EMAIL;
        if (alertEmail && ps?.notifications?.emailOnSupportTicket !== false) {
          sendEmail({
            email: alertEmail,
            toName: 'MakaziFlow Admin',
            subject: `[${ticketNumber}] New Landing Inquiry from ${cleanName}`,
            message: `<p><strong>Name:</strong> ${cleanName}<br/><strong>Email:</strong> ${cleanEmail}<br/><strong>Phone:</strong> ${cleanPhone}<br/><strong>Role:</strong> ${roleLabel} (${unitsLabel || 'N/A'})</p><p>${derivedBody.replace(/\n/g, '<br/>')}</p>`
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      ticketNumber,
      ticket
    });
  } catch (error) {
    console.error('Public contact submission error:', error.message);
    return res.status(500).json({ message: 'Failed to submit contact inquiry. Please try again.' });
  }
});

module.exports = router;
