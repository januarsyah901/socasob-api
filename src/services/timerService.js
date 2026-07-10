let elapsedSeconds = 0;
let timerInterval = null;
let startTime = null;
let isActive = false;

const startTimer = (onTick) => {
  if (isActive) return;

  isActive = true;
  startTime = startTime || new Date();

  timerInterval = setInterval(() => {
    elapsedSeconds++;
    
    if (onTick && typeof onTick === 'function') {
      const timeObj = getFormattedTime();
      onTick({
        ...timeObj,
        timestamp: new Date().toISOString()
      });
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isActive = false;
};

const resetTimer = () => {
  stopTimer();
  elapsedSeconds = 0;
  startTime = null;
};

const getElapsedSeconds = () => {
  return elapsedSeconds;
};

const getFormattedTime = () => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return { hours, minutes, seconds };
};

const getStartTime = () => {
  return startTime;
};

const getIsActive = () => {
  return isActive;
};

module.exports = {
  startTimer,
  stopTimer,
  resetTimer,
  getElapsedSeconds,
  getFormattedTime,
  getStartTime,
  getIsActive
};
