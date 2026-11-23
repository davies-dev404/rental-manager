/**
 * Backend-Only Secure Initial Super Admin Provisioning Script
 * Usage:
 *   node server/scripts/provisionSuperAdmin.js --email admin@example.com --name "Platform Owner" --password "StrongPassword#123"
 * Or via environment variables:
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... SUPERADMIN_NAME="MakaziFlow Super Admin" node server/scripts/provisionSuperAdmin.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { validatePassword } = require('../utils/passwordPolicy');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
      args[key] = val;
      if (val !== 'true') i++;
    }
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const name = String(args.name || process.env.SUPERADMIN_NAME || 'MakaziFlow Super Admin').trim();
  const phone = String(args.phone || process.env.SUPERADMIN_PHONE || '').trim();
  const password = String(args.password || process.env.SUPERADMIN_PASSWORD || '');

  if (!email) {
    console.error('❌ Missing --email or SUPERADMIN_EMAIL');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGODB_DEV_URI || 'mongodb://127.0.0.1:27017/rental_manager_dev';
  await mongoose.connect(uri);

  let user = await User.findOne({ email });
  if (user) {
    user.role = 'superadmin';
    user.isSuperAdmin = true;
    user.isVerified = true;
    user.accountStatus = 'active';
    user.hasCompletedOnboarding = true;
    if (password) {
      const check = validatePassword(password);
      if (!check.valid) {
        console.error('❌ Password rejected by policy:', check.message);
        process.exit(1);
      }
      user.password = password;
    }
    await user.save();
    console.log(`✅ Promoted existing user ${email} to active superadmin.`);
  } else {
    if (!password) {
      console.error('❌ Password (--password or SUPERADMIN_PASSWORD) is required to create a new superadmin account.');
      process.exit(1);
    }
    const check = validatePassword(password);
    if (!check.valid) {
      console.error('❌ Password rejected by policy:', check.message);
      process.exit(1);
    }
    user = await User.create({
      name,
      email,
      phone: phone || undefined,
      password,
      role: 'superadmin',
      isSuperAdmin: true,
      isVerified: true,
      accountStatus: 'active',
      hasCompletedOnboarding: true
    });
    console.log(`✅ Created new superadmin account: ${email}`);
  }

  await AdminLog.create({
    adminId: user._id,
    adminEmail: user.email,
    adminName: user.name,
    adminRole: 'superadmin',
    action: 'PROVISION_SUPERADMIN_CLI',
    category: 'security',
    targetType: 'User',
    targetId: String(user._id),
    details: `Backend CLI provisioned superadmin ${user.email}`,
    status: 'success'
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Provisioning error:', err);
  process.exit(1);
});
