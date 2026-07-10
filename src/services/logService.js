const DailyLog = require('../models/DailyLog');
const {
  calculateEyeStatus,
  calculateEyeHealthScore,
  calculateRestCompliance
} = require('./eyeHealthEngine');

let activeSession = null;

/**
 * Mendapatkan tanggal hari ini dalam format lokal YYYY-MM-DD
 */
const getLocalDateString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Mengambil log hari ini, buat baru jika belum ada
 */
const getTodayLog = async () => {
  const today = getLocalDateString();
  let log = await DailyLog.findOne({ date: today });
  
  if (!log) {
    log = await DailyLog.create({
      date: today,
      nearDuration: 0,
      farDuration: 0,
      blinkCount: 0,
      sessions: [],
      eyeHealthStatus: 'normal',
      restCompliance: 100
    });
  }
  
  return log;
};

/**
 * Memperbarui durasi harian (menambah 1 detik)
 * Serta mengelola transisi sesi (Dekat <-> Jauh)
 * @param {string} distance - 'Dekat' | 'Jauh'
 */
const updateDailyDuration = async (distance) => {
  const today = getLocalDateString();
  const fieldToIncrement = distance === 'Dekat' ? 'nearDuration' : 'farDuration';
  
  // 1. Increment durasi di DB
  await DailyLog.updateOne(
    { date: today },
    { $inc: { [fieldToIncrement]: 1 } },
    { upsert: true }
  );

  // 2. Kelola Sesi Aktif
  const now = new Date();
  if (!activeSession) {
    // Mulai sesi baru
    activeSession = {
      startTime: now,
      peakDistance: distance
    };
  } else if (activeSession.peakDistance !== distance) {
    // Jarak berubah, simpan sesi lama dan buat sesi baru
    const finishedSession = {
      startTime: activeSession.startTime,
      endTime: now,
      peakDistance: activeSession.peakDistance
    };

    await DailyLog.updateOne(
      { date: today },
      { $push: { sessions: finishedSession } },
      { upsert: true }
    );

    // Mulai sesi baru
    activeSession = {
      startTime: now,
      peakDistance: distance
    };
  }
};

/**
 * Menutup sesi aktif (misalnya saat aplikasi disconnect)
 */
const closeActiveSession = async () => {
  if (activeSession) {
    const today = getLocalDateString();
    const finishedSession = {
      startTime: activeSession.startTime,
      endTime: new Date(),
      peakDistance: activeSession.peakDistance
    };

    await DailyLog.updateOne(
      { date: today },
      { $push: { sessions: finishedSession } },
      { upsert: true }
    );

    activeSession = null;
    await recalculateMetrics();
  }
};

/**
 * Menambah jumlah kedipan mata
 */
const incrementBlink = async () => {
  const today = getLocalDateString();
  await DailyLog.updateOne(
    { date: today },
    { $inc: { blinkCount: 1 } },
    { upsert: true }
  );
};

/**
 * Menghitung ulang status kesehatan mata dan rest compliance untuk log hari ini
 */
const recalculateMetrics = async () => {
  const today = getLocalDateString();
  const log = await DailyLog.findOne({ date: today });
  
  if (log) {
    const totalDuration = log.nearDuration + log.farDuration;
    const newStatus = calculateEyeStatus(log.nearDuration, log.farDuration);
    const newCompliance = calculateRestCompliance(log.sessions, totalDuration);

    log.eyeHealthStatus = newStatus;
    log.restCompliance = newCompliance;
    await log.save();
  }
};

/**
 * Mengambil log riwayat 7 hari terakhir
 */
const getWeeklyLogs = async (startDateStr, endDateStr) => {
  let query = {};
  
  if (startDateStr && endDateStr) {
    query.date = { $gte: startDateStr, $lte: endDateStr };
  } else {
    // Default 7 hari terakhir
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      dates.push(localDate.toISOString().split('T')[0]);
    }
    query.date = { $in: dates };
  }

  const logs = await DailyLog.find(query).sort({ date: 1 });
  return logs;
};

/**
 * Mengambil log untuk tanggal spesifik
 */
const getLogByDate = async (dateStr) => {
  return await DailyLog.findOne({ date: dateStr });
};

module.exports = {
  getTodayLog,
  updateDailyDuration,
  closeActiveSession,
  incrementBlink,
  recalculateMetrics,
  getWeeklyLogs,
  getLogByDate,
  getLocalDateString
};
