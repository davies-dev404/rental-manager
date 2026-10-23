const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

// Get account-specific logs for current logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.id;
    const currentUserEmail = req.user?.email ? req.user.email.toLowerCase() : null;
    const currentUserName = req.user?.name;

    if (!currentUserId && !currentUserEmail) {
      return res.json([]);
    }

    // STRICT account-level isolation:
    // Only return logs explicitly belonging to this user's account ID or account Email.
    const query = {
      $or: [
        ...(currentUserId ? [{ userId: currentUserId }] : []),
        ...(currentUserEmail ? [{ userEmail: currentUserEmail }] : [])
      ]
    };

    let logs = await ActivityLog.find(query).sort({ timestamp: -1 }).limit(100);

    // If this account doesn't have any logs yet, initialize a welcoming first audit entry for this user
    if (!logs || logs.length === 0) {
      const initialLogs = [
        {
          user: currentUserName || currentUserEmail || 'User',
          userId: currentUserId,
          userEmail: currentUserEmail,
          action: 'Audit Trail Initialized',
          description: `Account-specific audit tracking enabled for ${currentUserName || currentUserEmail || 'account'}. Property updates, payments, and system changes are tracked here.`,
          type: 'auth',
          status: 'success',
          timestamp: new Date()
        }
      ];
      try {
        logs = await ActivityLog.insertMany(initialLogs);
      } catch (seedErr) {
        logs = initialLogs;
      }
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create log entry for current user
router.post('/', protect, async (req, res) => {
  try {
    const { action, description, type, status } = req.body;
    const log = await ActivityLog.create({
      user: req.user?.name || req.user?.email || 'User',
      userId: req.user?._id || req.user?.id || null,
      userEmail: req.user?.email ? req.user.email.toLowerCase() : null,
      action,
      description,
      type: type || 'general',
      status: status || 'success',
      timestamp: new Date()
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Clear account-specific logs
router.delete('/clear', protect, async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.id;
    const currentUserEmail = req.user?.email ? req.user.email.toLowerCase() : null;

    const conditions = [
      ...(currentUserId ? [{ userId: currentUserId }] : []),
      ...(currentUserEmail ? [{ userEmail: currentUserEmail }] : [])
    ];

    if (conditions.length > 0) {
      await ActivityLog.deleteMany({ $or: conditions });
    }
    res.json({ message: 'Audit trail cleared for this account.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
