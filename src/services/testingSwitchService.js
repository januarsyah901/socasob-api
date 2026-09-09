const TestingSwitchConfig = require('../models/TestingSwitchConfig');
const Robot = require('../models/Robot');
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const logService = require('./logService');
const timerService = require('./timerService');

// State in-memory untuk lookup instan (0ms) pada event socket berkecepatan tinggi
let inMemoryConfig = {
  enabled: false,
  physicalRobotId: 'dummyrobot01',
  targetRobotId: 'ROBOT-01',
  lastSwitchedAt: new Date()
};

let isInitialized = false;

/**
 * Inisialisasi konfigurasi dari MongoDB saat server boot
 */
async function initSwitchConfig() {
  try {
    let doc = await TestingSwitchConfig.findOne({ key: 'global' });
    if (!doc) {
      doc = await TestingSwitchConfig.create({
        key: 'global',
        enabled: false,
        physicalRobotId: 'dummyrobot01',
        targetRobotId: 'ROBOT-01',
        lastSwitchedAt: new Date()
      });
    }
    inMemoryConfig = {
      enabled: Boolean(doc.enabled),
      physicalRobotId: doc.physicalRobotId || 'dummyrobot01',
      targetRobotId: doc.targetRobotId || 'ROBOT-01',
      lastSwitchedAt: doc.lastSwitchedAt || new Date()
    };
    isInitialized = true;
    console.log(`[TestingSwitch] Initialized: enabled=${inMemoryConfig.enabled}, physical=${inMemoryConfig.physicalRobotId} -> target=${inMemoryConfig.targetRobotId}`);
  } catch (err) {
    console.warn('[TestingSwitch] Init warning (using in-memory fallback):', err.message);
  }
}

/**
 * Mendapatkan konfigurasi saat ini beserta target user dan daftar opsi 10 user
 */
async function getSwitchStatus() {
  if (!isInitialized) {
    await initSwitchConfig();
  }

  // Cari robot yang dipasangkan ke user (ROBOT-01 s/d ROBOT-10 atau lainnya)
  const pairedRobots = await Robot.find({ ownerId: { $ne: null } })
    .populate('ownerId', 'fullName email')
    .sort({ robotId: 1 })
    .lean();

  const availableTargets = pairedRobots.map(r => ({
    robotId: r.robotId,
    robotName: r.name,
    serialNumber: r.serialNumber,
    userId: r.ownerId ? r.ownerId._id : null,
    userName: r.ownerId ? r.ownerId.fullName : 'Tanpa Pemilik',
    userEmail: r.ownerId ? r.ownerId.email : ''
  }));

  // Target yang sedang terpilih
  const currentTarget = availableTargets.find(t => t.robotId === inMemoryConfig.targetRobotId) || null;

  // Cek ringkasan log hari ini untuk target terpilih
  let todayStats = null;
  if (inMemoryConfig.targetRobotId) {
    const todayLog = await logService.getTodayLog(inMemoryConfig.targetRobotId);
    if (todayLog) {
      const totalSec = todayLog.nearDuration + todayLog.farDuration;
      todayStats = {
        nearDuration: todayLog.nearDuration,
        farDuration: todayLog.farDuration,
        totalDurationSec: totalSec,
        totalDurationMin: Math.round(totalSec / 60),
        blinkCount: todayLog.blinkCount,
        eyeHealthStatus: todayLog.eyeHealthStatus
      };
    }
  }

  return {
    enabled: inMemoryConfig.enabled,
    physicalRobotId: inMemoryConfig.physicalRobotId,
    targetRobotId: inMemoryConfig.targetRobotId,
    currentTarget,
    availableTargets,
    todayStats,
    lastSwitchedAt: inMemoryConfig.lastSwitchedAt
  };
}

/**
 * Mengubah target switch (saklar)
 */
async function setSwitchTarget({ enabled, physicalRobotId, targetRobotId }) {
  const oldTarget = inMemoryConfig.targetRobotId;

  const nextEnabled = typeof enabled === 'boolean' ? enabled : inMemoryConfig.enabled;
  const nextPhysical = physicalRobotId !== undefined ? physicalRobotId.trim() : inMemoryConfig.physicalRobotId;
  const nextTarget = targetRobotId !== undefined ? targetRobotId.trim() : inMemoryConfig.targetRobotId;

  // Jika target berganti, stop timer & watchdog robot sebelumnya agar tidak carry-over
  if (oldTarget && oldTarget !== nextTarget) {
    try {
      timerService.stopTimer(oldTarget);
      await logService.closeActiveSession(oldTarget);
      console.log(`[TestingSwitch] Stopped previous target timer: ${oldTarget}`);
    } catch (e) {
      console.error('[TestingSwitch] Error stopping previous timer:', e.message);
    }
  }

  const now = new Date();
  inMemoryConfig = {
    enabled: nextEnabled,
    physicalRobotId: nextPhysical,
    targetRobotId: nextTarget,
    lastSwitchedAt: now
  };

  try {
    await TestingSwitchConfig.findOneAndUpdate(
      { key: 'global' },
      {
        enabled: nextEnabled,
        physicalRobotId: nextPhysical,
        targetRobotId: nextTarget,
        lastSwitchedAt: now
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    console.error('[TestingSwitch] Failed persisting config to Mongo:', err.message);
  }

  return await getSwitchStatus();
}

/**
 * Resolusi ID Robot: jika saklar aktif dan robotId cocok dengan robot fisik,
 * mapping ke robot target (misal dummyrobot01 -> ROBOT-02)
 */
function resolveRobotId(incomingRobotId) {
  if (!incomingRobotId) return incomingRobotId;

  if (inMemoryConfig.enabled && inMemoryConfig.targetRobotId) {
    // Cocokkan jika incomingId sama dengan physicalRobotId atau wildcard '*'
    if (incomingRobotId === inMemoryConfig.physicalRobotId || inMemoryConfig.physicalRobotId === '*') {
      return inMemoryConfig.targetRobotId;
    }
  }

  return incomingRobotId;
}

/**
 * Reset log hari ini untuk target robot tertentu
 */
async function resetTargetTodayLog(robotId) {
  const target = robotId || inMemoryConfig.targetRobotId;
  if (!target) return false;

  const today = logService.getLocalDateString();
  await DailyLog.deleteOne({ robotId: target, date: today });
  console.log(`[TestingSwitch] Reset DailyLog for ${target} on ${today}`);
  return true;
}

module.exports = {
  initSwitchConfig,
  getSwitchStatus,
  setSwitchTarget,
  resolveRobotId,
  resetTargetTodayLog
};
