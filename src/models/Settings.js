const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: 'default_user',
    index: true
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
