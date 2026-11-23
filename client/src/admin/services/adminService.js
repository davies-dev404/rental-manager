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
  updateUserStatus: async (id, payload) => {
    const res = await smartFetch(`${API_URL}/admin/users/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return parseApiResponse(res, "Failed to update account status");
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

  // Activity & Audit Logs
  getActivityLogs: async (params = {}) => {
    const res = await smartFetch(`${API_URL}/admin/activity-logs${buildQueryString(params)}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return parseApiResponse(res, "Failed to load activity logs");
  }
};
