const mongoose = require('mongoose');
const crypto = require('crypto');

const RobotSchema = new mongoose.Schema({
  robotId: {
    type: String,
    required: [true, 'robotId wajib diisi'],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Nama robot wajib diisi'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  ipAddress: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
    default: () => `scsb_live_${crypto.randomBytes(16).toString('hex')}`
  },
  lastSeenAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Robot', RobotSchema);
