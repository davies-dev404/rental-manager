/**
 * MakaziFlow GraphQL Schema & Resolvers
 * Apollo Server 4 integrated with Express.
 * Endpoint: /graphql
 */
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { ApolloServerPluginDrainHttpServer } = require("@apollo/server/plugin/drainHttpServer");

const typeDefs = `#graphql
  scalar JSON
  scalar Date

  type User { id: ID! name: String! email: String! role: String! avatar: String phone: String isVerified: Boolean isDemoMode: Boolean subscriptionTier: String hasCompletedOnboarding: Boolean }
  type Property { id: ID! name: String! type: String address: String city: String country: String totalUnits: Int units: [Unit] }
  type Unit { id: ID! unitNumber: String! type: String floor: Int bedrooms: Int bathrooms: Int rent: Float status: String property: Property tenant: Tenant }
  type Tenant { id: ID! name: String! email: String phone: String unit: Unit property: Property leaseStart: Date leaseEnd: Date monthlyRent: Float status: String }
  type Payment { id: ID! tenant: Tenant property: Property unit: Unit amount: Float! method: String status: String reference: String dueDate: Date paidDate: Date }
  type Expense { id: ID! title: String! category: String amount: Float! property: Property date: Date description: String }
  type Maintenance { id: ID! title: String! description: String category: String priority: String status: String property: Property unit: Unit tenant: Tenant estimatedCost: Float actualCost: Float }
  type Invoice { id: ID! invoiceNumber: String tenant: Tenant property: Property unit: Unit amount: Float! status: String dueDate: Date issuedDate: Date items: [JSON] }
  type DashboardSummary { totalProperties: Int totalUnits: Int occupiedUnits: Int vacantUnits: Int totalTenants: Int monthlyRevenue: Float pendingPayments: Float openMaintenanceRequests: Int occupancyRate: Float }

  type Query {
    me: User
    dashboardSummary: DashboardSummary
    properties: [Property]
    property(id: ID!): Property
    units(propertyId: ID): [Unit]
    unit(id: ID!): Unit
    tenants(propertyId: ID, status: String): [Tenant]
    tenant(id: ID!): Tenant
    payments(tenantId: ID, status: String): [Payment]
    expenses(propertyId: ID, category: String): [Expense]
    maintenanceRequests(propertyId: ID, status: String): [Maintenance]
    invoices(tenantId: ID, status: String): [Invoice]
  }

  type Mutation { _placeholder: Boolean }
`;

const resolvers = {
  Query: {
    me: async (_, __, { user, models }) => {
      if (!user) throw new Error("Not authenticated");
      return models.User.findById(user.id).lean();
    },
    dashboardSummary: async (_, __, { user, models }) => {
      if (!user) throw new Error("Not authenticated");
      const [properties, units, tenants, payments, maintenance] = await Promise.all([
        models.Property.find({ user: user.id }).lean(),
        models.Unit.find({ user: user.id }).lean(),
        models.Tenant.find({ user: user.id }).lean(),
        models.Payment.find({ user: user.id }).lean(),
        models.Maintenance.find({ user: user.id, status: { $nin: ["resolved","closed"] } }).lean(),
      ]);
      const occupied = units.filter(u => u.status === "occupied").length;
      const now = new Date();
      const monthlyRevenue = payments.filter(p => p.status === "paid" && p.paidDate && new Date(p.paidDate).getMonth() === now.getMonth() && new Date(p.paidDate).getFullYear() === now.getFullYear()).reduce((s, p) => s + (p.amount||0), 0);
      const pending = payments.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount||0), 0);
      return { totalProperties: properties.length, totalUnits: units.length, occupiedUnits: occupied, vacantUnits: units.length - occupied, totalTenants: tenants.length, monthlyRevenue, pendingPayments: pending, openMaintenanceRequests: maintenance.length, occupancyRate: units.length > 0 ? Math.round((occupied/units.length)*100) : 0 };
    },
    properties: async (_, __, { user, models }) => { if (!user) throw new Error("Not authenticated"); return models.Property.find({ user: user.id }).lean(); },
    property: async (_, { id }, { user, models }) => { if (!user) throw new Error("Not authenticated"); return models.Property.findOne({ _id: id, user: user.id }).lean(); },
    units: async (_, { propertyId }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (propertyId) f.property = propertyId; return models.Unit.find(f).lean(); },
    unit: async (_, { id }, { user, models }) => { if (!user) throw new Error("Not authenticated"); return models.Unit.findOne({ _id: id, user: user.id }).lean(); },
    tenants: async (_, { propertyId, status }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (propertyId) f.property = propertyId; if (status) f.status = status; return models.Tenant.find(f).lean(); },
    tenant: async (_, { id }, { user, models }) => { if (!user) throw new Error("Not authenticated"); return models.Tenant.findOne({ _id: id, user: user.id }).lean(); },
    payments: async (_, { tenantId, status }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (tenantId) f.tenant = tenantId; if (status) f.status = status; return models.Payment.find(f).sort({ createdAt: -1 }).lean(); },
    expenses: async (_, { propertyId, category }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (propertyId) f.property = propertyId; if (category) f.category = category; return models.Expense.find(f).sort({ date: -1 }).lean(); },
    maintenanceRequests: async (_, { propertyId, status }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (propertyId) f.property = propertyId; if (status) f.status = status; return models.Maintenance.find(f).sort({ createdAt: -1 }).lean(); },
    invoices: async (_, { tenantId, status }, { user, models }) => { if (!user) throw new Error("Not authenticated"); const f = { user: user.id }; if (tenantId) f.tenant = tenantId; if (status) f.status = status; return models.Invoice.find(f).sort({ createdAt: -1 }).lean(); },
  },
  Mutation: { _placeholder: () => true },
  Property: { id: (p) => p._id?.toString() },
  Unit:     { id: (u) => u._id?.toString() },
  Tenant:   { id: (t) => t._id?.toString() },
  Payment:  { id: (p) => p._id?.toString() },
  Expense:  { id: (e) => e._id?.toString() },
  Maintenance: { id: (m) => m._id?.toString() },
  Invoice:  { id: (i) => i._id?.toString() },
  User:     { id: (u) => u._id?.toString() },
};

async function startGraphQL(app, httpServer, models) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (err) => { console.error("[GraphQL Error]", err.message); return { message: err.message }; },
  });
  await server.start();
  app.use("/graphql", expressMiddleware(server, {
    context: async ({ req }) => {
      const jwt = require("jsonwebtoken");
      let user = null;
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      if (token) { try { const d = jwt.verify(token, process.env.JWT_SECRET); user = { id: d.id }; } catch {} }
      return { user, models };
    },
  }));
  console.log("🚀 GraphQL endpoint ready at /graphql");
}

module.exports = { startGraphQL };
