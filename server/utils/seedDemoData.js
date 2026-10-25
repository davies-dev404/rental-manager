const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Reminder = require('../models/Reminder');
const ActivityLog = require('../models/ActivityLog');

// ─── Date Helpers ────────────────────────────────────────────────────────────
const d = (monthsOffset, day = 1) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthsOffset, day);
};
const monthStr = (offset = 0) => {
  const dt = d(offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const mpesa = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Full-throttle realistic Kenyan rental portfolio demo seed.
 * 5 Properties · 22 Units · 16 Tenants · 6 months payments
 * 26 Expenses · 8 Reminders · 15 Activity Logs
 */
async function seedDemoDataForUser(user) {
  const userId = user._id || user.id;

  // Clear existing demo records first to avoid duplicates
  await clearDemoDataForUser(user, false);

  // ─── 1. PROPERTIES ──────────────────────────────────────────────────────
  const propKilimani = await Property.create({
    name: 'Kilimani Heights Apartments',
    location: 'Argwings Kodhek Rd, Kilimani, Nairobi',
    type: 'Apartment',
    user: userId,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
  });

  const propWestlands = await Property.create({
    name: 'Westlands Executive Suites',
    location: 'Muthithi Rd, Westlands, Nairobi',
    type: 'Commercial & Residential',
    user: userId,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'
  });

  const propRoysambu = await Property.create({
    name: 'Roysambu Garden Court',
    location: 'Off Thika Superhighway, Roysambu, Nairobi',
    type: 'Apartment',
    user: userId,
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80'
  });

  const propKaren = await Property.create({
    name: 'Karen Ridge Villas',
    location: 'Karen Road, Karen, Nairobi',
    type: 'Villa',
    user: userId,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
  });

  const propThika = await Property.create({
    name: 'Thika Road Mansions',
    location: 'Eastern Bypass, Ruiru, Kiambu',
    type: 'Apartment',
    user: userId,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
  });

  // ─── 2. UNITS ────────────────────────────────────────────────────────────
  // Kilimani (5 units)
  const ukA101 = await Unit.create({ propertyId: propKilimani._id, unitNumber: 'A101', type: '2 Bedroom', user: userId, rentAmount: 45000, status: 'occupied', bedrooms: 2, bathrooms: 2, size: 1150 });
  const ukA102 = await Unit.create({ propertyId: propKilimani._id, unitNumber: 'A102', type: '2 Bedroom', user: userId, rentAmount: 45000, status: 'occupied', bedrooms: 2, bathrooms: 2, size: 1150 });
  const ukB201 = await Unit.create({ propertyId: propKilimani._id, unitNumber: 'B201', type: '3 Bedroom Penthouse', user: userId, rentAmount: 75000, status: 'occupied', bedrooms: 3, bathrooms: 3, size: 1800 });
  await Unit.create({ propertyId: propKilimani._id, unitNumber: 'B202', type: '1 Bedroom Executive', user: userId, rentAmount: 32000, status: 'vacant', bedrooms: 1, bathrooms: 1, size: 650 });
  const ukC301 = await Unit.create({ propertyId: propKilimani._id, unitNumber: 'C301', type: 'Studio', user: userId, rentAmount: 22000, status: 'occupied', bedrooms: 1, bathrooms: 1, size: 420 });

  // Westlands (4 units)
  const uwS101 = await Unit.create({ propertyId: propWestlands._id, unitNumber: 'Suite 101', type: 'Commercial Office', user: userId, rentAmount: 85000, status: 'occupied', bedrooms: 0, bathrooms: 2, size: 1200 });
  const uwS201 = await Unit.create({ propertyId: propWestlands._id, unitNumber: 'Studio 201', type: 'Studio', user: userId, rentAmount: 28000, status: 'occupied', bedrooms: 1, bathrooms: 1, size: 450 });
  await Unit.create({ propertyId: propWestlands._id, unitNumber: 'Studio 202', type: 'Studio', user: userId, rentAmount: 28000, status: 'vacant', bedrooms: 1, bathrooms: 1, size: 450 });
  const uwP301 = await Unit.create({ propertyId: propWestlands._id, unitNumber: 'Penthouse 301', type: '3 Bedroom Penthouse', user: userId, rentAmount: 120000, status: 'occupied', bedrooms: 3, bathrooms: 3, size: 2200 });

  // Roysambu (5 units)
  const urR101 = await Unit.create({ propertyId: propRoysambu._id, unitNumber: 'R-101', type: '1 Bedroom', user: userId, rentAmount: 18000, status: 'occupied', bedrooms: 1, bathrooms: 1, size: 550 });
  const urR102 = await Unit.create({ propertyId: propRoysambu._id, unitNumber: 'R-102', type: 'Bedsitter', user: userId, rentAmount: 12000, status: 'occupied', bedrooms: 1, bathrooms: 1, size: 320 });
  await Unit.create({ propertyId: propRoysambu._id, unitNumber: 'R-103', type: '1 Bedroom', user: userId, rentAmount: 18000, status: 'vacant', bedrooms: 1, bathrooms: 1, size: 550 });
  const urR201 = await Unit.create({ propertyId: propRoysambu._id, unitNumber: 'R-201', type: '2 Bedroom', user: userId, rentAmount: 25000, status: 'occupied', bedrooms: 2, bathrooms: 1, size: 780 });
  const urR202 = await Unit.create({ propertyId: propRoysambu._id, unitNumber: 'R-202', type: '2 Bedroom', user: userId, rentAmount: 25000, status: 'occupied', bedrooms: 2, bathrooms: 1, size: 780 });

  // Karen (3 units — 2 occupied, 1 vacant)
  const uvK1 = await Unit.create({ propertyId: propKaren._id, unitNumber: 'Villa 1', type: '4 Bedroom Villa', user: userId, rentAmount: 180000, status: 'occupied', bedrooms: 4, bathrooms: 4, size: 3800 });
  const uvK2 = await Unit.create({ propertyId: propKaren._id, unitNumber: 'Villa 2', type: '4 Bedroom Villa', user: userId, rentAmount: 175000, status: 'occupied', bedrooms: 4, bathrooms: 4, size: 3600 });
  await Unit.create({ propertyId: propKaren._id, unitNumber: 'Villa 3', type: '3 Bedroom Villa', user: userId, rentAmount: 145000, status: 'vacant', bedrooms: 3, bathrooms: 3, size: 2900 });

  // Thika (4 units — 3 occupied, 1 vacant)
  const utT101 = await Unit.create({ propertyId: propThika._id, unitNumber: 'T-101', type: '2 Bedroom', user: userId, rentAmount: 20000, status: 'occupied', bedrooms: 2, bathrooms: 1, size: 650 });
  const utT102 = await Unit.create({ propertyId: propThika._id, unitNumber: 'T-102', type: '2 Bedroom', user: userId, rentAmount: 20000, status: 'occupied', bedrooms: 2, bathrooms: 1, size: 650 });
  const utT201 = await Unit.create({ propertyId: propThika._id, unitNumber: 'T-201', type: '3 Bedroom', user: userId, rentAmount: 30000, status: 'occupied', bedrooms: 3, bathrooms: 2, size: 900 });
  await Unit.create({ propertyId: propThika._id, unitNumber: 'T-202', type: '3 Bedroom', user: userId, rentAmount: 30000, status: 'vacant', bedrooms: 3, bathrooms: 2, size: 900 });

  // ─── 3. TENANTS ──────────────────────────────────────────────────────────
  const leaseStart = d(-8);
  const leaseEnd   = d(4);
  const mkTenant = (data) => Tenant.create({
    user: userId, status: 'active', leaseStart, leaseEnd,
    deposit: data.rentAmount, nextPaymentDate: d(1, 5), idType: 'national_id',
    ...data
  });

  const t01 = await mkTenant({ name: 'Kevin Mwangi',        email: 'kevin.mwangi@gmail.com',       phone: '+254712345678', nationalId: '28475891', unitId: ukA101._id, rentAmount: 45000, utilities: [{ name: 'Water',   amount: 1500, billingType: 'fixed', isIncluded: false }, { name: 'Garbage',  amount: 500,  billingType: 'fixed', isIncluded: false }] });
  const t02 = await mkTenant({ name: 'Faith Wanjiku',        email: 'faith.wanjiku@yahoo.com',      phone: '+254722987654', nationalId: '30192847', unitId: ukA102._id, rentAmount: 45000, utilities: [{ name: 'Water',   amount: 1200, billingType: 'fixed', isIncluded: false }] });
  const t03 = await mkTenant({ name: 'Brian Kiprop',          email: 'brian.kiprop@techkenya.co.ke', phone: '+254701234567', nationalId: '26483920', unitId: ukB201._id, rentAmount: 75000, utilities: [{ name: 'Water',   amount: 2000, billingType: 'fixed', isIncluded: false }, { name: 'Security & Service', amount: 3500, billingType: 'fixed', isIncluded: false }] });
  const t04 = await mkTenant({ name: 'Alice Kamau',           email: 'alice.kamau@outlook.com',      phone: '+254733901234', nationalId: '32984710', unitId: ukC301._id, rentAmount: 22000, utilities: [{ name: 'Water',   amount: 800,  billingType: 'fixed', isIncluded: false }] });
  const t05 = await mkTenant({ name: 'Dr. Patrick Ochieng',  email: 'patrick.ochieng@clinic.co.ke', phone: '+254733445566', nationalId: '24859201', unitId: uwS101._id, rentAmount: 85000, utilities: [{ name: 'Service Charge', amount: 8000, billingType: 'fixed', isIncluded: false }] });
  const t06 = await mkTenant({ name: 'Sharon Achieng',        email: 'sharon.achieng@outlook.com',   phone: '+254799887766', nationalId: '33948572', unitId: uwS201._id, rentAmount: 28000, utilities: [{ name: 'Water',   amount: 1000, billingType: 'fixed', isIncluded: false }] });
  const t07 = await mkTenant({ name: 'James Otieno',          email: 'james.otieno@safaricom.co.ke', phone: '+254711223344', nationalId: '27490183', unitId: uwP301._id, rentAmount: 120000, utilities: [{ name: 'Water', amount: 3000, billingType: 'fixed', isIncluded: false }, { name: 'Security', amount: 5000, billingType: 'fixed', isIncluded: false }, { name: 'Parking', amount: 5000, billingType: 'fixed', isIncluded: false }] });
  const t08 = await mkTenant({ name: 'Mercy Chebet',          email: 'mercy.chebet@gmail.com',       phone: '+254720112233', nationalId: '31284950', unitId: urR101._id, rentAmount: 18000, utilities: [{ name: 'Water',   amount: 800,  billingType: 'fixed', isIncluded: false }] });
  const t09 = await mkTenant({ name: "Samuel Ndung'u",        email: 'samuel.ndungu@gmail.com',      phone: '+254729887766', nationalId: '29485719', unitId: urR102._id, rentAmount: 12000, utilities: [{ name: 'Water',   amount: 600,  billingType: 'fixed', isIncluded: false }] });
  const t10 = await mkTenant({ name: 'Grace Nyambura',        email: 'grace.nyambura@icloud.com',    phone: '+254700881234', nationalId: '34920184', unitId: urR201._id, rentAmount: 25000, utilities: [{ name: 'Water',   amount: 1000, billingType: 'fixed', isIncluded: false }] });
  const t11 = await mkTenant({ name: 'Peter Njoroge',         email: 'peter.njoroge@gmail.com',      phone: '+254710334455', nationalId: '26783940', unitId: urR202._id, rentAmount: 25000, utilities: [{ name: 'Water',   amount: 1000, billingType: 'fixed', isIncluded: false }] });
  const t12 = await mkTenant({ name: 'Ambassador H. Kariuki', email: 'h.kariuki@diplomats.org',      phone: '+254733210987', nationalId: 'P12345678', idType: 'passport', unitId: uvK1._id, rentAmount: 180000, utilities: [{ name: 'Gardening', amount: 8000, billingType: 'fixed', isIncluded: false }, { name: 'Pool Service', amount: 5000, billingType: 'fixed', isIncluded: false }] });
  const t13 = await mkTenant({ name: 'Sophia Mutua',          email: 'sophia.mutua@nairobi.co.ke',   phone: '+254744221133', nationalId: '31029384', unitId: uvK2._id,   rentAmount: 175000, utilities: [{ name: 'Gardening', amount: 8000, billingType: 'fixed', isIncluded: false }] });
  const t14 = await mkTenant({ name: 'Daniel Kamweru',        email: 'daniel.kamweru@gmail.com',     phone: '+254755667788', nationalId: '28490173', unitId: utT101._id, rentAmount: 20000, utilities: [{ name: 'Water',   amount: 700,  billingType: 'fixed', isIncluded: false }] });
  const t15 = await mkTenant({ name: 'Lucy Wachira',          email: 'lucy.wachira@hotmail.com',     phone: '+254766778899', nationalId: '33102938', unitId: utT102._id, rentAmount: 20000, utilities: [{ name: 'Water',   amount: 700,  billingType: 'fixed', isIncluded: false }] });
  const t16 = await mkTenant({ name: 'Joseph Gitau',          email: 'joseph.gitau@gmail.com',       phone: '+254777889900', nationalId: '27384920', unitId: utT201._id, rentAmount: 30000, utilities: [{ name: 'Water',   amount: 1000, billingType: 'fixed', isIncluded: false }, { name: 'Parking', amount: 2000, billingType: 'fixed', isIncluded: false }] });

  // ─── 4. PAYMENTS — 6 months of history ──────────────────────────────────
  const tData = [
    { t: t01, u: ukA101, total: 47000,  rent: 45000,  util: 2000 },
    { t: t02, u: ukA102, total: 46200,  rent: 45000,  util: 1200 },
    { t: t03, u: ukB201, total: 80500,  rent: 75000,  util: 5500 },
    { t: t04, u: ukC301, total: 22800,  rent: 22000,  util: 800  },
    { t: t05, u: uwS101, total: 93000,  rent: 85000,  util: 8000 },
    { t: t06, u: uwS201, total: 29000,  rent: 28000,  util: 1000 },
    { t: t07, u: uwP301, total: 133000, rent: 120000, util: 13000},
    { t: t08, u: urR101, total: 18800,  rent: 18000,  util: 800  },
    { t: t09, u: urR102, total: 12600,  rent: 12000,  util: 600  },
    { t: t10, u: urR201, total: 26000,  rent: 25000,  util: 1000 },
    { t: t11, u: urR202, total: 26000,  rent: 25000,  util: 1000 },
    { t: t12, u: uvK1,   total: 193000, rent: 180000, util: 13000},
    { t: t13, u: uvK2,   total: 183000, rent: 175000, util: 8000 },
    { t: t14, u: utT101, total: 20700,  rent: 20000,  util: 700  },
    { t: t15, u: utT102, total: 20700,  rent: 20000,  util: 700  },
    { t: t16, u: utT201, total: 33000,  rent: 30000,  util: 3000 },
  ];

  const paymentRecords = [];
  const methods = ['M-Pesa Paybill', 'M-Pesa Paybill', 'M-Pesa Paybill', 'Bank Transfer', 'Cash'];

  for (let mo = -5; mo <= 0; mo++) {
    for (const td of tData) {
      let status = 'paid';
      let amount = td.total;

      // Current month: t02 partial, t09 overdue
      if (mo === 0) {
        if (String(td.t._id) === String(t02._id)) { status = 'partial'; amount = Math.round(td.rent * 0.65); }
        else if (String(td.t._id) === String(t09._id)) { status = 'overdue'; }
      }

      const dayPaid = Math.floor(Math.random() * 9) + 2;
      paymentRecords.push({
        tenantId: td.t._id, unitId: td.u._id, amount, user: userId,
        rentAmount: td.rent, utilityAmount: td.util,
        method: methods[Math.floor(Math.random() * methods.length)],
        status, monthCovered: monthStr(mo), type: 'Rent',
        reference: mpesa(), date: d(mo, dayPaid)
      });
    }
  }

  // Security deposit records at move-in
  paymentRecords.push(
    { tenantId: t01._id, unitId: ukA101._id, amount: 45000,  user: userId, rentAmount: 0, depositAmount: 45000,  utilityAmount: 0, method: 'Bank Transfer', status: 'paid', monthCovered: monthStr(-8), type: 'Deposit', reference: mpesa(), date: d(-8, 1) },
    { tenantId: t05._id, unitId: uwS101._id, amount: 85000,  user: userId, rentAmount: 0, depositAmount: 85000,  utilityAmount: 0, method: 'Bank Transfer', status: 'paid', monthCovered: monthStr(-8), type: 'Deposit', reference: mpesa(), date: d(-8, 1) },
    { tenantId: t07._id, unitId: uwP301._id, amount: 120000, user: userId, rentAmount: 0, depositAmount: 120000, utilityAmount: 0, method: 'Bank Transfer', status: 'paid', monthCovered: monthStr(-8), type: 'Deposit', reference: mpesa(), date: d(-8, 1) },
    { tenantId: t12._id, unitId: uvK1._id,   amount: 180000, user: userId, rentAmount: 0, depositAmount: 180000, utilityAmount: 0, method: 'Bank Transfer', status: 'paid', monthCovered: monthStr(-8), type: 'Deposit', reference: mpesa(), date: d(-8, 1) },
    { tenantId: t13._id, unitId: uvK2._id,   amount: 175000, user: userId, rentAmount: 0, depositAmount: 175000, utilityAmount: 0, method: 'Bank Transfer', status: 'paid', monthCovered: monthStr(-8), type: 'Deposit', reference: mpesa(), date: d(-8, 1) }
  );

  await Payment.insertMany(paymentRecords);

  // ─── 5. EXPENSES ─────────────────────────────────────────────────────────
  await Expense.insertMany([
    // Current month
    { title: 'Security Guards (Day & Night)',        category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice — KK Security Services', date: d(0, 2) },
    { title: 'Bulk Water Utility Bill',              category: 'Utilities',    amount: 14500, user: userId, propertyId: propKilimani._id, description: 'Nairobi City Water & Sewerage Company — Main Account Meter',  date: d(0, 6) },
    { title: 'Garbage Collection & Sanitation',      category: 'Sanitation',   amount: 6500,  user: userId, propertyId: propRoysambu._id, description: 'Twice-weekly trash pickup by City Waste Collectors',           date: d(0, 8) },
    { title: 'Hallway Lighting & Electrical Repair', category: 'Maintenance',  amount: 4800,  user: userId, propertyId: propWestlands._id,description: 'Replaced faulty LED hallway fixtures and sensor switch',        date: d(0, 10) },
    { title: 'Pool Maintenance — Karen Villas',      category: 'Maintenance',  amount: 12000, user: userId, propertyId: propKaren._id,   description: 'Monthly pool chemical treatment and filter service',            date: d(0, 5) },
    { title: 'Gardening & Landscaping',              category: 'Maintenance',  amount: 9500,  user: userId, propertyId: propKaren._id,   description: 'Lawn mowing, hedge trimming, flower bed replanting',           date: d(0, 7) },
    { title: 'Lift Maintenance Contract',            category: 'Maintenance',  amount: 18000, user: userId, propertyId: propKilimani._id, description: 'Quarterly preventive maintenance — Schindler Kenya',           date: d(0, 3) },
    { title: 'Internet Fiber Uplink — Westlands',    category: 'Utilities',    amount: 8500,  user: userId, propertyId: propWestlands._id,description: 'Fiber backbone uplink from Safaricom Business',                date: d(0, 1) },
    { title: 'Property Insurance Premium',           category: 'Insurance',    amount: 35000, user: userId, propertyId: propKaren._id,   description: 'Annual property & liability insurance — CIC Insurance Group',  date: d(0, 1) },
    { title: 'Generator Fuel & Service',             category: 'Utilities',    amount: 11200, user: userId, propertyId: propThika._id,   description: 'Monthly diesel refill and oil change for backup generator',    date: d(0, 9) },
    // Previous month
    { title: 'Plumbing Repairs — A102',              category: 'Maintenance',  amount: 7200,  user: userId, propertyId: propKilimani._id, description: 'Burst pipe repair in bathroom — Faith Wanjiku unit',          date: d(-1, 14) },
    { title: 'Interior Repaint — R-201',             category: 'Maintenance',  amount: 15000, user: userId, propertyId: propRoysambu._id, description: 'Full interior repaint before tenant renewal',                  date: d(-1, 20) },
    { title: 'Security Guards',                      category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice',                        date: d(-1, 2) },
    { title: 'Bulk Water Utility Bill',              category: 'Utilities',    amount: 13800, user: userId, propertyId: propKilimani._id, description: 'Nairobi City Water & Sewerage Company',                        date: d(-1, 6) },
    { title: 'Pest Control — Roysambu Block',        category: 'Maintenance',  amount: 5500,  user: userId, propertyId: propRoysambu._id, description: 'Quarterly fumigation — bed bugs and cockroach treatment',      date: d(-1, 18) },
    // 2 months ago
    { title: 'Roof Gutter Cleaning',                 category: 'Maintenance',  amount: 8000,  user: userId, propertyId: propKilimani._id, description: 'Pre-rain season gutter clearing & waterproofing inspection',  date: d(-2, 12) },
    { title: 'Security Guards',                      category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice',                        date: d(-2, 2) },
    { title: 'CCTV System Upgrade',                  category: 'Security',     amount: 42000, user: userId, propertyId: propWestlands._id,description: 'Replaced 6 analogue cameras with 4K IP cameras + DVR upgrade', date: d(-2, 8) },
    { title: 'Landscaping — Karen Villas',           category: 'Maintenance',  amount: 9000,  user: userId, propertyId: propKaren._id,   description: 'Quarterly garden redesign and tree trimming',                  date: d(-2, 15) },
    // 3-5 months ago
    { title: 'Emergency Electrical Repair',          category: 'Maintenance',  amount: 22000, user: userId, propertyId: propThika._id,   description: 'Emergency DB board replacement after short circuit',           date: d(-3, 9) },
    { title: 'Security Guards',                      category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice',                        date: d(-3, 2) },
    { title: 'Water Tank Cleaning',                  category: 'Maintenance',  amount: 4500,  user: userId, propertyId: propRoysambu._id, description: 'Bi-annual water storage tank decontamination',                date: d(-4, 11) },
    { title: 'Gate Automation Repair',               category: 'Maintenance',  amount: 12500, user: userId, propertyId: propKilimani._id, description: 'Electric gate motor and remote receiver replacement',          date: d(-4, 6) },
    { title: 'Security Guards',                      category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice',                        date: d(-4, 2) },
    { title: 'Annual Fire Safety Inspection',        category: 'Compliance',   amount: 18000, user: userId, propertyId: propKilimani._id, description: 'Nairobi County fire extinguisher servicing and compliance cert', date: d(-5, 15) },
    { title: 'Security Guards',                      category: 'Security',     amount: 28000, user: userId, propertyId: propKilimani._id, description: 'Monthly security guard patrol invoice',                        date: d(-5, 2) },
  ]);

  // ─── 6. REMINDERS ────────────────────────────────────────────────────────
  await Reminder.insertMany([
    { title: 'Monthly Rent SMS Blast',                  type: 'rent_due',    method: 'sms',      frequency: '3days',  dueDate: d(1, 1),  recipientName: 'All Active Tenants',        description: 'Automated SMS notification for monthly rent billing cycle',                          status: 'pending', user: userId },
    { title: 'Lease Renewal — Brian Kiprop (B201)',     type: 'lease_expiry',method: 'email',    frequency: '30days', dueDate: d(4, 1),  recipientName: 'Brian Kiprop',              description: 'Lease for 3BR Penthouse B201 expires in 4 months. Initiate renewal discussions.', status: 'pending', user: userId },
    { title: 'Lease Renewal — James Otieno (P301)',     type: 'lease_expiry',method: 'email',    frequency: '30days', dueDate: d(4, 1),  recipientName: 'James Otieno',             description: 'Penthouse 301 lease renewal — high-value tenant, offer 5% increment.',          status: 'pending', user: userId },
    { title: "Overdue Rent — Samuel Ndung'u (R-102)",   type: 'rent_due',    method: 'whatsapp', frequency: '1day',   dueDate: d(0, 15), recipientName: "Samuel Ndung'u",            description: 'R-102 bedsitter tenant overdue this month. Send WhatsApp follow-up.',            status: 'pending', user: userId },
    { title: 'Sub-meter Water Reading',                 type: 'inspection',  method: 'email',    frequency: '1day',   dueDate: d(0, 28), recipientName: 'Caretaker Office',          description: 'Log water meter consumption for Kilimani and Roysambu before billing',            status: 'pending', user: userId },
    { title: 'Lift Maintenance — Kilimani Heights',     type: 'maintenance', method: 'email',    frequency: '7days',  dueDate: d(3, 1),  recipientName: 'Schindler Kenya Ltd',       description: 'Book next quarterly preventive maintenance for the two passenger lifts',          status: 'pending', user: userId },
    { title: 'Faith Wanjiku — Partial Balance (A102)',  type: 'rent_due',    method: 'sms',      frequency: '1day',   dueDate: d(0, 20), recipientName: 'Faith Wanjiku',             description: 'Unit A102 — outstanding balance of KES 15,000 from partial payment this month', status: 'pending', user: userId },
    { title: 'Pool Chemical Restock — Karen Villas',    type: 'maintenance', method: 'email',    frequency: '7days',  dueDate: d(1, 10), recipientName: 'Karen Villas Caretaker',    description: 'Order chlorine and pH balancer for the two villa pools',                        status: 'pending', user: userId },
  ]);

  // ─── 7. ACTIVITY LOGS ────────────────────────────────────────────────────
  const logs = [
    { action: 'Demo Environment Initialized',           description: 'MakaziFlow demo dataset seeded: 5 properties, 22 units, 16 tenants, 6 months payment history.', type: 'system',   status: 'success', daysAgo: 0  },
    { action: 'Rent Payment Received',                  description: 'James Otieno paid KES 133,000 for Penthouse 301 (M-Pesa Paybill)',                               type: 'payment',  status: 'success', daysAgo: 1  },
    { action: 'Rent Payment Received',                  description: 'Ambassador Kariuki paid KES 193,000 for Karen Villa 1 (Bank Transfer)',                          type: 'payment',  status: 'success', daysAgo: 2  },
    { action: 'Partial Payment Flagged',                description: 'Faith Wanjiku paid KES 30,000 of KES 46,200 due — Unit A102',                                   type: 'payment',  status: 'warning', daysAgo: 3  },
    { action: 'Overdue Rent Alert',                     description: "Samuel Ndung'u (R-102) has not paid rent for current month",                                    type: 'payment',  status: 'error',   daysAgo: 4  },
    { action: 'Lease Renewal Initiated',                description: 'Brian Kiprop lease for B201 Penthouse extended by 12 months',                                   type: 'tenant',   status: 'success', daysAgo: 5  },
    { action: 'New Tenant Onboarded',                   description: 'Joseph Gitau moved into T-201, Thika Road Mansions. Deposit KES 30,000 collected.',             type: 'tenant',   status: 'success', daysAgo: 7  },
    { action: 'Expense Recorded',                       description: 'KES 42,000 CCTV upgrade logged for Westlands Executive Suites',                                 type: 'expense',  status: 'info',    daysAgo: 8  },
    { action: 'Maintenance Ticket Resolved',            description: 'Burst pipe in A102 (Kilimani) repaired by Jua Kali Plumbers — KES 7,200',                       type: 'system',   status: 'success', daysAgo: 10 },
    { action: 'Unit Marked Vacant',                     description: 'B202 (Kilimani Heights) marked vacant — previous tenant moved out',                             type: 'system',   status: 'info',    daysAgo: 12 },
    { action: 'Rent Reminder Dispatched',               description: '14 SMS reminders sent to tenants for upcoming rent cycle',                                      type: 'system',   status: 'success', daysAgo: 14 },
    { action: 'Settings Updated',                       description: 'M-Pesa Paybill number updated. SMTP email configured for rent receipts.',                       type: 'settings', status: 'success', daysAgo: 15 },
    { action: 'New Property Added',                     description: 'Thika Road Mansions added to portfolio — 4 units registered',                                   type: 'system',   status: 'success', daysAgo: 20 },
    { action: 'Receipt Email Sent',                     description: 'Payment receipt emailed to Dr. Patrick Ochieng for Suite 101',                                  type: 'payment',  status: 'success', daysAgo: 22 },
    { action: 'Annual Fire Safety Compliance Done',     description: 'Kilimani Heights passed Nairobi County fire safety inspection — certificate valid 12 months',   type: 'system',   status: 'success', daysAgo: 25 },
  ];

  await ActivityLog.insertMany(logs.map(e => ({
    user: user.name || 'Demo User',
    userId,
    userEmail: user.email,
    action: e.action,
    description: e.description,
    type: e.type,
    status: e.status,
    timestamp: new Date(Date.now() - e.daysAgo * 86400000)
  })));

  return { success: true, propertiesCount: 5, unitsCount: 22, tenantsCount: 16, paymentsCount: paymentRecords.length + 5, expensesCount: 26, remindersCount: 8 };
}

/**
 * Clears all demo data for a user when switching to live mode or resetting.
 */
async function clearDemoDataForUser(user, logAction = true) {
  const userId = user._id || user.id;

  await Promise.all([
    Property.deleteMany({ user: userId }),
    Unit.deleteMany({ user: userId }),
    Tenant.deleteMany({ user: userId }),
    Payment.deleteMany({ user: userId }),
    Expense.deleteMany({ user: userId }),
    Reminder.deleteMany({ user: userId })
  ]);

  if (logAction) {
    await ActivityLog.create({
      user: user.name || 'User',
      userId: userId,
      userEmail: user.email,
      action: 'Demo Data Cleared',
      description: 'All sample properties, units, tenants, and transactions removed to switch to a clean Live workspace.',
      type: 'system',
      status: 'info',
      timestamp: new Date()
    });
  }

  return { success: true };
}

module.exports = {
  seedDemoDataForUser,
  clearDemoDataForUser
};