// Real API Implementation connected to MERN Backend
import { toast } from "sonner"; // Assuming sonner is used, or replace with console for now if imports differ

const RENDER_PROD_API = 'https://rental-manager-1-7jmg.onrender.com/api';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // In local development, use Vite proxy to local server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api';
    }
    // On live production domain (makaziflow.afrinextech.co.ke or any external domain),
    // always connect directly to the live Render backend where MongoDB Atlas is connected.
    return RENDER_PROD_API;
  }
  return import.meta.env.VITE_API_URL || RENDER_PROD_API;
};

export const API_URL = getApiUrl();

export async function smartFetch(url, options = {}) {
  let targetUrl = url;
  if (typeof targetUrl === 'string' && targetUrl.startsWith('/api')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      targetUrl = targetUrl.replace(/^\/api/, RENDER_PROD_API);
    }
  }
  try {
    let res = await fetch(targetUrl, options);
    if (!res.ok && res.status >= 500 && typeof targetUrl === 'string' && targetUrl.startsWith('/api')) {
      const cloned = res.clone();
      const txt = await cloned.text().catch(() => '');
      if (txt.includes('Database connection failed') || txt.includes('Could not connect to any servers')) {
        console.warn('Primary /api failed with database IP block; routing to Render API...');
        const fallbackUrl = targetUrl.replace(/^\/api/, RENDER_PROD_API);
        return await fetch(fallbackUrl, options);
      }
    }
    return res;
  } catch (err) {
    if (typeof targetUrl === 'string' && targetUrl.startsWith('/api')) {
      console.warn('Primary /api network error; routing to Render API:', err.message);
      const fallbackUrl = targetUrl.replace(/^\/api/, RENDER_PROD_API);
      return await fetch(fallbackUrl, options);
    }
    throw err;
  }
}


async function parseApiResponse(response, defaultErrorMsg = 'Request failed') {
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem("rental_user");
      window.dispatchEvent(new Event("auth:logout"));
    }
    if (data && (data.message || data.error)) {
      throw new Error(data.message || data.error);
    }
    if (response.status === 405) {
      throw new Error('API Method Not Allowed (405). The requested endpoint does not accept this method or is not deployed properly.');
    }
    if (response.status === 404) {
      throw new Error('API Endpoint Not Found (404). Please ensure the backend server is reachable.');
    }
    if (response.status >= 500) {
      throw new Error(`Server Error (${response.status}): The backend encountered an issue. Please try again.`);
    }
    throw new Error(defaultErrorMsg);
  }

  return data !== null ? data : {};
}

export const getAuthHeaders = () => {
  const storedUser = localStorage.getItem("rental_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const token = user?.token;
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  API_URL,
  getAuthHeaders, // Expose for direct fetch use
  logout: async () => {
    try {
      const response = await smartFetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      return await response.json().catch(() => ({}));
    } catch {
      return {};
    }
  },
  // Users
  login: async (email, password, turnstileToken) => {
    const response = await smartFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ email, password, turnstileToken })
    });
    return await parseApiResponse(response, 'Login failed');
  },

  verifyLoginOtp: async (email, otp) => {
    const response = await smartFetch(`${API_URL}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ email, otp })
    });
    return await parseApiResponse(response, 'OTP verification failed');
  },

  resendLoginOtp: async (email) => {
    const response = await smartFetch(`${API_URL}/auth/resend-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ email })
    });
    return await parseApiResponse(response, 'Failed to resend verification code');
  },

  registerUser: async (userData) => {
    const response = await smartFetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response, 'Registration failed');
  },

  googleAuth: async (payload) => {
    try {
      const response = await smartFetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Google sign-in failed');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  appleAuth: async (payload) => {
    try {
      const response = await smartFetch(`${API_URL}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Apple sign-in failed');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await smartFetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset code');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    try {
      const response = await smartFetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email, code, newPassword })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  verifyEmail: async (email, otp) => {
    try {
        const response = await smartFetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ email, otp })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Verification failed');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
  },

  updateUser: async (updates) => {
    // Placeholder - Logic needs backend route
    return updates; 
  },

  getMe: async () => {
    const response = await smartFetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(), credentials: 'include'
    });
    return await parseApiResponse(response, 'Failed to fetch user profile');
  },

  submitOnboarding: async (data) => {
    const response = await smartFetch(`${API_URL}/auth/onboarding`, {
      method: 'POST',
      headers: getAuthHeaders(), credentials: 'include',
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response, 'Failed to save onboarding settings');
  },

  seedDemoMode: async () => {
    const response = await smartFetch(`${API_URL}/auth/demo-mode/seed`, {
      method: 'POST',
      headers: getAuthHeaders(), credentials: 'include'
    });
    return await parseApiResponse(response, 'Failed to activate demo mode');
  },

  clearDemoMode: async () => {
    const response = await smartFetch(`${API_URL}/auth/demo-mode/clear`, {
      method: 'POST',
      headers: getAuthHeaders(), credentials: 'include'
    });
    return await parseApiResponse(response, 'Failed to clear demo mode');
  },
  
  changePassword: async (oldPassword, newPassword) => {
    const response = await smartFetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(), credentials: 'include',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to change password');
    }
    return await response.json();
  },

  // 2FA
  enable2FA: async () => {
    const response = await smartFetch(`${API_URL}/auth/2fa/enable`, { 
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include' 
    });
    if (!response.ok) throw new Error("Could not initiate 2FA setup");
    return await response.json();
  },
  
  verifyAndEnable2FA: async (token) => {
    const response = await smartFetch(`${API_URL}/auth/2fa/verify`, { 
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    if (!response.ok) throw new Error("Invalid 2FA code");
    return await response.json();
  },

  disable2FA: async () => {
    const response = await smartFetch(`${API_URL}/auth/2fa/disable`, { 
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include' 
    });
    if (!response.ok) throw new Error("Could not disable 2FA");
    return await response.json();
  },
  
  // Properties
  getProperties: async () => {
    try {
      const response = await smartFetch(`${API_URL}/properties`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  },
  addProperty: async (prop) => {
    const response = await smartFetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(prop)
    });
    if (!response.ok) throw new Error("Failed to add property");
    return await response.json();
  },
  updateProperty: async (updatedProp) => {
    const response = await smartFetch(`${API_URL}/properties/${updatedProp.id}`, { // Assuming id is reachable
        method: 'PUT',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(updatedProp)
    });
    if (!response.ok) throw new Error("Failed to update property");
    return await response.json();
  },
  deleteProperty: async (id) => {
    const response = await smartFetch(`${API_URL}/properties/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), credentials: 'include'
    });
    return response.ok;
  },
  
  // Units (Real)
  getUnits: async (propertyId) => {
    try {
      let url = `${API_URL}/units`;
      let id = propertyId;
      if (id && typeof id === 'object') {
        id = id._id || id.id || null;
      }
      if (id && typeof id === 'string' && id !== '[object Object]' && id.trim()) {
        url += `?propertyId=${encodeURIComponent(id)}`;
      }
      const response = await smartFetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  },
  addUnit: async (unit) => {
    const response = await smartFetch(`${API_URL}/units`, {
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(unit)
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || "Failed to add unit");
      err.code = errBody.code;
      err.limit = errBody.limit;
      err.upgradeRequired = Boolean(errBody.upgradeRequired);
      throw err;
    }
    return await response.json();
  },
  updateUnit: async (unit) => {
     const response = await smartFetch(`${API_URL}/units/${unit.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(unit)
    });
    if (!response.ok) throw new Error("Failed to update unit");
    return await response.json();
  },
  deleteUnit: async (id) => {
     const response = await smartFetch(`${API_URL}/units/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), credentials: 'include'
    });
    return response.ok;
  },

  // Caretakers
  getCaretakers: async () => {
    const response = await smartFetch(`${API_URL}/users?role=caretaker`, { headers: getAuthHeaders(), credentials: 'include' });
    if (!response.ok) return [];
    return await response.json();
  },
  assignCaretaker: async (propertyId, caretakerId) => {
    const response = await smartFetch(`${API_URL}/properties/${propertyId}`, {
        method: 'PUT',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify({ caretakerId })
    });
    if (!response.ok) throw new Error("Failed to assign caretaker");
    return await response.json();
  },

  // Tenants - REAL
  getTenants: async () => {
    try {
      const response = await smartFetch(`${API_URL}/tenants`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  },
  addTenant: async (tenant) => {
    const response = await smartFetch(`${API_URL}/tenants`, {
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error("Failed to add tenant");
    return await response.json();
  },
  updateTenant: async (tenant) => {
     const response = await smartFetch(`${API_URL}/tenants/${tenant._id || tenant.id}`, { // Handle mongo _id
        method: 'PUT',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error("Failed to update tenant");
    return await response.json();
  },
  deleteTenant: async (id) => {
     const response = await smartFetch(`${API_URL}/tenants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(), credentials: 'include'
    });
    return response.ok;
  },

  // Payments (Real)
  getPayments: async () => {
    const response = await smartFetch(`${API_URL}/payments`, { headers: getAuthHeaders(), credentials: 'include' });
    if (!response.ok) return [];
    const data = await response.json();
    // Transform to match frontend expectation (tenantId as name string for display)
    return data.map(p => ({
        ...p,
        id: p._id, // Ensure ID is available as .id
        tenantId: p.tenantId?.name || "Unknown",
        unitId: p.unitId // Keep as object or ID depending on population
    }));
  },
  getPayment: async (id) => {
      const response = await smartFetch(`${API_URL}/payments/${id}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error("Payment not found");
      return await response.json();
  },
  recordPayment: async (paymentData) => {
    const response = await smartFetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record payment");
    }
    return await response.json();
  },
  addPayment: async (paymentData) => {
    return await api.recordPayment(paymentData);
  },
  
  emailReceipt: async (paymentId) => {
      const response = await smartFetch(`${API_URL}/payments/${paymentId}/email`, {
          method: 'POST',
          headers: getAuthHeaders(), credentials: 'include'
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to send email");
      }
      return await response.json();
  },

  sendInvoice: async (invoiceData) => {
    const response = await smartFetch(`${API_URL}/payments/send-invoice`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(invoiceData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to dispatch invoice");
    }
    return await response.json();
  },
  
  initiateSTKPush: async (paymentData) => {
      const response = await smartFetch(`${API_URL}/mpesa/stk-push`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData)
      });
      if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "STK Push Failed");
      }
      return await response.json();
  },
  getNotifications: async () => [],
  getStats: async () => {
    const response = await smartFetch(`${API_URL}/dashboard/stats`, { headers: getAuthHeaders(), credentials: 'include' });
    if (!response.ok) return {}; 
    return await response.json();
  },
  getActivityLogs: async () => {
    try {
      const response = await smartFetch(`${API_URL}/activity-logs`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  },
  logActivity: async (action, description, type = 'info', status = 'success') => {
    try {
      await smartFetch(`${API_URL}/activity-logs`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, description, type, status })
      });
    } catch (e) {
      console.warn("Client activity log skipped:", e);
    }
  },
  getDocuments: async () => [],
  addDocument: async () => {},
  getReminders: async () => {
      const response = await smartFetch(`${API_URL}/reminders`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
  },
  getDebtors: async () => {
      const response = await smartFetch(`${API_URL}/reminders/debtors`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      return await response.json();
  },
  addReminder: async (reminderData) => {
      const response = await smartFetch(`${API_URL}/reminders`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(reminderData)
      });
      if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to create reminder");
      }
      return await response.json();
  },
  sendReminderNow: async (id) => {
      const response = await smartFetch(`${API_URL}/reminders/${id}/send`, {
          method: 'POST',
          headers: getAuthHeaders(), credentials: 'include'
      });
      if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to send reminder");
      }
      return await response.json();
  },
  deleteReminder: async (id) => {
      await smartFetch(`${API_URL}/reminders/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(), credentials: 'include'
      });
  },
  sendBrevoCampaign: async (campaignData) => {
      const response = await smartFetch(`${API_URL}/reminders/campaign`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(campaignData)
      });
      return await parseApiResponse(response, 'Failed to create Brevo email campaign');
  },
  getExpenses: async () => {
    const response = await smartFetch(`${API_URL}/expenses`, { headers: getAuthHeaders(), credentials: 'include' });
    if (!response.ok) return [];
    return await response.json();
  },
  addExpense: async (expense) => {
    const payload = {
      ...expense,
      title: expense.title || expense.description || 'General Expense',
      description: expense.description || expense.title || 'General Expense',
      amount: Number(expense.amount)
    };
    const response = await smartFetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(), credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to add expense');
    }
    return await response.json();
  },
  deleteExpense: async (id) => {
    const response = await smartFetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(), credentials: 'include'
    });
    return response.ok;
  },
  getSettings: async () => {
    try {
      const response = await smartFetch(`${API_URL}/settings`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return {};
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return {};
      return await response.json();
    } catch {
      return {};
    }
  },
  updateSettings: async (settings) => {
    const response = await smartFetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return await response.json();
  },
  testSMTP: async (config) => {
    const response = await smartFetch(`${API_URL}/settings/test-smtp`, {
        method: 'POST',
        headers: getAuthHeaders(), credentials: 'include',
        body: JSON.stringify(config)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "SMTP Test Failed");
    }
    return await response.json();
  },

  getReportsData: async () => {
    const response = await smartFetch(`${API_URL}/reports`, { headers: getAuthHeaders(), credentials: 'include' });
    if (!response.ok) return {};
    return await response.json();
  },
  getKraTaxReport: async (month) => {
      let url = `${API_URL}/reports/kra-tax-report`;
      if (month) url += `?month=${month}`;
      const response = await smartFetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch tax report");
      return await response.json();
  },
  fileKraReturn: async (data) => {
      // Placeholder for KRA filing API
      const response = await smartFetch(`${API_URL}/reports/kra-file-return`, {
          method: 'POST', 
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to submit return");
      return await response.json();
  },
  getActivityLogs: async () => {
    try {
      const response = await smartFetch(`${API_URL}/activity-logs`, { headers: getAuthHeaders(), credentials: 'include' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  clearActivityLogs: async () => {
    try {
      const response = await smartFetch(`${API_URL}/activity-logs/clear`, {
        method: 'DELETE',
        headers: getAuthHeaders(), credentials: 'include'
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  resetData: async () => { localStorage.clear(); window.location.reload(); },

  // ─── SaaS Subscriptions & Unit Entitlements ───────────────────────────────
  getSubscriptionPlans: async () => {
    const response = await smartFetch(`${API_URL}/subscriptions/plans`);
    return await parseApiResponse(response, "Failed to load subscription plans");
  },
  calculateSubscription: async (payload) => {
    const response = await smartFetch(`${API_URL}/subscriptions/calculate`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to calculate subscription price");
  },
  getMySubscription: async () => {
    const response = await smartFetch(`${API_URL}/subscriptions/my`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load subscription details");
  },
  subscribeToPlan: async (payload) => {
    const response = await smartFetch(`${API_URL}/subscriptions/subscribe`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || "Subscription initiation failed");
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },
  cancelSubscription: async (reason) => {
    const response = await smartFetch(`${API_URL}/subscriptions/cancel`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ reason })
    });
    return await parseApiResponse(response, "Failed to cancel subscription");
  },
  previewDowngrade: async (payload) => {
    const response = await smartFetch(`${API_URL}/subscriptions/downgrade-preview`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to preview downgrade");
  },

  // ─── Centralized Payment Gateway (Pesaflow + Adapters) & Tenant Portal ────
  getPaymentProviders: async () => {
    const response = await smartFetch(`${API_URL}/v2/payments/providers`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load payment providers");
  },
  initiateTenantPayment: async (payload) => {
    const response = await smartFetch(`${API_URL}/v2/payments/tenant/initiate`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || "Failed to initiate tenant payment");
      err.code = data.code;
      throw err;
    }
    return data;
  },
  verifyGatewayTransaction: async (transactionId) => {
    const response = await smartFetch(`${API_URL}/v2/payments/verify/${transactionId}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to verify transaction");
  },
  getGatewayTransactions: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const response = await smartFetch(`${API_URL}/v2/payments/transactions${qs ? `?${qs}` : ""}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load transactions");
  },
  getStructuredInvoices: async (category = "") => {
    const response = await smartFetch(`${API_URL}/v2/payments/invoices${category ? `?category=${category}` : ""}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load invoices");
  },
  createStructuredInvoice: async (payload) => {
    const response = await smartFetch(`${API_URL}/v2/payments/invoices`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to create invoice");
  },
  getTenantPortalSummary: async () => {
    const response = await smartFetch(`${API_URL}/v2/payments/tenant-portal/summary`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load tenant portal summary");
  },

  // ─── KRA eTIMS Compliance ─────────────────────────────────────────────────
  submitInvoiceToEtims: async (invoiceId, overrideConfig = {}) => {
    const response = await smartFetch(`${API_URL}/v2/payments/etims/submit/${invoiceId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(overrideConfig)
    });
    return await parseApiResponse(response, "Failed to submit invoice to eTIMS");
  },
  retryEtimsSubmission: async (submissionId) => {
    const response = await smartFetch(`${API_URL}/v2/payments/etims/retry/${submissionId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to retry eTIMS submission");
  },
  getEtimsSubmissions: async () => {
    const response = await smartFetch(`${API_URL}/v2/payments/etims/submissions`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load eTIMS submissions");
  },

  // ─── Super Admin Financial & Subscription Governance ──────────────────────
  getSuperAdminOverview: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/overview`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load Super Admin overview");
  },
  getSuperAdminPlans: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/plans`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load plans");
  },
  createSuperAdminPlan: async (payload) => {
    const response = await smartFetch(`${API_URL}/super-admin/plans`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to create plan");
  },
  updateSuperAdminPlan: async (id, payload) => {
    const response = await smartFetch(`${API_URL}/super-admin/plans/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to update plan");
  },
  getSuperAdminLandlords: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/landlords`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load landlords");
  },
  overrideLandlordSubscription: async (landlordId, payload) => {
    const response = await smartFetch(`${API_URL}/super-admin/landlords/${landlordId}/subscription-override`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return await parseApiResponse(response, "Failed to update landlord subscription");
  },
  getSuperAdminTransactions: async (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== "all"));
    const qs = new URLSearchParams(clean).toString();
    const response = await smartFetch(`${API_URL}/super-admin/transactions${qs ? `?${qs}` : ""}`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load Super Admin transactions");
  },
  getSuperAdminUnmatched: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/unmatched`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load unmatched payments");
  },
  verifySuperAdminTransaction: async (id) => {
    const response = await smartFetch(`${API_URL}/super-admin/transactions/${id}/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to verify transaction");
  },
  reverseSuperAdminTransaction: async (id, reason) => {
    const response = await smartFetch(`${API_URL}/super-admin/transactions/${id}/reverse`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ reason })
    });
    return await parseApiResponse(response, "Failed to reverse transaction");
  },
  processSubscriptionExpirations: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/subscriptions/process-expirations`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to process expirations");
  },
  getSubscriptionAuditLogs: async () => {
    const response = await smartFetch(`${API_URL}/super-admin/audit-logs`, {
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await parseApiResponse(response, "Failed to load subscription audit logs");
  },
  getGoogleReviews: async () => {
    try {
      const response = await smartFetch(`${API_URL}/public/google-reviews`);
      if (!response.ok) return { configured: false, rating: null, userRatingCount: 0, reviews: [] };
      return await response.json();
    } catch {
      return { configured: false, rating: null, userRatingCount: 0, reviews: [] };
    }
  }
};
