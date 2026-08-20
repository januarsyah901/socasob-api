// services/timerService.js
//
// Refactor: mendukung timer per robot_id (Map)
// sebelumnya hanya satu timer global.

// Map: robotId → { elapsedSeconds, timerInterval, startTime, isActive }
const timers = new Map();

const getOrCreate = (robotId) => {
  if (!timers.has(robotId)) {
    timers.set(robotId, {
      elapsedSeconds: 0,
      timerInterval: null,
      startTime: null,
      isActive: false,
    });
  }
  return timers.get(robotId);
};

const startTimer = (robotId, onTick) => {
  const t = getOrCreate(robotId);
  if (t.isActive) return;

  t.isActive = true;
  t.startTime = t.startTime || new Date();

  t.timerInterval = setInterval(() => {
    t.elapsedSeconds++;
    if (onTick && typeof onTick === 'function') {
      const timeObj = getFormattedTime(robotId);
      onTick({ ...timeObj, timestamp: new Date().toISOString() });
    }
  }, 1000);
};

const stopTimer = (robotId) => {
  const t = timers.get(robotId);
  if (!t) return;
  if (t.timerInterval) {
    clearInterval(t.timerInterval);
    t.timerInterval = null;
  }
  t.isActive = false;
};

const resetTimer = (robotId) => {
  stopTimer(robotId);
  const t = timers.get(robotId);
  if (t) {
    t.elapsedSeconds = 0;
    t.startTime = null;
  }
};

const getElapsedSeconds = (robotId) => {
  return timers.get(robotId)?.elapsedSeconds || 0;
};

const getFormattedTime = (robotId) => {
  const elapsed = getElapsedSeconds(robotId);
  return {
    hours: Math.floor(elapsed / 3600),
    minutes: Math.floor((elapsed % 3600) / 60),
    seconds: elapsed % 60,
  };
};

const getStartTime = (robotId) => {
  return timers.get(robotId)?.startTime || null;
};

const getIsActive = (robotId) => {
  return timers.get(robotId)?.isActive || false;
};

module.exports = {
  startTimer,
  stopTimer,
  resetTimer,
  getElapsedSeconds,
  getFormattedTime,
  getStartTime,
  getIsActive,
};
