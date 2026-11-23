const express = require('express');
const router = express.Router();

const { requireSuperAdmin, adminActionLimiter } = require('../middleware/adminMiddleware');
const { validateObjectId } = require('../middleware/securityMiddleware');

const dashboardController = require('../controllers/admin/dashboardController');
const userController = require('../controllers/admin/userController');
const propertyController = require('../controllers/admin/propertyController');
const tenantController = require('../controllers/admin/tenantController');
const paymentController = require('../controllers/admin/paymentController');
const subscriptionController = require('../controllers/admin/subscriptionController');
const reportController = require('../controllers/admin/reportController');
const supportController = require('../controllers/admin/supportController');
const settingsController = require('../controllers/admin/settingsController');
const activityController = require('../controllers/admin/activityController');

router.use(requireSuperAdmin);
router.use(adminActionLimiter);

// Overview Dashboard
router.get('/dashboard', dashboardController.getOverviewDashboard);

// User Management
router.get('/users', userController.listUsers);
router.get('/users/:id', validateObjectId('id'), userController.getUserDetail);
router.patch('/users/:id/status', validateObjectId('id'), userController.updateUserStatus);

// Property Management
router.get('/properties', propertyController.listProperties);
router.get('/properties/:id', validateObjectId('id'), propertyController.getPropertyDetail);
router.patch('/properties/:id/flag', validateObjectId('id'), propertyController.flagProperty);

// Tenant Management
router.get('/tenants', tenantController.listTenants);
router.get('/tenants/:id', validateObjectId('id'), tenantController.getTenantDetail);

// Payments & Transactions
router.get('/payments/export', paymentController.exportPaymentsCsv);
router.get('/payments', paymentController.listPayments);
router.get('/payments/:id', validateObjectId('id'), paymentController.getPaymentDetail);
router.post('/payments/:id/verify', validateObjectId('id'), paymentController.verifyPayment);
router.post('/payments/:id/reverse', validateObjectId('id'), paymentController.reversePayment);

// Subscription & Plans Management
router.get('/subscriptions', subscriptionController.listSubscriptions);
router.post('/subscriptions/plans', subscriptionController.createPlan);
router.patch('/subscriptions/plans/:id', validateObjectId('id'), subscriptionController.updatePlan);
router.put('/subscriptions/plans/:id', validateObjectId('id'), subscriptionController.updatePlan);
router.post('/subscriptions/landlords/:id/override', validateObjectId('id'), subscriptionController.overrideLandlordSubscription);
router.post('/subscriptions/process-expirations', subscriptionController.runExpirySweep);

// Reports & Analytics (JSON, CSV, PDF)
router.get('/reports/:type/export', reportController.exportReport);
router.get('/reports/:type', reportController.getReportData);

// Support Management
router.get('/support', supportController.listTickets);
router.get('/support/:id', validateObjectId('id'), supportController.getTicketDetail);
router.patch('/support/:id', validateObjectId('id'), supportController.updateTicket);

// Platform Settings
router.get('/settings', settingsController.getPlatformSettings);
router.patch('/settings', settingsController.updatePlatformSettings);

// Security & Audit Logs
router.get('/activity-logs', activityController.listAuditLogs);

module.exports = router;
