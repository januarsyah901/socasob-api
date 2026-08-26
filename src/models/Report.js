const mongoose = require('mongoose');

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
    default: 'Bang Jan'
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
  myopiaRisk: {
    type: String,
    enum: ['Rendah', 'Sedang', 'Tinggi'],
    required: true
  },
  fatigueRisk: {
    type: String,
    enum: ['Rendah', 'Sedang', 'Tinggi'],
    required: true
  },
  cvsRisk: {
    type: String,
    enum: ['Rendah', 'Sedang', 'Tinggi'],
    default: 'Rendah'
  },
  restCompliance: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  nearDurationMin: {
    type: Number,
    default: 0
  },
  farDurationMin: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  avgDistanceCm: {
    type: Number,
    default: 35
  },
  blinkRatePerMin: {
    type: Number,
    default: 15
  },
  clinicalNotes: {
    type: [String],
    default: []
  },
  examinerNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
