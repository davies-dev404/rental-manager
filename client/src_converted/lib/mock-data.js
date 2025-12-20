import { format } from "date-fns";
// --- Mock Data Store ---
const mockUsers = [
    { id: "u1", name: "Admin User", email: "admin@rental.com", role: "admin" },
    { id: "u2", name: "John Caretaker", email: "john@rental.com", role: "caretaker" },
];
const mockProperties = [
    { id: "p1", name: "Sunset Apartments", address: "123 Sunset Blvd, Nairobi", caretakerId: "u2" },
    { id: "p2", name: "Green Valley Estate", address: "45 Valley Rd, Nakuru", caretakerId: "u2" },
];
const mockUnits = [
    { id: "un1", propertyId: "p1", unitNumber: "A101", type: "2 Bedroom", rentAmount: 25000, status: "occupied" },
    { id: "un2", propertyId: "p1", unitNumber: "A102", type: "2 Bedroom", rentAmount: 25000, status: "occupied" },
    { id: "un3", propertyId: "p1", unitNumber: "B101", type: "1 Bedroom", rentAmount: 18000, status: "vacant" },
    { id: "un4", propertyId: "p2", unitNumber: "V1", type: "3 Bedroom Villa", rentAmount: 45000, status: "occupied" },
];
const mockTenants = [
    { id: "t1", name: "Alice Johnson", email: "alice@example.com", phone: "+254700000001", nationalId: "12345678", unitId: "un1", leaseStart: "2024-01-01", status: "active" },
    { id: "t2", name: "Bob Smith", email: "bob@example.com", phone: "+254700000002", nationalId: "87654321", unitId: "un2", leaseStart: "2024-03-01", status: "active" },
    { id: "t3", name: "Charlie Davis", email: "charlie@example.com", phone: "+254700000003", nationalId: "11223344", unitId: "un4", leaseStart: "2024-02-15", status: "active" },
];
const mockPayments = [
    { id: "pay1", tenantId: "t1", unitId: "un1", amount: 25000, date: "2024-05-05", status: "paid", method: "mobile_money", monthCovered: "2024-05" },
    { id: "pay2", tenantId: "t2", unitId: "un2", amount: 20000, date: "2024-05-10", status: "partial", method: "bank", monthCovered: "2024-05" },
    // Overdue payment simulated by absence or explicit pending record
];
// --- API Helpers (Simulating Backend Latency) ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const api = {
    // Users
    login: async (email, role) => {
        await delay(800);
        const user = mockUsers.find(u => u.email === email && u.role === role);
        if (!user)
            throw new Error("Invalid credentials");
        return user;
    },
    // Properties
    getProperties: async () => {
        await delay(500);
        return [...mockProperties];
    },
    addProperty: async (prop) => {
        await delay(500);
        const newProp = { ...prop, id: Math.random().toString(36).substr(2, 9) };
        mockProperties.push(newProp);
        return newProp;
    },
    // Units
    getUnits: async (propertyId) => {
        await delay(500);
        if (propertyId)
            return mockUnits.filter(u => u.propertyId === propertyId);
        return [...mockUnits];
    },
    // Tenants
    getTenants: async () => {
        await delay(500);
        return [...mockTenants];
    },
    addTenant: async (tenant) => {
        await delay(600);
        const newTenant = { ...tenant, id: Math.random().toString(36).substr(2, 9) };
        mockTenants.push(newTenant);
        // Auto-update unit status
        const unitIndex = mockUnits.findIndex(u => u.id === tenant.unitId);
        if (unitIndex >= 0) {
            mockUnits[unitIndex].status = "occupied";
        }
        return newTenant;
    },
    // Payments
    getPayments: async () => {
        await delay(500);
        return [...mockPayments];
    },
    recordPayment: async (payment) => {
        await delay(600);
        const newPayment = { ...payment, id: Math.random().toString(36).substr(2, 9) };
        mockPayments.push(newPayment);
        return newPayment;
    },
    // Dashboard Stats
    getStats: async () => {
        await delay(500);
        const totalProperties = mockProperties.length;
        const totalUnits = mockUnits.length;
        const occupiedUnits = mockUnits.filter(u => u.status === "occupied").length;
        const vacantUnits = totalUnits - occupiedUnits;
        const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
        // Calculate Monthly Rent
        const expectedMonthlyRent = mockUnits.reduce((sum, u) => u.status === "occupied" ? sum + u.rentAmount : sum, 0);
        // Collected this month
        const currentMonth = format(new Date(), "yyyy-MM");
        const collectedThisMonth = mockPayments
            .filter(p => p.monthCovered === currentMonth && (p.status === "paid" || p.status === "partial"))
            .reduce((sum, p) => sum + p.amount, 0);
        return {
            totalProperties,
            totalUnits,
            occupiedUnits,
            vacantUnits,
            occupancyRate,
            expectedMonthlyRent,
            collectedThisMonth,
            outstandingAmount: Math.max(0, expectedMonthlyRent - collectedThisMonth)
        };
    }
};
