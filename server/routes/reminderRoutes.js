const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { protect } = require('../middleware/authMiddleware');

// Get all reminders
router.get('/', protect, async (req, res) => {
  try {
    const reminders = await Reminder.find().sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reminder
router.post('/', protect, async (req, res) => {
  try {
    const reminder = await Reminder.create(req.body);
    res.status(201).json(reminder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete reminder
router.delete('/:id', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    
    await reminder.deleteOne();
    res.json({ message: 'Reminder removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
