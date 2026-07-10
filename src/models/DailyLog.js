const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  peakDistance: {
    type: String,
    enum: ['Dekat', 'Jauh'],
    default: 'Jauh'
  }
});

const DailyLogSchema = new mongoose.Schema({
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    unique: true,
    index: true
  },
  nearDuration: {
    type: Number, // in seconds
    default: 0
  },
  farDuration: {
    type: Number, // in seconds
    default: 0
  },
  blinkCount: {
    type: Number,
    default: 0
  },
  sessions: [SessionSchema],
  eyeHealthStatus: {
    type: String,
    enum: ['normal', 'risk_myopia', 'risk_fatigue'],
    default: 'normal'
  },
  restCompliance: {
    type: Number, // percentage 0-100
    default: 100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DailyLog', DailyLogSchema);
