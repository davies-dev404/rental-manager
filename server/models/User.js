const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { 
    type: String, 
    required: function() {
      return !this.authProvider || this.authProvider === 'local';
    } 
  },
  authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
  googleId: { type: String },
  appleId: { type: String },
  role: { type: String, enum: ['admin', 'caretaker', 'landlord', 'tenant', 'manager'], default: 'admin' },
  avatar: { type: String, default: 'https://github.com/shadcn.png' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  hasCompletedOnboarding: { type: Boolean, default: false },
  onboardingRole: { type: String, enum: ['landlord', 'manager', 'caretaker', 'tenant'], default: 'landlord' },
  unitsCount: { type: Number, default: 0 },
  subscriptionTier: { type: String, default: 'starter' },
  isDemoMode: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) return;
  try {
      this.password = await bcrypt.hash(this.password, 10);
  } catch (err) {
      console.error('Bcrypt Hashing Failed:', err);
      throw err;
  }
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
