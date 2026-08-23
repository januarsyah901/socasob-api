const Robot = require('../models/Robot');

// In-memory cache for fast validation (0ms overhead in socket loops)
const activeRobotCache = new Map();
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 10000; // 10 seconds

/**
 * Memastikan minimal satu robot default terdaftar saat server start.
 */
const ensureDefaultRobot = async () => {
  try {
    const count = await Robot.countDocuments();
    if (count === 0) {
      console.log('🤖 Mendaftarkan robot default (fadfa566)...');
      await Robot.create({
        robotId: 'fadfa566',
        name: 'SocaSob ESP32 Utama',
        status: 'active',
        ipAddress: '192.168.1.100',
        description: 'Perangkat bawaan default'
      });
      console.log('✅ Robot default berhasil didaftarkan.');
    }
  } catch (err) {
    console.error('⚠️ Gagal memastikan robot default:', err.message);
  }
};

/**
 * Memperbarui cache robot aktif dari database.
 */
const refreshActiveRobotCache = async () => {
  try {
    const robots = await Robot.find({ status: 'active' }).select('robotId name status').lean();
    activeRobotCache.clear();
    robots.forEach(r => {
      activeRobotCache.set(r.robotId, r);
    });
    cacheLastUpdated = Date.now();
  } catch (err) {
    console.error('⚠️ Gagal refresh cache robot:', err.message);
  }
};

/**
 * Validasi cepat apakah robot terdaftar dan statusnya aktif.
 * @param {string} robotId
 * @returns {Promise<boolean>}
 */
const isRobotValidAndActive = async (robotId) => {
  if (!robotId) return false;

  const now = Date.now();
  if (now - cacheLastUpdated > CACHE_TTL_MS || activeRobotCache.size === 0) {
    await refreshActiveRobotCache();
  }

  if (activeRobotCache.has(robotId)) {
    return true;
  }

  // Fallback direct check jika baru saja didaftarkan
  const robot = await Robot.findOne({ robotId, status: 'active' }).lean();
  if (robot) {
    activeRobotCache.set(robot.robotId, robot);
    return true;
  }

  return false;
};

/**
 * Update timestamp aktivitas terakhir robot.
 * @param {string} robotId
 */
const touchRobotLastSeen = async (robotId) => {
  try {
    await Robot.updateOne({ robotId }, { $set: { lastSeenAt: new Date() } });
  } catch (_) {
    // Abaikan error background touch
  }
};

module.exports = {
  ensureDefaultRobot,
  refreshActiveRobotCache,
  isRobotValidAndActive,
  touchRobotLastSeen
};
