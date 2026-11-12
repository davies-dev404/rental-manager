const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  idType: { type: String, enum: ['national_id', 'passport', 'driving_license'], default: 'national_id' },
  nationalId: { type: String, default: '' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  status: { type: String, enum: ['active', 'past'], default: 'active' },
  leaseStart: { type: Date },
  leaseEnd: { type: Date },
  rentAmount: { type: Number }, // Snapshot of rent at lease start
  deposit: { type: Number, default: 0 },
  depositType: { type: String, default: 'Rent Deposit' },
  deposits: [{
    type: { type: String, default: 'Rent Deposit' },
    paid: { type: Number, default: 0 },
    returned: { type: Number, default: 0 }
  }],
  notes: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  kraPin: { type: String, default: '' },
  penaltyType: { type: String, default: '' },
  moveInDate: { type: Date },
  moveOutDate: { type: Date },
  otherPhones: [{
    name: { type: String },
    phone: { type: String }
  }],
  nextOfKin: [{
    name: { type: String },
    phone: { type: String },
    relationship: { type: String },
    otherInfo: { type: String }
  }],
  bankPayerNames: [{ type: String }],
  utilities: [{
    name: { type: String, required: true }, // e.g. "Water", "Electricity (Post-pay)", "Garbage", "Parking", "Security"
    amount: { type: Number, required: true, default: 0 },
    billingType: { type: String, enum: ['fixed', 'postpay_metered'], default: 'fixed' },
    isIncluded: { type: Boolean, default: false } // Landlord can include it in rent or bill separately
  }],
  nextPaymentDate: { type: Date }, // For tracking custom due dates
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', tenantSchema);
