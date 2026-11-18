const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const router = express.Router();

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

module.exports = router;
