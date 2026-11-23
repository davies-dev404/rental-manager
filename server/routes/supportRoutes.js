const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const supportController = require('../controllers/admin/supportController');

// Authenticated users (landlords, managers, caretakers, tenants) submit support tickets & track status
router.post('/tickets', protect, supportController.submitTicketFromUser);
router.get('/tickets/mine', protect, supportController.listMyTickets);

module.exports = router;
