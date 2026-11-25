const express = require('express');
const router = express.Router();

const { requireSuperAdmin, adminActionLimiter } = require('../middleware/adminMiddleware');
const { validateObjectId } = require('../middleware/securityMiddleware');

const dashboardController = require('../controllers/admin/dashboardController');
const userController = require('../controllers/admin/userController');
const user360Controller = require('../controllers/admin/user360Controller');
const propertyController = require('../controllers/admin/propertyController');
const tenantController = require('../controllers/admin/tenantController');
const paymentController = require('../controllers/admin/paymentController');
const subscriptionController = require('../controllers/admin/subscriptionController');
const reportController = require('../controllers/admin/reportController');
const supportController = require('../controllers/admin/supportController');
const settingsController = require('../controllers/admin/settingsController');
const activityController = require('../controllers/admin/activityController');
const systemController = require('../controllers/admin/systemController');

router.use(requireSuperAdmin);
router.use(adminActionLimiter);

// Overview Dashboard & Demo Data Maintenance Cleanup
router.get('/dashboard', dashboardController.getOverviewDashboard);
router.post('/system/clear-demo-data', dashboardController.clearDemoData);
router.post('/system/cleanup-test-accounts', dashboardController.cleanupTestAccounts);

// User Management & User 360° Dashboard
router.get('/users', userController.listUsers);
router.get('/users/:id', validateObjectId('id'), user360Controller.getUser360Overview);
router.patch('/users/:id', validateObjectId('id'), user360Controller.updateUserProfile);
router.patch('/users/:id/status', validateObjectId('id'), userController.updateUserStatus);
router.post('/users/:id/actions', validateObjectId('id'), user360Controller.performAccountAction);
router.get('/users/:id/export', validateObjectId('id'), user360Controller.exportUserData);
router.get('/users/:id/properties', validateObjectId('id'), user360Controller.getUserProperties);
router.patch('/users/:id/properties/:propertyId', validateObjectId('id'), user360Controller.manageUserProperty);
router.get('/users/:id/tenants', validateObjectId('id'), user360Controller.getUserTenants);
router.get('/users/:id/payments', validateObjectId('id'), user360Controller.getUserPayments);
router.get('/users/:id/payments/:paymentId', validateObjectId('id'), user360Controller.getUserPaymentInvestigation);
router.get('/users/:id/subscriptions', validateObjectId('id'), user360Controller.getUserSubscriptions);
router.post('/users/:id/subscriptions/manage', validateObjectId('id'), user360Controller.manageUserSubscription);
router.get('/users/:id/security', validateObjectId('id'), user360Controller.getUserSecurityAudit);
router.get('/users/:id/support', validateObjectId('id'), user360Controller.getUserSupportCenter);
router.post('/users/:id/notes', validateObjectId('id'), user360Controller.createInternalNote);
router.post('/users/:id/notify', validateObjectId('id'), user360Controller.sendUserNotification);

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

// Support Management & Real-Time SSE Stream
router.get('/support/stream', supportController.streamAdminSupport);
router.get('/support', supportController.listTickets);
router.get('/support/:id', validateObjectId('id'), supportController.getTicketDetail);
router.patch('/support/:id', validateObjectId('id'), supportController.updateTicket);

// Platform Settings
router.get('/settings', settingsController.getPlatformSettings);
router.patch('/settings', settingsController.updatePlatformSettings);
router.post('/settings/maintenance/notify', settingsController.sendMaintenanceBroadcast);

// Security & Audit Logs
router.get('/activity-logs', activityController.listAuditLogs);

// System Health, Telemetry, Feature Flags & Dead Letter Queue
router.get('/system-health', systemController.getSystemHealth);
router.get('/metrics', systemController.getPrometheusMetrics);
router.get('/feature-flags', systemController.listFeatureFlags);
router.patch('/feature-flags/:key', systemController.updateFeatureFlag);
router.get('/dlq', systemController.listDeadLetterJobs);
router.post('/dlq/:id/replay', validateObjectId('id'), systemController.replayDeadLetterJob);
router.patch('/dlq/:id/resolve', validateObjectId('id'), systemController.resolveDeadLetterJob);

module.exports = router;
