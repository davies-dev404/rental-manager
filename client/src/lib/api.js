// Real API Implementation connected to MERN Backend
import { toast } from "sonner"; // Assuming sonner is used, or replace with console for now if imports differ

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_DIR;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (!envUrl || envUrl.startsWith('http://localhost') || envUrl.startsWith('http://127.0.0.1')) {
      return '/api';
    }
  }
  if (import.meta.env.PROD) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '/api';
    }
  }
  return envUrl || '/api';
};

export const API_URL = getApiUrl();

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
  // Users
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await parseApiResponse(response, 'Login failed');
  },

  verifyLoginOtp: async (email, otp) => {
    const response = await fetch(`${API_URL}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return await parseApiResponse(response, 'OTP verification failed');
  },

  resendLoginOtp: async (email) => {
    const response = await fetch(`${API_URL}/auth/resend-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await parseApiResponse(response, 'Failed to resend verification code');
  },

  registerUser: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response, 'Registration failed');
  },

  googleAuth: async (payload) => {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_URL}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
  
  changePassword: async (oldPassword, newPassword) => {
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_URL}/auth/2fa/enable`, { 
        method: 'POST',
        headers: getAuthHeaders() 
    });
    if (!response.ok) throw new Error("Could not initiate 2FA setup");
    return await response.json();
  },
  
  verifyAndEnable2FA: async (token) => {
    const response = await fetch(`${API_URL}/auth/2fa/verify`, { 
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    if (!response.ok) throw new Error("Invalid 2FA code");
    return await response.json();
  },

  disable2FA: async () => {
    const response = await fetch(`${API_URL}/auth/2fa/disable`, { 
        method: 'POST',
        headers: getAuthHeaders() 
    });
    if (!response.ok) throw new Error("Could not disable 2FA");
    return await response.json();
  },
  
  // Properties
  getProperties: async () => {
    const response = await fetch(`${API_URL}/properties`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch properties");
    return await response.json();
  },
  addProperty: async (prop) => {
    const response = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(prop)
    });
    if (!response.ok) throw new Error("Failed to add property");
    return await response.json();
  },
  updateProperty: async (updatedProp) => {
    const response = await fetch(`${API_URL}/properties/${updatedProp.id}`, { // Assuming id is reachable
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedProp)
    });
    if (!response.ok) throw new Error("Failed to update property");
    return await response.json();
  },
  deleteProperty: async (id) => {
    const response = await fetch(`${API_URL}/properties/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
  },
  
  // Units (Real)
  getUnits: async (propertyId) => {
    let url = `${API_URL}/units`;
    let id = propertyId;
    if (id && typeof id === 'object') {
      id = id._id || id.id || null;
    }
    if (id && typeof id === 'string' && id !== '[object Object]' && id.trim()) {
      url += `?propertyId=${encodeURIComponent(id)}`;
    }
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) return []; // Fallback empty
    return await response.json();
  },
  addUnit: async (unit) => {
    const response = await fetch(`${API_URL}/units`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(unit)
    });
    if (!response.ok) throw new Error("Failed to add unit");
    return await response.json();
  },
  updateUnit: async (unit) => {
     const response = await fetch(`${API_URL}/units/${unit.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(unit)
    });
    if (!response.ok) throw new Error("Failed to update unit");
    return await response.json();
  },
  deleteUnit: async (id) => {
     const response = await fetch(`${API_URL}/units/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
  },

  // Caretakers
  getCaretakers: async () => {
    const response = await fetch(`${API_URL}/users?role=caretaker`, { headers: getAuthHeaders() });
    if (!response.ok) return [];
    return await response.json();
  },
  assignCaretaker: async (propertyId, caretakerId) => {
    const response = await fetch(`${API_URL}/properties/${propertyId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ caretakerId })
    });
    if (!response.ok) throw new Error("Failed to assign caretaker");
    return await response.json();
  },

  // Tenants - REAL
  getTenants: async () => {
    const response = await fetch(`${API_URL}/tenants`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch tenants");
    return await response.json();
  },
  addTenant: async (tenant) => {
    const response = await fetch(`${API_URL}/tenants`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error("Failed to add tenant");
    return await response.json();
  },
  updateTenant: async (tenant) => {
     const response = await fetch(`${API_URL}/tenants/${tenant._id || tenant.id}`, { // Handle mongo _id
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(tenant)
    });
    if (!response.ok) throw new Error("Failed to update tenant");
    return await response.json();
  },
  deleteTenant: async (id) => {
     const response = await fetch(`${API_URL}/tenants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
  },

  // Payments (Real)
  getPayments: async () => {
    const response = await fetch(`${API_URL}/payments`, { headers: getAuthHeaders() });
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
      const response = await fetch(`${API_URL}/payments/${id}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Payment not found");
      return await response.json();
  },
  recordPayment: async (paymentData) => {
    const response = await fetch(`${API_URL}/payments`, {
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
      const response = await fetch(`${API_URL}/payments/${paymentId}/email`, {
          method: 'POST',
          headers: getAuthHeaders()
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to send email");
      }
      return await response.json();
  },
  
  initiateSTKPush: async (paymentData) => {
      const response = await fetch(`${API_URL}/mpesa/stk-push`, {
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
    const response = await fetch(`${API_URL}/dashboard/stats`, { headers: getAuthHeaders() });
    if (!response.ok) return {}; 
    return await response.json();
  },
  getActivityLogs: async () => {
    try {
      const response = await fetch(`${API_URL}/activity-logs`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  },
  logActivity: async (action, description, type = 'info', status = 'success') => {
    try {
      await fetch(`${API_URL}/activity-logs`, {
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
      const response = await fetch(`${API_URL}/reminders`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      return await response.json();
  },
  getDebtors: async () => {
      const response = await fetch(`${API_URL}/reminders/debtors`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      return await response.json();
  },
  addReminder: async (reminderData) => {
      const response = await fetch(`${API_URL}/reminders`, {
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
      const response = await fetch(`${API_URL}/reminders/${id}/send`, {
          method: 'POST',
          headers: getAuthHeaders()
      });
      if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to send reminder");
      }
      return await response.json();
  },
  deleteReminder: async (id) => {
      await fetch(`${API_URL}/reminders/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
      });
  },
  getExpenses: async () => {
    const response = await fetch(`${API_URL}/expenses`, { headers: getAuthHeaders() });
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
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to add expense');
    }
    return await response.json();
  },
  deleteExpense: async (id) => {
    const response = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.ok;
  },
  getSettings: async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, { headers: getAuthHeaders() });
      if (!response.ok) return {};
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return {};
      return await response.json();
    } catch {
      return {};
    }
  },
  updateSettings: async (settings) => {
    const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return await response.json();
  },
  testSMTP: async (config) => {
    const response = await fetch(`${API_URL}/settings/test-smtp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "SMTP Test Failed");
    }
    return await response.json();
  },

  getReportsData: async () => {
    const response = await fetch(`${API_URL}/reports`, { headers: getAuthHeaders() });
    if (!response.ok) return {};
    return await response.json();
  },
  getKraTaxReport: async (month) => {
      let url = `${API_URL}/reports/kra-tax-report`;
      if (month) url += `?month=${month}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch tax report");
      return await response.json();
  },
  fileKraReturn: async (data) => {
      // Placeholder for KRA filing API
      const response = await fetch(`${API_URL}/reports/kra-file-return`, {
          method: 'POST', 
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to submit return");
      return await response.json();
  },
  getActivityLogs: async () => {
    try {
      const response = await fetch(`${API_URL}/activity-logs`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  clearActivityLogs: async () => {
    try {
      const response = await fetch(`${API_URL}/activity-logs/clear`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  resetData: async () => { localStorage.clear(); window.location.reload(); }
};
