const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'caretaker'], default: 'admin' },
  avatar: { type: String, default: 'https://github.com/shadcn.png' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false }
});

// Hash password before saving
// Hash password before saving
userSchema.pre('save', async function() {
  console.log('User pre-save hook triggered for:', this.email);
  if (!this.isModified('password')) return;
  try {
      console.log('Hashing password...');
      this.password = await bcrypt.hash(this.password, 10);
      console.log('Password hashed successfully.');
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
