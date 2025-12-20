// Mock API with LocalStorage Persistence
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Keys for localStorage - Versioned to force clear old data
const KEYS = {
  PROPERTIES: 'rental_properties_v2',
  UNITS: 'rental_units_v2',
  TENANTS: 'rental_tenants_v2',
  PAYMENTS: 'rental_payments_v2',
  NOTIFICATIONS: 'rental_notifications_v2',
  ACTIVITY_LOGS: 'rental_activity_logs_v2',
  DOCUMENTS: 'rental_documents_v2',
  REMINDERS: 'rental_reminders_v2',
  EXPENSES: 'rental_expenses_v2',
  SETTINGS: 'rental_settings_v2'
};

// Empty Defaults to initialize if storage is empty
const DEFAULTS = {
  PROPERTIES: [],
  UNITS: [],
  TENANTS: [],
  PAYMENTS: [],
  NOTIFICATIONS: [],
  ACTIVITY_LOGS: [],
  DOCUMENTS: [],
  REMINDERS: [],
  EXPENSES: [],
  SETTINGS: {
    notifications: {
      email: true,
      sms: true,
      push: true,
      reminderDays: 3
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    integrations: {
      mpesa: {
        enabled: false,
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        paybill: '',
        environment: 'sandbox'
      },
      sms: {
        provider: 'africastalking',
        apiKey: '',
        senderId: '',
        enabled: false
      },
      email: {
        provider: 'smtp',
        host: '',
        port: 587,
        user: '',
        pass: '',
        enabled: false
      }
    }
  }
};

// Helper to get data from storage or defaults
const getStorage = (key, defaultData) => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const setStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const api = {
  // Users
  login: async (email, role) => {
    await delay(500);
    return {
      id: "1",
      name: role === 'admin' ? "Admin User" : "Caretaker User",
      email: email,
      role: role,
      avatar: "https://github.com/shadcn.png" 
    };
  },

  // Properties
  getProperties: async () => {
    await delay(300);
    return getStorage(KEYS.PROPERTIES, DEFAULTS.PROPERTIES);
  },
  addProperty: async (prop) => {
    await delay(300);
    const properties = getStorage(KEYS.PROPERTIES, DEFAULTS.PROPERTIES);
    const newProp = { 
        ...prop, 
        id: Math.random().toString(36).substr(2, 9),
        units: 0,
        occupancy: 0 
    };
    properties.push(newProp);
    setStorage(KEYS.PROPERTIES, properties);
    return newProp;
  },
  updateProperty: async (updatedProp) => {
    await delay(300);
    const properties = getStorage(KEYS.PROPERTIES, DEFAULTS.PROPERTIES);
    const index = properties.findIndex(p => p.id === updatedProp.id);
    if (index !== -1) {
        properties[index] = { ...properties[index], ...updatedProp };
        setStorage(KEYS.PROPERTIES, properties);
        return properties[index];
    }
    throw new Error("Property not found");
  },
  deleteProperty: async (id) => {
    await delay(300);
    const properties = getStorage(KEYS.PROPERTIES, DEFAULTS.PROPERTIES);
    const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
    const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
    
    // Find units associated with property
    const propertyUnitIds = units.filter(u => u.propertyId === id).map(u => u.id);
    
    // Filter out tenants linked to these units
    const newTenants = tenants.filter(t => {
        const tenantUnitId = typeof t.unitId === 'object' ? t.unitId.id : t.unitId;
        return !propertyUnitIds.includes(tenantUnitId);
    });
    
    // Filter out units for this property
    const newUnits = units.filter(u => u.propertyId !== id);
    
    // Filter out property
    const newProperties = properties.filter(p => p.id !== id);
    
    setStorage(KEYS.TENANTS, newTenants);
    setStorage(KEYS.UNITS, newUnits);
    setStorage(KEYS.PROPERTIES, newProperties);
    
    return true;
  },

  // Units
  getUnits: async (propertyId) => {
    await delay(300);
    const allUnits = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
    if (!propertyId) return allUnits;
    return allUnits.filter(u => u.propertyId === propertyId);
  },
  addUnit: async (unit) => {
      await delay(300);
      const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
      const newUnit = { ...unit, id: Math.random().toString(36).substr(2, 9), status: 'vacant' };
      units.push(newUnit);
      setStorage(KEYS.UNITS, units);
      return newUnit;
  },
  updateUnit: async (unit) => {
      await delay(300);
      const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
      const index = units.findIndex(u => u.id === unit.id);
      if (index !== -1) {
          units[index] = { ...units[index], ...unit };
          setStorage(KEYS.UNITS, units);
          return units[index];
      }
      throw new Error("Unit not found");
  },
  deleteUnit: async (id) => {
      await delay(300);
      const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
      const newUnits = units.filter(u => u.id !== id);
      setStorage(KEYS.UNITS, newUnits);
      return true;
  },

  // Tenants
  getTenants: async () => {
    await delay(300);
    const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
    const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
    // Enrich tenant with unit object for display if unitId exists
    return tenants.map(t => {
        const unit = units.find(u => u.id === t.unitId);
        return {
            ...t,
            unitId: unit ? { ...unit, unitNumber: unit.unitNumber || unit.number } : t.unitId 
        };
    });
  },
  addTenant: async (tenant) => {
    await delay(300);
    const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
    const newTenant = { ...tenant, id: Math.random().toString(36).substr(2, 9) };
    tenants.push(newTenant);
    setStorage(KEYS.TENANTS, tenants);
    
    // Update unit status to occupied
    if (tenant.unitId) {
        const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
        const updatedUnits = units.map(u => u.id === tenant.unitId ? { ...u, status: 'occupied' } : u);
        setStorage(KEYS.UNITS, updatedUnits);
    }
    
    return newTenant;
  },
  updateTenant: async (tenant) => {
      await delay(300);
      const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
      const index = tenants.findIndex(t => t.id === tenant.id);
      
      if (index !== -1) {
          // If unit changed, handle occupancy
          const oldUnitId = typeof tenants[index].unitId === 'object' ? tenants[index].unitId.id : tenants[index].unitId;
          const newUnitId = typeof tenant.unitId === 'object' ? tenant.unitId.id : tenant.unitId;

          if (oldUnitId !== newUnitId) {
             const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
             // Vacate old
             if (oldUnitId) {
                 const uIndex = units.findIndex(u => u.id === oldUnitId);
                 if (uIndex !== -1) units[uIndex].status = 'vacant';
             }
             // Occupy new
             if (newUnitId) {
                 const uIndex = units.findIndex(u => u.id === newUnitId);
                 if (uIndex !== -1) units[uIndex].status = 'occupied';
             }
             setStorage(KEYS.UNITS, units);
          }

          tenants[index] = { ...tenants[index], ...tenant };
          setStorage(KEYS.TENANTS, tenants);
          return tenants[index];
      }
      throw new Error("Tenant not found");
  },
  terminateLease: async (id) => {
      await delay(300);
      const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
      const index = tenants.findIndex(t => t.id === id);
      if (index !== -1) {
          tenants[index].status = 'past';
          tenants[index].leaseEnd = new Date().toISOString().split('T')[0];
          setStorage(KEYS.TENANTS, tenants);
          
          // Vacate Unit
          const unitId = typeof tenants[index].unitId === 'object' ? tenants[index].unitId.id : tenants[index].unitId;
          if (unitId) {
              const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
              const uIndex = units.findIndex(u => u.id === unitId);
              if (uIndex !== -1) {
                  units[uIndex].status = 'vacant';
                  setStorage(KEYS.UNITS, units);
              }
          }
          return true;
      }
      throw new Error("Tenant not found");
  },
  deleteTenant: async (id) => {
      await delay(300);
      const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
      const tenant = tenants.find(t => t.id === id);
      
      if (tenant) {
          // Vacate Unit if active
          if (tenant.status === 'active') {
              const unitId = typeof tenant.unitId === 'object' ? tenant.unitId.id : tenant.unitId;
              if (unitId) {
                  const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
                  const uIndex = units.findIndex(u => u.id === unitId);
                  if (uIndex !== -1) {
                      units[uIndex].status = 'vacant';
                      setStorage(KEYS.UNITS, units);
                  }
              }
          }
          
          const newTenants = tenants.filter(t => t.id !== id);
          setStorage(KEYS.TENANTS, newTenants);
          return true;
      }
      return false;
  },

  // Payments
  getPayments: async () => {
    await delay(300);
    return getStorage(KEYS.PAYMENTS, DEFAULTS.PAYMENTS);
  },
  recordPayment: async (payment) => {
    await delay(300);
    const payments = getStorage(KEYS.PAYMENTS, DEFAULTS.PAYMENTS);
    const newPayment = { ...payment, id: Math.random().toString(36).substr(2, 9), status: "Completed" };
    payments.push(newPayment);
    setStorage(KEYS.PAYMENTS, payments);
    return newPayment;
  },

  // Notifications
  getNotifications: async () => {
    await delay(200);
    return getStorage(KEYS.NOTIFICATIONS, DEFAULTS.NOTIFICATIONS);
  },
  markNotificationRead: async (id) => {
      const notes = getStorage(KEYS.NOTIFICATIONS, DEFAULTS.NOTIFICATIONS);
      const updated = notes.map(n => n.id === id ? { ...n, read: true } : n);
      setStorage(KEYS.NOTIFICATIONS, updated);
      return updated;
  },

  // Dashboard Stats
  getStats: async () => {
    await delay(300);
    const properties = getStorage(KEYS.PROPERTIES, DEFAULTS.PROPERTIES);
    const units = getStorage(KEYS.UNITS, DEFAULTS.UNITS);
    const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
    const payments = getStorage(KEYS.PAYMENTS, DEFAULTS.PAYMENTS);
    
    // Filter out orphaned units (units whose property doesn't exist)
    const validUnits = units.filter(u => properties.some(p => p.id === u.propertyId));
    
    // Filter out orphaned tenants (tenants whose unit doesn't exist or is invalid)
    const validTenants = tenants.filter(t => {
        const unitId = typeof t.unitId === 'object' ? t.unitId.id : t.unitId;
        return validUnits.some(u => u.id === unitId);
    });

    const totalProperties = properties.length;
    const totalUnits = validUnits.length;
    const occupiedUnits = validUnits.filter(u => u.status === 'occupied').length;
    const vacantUnits = totalUnits - occupiedUnits;

    // Calculate collected vs outstanding
    const collected = payments
        .filter(p => p.status === 'Completed')
        .reduce((acc, curr) => acc + (parseInt(curr.amount) || 0), 0);
        
    const outstanding = payments
        .filter(p => p.status === 'Pending')
        .reduce((acc, curr) => acc + (parseInt(curr.amount) || 0), 0);

    // Estimate expected monthly rent from VALID occupied units
    const expectedRent = validUnits
        .filter(u => u.status === 'occupied')
        .reduce((acc, curr) => acc + (parseInt(curr.rentAmount) || 0), 0);
        
    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      collectedThisMonth: collected,
      outstandingAmount: outstanding,
      expectedMonthlyRent: expectedRent
    };
  },

  // Tools & Analytics
  getActivityLogs: async () => {
      await delay(300);
      return getStorage(KEYS.ACTIVITY_LOGS, DEFAULTS.ACTIVITY_LOGS);
  },
  logActivity: async (action, description, type, user = "Admin User") => {
      const logs = getStorage(KEYS.ACTIVITY_LOGS, DEFAULTS.ACTIVITY_LOGS);
      const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          user,
          action,
          description,
          status: 'success',
          type
      };
      logs.unshift(newLog); // Add to top
      setStorage(KEYS.ACTIVITY_LOGS, logs);
      return newLog;
  },

  getDocuments: async () => {
      await delay(300);
      return getStorage(KEYS.DOCUMENTS, DEFAULTS.DOCUMENTS);
  },
  addDocument: async (doc) => {
      await delay(300);
      const docs = getStorage(KEYS.DOCUMENTS, DEFAULTS.DOCUMENTS);
      const newDoc = {
          ...doc,
          id: Math.random().toString(36).substr(2, 9),
          uploadDate: new Date().toISOString().split('T')[0],
          size: "1.2 MB" // Mock size
      };
      docs.push(newDoc);
      setStorage(KEYS.DOCUMENTS, docs);
      return newDoc;
  },

  getReminders: async () => {
      await delay(300);
      return getStorage(KEYS.REMINDERS, DEFAULTS.REMINDERS);
  },
  addReminder: async (reminder) => {
      await delay(300);
      const reminders = getStorage(KEYS.REMINDERS, DEFAULTS.REMINDERS);
      const newReminder = { ...reminder, id: Math.random().toString(36).substr(2, 9), status: 'pending' };
      reminders.push(newReminder);
      setStorage(KEYS.REMINDERS, reminders);
      return newReminder;
  },

  getExpenses: async () => {
    await delay(300);
    return getStorage(KEYS.EXPENSES, DEFAULTS.EXPENSES);
  },
  addExpense: async (expense) => {
    await delay(300);
    const expenses = getStorage(KEYS.EXPENSES, DEFAULTS.EXPENSES);
    const newExpense = { 
        ...expense, 
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0]
    };
    expenses.push(newExpense);
    setStorage(KEYS.EXPENSES, expenses);
    return newExpense;
  },
  
  // Settings
  getSettings: async () => {
      await delay(300);
      return getStorage(KEYS.SETTINGS, DEFAULTS.SETTINGS);
  },
  updateSettings: async (newSettings) => {
      await delay(500);
      setStorage(KEYS.SETTINGS, newSettings);
      return newSettings;
  },

  getReportsData: async () => {
    await delay(500);
    // Derive real data for reports
    const payments = getStorage(KEYS.PAYMENTS, DEFAULTS.PAYMENTS);
    const tenants = getStorage(KEYS.TENANTS, DEFAULTS.TENANTS);
    const expenses = getStorage(KEYS.EXPENSES, DEFAULTS.EXPENSES);
    
    // Revenue Data (Group by month - simplified for demo)
    const revenueMap = {};
    payments.forEach(p => {
        const month = new Date(p.date).toLocaleString('default', { month: 'short' });
        if (!revenueMap[month]) revenueMap[month] = { month, collected: 0, expected: 0 };
        if (p.status === 'Completed') revenueMap[month].collected += parseInt(p.amount);
        // Assuming expected is same as collected for completed, and amount for pending (simplified)
        revenueMap[month].expected += parseInt(p.amount); 
    });
    // Fill in last 6 months if empty
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]; // Static for now or dynamic
    const revenueData = months.map(m => revenueMap[m] || { month: m, collected: 0, expected: 0 });

    // Tenant Data (Real Logic)
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    let paidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;

    tenants.forEach(t => {
        // Find payments for this tenant for this month
        const tenantPayments = payments.filter(p => p.tenantId === t.id && p.date.startsWith(currentMonthStr));
        const totalPaid = tenantPayments.filter(p => p.status === 'Completed').reduce((acc, p) => acc + (parseInt(p.amount)||0), 0);
        const hasPending = tenantPayments.some(p => p.status === 'Pending');
        
        // Simple logic: if paid > 0, they are paid (or partial). If 0, overdue.
        // In real app, compare vs unit rent.
        if (totalPaid > 0) {
            paidCount++;
        } else if (hasPending) {
            partialCount++;
        } else {
            overdueCount++;
        }
    });

    const tenantData = [
        { name: "Paid", value: paidCount, fill: "hsl(var(--chart-2))" }, // Emerald
        { name: "Partial", value: partialCount, fill: "hsl(var(--chart-4))" }, // Amber
        { name: "Overdue", value: overdueCount, fill: "hsl(var(--chart-1))" }, // Rose
    ];
    
    // Avoid empty pie chart if no tenants
    if (tenants.length === 0) {
         tenantData[0].value = 1; 
         tenantData[0].name = "No Tenants";
         tenantData[0].fill = "#e5e7eb";
    }

    // Expenses
    const expenseData = expenses.reduce((acc, curr) => {
        const month = new Date(curr.date).toLocaleString('default', { month: 'short' });
        if (!acc[month]) acc[month] = { month, amount: 0 };
        acc[month].amount += parseInt(curr.amount);
        return acc;
    }, {});
    const formattedExpenseData = months.map(m => expenseData[m] || { month: m, amount: 0 });

    return { revenueData, tenantData, expenseData: formattedExpenseData };
  }
};

