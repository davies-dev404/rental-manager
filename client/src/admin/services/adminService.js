import { API_URL, smartFetch, getAuthHeaders, parseApiResponse } from "@/lib/api";

function buildQueryString(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all")
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : "";
}

async function downloadAdminBlob(url, fallbackFilename) {
  const response = await smartFetch(url, {
    headers: getAuthHeaders(),
    credentials: "include"
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Export failed");
  }
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  const blob = await response.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  return true;
}

export const adminService = {
  adminLogin: async (email, password, turnstileToken) => {
    const res = await smartFetch(`${API_URL}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, turnstileToken })
    });
    return parseApiResponse(res, "Invalid administrator credentials");
  },
  adminVerifyOtp: async (email, otp) => {
    const res = await smartFetch(`${API_URL}/admin/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, otp })
    });
    return parseApiResponse(res, "OTP verification failed");
  },
  adminResendOtp: async (email) => {
    const res = await smartFetch(`${API_URL}/admin/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email })
    });
    return parseApiResponse(res, "Failed to resend OTP");
  },
  getDashboard: async () => {
    const res = await smartFetch(`${API_URL}/admin/dashboard`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load dashboard statistics");
  },
  clearDemoData: async () => {
    const res = await smartFetch(`${API_URL}/admin/system/clear-demo-data`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to clear demo records");
  },
  cleanupTestAccounts: async (keepEmails = ["kipsoidavis@gmail.com"]) => {
    const res = await smartFetch(`${API_URL}/admin/system/cleanup-test-accounts`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ keepEmails })
    });
    return parseApiResponse(res, "Failed to clean up test accounts");
  },

  // Users
  getUsers: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/users${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load users");
  },
  getUserDetail: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load user profile");
  },
  updateUserProfile: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update user profile");
  },
  updateUserStatus: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update account status");
  },
  performUserAccountAction: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/actions`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to run account action");
  },
  exportUserData: (id, format = "json") =>
    downloadAdminBlob(
      `${API_URL}/admin/users/${id}/export${buildQueryString({ format })}`,
      `makaziflow-user360-${id}.${format}`
    ),
  getUserProperties: async (id, params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/properties${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load landlord properties");
  },
  exportUserPropertiesCsv: (id, params = {}) =>
    downloadAdminBlob(
      `${API_URL}/admin/users/${id}/properties${buildQueryString({ ...params, export: "csv" })}`,
      `landlord-properties-${id}.csv`
    ),
  manageUserProperty: async (userId, propertyId, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${userId}/properties/${propertyId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update property");
  },
  getUserTenants: async (id, params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/tenants${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load landlord tenants");
  },
  getUserPayments: async (id, params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/payments${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load financial intelligence");
  },
  exportUserPaymentsCsv: (id, params = {}) =>
    downloadAdminBlob(
      `${API_URL}/admin/users/${id}/payments${buildQueryString({ ...params, export: "csv" })}`,
      `landlord-payments-${id}.csv`
    ),
  getUserPaymentInvestigation: async (userId, paymentId) => {
    const res = await smartFetch(`${API_URL}/admin/users/${userId}/payments/${paymentId}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to inspect transaction");
  },
  getUserSubscriptions: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/subscriptions`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load subscription details");
  },
  manageUserSubscription: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/subscriptions/manage`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update subscription");
  },
  getUserSecurityAudit: async (id, params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/security${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load security & audit history");
  },
  getUserSupportCenter: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/support`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load support center");
  },
  createUserInternalNote: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/notes`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to save internal note");
  },
  sendUserNotification: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/notify`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to send notification");
  },

  // Properties
  getProperties: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/properties${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load properties");
  },
  getPropertyDetail: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/properties/${id}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load property details");
  },
  flagProperty: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/properties/${id}/flag`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update property status");
  },

  // Tenants
  getTenants: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/tenants${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load tenants");
  },
  getTenantDetail: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/tenants/${id}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load tenant details");
  },

  // Payments
  getPayments: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/payments${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load transactions");
  },
  getPaymentDetail: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/payments/${id}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load transaction details");
  },
  verifyPayment: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/payments/${id}/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to verify transaction");
  },
  reversePayment: async (id, reason) => {
    const res = await smartFetch(`${API_URL}/admin/payments/${id}/reverse`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ reason })
    });
    return parseApiResponse(res, "Failed to reverse transaction");
  },
  exportPaymentsCsv: (params = {}) =>
    downloadAdminBlob(
      `${API_URL}/admin/payments/export${buildQueryString(params)}`,
      `makaziflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    ),
  getReconciliationOverview: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/reconciliation/overview${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load financial reconciliation overview");
  },
  getReconciliationCallbacks: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/reconciliation/callbacks${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load payment callbacks");
  },
  resolveCallback: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/reconciliation/callbacks/${id}/resolve`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update callback reconciliation");
  },
  getEtimsSubmissions: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/reconciliation/etims${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load eTIMS submissions");
  },
  retryEtimsSubmission: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/reconciliation/etims/${id}/retry`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to retry eTIMS submission");
  },

  // Subscriptions
  getSubscriptions: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load subscriptions");
  },
  createPlan: async (payload) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/plans`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to create plan");
  },
  updatePlan: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/plans/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update plan");
  },
  overrideSubscription: async (landlordId, payload) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/landlords/${landlordId}/override`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to override subscription");
  },
  runExpirySweep: async () => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/process-expirations`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to process subscription expirations");
  },
  extendTrial: async (landlordId, payload) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/landlords/${landlordId}/extend-trial`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to extend trial");
  },
  manageSubscriptionLifecycle: async (subscriptionId, payload) => {
    const res = await smartFetch(`${API_URL}/admin/subscriptions/${subscriptionId}/lifecycle`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update subscription lifecycle");
  },
  globalSearch: async (q) => {
    const res = await smartFetch(`${API_URL}/admin/search${buildQueryString({ q })}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to search platform records");
  },

  // Reports
  getReport: async (type, params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/reports/${type}${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to generate report");
  },
  exportReport: (type, format = "csv", params = {}) =>
    downloadAdminBlob(
      `${API_URL}/admin/reports/${type}/export${buildQueryString({ ...params, format })}`,
      `makaziflow-${type}-report-${new Date().toISOString().slice(0, 10)}.${format}`
    ),

  // Support
  getSupportTickets: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/support${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load support tickets");
  },
  getSupportTicketDetail: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/support/${id}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load ticket");
  },
  updateSupportTicket: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/support/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update ticket");
  },

  // Settings
  getSettings: async () => {
    const res = await smartFetch(`${API_URL}/admin/settings`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load platform settings");
  },
  updateSettings: async (payload) => {
    const res = await smartFetch(`${API_URL}/admin/settings`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to save platform settings");
  },
  sendMaintenanceBroadcast: async () => {
    const res = await smartFetch(`${API_URL}/admin/settings/maintenance/notify`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to send maintenance email broadcast");
  },

  // Activity & Audit Logs
  getActivityLogs: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/activity-logs${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load activity logs");
  },

  // System Health, DLQ & Feature Flags
  getSystemHealth: async () => {
    const res = await smartFetch(`${API_URL}/admin/system-health`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load system health");
  },
  getFeatureFlags: async () => {
    const res = await smartFetch(`${API_URL}/admin/feature-flags`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load feature flags");
  },
  updateFeatureFlag: async (key, payload) => {
    const res = await smartFetch(`${API_URL}/admin/feature-flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update feature flag");
  },
  getDeadLetterJobs: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/dlq${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load dead letter jobs");
  },
  replayDeadLetterJob: async (id) => {
    const res = await smartFetch(`${API_URL}/admin/dlq/${id}/replay`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to replay dead letter job");
  },
  resolveDeadLetterJob: async (id, notes) => {
    const res = await smartFetch(`${API_URL}/admin/dlq/${id}/resolve`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ notes })
    });
    return parseApiResponse(res, "Failed to resolve dead letter job");
  }
};
