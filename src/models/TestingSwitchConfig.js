const mongoose = require('mongoose');

const TestingSwitchConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global',
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  physicalRobotId: {
    type: String,
    default: 'dummyrobot01',
    trim: true
  },
  targetRobotId: {
    type: String,
    default: 'ROBOT-01',
    trim: true
  },
  lastSwitchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TestingSwitchConfig', TestingSwitchConfigSchema);
