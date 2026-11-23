const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/securityMiddleware');
const supportController = require('../controllers/admin/supportController');

// Authenticated users (landlords, managers, caretakers, tenants) submit support tickets, reply & stream updates
router.get('/stream', protect, supportController.streamUserSupport);
router.post('/tickets', protect, supportController.submitTicketFromUser);
router.get('/tickets/mine', protect, supportController.listMyTickets);
router.post('/tickets/:id/reply', protect, validateObjectId('id'), supportController.replyFromUser);

module.exports = router;
