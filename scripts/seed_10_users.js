/**
 * Seed 10 Users & 10 Robots for PKM Testing
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Robot = require('../src/models/Robot');

const USERS_LIST = [
  { id: '6aa0039cea5efb1927881f96', fullName: 'User 01', email: 'user01@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f97', fullName: 'User 02', email: 'user02@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f98', fullName: 'User 03', email: 'user03@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f99', fullName: 'User 04', email: 'user04@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f9a', fullName: 'User 05', email: 'user05@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f9b', fullName: 'User 06', email: 'user06@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f9c', fullName: 'User 07', email: 'user07@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f9d', fullName: 'User 08', email: 'user08@example.com', password: 'password' },
  { id: '6aa0039dea5efb1927881f9e', fullName: 'User 09', email: 'user09@example.com', password: 'password' },
  { id: '6aa0039eea5efb1927881f9f', fullName: 'User 10', email: 'user10@example.com', password: 'password' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/socasob');
  console.log('MongoDB connected');

  // 1. Seed Admin User
  let admin = await User.findOne({ email: 'admin@socasob.com' });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await User.create({
      fullName: 'Administrator',
      email: 'admin@socasob.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Admin created: admin@socasob.com / admin123');
  } else {
    console.log('Admin already exists');
  }

  // 2. Seed 10 Users
  for (const u of USERS_LIST) {
    let existingUser = await User.findOne({ email: u.email });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      existingUser = new User({
        _id: new mongoose.Types.ObjectId(u.id),
        fullName: u.fullName,
        email: u.email,
        password: hashedPassword,
        role: 'user',
      });
      await User.collection.insertOne(existingUser);
      console.log(`Created ${u.fullName} (${u.email}) with ID ${u.id}`);
    } else {
      console.log(`${u.fullName} already exists`);
    }

    // 3. Seed Robot for this user
    const pad = u.fullName.replace('User ', '');
    const robotId = `ROBOT-${pad}`;
    const serial = `SOCA-U${pad}`;

    await Robot.findOneAndUpdate(
      { robotId },
      {
        robotId,
        serialNumber: serial,
        name: `Robot ${u.fullName}`,
        status: 'active',
        ownerId: existingUser._id,
        description: `Robot pengujian khusus ${u.fullName}`,
      },
      { upsert: true, new: true }
    );
    console.log(`Paired ${robotId} (${serial}) -> ${u.fullName}`);
  }

  // 4. Seed Physical Robot ID (dummyrobot01 and fadfa566)
  await Robot.findOneAndUpdate(
    { robotId: 'dummyrobot01' },
    {
      robotId: 'dummyrobot01',
      serialNumber: 'SOCA-PHYSICAL',
      name: 'ESP32-CAM Fisik (Live)',
      status: 'active',
      description: 'Perangkat keras ESP32-CAM fisik utama',
    },
    { upsert: true }
  );

  await Robot.findOneAndUpdate(
    { robotId: 'fadfa566' },
    {
      robotId: 'fadfa566',
      serialNumber: 'SOCA-TEST',
      name: 'SocaSob Hardware Backup',
      status: 'active',
      description: 'ID cadangan perangkat keras',
    },
    { upsert: true }
  );

  console.log('\nSeed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
