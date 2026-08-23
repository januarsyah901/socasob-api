const logService = require('../services/logService');
const timerService = require('../services/timerService');
const { isRobotValidAndActive, touchRobotLastSeen } = require('../services/robotService');
const { calculateEyeHealthScore, calculateRiskLevels } = require('../services/eyeHealthEngine');

// ============================================================
// State per robot_id (Map menggantikan variabel global tunggal)
// ============================================================
// Struktur: robotId → { distance, confidence, lastDetectionTime, watchdogInterval }
const robotStates = new Map();

/**
 * Mengambil atau membuat state awal untuk robot tertentu.
 * @param {string} robotId
 */
const getOrCreateRobotState = (robotId) => {
  if (!robotStates.has(robotId)) {
    robotStates.set(robotId, {
      distance: 'Jauh',
      confidence: 100,
      lastDetectionTime: null,
      watchdogInterval: null,
    });
  }
  return robotStates.get(robotId);
};

// ============================================================
// Watchdog per robot
// ============================================================

const startWatchdog = (io, robotId) => {
  const state = getOrCreateRobotState(robotId);
  if (state.watchdogInterval) clearInterval(state.watchdogInterval);

  state.watchdogInterval = setInterval(async () => {
    if (state.lastDetectionTime && (new Date() - state.lastDetectionTime > 5000)) {
      console.log(`[Watchdog] Robot ${robotId} timeout. Menghentikan timer.`);
      timerService.stopTimer(robotId);
      await logService.closeActiveSession(robotId);

      // Emit status disconnected hanya ke room robot ini
      io.to(`robot:${robotId}`).emit('eye-status', {
        status: 'disconnected',
        score: 0,
        indicators: { eyeFatigue: 0, myopiaRisk: 0, postureWarning: false, blinkRate: 0 },
        timestamp: new Date().toISOString()
      });
    }
  }, 5000);
};

const stopWatchdog = (robotId) => {
  const state = robotStates.get(robotId);
  if (state && state.watchdogInterval) {
    clearInterval(state.watchdogInterval);
    state.watchdogInterval = null;
  }
};

// ============================================================
// Handler untuk event dari ML (py-eye-detection)
// ============================================================

/**
 * Memproses event real-time py-eye-detection dari ML.
 * @param {Server} io - Instance Socket.io server
 * @param {Object} payload - { robot_id, distance, confidence, blink_event, timestamp }
 */
const handleEyeDetection = async (io, payload) => {
  if (!payload || !payload.robot_id || !payload.distance) return;

  const { robot_id: robotId, distance, confidence, blink_event: blinkEvent, timestamp } = payload;

  // Security Gate: Cek apakah robot terdaftar dan aktif
  const isValid = await isRobotValidAndActive(robotId);
  if (!isValid) {
    console.warn(`[Security Gate] Mengabaikan frame dari robot '${robotId}' (belum terdaftar / inaktif).`);
    return;
  }

  touchRobotLastSeen(robotId);

  const state = getOrCreateRobotState(robotId);

  state.distance = distance;
  state.confidence = confidence || 100;
  state.lastDetectionTime = new Date();

  // 1. Kirim status jarak real-time ke room robot ini
  io.to(`robot:${robotId}`).emit('eye-distance', {
    distance,
    confidence: state.confidence,
    timestamp: timestamp || state.lastDetectionTime.toISOString()
  });

  // 2. Jika ada blink event, increment ke DB
  if (blinkEvent) {
    await logService.incrementBlink(robotId);
  }

  // 3. Mulai timer jika belum aktif
  if (!timerService.getIsActive(robotId)) {
    startWatchdog(io, robotId);

    timerService.startTimer(robotId, async (timeData) => {
      // a. Emit timer ke FE
      io.to(`robot:${robotId}`).emit('timer-update', timeData);

      // b. Update durasi harian di MongoDB (increment 1 detik)
      await logService.updateDailyDuration(robotId, state.distance);

      // c. Setiap 5 detik, kalkulasi & emit eye-status
      if (timeData.seconds % 5 === 0) {
        await logService.recalculateMetrics(robotId);
        const log = await logService.getTodayLog(robotId);
        if (!log) return;

        const totalSec = log.nearDuration + log.farDuration;
        const risks = calculateRiskLevels(log.nearDuration, log.farDuration);
        const score = calculateEyeHealthScore(
          log.nearDuration, log.farDuration, log.blinkCount, log.restCompliance
        );
        const totalMin = totalSec / 60;
        const blinkRate = totalMin > 0 ? (log.blinkCount / totalMin) : 0;

        io.to(`robot:${robotId}`).emit('eye-status', {
          status: log.eyeHealthStatus,
          score,
          indicators: {
            eyeFatigue: risks.fatigueRisk === 'Tinggi' ? 85 : risks.fatigueRisk === 'Sedang' ? 45 : 10,
            myopiaRisk: risks.myopiaRisk === 'Tinggi' ? 85 : risks.myopiaRisk === 'Sedang' ? 45 : 10,
            postureWarning: false,
            blinkRate: Math.round(blinkRate * 10) / 10
          },
          timestamp: new Date().toISOString()
        });
      }
    });
  }
};

// ============================================================
// Handler untuk event agregasi py-minute-summary dari ML
// ============================================================

/**
 * Memproses event agregasi 1 menit py-minute-summary dari ML.
 * Data disimpan ke MongoDB dan diteruskan ke FE room robot.
 * @param {Server} io
 * @param {Object} summary - Payload lengkap dari AggregatorService ML
 */
const handleMinuteSummary = async (io, summary) => {
  if (!summary || !summary.robot_id) return;

  const { robot_id: robotId } = summary;

  const isValid = await isRobotValidAndActive(robotId);
  if (!isValid) {
    console.warn(`[Security Gate] Mengabaikan ringkasan 1 menit dari robot '${robotId}' (belum terdaftar / inaktif).`);
    return;
  }

  console.log(`[Summary] Menerima ringkasan 1 menit dari robot: ${robotId}`);

  try {
    // Simpan durasi dekat/jauh ke DailyLog (increment berdasarkan near/far duration)
    const today = logService.getLocalDateString();
    const DailyLog = require('../models/DailyLog');

    await DailyLog.updateOne(
      { robotId, date: today },
      {
        $inc: {
          nearDuration: summary.near_duration_sec || 0,
          farDuration: summary.far_duration_sec || 0,
          blinkCount: summary.blink_count || 0,
        }
      },
      { upsert: true }
    );

    await logService.recalculateMetrics(robotId);

    // Forward ke FE room robot ini
    io.to(`robot:${robotId}`).emit('minute-summary', {
      near_duration_sec: summary.near_duration_sec,
      far_duration_sec: summary.far_duration_sec,
      near_percentage: summary.near_percentage,
      blink_count: summary.blink_count,
      avg_blink_rate: summary.avg_blink_rate,
      dominant_distance: summary.dominant_distance,
      health_status: summary.health_status,
      eye_conditions: summary.eye_conditions,
      recommendations: summary.recommendations,
      period_start: summary.period_start,
      period_end: summary.period_end,
    });

    console.log(`[Summary] Data robot ${robotId} berhasil disimpan ke DB.`);
  } catch (err) {
    console.error(`[Summary] Gagal menyimpan data robot ${robotId}:`, err.message);
  }
};

// ============================================================
// Handler untuk event subscribe dari FE
// ============================================================

/**
 * Mendaftarkan socket FE ke room robot tertentu.
 * Dipanggil saat user input robot_id di dashboard.
 * @param {Socket} socket - Socket instance milik FE client
 * @param {string} robotId
 */
const handleSubscribeRobot = (socket, robotId) => {
  if (!robotId) return;

  // Keluarkan dari room robot lama dulu (jika ada)
  const roomsToLeave = [...socket.rooms].filter(r => r.startsWith('robot:'));
  roomsToLeave.forEach(room => socket.leave(room));

  // Join room robot baru
  socket.join(`robot:${robotId}`);
  console.log(`[FE Subscribe] socket ${socket.id} join room robot:${robotId}`);

  // Konfirmasi ke FE
  socket.emit('subscribed', { robot_id: robotId, room: `robot:${robotId}` });
};

// ============================================================
// Register semua handlers ke socket instance
// ============================================================

/**
 * @param {Socket} socket - Instance socket client (bisa ML atau FE)
 * @param {Server} io    - Instance Socket.io server
 */
const registerPythonHandlers = (socket, io) => {
  // --- Event dari ML ---
  socket.on('py-eye-detection', (payload) => handleEyeDetection(io, payload));
  socket.on('py-minute-summary', (payload) => handleMinuteSummary(io, payload));

  // --- Event dari FE ---
  socket.on('subscribe-robot', ({ robot_id }) => handleSubscribeRobot(socket, robot_id));

  // --- Disconnect ---
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    // Hentikan semua watchdog dan timer aktif
    for (const [robotId] of robotStates) {
      stopWatchdog(robotId);
      timerService.stopTimer(robotId);
      await logService.closeActiveSession(robotId);
    }
  });
};

module.exports = { registerPythonHandlers };
