const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  robotId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    index: true
  },
  // --- Metrik Baru Sesuai Aturan ---
  screenTimeMinutes: {
    type: Number,
    default: 0
  },
  longestContinuousGazeMinutes: {
    type: Number,
    default: 0
  },
  blinkRatePerMinute: {
    type: Number,
    default: 0
  },
  incompleteBlinkRatio: {
    type: Number, // percentage 0-100
    default: 0
  },
  dominantDistanceCm: {
    type: Number,
    default: 50 // aman default
  },
  distanceBelow50CmForAtLeast10Seconds: {
    type: Boolean,
    default: false
  },
  distanceBelow20CmDetected: {
    type: Boolean,
    default: false
  },
  
  // -- Legacy fields (dipertahankan agar tidak break jika ada dependensi) --
  nearDuration: { type: Number, default: 0 },
  farDuration: { type: Number, default: 0 },
  blinkCount: { type: Number, default: 0 },
  sessions: { type: Array, default: [] },
  eyeHealthStatus: { type: String, default: 'normal' },
  restCompliance: { type: Number, default: 100 }
}, {
  timestamps: true
});

DailyLogSchema.index({ robotId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', DailyLogSchema);
