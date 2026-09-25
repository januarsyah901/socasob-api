const logService = require('../services/logService');
const timerService = require('../services/timerService');
const { isRobotValidAndActive, touchRobotLastSeen } = require('../services/robotService');
const { resolveRobotId } = require('../services/testingSwitchService');
const { sendPushToRobot } = require('../services/pushService');

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getDurationSeconds = (value) => asNumber(value);

const robotStates = new Map();

const getOrCreateRobotState = (robotId) => {
  if (!robotStates.has(robotId)) {
    robotStates.set(robotId, {
      distance: 'Jauh',
      confidence: 100,
      lastDetectionTime: null,
      watchdogInterval: null,
      lastEyeStatusEmitAt: 0,
    });
  }
  return robotStates.get(robotId);
};

const startWatchdog = (io, robotId) => {
  const state = getOrCreateRobotState(robotId);
  if (state.watchdogInterval) clearInterval(state.watchdogInterval);

  state.watchdogInterval = setInterval(async () => {
    if (state.lastDetectionTime && (new Date() - state.lastDetectionTime > 5000)) {
      console.log(`[Watchdog] Robot ${robotId} timeout. Menghentikan timer.`);
      timerService.stopTimer(robotId);
      await logService.closeActiveSession(robotId);

      io.to(`robot:${robotId}`).emit('eye-status', {
        status: 'disconnected',
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

const handleEyeDetection = async (io, payload) => {
  if (!payload || !payload.robot_id) return;

  const {
    robot_id: robotId,
    distance,
    confidence,
    timestamp,
    health_status,
    system_status,
    composite_score,
    blink_rate,
    eye_conditions,
    recommendations,
    distance_cm
  } = payload;

  const isValid = await isRobotValidAndActive(robotId);
  if (!isValid) {
    console.warn(`[Security Gate] Mengabaikan frame dari robot '${robotId}' (belum terdaftar / inaktif).`);
    return;
  }

  touchRobotLastSeen(robotId);

  const state = getOrCreateRobotState(robotId);
  if (distance) state.distance = distance;
  state.confidence = confidence || 100;
  state.lastDetectionTime = new Date();

  // 1. Kirim status jarak real-time ke room robot ini
  if (distance === 'Dekat') {
    sendPushToRobot(
      robotId, 
      '⚠️ Peringatan Jarak Layar', 
      'Jarak mata Anda kurang dari 30 cm. Mundurkan posisi duduk!',
      'socasob-distance-alert',
      'distance'
    );
  }

  const distanceCm = payload.distance_cm != null ? Number(payload.distance_cm) : null;

  io.to(`robot:${robotId}`).emit('eye-distance', {
    distance: distance || state.distance,
    distanceCm,
    distance_cm: distanceCm,
    confidence: state.confidence,
    timestamp: timestamp || state.lastDetectionTime.toISOString()
  });

  if (!timerService.getIsActive(robotId)) {
    startWatchdog(io, robotId);
    timerService.startTimer(robotId, (timeData) => {
      io.to(`robot:${robotId}`).emit('timer-update', timeData);
    });
  }

  const now = Date.now();
  const lastEmitAt = state.lastEyeStatusEmitAt || 0;
  const postureWarning = typeof distance_cm === 'number' ? distance_cm < 50 : false;

  if (now - lastEmitAt >= 5000) {
    state.lastEyeStatusEmitAt = now;

    io.to(`robot:${robotId}`).emit('eye-status', {
      status: health_status || 'normal',
      health_status: health_status || 'normal',
      system_status: system_status || 'ok',
      score: composite_score ?? 0,
      composite_score: composite_score ?? 0,
      blink_rate: blink_rate ?? 0,
      eye_conditions: eye_conditions || [],
      recommendations: recommendations || [],
      indicators: {
        eyeFatigue: 0,
        myopiaRisk: 0,
        postureWarning,
        blinkRate: asNumber(blink_rate)
      },
      timestamp: new Date().toISOString()
    });
  }
};

const handleMinuteSummary = async (io, summary) => {
  if (!summary || !summary.robot_id) return;

  const { robot_id: robotId } = summary;

  const isValid = await isRobotValidAndActive(robotId);
  if (!isValid) {
    console.warn(`[Security Gate] Mengabaikan ringkasan 1 menit dari robot '${robotId}' (belum terdaftar / inaktif).`);
    return;
  }

  try {
    const today = logService.getLocalDateString();
    const DailyLog = require('../models/DailyLog');

    const existingLog = await DailyLog.findOne({ robotId, date: today });
    const screenDurationSec = getDurationSeconds(summary.screen_duration_sec);
    const nearDurationSec = getDurationSeconds(summary.near_duration_sec);
    const farDurationSec = getDurationSeconds(summary.far_duration_sec);
    const blinkCount = asNumber(summary.blink_count);
    const incompleteBlinkCount = asNumber(summary.incomplete_blink_count);
    const screenTimeMinutes = screenDurationSec > 0 ? screenDurationSec / 60 : (nearDurationSec + farDurationSec) / 60;
    const longestContinuousGazeMinutes = asNumber(summary.longest_continuous_gaze_minutes);
    const avgDistanceCm = Number(summary.avg_distance_cm);
    const stickyBelow50 = !!(existingLog && existingLog.distanceBelow50CmForAtLeast10Seconds) || !!summary.distance_below_50_cm_for_at_least_10_seconds;
    const stickyBelow20 = !!(existingLog && existingLog.distanceBelow20CmDetected) || !!summary.distance_below_20_cm_detected;

    const update = {
      $inc: {
        nearDuration: nearDurationSec,
        farDuration: farDurationSec,
        screenTimeMinutes,
        blinkCount,
        totalBlinkObserved: blinkCount,
        incompleteBlinkCount
      },
      $max: {
        longestContinuousGazeMinutes
      },
      $set: {
        distanceBelow50CmForAtLeast10Seconds: stickyBelow50,
        distanceBelow20CmDetected: stickyBelow20,
        dominantDistanceCm: Number.isFinite(avgDistanceCm) ? avgDistanceCm : (existingLog ? existingLog.dominantDistanceCm : 50)
      }
    };

    await DailyLog.updateOne({ robotId, date: today }, update, { upsert: true });

    const updatedLog = await DailyLog.findOne({ robotId, date: today });
    if (updatedLog) {
      const totalScreenMinutes = Number(updatedLog.screenTimeMinutes || 0);
      const totalBlinkObserved = Number(updatedLog.totalBlinkObserved || 0);
      const incompleteTotal = Number(updatedLog.incompleteBlinkCount || 0);

      updatedLog.blinkRatePerMinute = totalScreenMinutes > 0 ? totalBlinkObserved / totalScreenMinutes : 0;
      updatedLog.incompleteBlinkRatio = totalBlinkObserved > 0 ? (incompleteTotal / totalBlinkObserved) * 100 : 0;
      await updatedLog.save();
    }

    io.to(`robot:${robotId}`).emit('minute-summary', {
      robot_id: robotId,
      near_duration_sec: summary.near_duration_sec,
      far_duration_sec: summary.far_duration_sec,
      screen_duration_sec: summary.screen_duration_sec,
      blink_count: summary.blink_count,
      incomplete_blink_count: summary.incomplete_blink_count,
      longest_continuous_gaze_minutes: summary.longest_continuous_gaze_minutes,
      distance_below_50_cm_for_at_least_10_seconds: summary.distance_below_50_cm_for_at_least_10_seconds,
      distance_below_20_cm_detected: summary.distance_below_20_cm_detected,
      avg_distance_cm: summary.avg_distance_cm,
      near_percentage: summary.near_percentage,
      health_status: summary.health_status,
      system_status: summary.system_status,
      composite_score: summary.composite_score,
      blink_rate: summary.blink_rate,
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

const handleHardwareStatus = async (io, payload) => {
  if (!payload || !payload.robot_id) return;
  const { robot_id: robotId } = payload;
  io.to(`robot:${robotId}`).emit('hardware-status', payload);
};

const handleSubscribeRobot = (socket, robotId) => {
  if (!robotId) return;

  const roomsToLeave = [...socket.rooms].filter(r => r.startsWith('robot:'));
  roomsToLeave.forEach(room => socket.leave(room));

  socket.join(`robot:${robotId}`);
  console.log(`[FE Subscribe] socket ${socket.id} join room robot:${robotId}`);

  socket.emit('subscribed', { robot_id: robotId, room: `robot:${robotId}` });
};

const registerPythonHandlers = (socket, io) => {
  const socketRobotIds = new Set();

  socket.on('py-eye-detection', (payload) => {
    if (payload?.robot_id) {
      payload.robot_id = resolveRobotId(payload.robot_id);
      socketRobotIds.add(payload.robot_id);
    }
    handleEyeDetection(io, payload);
  });

  socket.on('py-minute-summary', (payload) => {
    if (payload?.robot_id) {
      payload.robot_id = resolveRobotId(payload.robot_id);
      socketRobotIds.add(payload.robot_id);
    }
    handleMinuteSummary(io, payload);
  });

  socket.on('py-hardware-status', (payload) => {
    if (payload?.robot_id) {
      payload.robot_id = resolveRobotId(payload.robot_id);
    }
    handleHardwareStatus(io, payload);
  });

  socket.on('hardware', (payload) => {
    if (payload?.robot_id) {
      payload.robot_id = resolveRobotId(payload.robot_id);
    }
    handleHardwareStatus(io, payload);
  });

  socket.on('subscribe-robot', ({ robot_id }) => handleSubscribeRobot(socket, robot_id));

  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id} (robots: ${[...socketRobotIds].join(', ') || 'none'})`);

    for (const robotId of socketRobotIds) {
      stopWatchdog(robotId);
      timerService.stopTimer(robotId);
      await logService.closeActiveSession(robotId);
    }
  });
};

module.exports = { registerPythonHandlers };
