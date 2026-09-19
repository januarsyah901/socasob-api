const mongoose = require('mongoose');
const Report = require('../models/Report');
const DailyLog = require('../models/DailyLog');
const {
  evaluateDailyRisks,
  calculateRiskLevels
} = require('./eyeHealthEngine');

const formatDateIndo = (dateObj) => {
  try {
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch (_) {
    return dateObj.toISOString().split('T')[0];
  }
};

const formatDateStr = (dateObj) => {
  const offset = dateObj.getTimezoneOffset();
  const local = new Date(dateObj.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

const generateReport = async ({ robotId, patientName = 'Pengguna', period = '7days' }) => {
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
    title = 'Audit Longitudinal & Evaluasi Risiko Pemantauan'; // Updated title
  }

  const startDateObj = new Date(now);
  startDateObj.setDate(now.getDate() - daysBack);
  const startDateStr = formatDateStr(startDateObj);
  const todayStr = formatDateStr(now);

  const dateRange =
    daysBack === 0
      ? formatDateIndo(now)
      : `${formatDateIndo(startDateObj)} s.d. ${formatDateIndo(now)}`;

  const logs = await DailyLog.find({
    robotId,
    date: { $gte: startDateStr, $lte: todayStr }
  }).sort({ date: 1 });

  // Agregasi metrik baru & akumulasi hari risiko
  let maxScreenTime = 0;
  let maxContGaze = 0;
  let totalScreenTimeAll = 0;
  let totalContGazeAll = 0;
  let totalBlinkRate = 0;
  let totalIncompleteRatio = 0;
  let totalDominantDistance = 0;
  let anyBelow50 = false;
  let anyBelow20 = false;
  
  let fatigueRiskDays = 0;
  let dryEyeRiskDays = 0;
  let myopiaRiskDays = 0;
  
  // Agregasi metrik legacy
  let totalNearSec = 0;
  let totalFarSec = 0;
  let totalBlinks = 0;
  let totalCompliance = 0;
  
  let validDaysCount = 0;

  if (logs && logs.length > 0) {
    logs.forEach((log) => {
      // Legacy
      totalNearSec += log.nearDuration || 0;
      totalFarSec += log.farDuration || 0;
      totalBlinks += log.blinkCount || 0;
      totalCompliance += log.restCompliance || 100;

      // Evaluasi harian untuk hitung total hari terdeteksi
      const dailyScreenMins = log.screenTimeMinutes || Math.round(((log.nearDuration || 0) + (log.farDuration || 0)) / 60);
      const dailyGaze = log.longestContinuousGazeMinutes || 0;
      const dailyBlink = log.blinkRatePerMinute || (dailyScreenMins > 0 ? Math.round((log.blinkCount || 0) / dailyScreenMins) : 16);
      const dailyIncomplete = log.incompleteBlinkRatio || 0;
      const dailyBelow50 = log.distanceBelow50CmForAtLeast10Seconds !== undefined
        ? log.distanceBelow50CmForAtLeast10Seconds
        : (log.dominantDistanceCm ? log.dominantDistanceCm < 50 : false);
      const dailyBelow20 = log.distanceBelow20CmDetected || false;

      const dailyEval = evaluateDailyRisks({
        screenTimeMinutes: dailyScreenMins,
        longestContinuousGazeMinutes: dailyGaze,
        blinkRatePerMinute: dailyBlink,
        incompleteBlinkRatio: dailyIncomplete,
        distanceBelow50CmForAtLeast10Seconds: dailyBelow50,
        distanceBelow20CmDetected: dailyBelow20
      });

      if (dailyEval.eyeFatigueRisk.status === 'YA') fatigueRiskDays++;
      if (dailyEval.dryEyeRisk.status === 'YA') dryEyeRiskDays++;
      if (dailyEval.myopiaExposureRisk.status === 'YA') myopiaRiskDays++;

      // New metrics
      validDaysCount++;
      totalScreenTimeAll += dailyScreenMins;
      totalContGazeAll += dailyGaze;
      maxScreenTime = Math.max(maxScreenTime, dailyScreenMins);
      maxContGaze = Math.max(maxContGaze, dailyGaze);
      totalBlinkRate += dailyBlink;
      totalIncompleteRatio += dailyIncomplete;
      totalDominantDistance += (log.dominantDistanceCm || 45);
      if (dailyBelow50) anyBelow50 = true;
      if (dailyBelow20) anyBelow20 = true;
    });
  }

  const avgScreenTimeMinutes = validDaysCount > 0 ? Math.round(totalScreenTimeAll / validDaysCount) : 0;
  const avgLongestContinuousGazeMinutes = validDaysCount > 0 ? Math.round(totalContGazeAll / validDaysCount) : 0;
  const avgBlinkRatePerMin = validDaysCount > 0 ? Math.round(totalBlinkRate / validDaysCount) : 0;
  const avgIncompleteRatio = validDaysCount > 0 ? Math.round(totalIncompleteRatio / validDaysCount) : 0;
  const avgDominantDist = validDaysCount > 0 ? Math.round(totalDominantDistance / validDaysCount) : 0;

  // Run new evaluation based on aggregated worst-case/average (or just max/any for safety)
  // We use maxScreenTime and maxContGaze because risk is based on exceeding daily limits at least once in the period
  const evaluatedRisks = evaluateDailyRisks({
    screenTimeMinutes: maxScreenTime,
    longestContinuousGazeMinutes: maxContGaze,
    blinkRatePerMinute: avgBlinkRatePerMin,
    incompleteBlinkRatio: avgIncompleteRatio,
    distanceBelow50CmForAtLeast10Seconds: anyBelow50,
    distanceBelow20CmDetected: anyBelow20
  });

  const totalSec = totalNearSec + totalFarSec;
  const totalHours = Math.round((totalSec / 3600) * 10) / 10;
  const nearDurationMin = Math.round(totalNearSec / 60);
  const farDurationMin = Math.round(totalFarSec / 60);
  
  const restCompliance = logs.length > 0 ? Math.round(totalCompliance / logs.length) : 0;
  
  // Legacy risks mapping
  const legacyRisks = totalSec > 0
      ? calculateRiskLevels(totalNearSec, totalFarSec)
      : { myopiaRisk: 'Rendah', fatigueRisk: 'Rendah' };
  
  const cvsRisk = legacyRisks.fatigueRisk === 'Tinggi' ? 'Tinggi'
      : legacyRisks.fatigueRisk === 'Sedang' ? 'Sedang' : 'Rendah';

  // Dynamic Notes (updated to remove diagnosis and use safe terminology)
  const clinicalNotes = [];
  let examinerNotes = '-';

  if (logs.length === 0 && validDaysCount === 0) {
    clinicalNotes.push('Belum ada rekaman data telemetri yang terdeteksi untuk periode ini.');
  } else {
    // New logic based on evaluating true risks
    if (evaluatedRisks.eyeFatigueRisk.status === 'YA') {
      clinicalNotes.push('Terdeteksi risiko mata lelah. Perhatikan durasi menatap layar dan pastikan menjaga jarak ergonomis.');
    } else {
      clinicalNotes.push('Risiko mata lelah tergolong rendah pada periode ini.');
    }
    
    if (evaluatedRisks.dryEyeRisk.status === 'YA') {
      clinicalNotes.push('Terdeteksi indikasi risiko mata kering. Perbanyak kedipan sempurna dan batasi waktu layar berlebih.');
    }
    
    if (evaluatedRisks.myopiaExposureRisk.status === 'YA') {
      clinicalNotes.push('Paparan terhadap risiko miopia tinggi (jarak terlalu dekat / durasi terlalu lama). Harap biasakan aturan 20-20-20.');
    }

    if (daysBack >= 30) {
      clinicalNotes.push(`Tingkat kepatuhan istirahat tercatat ${restCompliance}%.`);
      if (daysBack === 180) { // 6 Bulan
        examinerNotes = 'Berdasarkan pola paparan kumulatif 6 bulan terakhir, pertimbangkan melakukan skrining mata atau pemeriksaan refraksi.';
      } else {
        examinerNotes = 'Terus pantau pola paparan risiko dan patuhi pengingat istirahat.';
      }
    } else {
      examinerNotes = 'Pemantauan jangka pendek menunjukkan aktivitas normal-sedang.';
    }
  }

  const reportId = `SOCA-${Math.floor(100000 + Math.random() * 900000)}`;

  const newReport = new Report({
    reportId,
    robotId,
    patientName: patientName.trim() || 'Pengguna',
    title,
    period,
    periodLabel,
    dateRange,
    
    // Akumulasi Hari Risiko & Rata-rata
    fatigueRiskDays,
    dryEyeRiskDays,
    myopiaRiskDays,
    totalDaysMonitored: validDaysCount,
    avgScreenTimeMinutes,
    avgLongestContinuousGazeMinutes,
    avgDominantDistanceCm: avgDominantDist,
    avgBlinkRatePerMinute: avgBlinkRatePerMin,
    avgIncompleteBlinkRatio: avgIncompleteRatio,

    // Evaluasi Risiko Periode
    myopiaExposureRisk: evaluatedRisks.myopiaExposureRisk,
    eyeFatigueRisk: evaluatedRisks.eyeFatigueRisk,
    dryEyeRisk: evaluatedRisks.dryEyeRisk,
    screenTimeMinutes: maxScreenTime,
    longestContinuousGazeMinutes: maxContGaze,
    blinkRatePerMinute: avgBlinkRatePerMin,
    incompleteBlinkRatio: avgIncompleteRatio,
    dominantDistanceCm: avgDominantDist,
    distanceBelow50CmForAtLeast10Seconds: anyBelow50,
    distanceBelow20CmDetected: anyBelow20,

    // Legacy fields
    myopiaRisk: legacyRisks.myopiaRisk,
    fatigueRisk: legacyRisks.fatigueRisk,
    cvsRisk,
    restCompliance,
    nearDurationMin,
    farDurationMin,
    totalHours,
    avgDistanceCm: avgDominantDist || (totalSec > 0 ? Math.round(((totalNearSec * 25) + (totalFarSec * 40)) / totalSec) : 0),
    blinkRatePerMin: avgBlinkRatePerMin, // fallback map
    clinicalNotes,
    examinerNotes,
    disclaimer: 'Semua output bersifat pemantauan risiko kebiasaan visual dan bukan diagnosis medis.'
  });

  await newReport.save();
  return newReport;
};

const getReports = async (robotId) => {
  const query = robotId ? { robotId } : {};
  return await Report.find(query).sort({ createdAt: -1 }).lean();
};

const getReportById = async (reportId) => {
  return await Report.findOne({
    $or: [
      { reportId },
      ...(mongoose.isValidObjectId(reportId) ? [{ _id: reportId }] : [])
    ]
  }).lean();
};

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
