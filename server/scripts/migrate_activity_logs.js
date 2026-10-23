const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rental_manager');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  
  for (const u of users) {
    const filter = {
      $or: [
        { user: new RegExp('^' + u.name + '$', 'i') },
        { user: new RegExp('^' + (u.name.split(' ')[0] || '') + '$', 'i') },
        { description: new RegExp(u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ]
    };
    const update = {
      $set: {
        userId: u._id,
        userEmail: u.email
      }
    };
    const res = await mongoose.connection.collection('activitylogs').updateMany(filter, update);
    console.log(`Linked ${res.modifiedCount} logs to ${u.name} (${u.email}) [ID: ${u._id}]`);
  }

  const unassigned = await mongoose.connection.collection('activitylogs').countDocuments({ userId: { $exists: false } });
  console.log(`Unassigned legacy logs remaining: ${unassigned}`);
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
