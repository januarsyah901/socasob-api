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
  // Kode yang diketikkan user saat pairing (contoh: SOCA-X7B9)
  serialNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true
  },
  // Pemilik robot — null berarti belum di-pair oleh siapapun
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
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
