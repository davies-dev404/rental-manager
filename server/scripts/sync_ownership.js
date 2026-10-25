const mongoose = require('mongoose');
const Property = require('../models/Property');
const Unit = require('../models/Unit');

async function sync() {
  await mongoose.connect('mongodb +srv://kipsoikibet2_db_user:[EMAIL_ADDRESS]/rental_manager?retryWrites=true&w=majority');
  const pRes = await Property.updateMany({}, { user: '6acd104238bfd6c8ee48d7a4' });
  const uRes = await Unit.updateMany({}, { user: '6acd104238bfd6c8ee48d7a4' });
  console.log('Updated properties to active user:', pRes.modifiedCount);
  console.log('Updated units to active user:', uRes.modifiedCount);
  process.exit(0);
}

sync();
