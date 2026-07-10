let ioInstance = null;

/**
 * Inisialisasi emitter dengan instance Socket.io
 * @param {Server} io - Instance Socket.io
 */
const initEmitter = (io) => {
  ioInstance = io;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io instance not initialized in frontendEmitter!');
  }
  return ioInstance;
};

/**
 * Mengirimkan data timer real-time per detik ke frontend
 * @param {Object} timeData - { hours, minutes, seconds, timestamp }
 */
const emitTimerUpdate = (timeData) => {
  try {
    const io = getIO();
    io.emit('timer-update', timeData);
  } catch (error) {
    console.error(`Error emitting timer-update: ${error.message}`);
  }
};

/**
 * Mengirimkan status jarak mata real-time ke frontend
 * @param {Object} distanceData - { distance: 'Dekat'|'Jauh', confidence, timestamp }
 */
const emitEyeDistance = (distanceData) => {
  try {
    const io = getIO();
    io.emit('eye-distance', distanceData);
  } catch (error) {
    console.error(`Error emitting eye-distance: ${error.message}`);
  }
};

/**
 * Mengirimkan status kesehatan mata berkala ke frontend
 * @param {Object} statusData - { status, score, indicators: { eyeFatigue, myopiaRisk, postureWarning, blinkRate }, timestamp }
 */
const emitEyeStatus = (statusData) => {
  try {
    const io = getIO();
    io.emit('eye-status', statusData);
  } catch (error) {
    console.error(`Error emitting eye-status: ${error.message}`);
  }
};

module.exports = {
  initEmitter,
  emitTimerUpdate,
  emitEyeDistance,
  emitEyeStatus
};
