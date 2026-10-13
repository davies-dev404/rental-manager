const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

// Get all logs
router.get('/', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create log entry
router.post('/', protect, async (req, res) => {
  try {
    const { action, description, type, status } = req.body;
    const log = await ActivityLog.create({
      user: req.user?.name || req.user?.email || 'User',
      action,
      description,
      type: type || 'info',
      status: status || 'success',
      timestamp: new Date()
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
