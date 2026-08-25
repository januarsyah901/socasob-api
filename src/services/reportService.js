const mongoose = require('mongoose');
const Report = require('../models/Report');
const DailyLog = require('../models/DailyLog');
const {
  calculateEyeHealthScore,
  calculateRiskLevels
} = require('./eyeHealthEngine');

/**
 * Format tanggal ke teks bahasa Indonesia (contoh: 23 Agustus 2026)
 */
const formatDateIndo = (dateObj) => {
  try {
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (_) {
    return dateObj.toISOString().split('T')[0];
  }
};

/**
 * Format tanggal ke format YYYY-MM-DD
 */
const formatDateStr = (dateObj) => {
  const offset = dateObj.getTimezoneOffset();
  const local = new Date(dateObj.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

/**
 * Generate dan simpan Laporan Medis baru berdasarkan data DailyLog riil
 */
const generateReport = async ({ robotId, patientName = 'Bang Jan', period = '7days' }) => {
  const now = new Date();
  let daysBack = 7;
  let periodLabel = '7 Hari Terakhir';
  let title = 'Evaluasi Mingguan Kesehatan Penglihatan';

  if (period === 'today') {
    daysBack = 0;
    periodLabel = 'Hari Ini';
    title = 'Evaluasi Harian Kesehatan Penglihatan';
  } else if (period === '30days') {
    daysBack = 30;
    periodLabel = '30 Hari Terakhir';
    title = 'Ringkasan Bulanan Kebiasaan Layar & Jarak Pandang';
  } else if (period === '6months') {
    daysBack = 180;
    periodLabel = '6 Bulan Terakhir';
    title = 'Audit Longitudinal Ergonomi & Evaluasi Miopia';
  }

  const startDateObj = new Date(now);
  startDateObj.setDate(now.getDate() - daysBack);

  const startDateStr = formatDateStr(startDateObj);
  const todayStr = formatDateStr(now);

  const dateRange =
    daysBack === 0
      ? formatDateIndo(now)
      : `${formatDateIndo(startDateObj)} – ${formatDateIndo(now)}`;

  // Ambil logs dari database MongoDB
  const logs = await DailyLog.find({
    robotId,
    date: { $gte: startDateStr, $lte: todayStr }
  }).sort({ date: 1 });

  let totalNearSec = 0;
  let totalFarSec = 0;
  let totalBlinks = 0;
  let totalCompliance = 0;

  if (logs && logs.length > 0) {
    logs.forEach((log) => {
      totalNearSec += log.nearDuration || 0;
      totalFarSec += log.farDuration || 0;
      totalBlinks += log.blinkCount || 0;
      totalCompliance += log.restCompliance || 100;
    });
  }

  const totalSec = totalNearSec + totalFarSec;
  const totalHours = Math.round((totalSec / 3600) * 10) / 10;
  const nearDurationMin = Math.round(totalNearSec / 60);
  const farDurationMin = Math.round(totalFarSec / 60);
  const totalMin = nearDurationMin + farDurationMin;

  const restCompliance =
    logs.length > 0 ? Math.round(totalCompliance / logs.length) : 85;

  const blinkRatePerMin =
    totalMin > 0
      ? Math.round((totalBlinks / totalMin) * 10) / 10
      : 15.0;

  const eyeHealthScore =
    totalSec > 0
      ? calculateEyeHealthScore(totalNearSec, totalFarSec, totalBlinks, restCompliance)
      : 86;

  const risks =
    totalSec > 0
      ? calculateRiskLevels(totalNearSec, totalFarSec)
      : { myopiaRisk: 'Rendah', fatigueRisk: 'Sedang' };

  const cvsRisk =
    risks.fatigueRisk === 'Tinggi'
      ? 'Tinggi'
      : risks.fatigueRisk === 'Sedang'
      ? 'Sedang'
      : 'Rendah';

  const avgDistanceCm =
    totalSec > 0
      ? Math.round(((totalNearSec * 25) + (totalFarSec * 40)) / totalSec)
      : 38.5;

  // Generate Dynamic Clinical Notes based on actual telemetries
  const clinicalNotes = [];

  if (avgDistanceCm >= 30) {
    clinicalNotes.push(
      `Jarak rata-rata mata terhadap layar monitor berada pada batas aman yang dianjurkan (${avgDistanceCm} cm ≥ 30 cm).`
    );
  } else {
    clinicalNotes.push(
      `Jarak rata-rata mata terhadap monitor tercatat terlalu dekat (${avgDistanceCm} cm < 30 cm). Membutuhkan penyesuaian posisi duduk dan tata letak layar kerja.`
    );
  }

  if (blinkRatePerMin >= 12) {
    clinicalNotes.push(
      `Frekuensi berkedip tercatat ${blinkRatePerMin} kedipan/menit, sangat baik dalam menjaga stabilitas hidrasi tear film kornea.`
    );
  } else {
    clinicalNotes.push(
      `Frekuensi berkedip rendah (${blinkRatePerMin} kedipan/menit < standar 12-15/mnt). Berisiko menimbulkan Computer Vision Syndrome (CVS) dan mata kering.`
    );
  }

  if (nearDurationMin > 60 && risks.myopiaRisk !== 'Rendah') {
    clinicalNotes.push(
      `Ditemukan akumulasi tatap dekat berlebih (${nearDurationMin} menit). Disarankan membatasi sesi dekat beruntun maksimal 45 menit.`
    );
  } else {
    clinicalNotes.push(
      `Pola pergantian tatap jauh terpelihara dengan baik (${farDurationMin} menit aman), efektif merelaksasikan otot akomodasi siliaris.`
    );
  }

  clinicalNotes.push(
    `Tingkat kepatuhan istirahat 20-20-20 tercatat ${restCompliance}%. ${
      restCompliance >= 70
        ? 'Sangat efektif dalam menekan risiko progresi miopia dan kelelahan visual.'
        : 'Perlu peningkatan disiplin jeda micro-break 20 detik secara berkala.'
    }`
  );

  const examinerNotes = `Pasien menunjukkan indeks kesehatan penglihatan ${eyeHealthScore}/100 dengan risiko miopia ${risks.myopiaRisk}. Disarankan ${
    eyeHealthScore >= 80
      ? 'mempertahankan kebiasaan ergonomis saat ini dan melanjutkan pemantauan SocaSob.'
      : 'meningkatkan frekuensi senam mata 20-20-20 dan berkonsultasi bila timbul gejala pusing atau buram.'
  }`;

  // Unique report ID
  const reportId = `SOCA-${Math.floor(100000 + Math.random() * 900000)}`;

  const newReport = new Report({
    reportId,
    robotId,
    patientName: patientName.trim() || 'Bang Jan',
    title,
    period,
    periodLabel,
    dateRange,
    eyeHealthScore,
    myopiaRisk: risks.myopiaRisk,
    fatigueRisk: risks.fatigueRisk,
    cvsRisk,
    restCompliance,
    nearDurationMin,
    farDurationMin,
    totalHours,
    avgDistanceCm,
    blinkRatePerMin,
    clinicalNotes,
    examinerNotes
  });

  await newReport.save();
  return newReport;
};

/**
 * Ambil semua laporan medis
 */
const getReports = async (robotId) => {
  const query = robotId ? { robotId } : {};
  return await Report.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * Ambil laporan medis berdasarkan ID
 */
const getReportById = async (reportId) => {
  return await Report.findOne({
    $or: [
      { reportId },
      ...(mongoose.isValidObjectId(reportId) ? [{ _id: reportId }] : [])
    ]
  }).lean();
};

/**
 * Hapus laporan medis berdasarkan ID
 */
const deleteReport = async (reportId) => {
  return await Report.findOneAndDelete({
    $or: [
      { reportId },
      ...(mongoose.isValidObjectId(reportId) ? [{ _id: reportId }] : [])
    ]
  });
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  deleteReport
};
