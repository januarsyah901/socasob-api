const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema({
  status: { type: String, enum: ['YA', 'TIDAK'], required: true },
  reasons: { type: [String], default: [] }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: [true, 'reportId wajib diisi'],
    unique: true,
    trim: true,
    index: true
  },
  robotId: {
    type: String,
    required: [true, 'robotId wajib diisi'],
    trim: true,
    index: true
  },
  patientName: {
    type: String,
    required: [true, 'patientName wajib diisi'],
    trim: true,
    default: 'Pengguna'
  },
  title: {
    type: String,
    required: [true, 'Judul laporan wajib diisi'],
    trim: true
  },
  period: {
    type: String,
    enum: ['today', '7days', '30days', '6months'],
    default: '7days'
  },
  periodLabel: {
    type: String,
    default: '7 Hari Terakhir'
  },
  dateRange: {
    type: String,
    required: true
  },
  
  // -- Evaluasi Baru --
  myopiaExposureRisk: {
    type: EvaluationSchema,
    required: true
  },
  eyeFatigueRisk: {
    type: EvaluationSchema,
    required: true
  },
  dryEyeRisk: {
    type: EvaluationSchema,
    required: true
  },

  // -- Metrik --
  screenTimeMinutes: { type: Number, default: 0 },
  longestContinuousGazeMinutes: { type: Number, default: 0 },
  blinkRatePerMinute: { type: Number, default: 0 },
  incompleteBlinkRatio: { type: Number, default: 0 },
  dominantDistanceCm: { type: Number, default: 0 },
  distanceBelow50CmForAtLeast10Seconds: { type: Boolean, default: false },
  distanceBelow20CmDetected: { type: Boolean, default: false },
  
  // -- Legacy/Fallback properties agar frontend yg blm update gak error keras --
  myopiaRisk: { type: String, default: 'Rendah' },
  fatigueRisk: { type: String, default: 'Rendah' },
  cvsRisk: { type: String, default: 'Rendah' },
  restCompliance: { type: Number, default: 100 },
  nearDurationMin: { type: Number, default: 0 },
  farDurationMin: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  avgDistanceCm: { type: Number, default: 0 },
  blinkRatePerMin: { type: Number, default: 0 },
  clinicalNotes: { type: [String], default: [] },
  examinerNotes: { type: String, default: '' },
  disclaimer: {
    type: String,
    default: 'Semua output bersifat pemantauan risiko kebiasaan visual dan bukan diagnosis medis.'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
