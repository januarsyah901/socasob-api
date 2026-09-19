const { THRESHOLDS, MESSAGES } = require('../config/socaSobThresholds');
const {
  MYOPIA_RISK_RATIO,
  FATIGUE_TIME_THRESHOLD,
  FATIGUE_RISK_RATIO
} = require('../config/constants');

/**
 * Menghitung status risiko harian (Mata Lelah, Mata Kering, Paparan Miopia)
 * sesuai dengan threshold terbaru yang disetujui dokter.
 */
const evaluateDailyRisks = (metrics) => {
  const {
    screenTimeMinutes = 0,
    longestContinuousGazeMinutes = 0,
    blinkRatePerMinute = 0,
    incompleteBlinkRatio = 0,
    distanceBelow50CmForAtLeast10Seconds = false,
    distanceBelow20CmDetected = false
  } = metrics;

  // 1. Risiko Mata Lelah
  const fatigueReasons = [];
  if (screenTimeMinutes > THRESHOLDS.FATIGUE.SCREEN_TIME_MINUTES) {
    fatigueReasons.push(MESSAGES.FATIGUE.HIGH_SCREEN_TIME);
  }
  if (longestContinuousGazeMinutes > THRESHOLDS.FATIGUE.CONT_GAZE_MINUTES) {
    fatigueReasons.push(MESSAGES.FATIGUE.HIGH_CONT_GAZE);
  }
  if (distanceBelow50CmForAtLeast10Seconds) {
    fatigueReasons.push(MESSAGES.FATIGUE.LOW_DISTANCE);
  }
  const eyeFatigueRisk = {
    status: fatigueReasons.length > 0 ? 'YA' : 'TIDAK',
    reasons: fatigueReasons
  };

  // 2. Risiko Mata Kering
  const dryEyeReasons = [];
  if (screenTimeMinutes > THRESHOLDS.DRY_EYE.SCREEN_TIME_MINUTES) {
    dryEyeReasons.push(MESSAGES.DRY_EYE.HIGH_SCREEN_TIME);
  }
  if (incompleteBlinkRatio >= THRESHOLDS.DRY_EYE.INCOMPLETE_BLINK_RATIO) {
    dryEyeReasons.push(MESSAGES.DRY_EYE.HIGH_INCOMPLETE_BLINK);
  }
  // Hanya evaluasi blink rate rendah jika ada screen time
  if (screenTimeMinutes > 0 && blinkRatePerMinute <= THRESHOLDS.DRY_EYE.BLINK_RATE) {
    dryEyeReasons.push(MESSAGES.DRY_EYE.LOW_BLINK_RATE);
  }
  const dryEyeRisk = {
    status: dryEyeReasons.length > 0 ? 'YA' : 'TIDAK',
    reasons: dryEyeReasons
  };

  // 3. Paparan Risiko Miopia
  const myopiaReasons = [];
  if (screenTimeMinutes >= THRESHOLDS.MYOPIA.SCREEN_TIME_MINUTES) {
    myopiaReasons.push(MESSAGES.MYOPIA.HIGH_SCREEN_TIME);
  }
  if (distanceBelow20CmDetected) {
    myopiaReasons.push(MESSAGES.MYOPIA.LOW_DISTANCE);
  }
  if (longestContinuousGazeMinutes > THRESHOLDS.MYOPIA.CONT_GAZE_MINUTES) {
    myopiaReasons.push(MESSAGES.MYOPIA.HIGH_CONT_GAZE);
  }
  const myopiaExposureRisk = {
    status: myopiaReasons.length > 0 ? 'YA' : 'TIDAK',
    reasons: myopiaReasons
  };

  return {
    eyeFatigueRisk,
    dryEyeRisk,
    myopiaExposureRisk
  };
};

/**
 * Menghitung status kesehatan mata berdasarkan durasi tatap dekat vs jauh (Legacy)
 */
const calculateEyeStatus = (nearDuration, farDuration) => {
  const total = nearDuration + farDuration;
  if (total === 0) return 'normal';
  const nearRatio = nearDuration / total;
  if (nearRatio > MYOPIA_RISK_RATIO) return 'risk_myopia';
  if (total > FATIGUE_TIME_THRESHOLD && nearRatio > FATIGUE_RISK_RATIO) return 'risk_fatigue';
  return 'normal';
};

/**
 * Menghitung tingkat risiko miopia dan kelelahan mata (Legacy)
 */
const calculateRiskLevels = (nearDuration, farDuration) => {
  const total = nearDuration + farDuration;
  if (total === 0) return { myopiaRisk: 'Rendah', fatigueRisk: 'Rendah' };
  const nearRatio = nearDuration / total;
  let myopiaRisk = 'Rendah';
  if (nearRatio > 0.6) myopiaRisk = 'Tinggi';
  else if (nearRatio > 0.3) myopiaRisk = 'Sedang';

  let fatigueRisk = 'Rendah';
  if (total > 3600) {
    if (nearRatio > 0.5) fatigueRisk = 'Tinggi';
    else if (nearRatio > 0.25) fatigueRisk = 'Sedang';
  } else if (total > 1800) {
    if (nearRatio > 0.4) fatigueRisk = 'Sedang';
  }
  return { myopiaRisk, fatigueRisk };
};

/**
 * Menghitung persentase kepatuhan istirahat berdasarkan aturan 20-20-20 (Legacy)
 */
const calculateRestCompliance = (sessions, totalDuration) => {
  if (!sessions || sessions.length === 0 || totalDuration < 1200) return 100;
  const slotDuration = 1200;
  const numSlots = Math.floor(totalDuration / slotDuration);
  if (numSlots === 0) return 100;
  let compliantSlots = 0;
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  for (let i = 0; i < numSlots; i++) {
    const slotStart = new Date(sortedSessions[0].startTime.getTime() + i * slotDuration * 1000);
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 1000);
    let hasBreak = false;
    for (let j = 0; j < sortedSessions.length; j++) {
      const sess = sortedSessions[j];
      const sessStart = new Date(sess.startTime);
      const sessEnd = sess.endTime ? new Date(sess.endTime) : new Date();
      if (sess.peakDistance === 'Jauh' && sessStart >= slotStart && sessEnd <= slotEnd) {
        if ((sessEnd - sessStart) / 1000 >= 20) { hasBreak = true; break; }
      }
      if (j < sortedSessions.length - 1) {
        const nextSessStart = new Date(sortedSessions[j + 1].startTime);
        if (sessEnd >= slotStart && nextSessStart <= slotEnd) {
          if ((nextSessStart - sessEnd) / 1000 >= 20) { hasBreak = true; break; }
        }
      }
    }
    if (hasBreak) compliantSlots++;
  }
  return Math.round((compliantSlots / numSlots) * 100);
};

module.exports = {
  evaluateDailyRisks,
  calculateEyeStatus,
  calculateRiskLevels,
  calculateRestCompliance
};
