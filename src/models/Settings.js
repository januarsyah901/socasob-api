const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userId: {
    // Mixed: mendukung ObjectId (dari JWT decoded.id) dan string
    type: mongoose.Schema.Types.Mixed,
    required: true,
    unique: true,
    index: true
  },
  robotId: {
    type: String,
    default: ''
  },
  robotIp: {
    type: String,
    required: true,
    default: '192.168.1.1'
  },
  audioVolume: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  audioEnabled: {
    type: Boolean,
    default: true
  },
  notificationEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);
