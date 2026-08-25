const DailyLog = require('../models/DailyLog');
const {
  calculateEyeStatus,
  calculateEyeHealthScore,
  calculateRestCompliance
} = require('./eyeHealthEngine');

// activeSession sekarang Map keyed by robotId
// { robotId → { startTime, peakDistance } }
const activeSessions = new Map();

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
 * Mengambil log hari ini untuk robot tertentu.
 * Tidak membuat dokumen baru secara otomatis — hanya baca dari DB.
 * @param {string} robotId
 */
const getTodayLog = async (robotId) => {
  if (!robotId) throw new Error('robotId wajib diisi');
  const today = getLocalDateString();
  return await DailyLog.findOne({ robotId, date: today });
};

/**
 * Memperbarui durasi harian (menambah 1 detik)
 * Serta mengelola transisi sesi (Dekat <-> Jauh)
 * @param {string} robotId
 * @param {string} distance - 'Dekat' | 'Jauh'
 */
const updateDailyDuration = async (robotId, distance) => {
  if (!robotId) return;
  const today = getLocalDateString();
  const fieldToIncrement = distance === 'Dekat' ? 'nearDuration' : 'farDuration';

  // 1. Increment durasi di DB
  await DailyLog.updateOne(
    { robotId, date: today },
    { $inc: { [fieldToIncrement]: 1 } },
    { upsert: true }
  );

  // 2. Kelola Sesi Aktif per robot
  const now = new Date();
  const activeSession = activeSessions.get(robotId);

  if (!activeSession) {
    activeSessions.set(robotId, { startTime: now, peakDistance: distance });
  } else if (activeSession.peakDistance !== distance) {
    // Jarak berubah: simpan sesi lama, buat sesi baru
    const finishedSession = {
      startTime: activeSession.startTime,
      endTime: now,
      peakDistance: activeSession.peakDistance
    };

    await DailyLog.updateOne(
      { robotId, date: today },
      { $push: { sessions: finishedSession } },
      { upsert: true }
    );

    activeSessions.set(robotId, { startTime: now, peakDistance: distance });
  }
};

/**
 * Menutup sesi aktif untuk robot tertentu (misalnya saat disconnect)
 * @param {string} robotId
 */
const closeActiveSession = async (robotId) => {
  if (!robotId) return;
  const activeSession = activeSessions.get(robotId);
  if (activeSession) {
    const today = getLocalDateString();
    const finishedSession = {
      startTime: activeSession.startTime,
      endTime: new Date(),
      peakDistance: activeSession.peakDistance
    };

    await DailyLog.updateOne(
      { robotId, date: today },
      { $push: { sessions: finishedSession } },
      { upsert: true }
    );

    activeSessions.delete(robotId);
    await recalculateMetrics(robotId);
  }
};

/**
 * Menambah jumlah kedipan mata untuk robot tertentu
 * @param {string} robotId
 */
const incrementBlink = async (robotId) => {
  if (!robotId) return;
  const today = getLocalDateString();
  await DailyLog.updateOne(
    { robotId, date: today },
    { $inc: { blinkCount: 1 } },
    { upsert: true }
  );
};

/**
 * Menghitung ulang status kesehatan mata dan rest compliance untuk robot tertentu
 * @param {string} robotId
 */
const recalculateMetrics = async (robotId) => {
  if (!robotId) return;
  const today = getLocalDateString();
  const log = await DailyLog.findOne({ robotId, date: today });

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
 * Mengambil log riwayat 7 hari terakhir untuk robot tertentu
 * @param {string} robotId
 * @param {string} [startDateStr]
 * @param {string} [endDateStr]
 */
const getWeeklyLogs = async (robotId, startDateStr, endDateStr) => {
  if (!robotId) return [];
  let query = { robotId };

  if (startDateStr && endDateStr) {
    query.date = { $gte: startDateStr, $lte: endDateStr };
  } else {
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

  return await DailyLog.find(query).sort({ date: 1 });
};

/**
 * Mengambil log untuk tanggal spesifik dan robot tertentu
 * @param {string} robotId
 * @param {string} dateStr
 */
const getLogByDate = async (robotId, dateStr) => {
  if (!robotId) return null;
  return await DailyLog.findOne({ robotId, date: dateStr });
};

/**
 * Mencatat penyelesaian sesi istirahat/senam mata (Micro-Break 20-20-20)
 * @param {string} robotId
 * @param {number} duration - durasi istirahat dalam detik (default: 20)
 */
const recordBreak = async (robotId, duration = 20) => {
  if (!robotId) return null;
  const today = getLocalDateString();
  const now = new Date();
  const startTime = new Date(now.getTime() - duration * 1000);

  const breakSession = {
    startTime,
    endTime: now,
    peakDistance: 'Jauh'
  };

  await DailyLog.findOneAndUpdate(
    { robotId, date: today },
    {
      $inc: { farDuration: duration },
      $push: { sessions: breakSession }
    },
    { upsert: true, new: true }
  );

  await recalculateMetrics(robotId);
  return await DailyLog.findOne({ robotId, date: today });
};

module.exports = {
  getTodayLog,
  updateDailyDuration,
  closeActiveSession,
  incrementBlink,
  recalculateMetrics,
  getWeeklyLogs,
  getLogByDate,
  getLocalDateString,
  recordBreak
};
