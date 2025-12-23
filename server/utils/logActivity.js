const ActivityLog = require('../models/ActivityLog');

/**
 * Log a user activity
 * @param {string|Object} user - User ID or User Object (optional) or "System"
 * @param {string} action - Short action name (e.g. "User Logged In")
 * @param {string} description - Detailed description
 * @param {string} type - 'auth', 'payment', 'tenant', 'settings', 'property', 'reminder'
 * @param {string} status - 'success', 'warning', 'error'
 */
const logActivity = async (user, action, description, type = 'info', status = 'success') => {
  try {
    let userName = 'System';
    
    if (user && typeof user === 'string') {
        userName = user;
    } else if (user && user.name) {
        userName = user.name;
    }

    await ActivityLog.create({
      user: userName,
      action,
      description,
      type,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to save activity log:', error);
    // Don't throw, just log error so main flow isn't interrupted
  }
};

module.exports = logActivity;
