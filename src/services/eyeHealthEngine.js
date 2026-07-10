const {
  MYOPIA_RISK_RATIO,
  FATIGUE_TIME_THRESHOLD,
  FATIGUE_RISK_RATIO
} = require('../config/constants');

/**
 * Menghitung status kesehatan mata berdasarkan durasi tatap dekat vs jauh
 * @param {number} nearDuration - Durasi mata dekat (detik)
 * @param {number} farDuration - Durasi mata jauh (detik)
 * @returns {string} - 'normal' | 'risk_myopia' | 'risk_fatigue'
 */
const calculateEyeStatus = (nearDuration, farDuration) => {
  const total = nearDuration + farDuration;
  if (total === 0) return 'normal';

  const nearRatio = nearDuration / total;

  // 1. risk_myopia: Jika durasi tatap dekat > 60%
  if (nearRatio > MYOPIA_RISK_RATIO) {
    return 'risk_myopia';
  }

  // 2. risk_fatigue: Jika total durasi > 1 jam DAN tatap dekat > 40%
  if (total > FATIGUE_TIME_THRESHOLD && nearRatio > FATIGUE_RISK_RATIO) {
    return 'risk_fatigue';
  }

  return 'normal';
};

/**
 * Menghitung skor kesehatan mata akumulatif (0 - 100)
 * @param {number} nearDuration - detik dekat
 * @param {number} farDuration - detik jauh
 * @param {number} blinkCount - total kedipan
 * @param {number} restCompliance - tingkat kepatuhan istirahat (0 - 100)
 * @returns {number} - Skor (integer 0-100)
 */
const calculateEyeHealthScore = (nearDuration, farDuration, blinkCount, restCompliance = 100) => {
  const total = nearDuration + farDuration;
  if (total === 0) return 100;

  let score = 100;

  // Faktor 1: Jarak Layar (Bobot Maksimal Pengurangan: 40 poin)
  const nearRatio = nearDuration / total;
  score -= nearRatio * 40;

  // Faktor 2: Kedipan Mata (Blink Rate) (Bobot Maksimal Pengurangan: 30 poin)
  // Blink rate ideal: 12-15 kedipan per menit (atau 0.2 - 0.25 kedipan per detik)
  const totalMinutes = total / 60;
  if (totalMinutes > 0.5) { // Hanya hitung jika durasi cukup (minimal 30 detik)
    const blinkRate = blinkCount / totalMinutes;
    if (blinkRate < 12) {
      // Kurangi skor proporsional jika kurang berkedip (blink rate < 12)
      const deficit = 12 - blinkRate;
      score -= Math.min(30, deficit * 2.5);
    }
  }

  // Faktor 3: Kepatuhan Istirahat (Rest Compliance) (Bobot Maksimal Pengurangan: 30 poin)
  const complianceDeficit = 100 - restCompliance;
  score -= (complianceDeficit / 100) * 30;

  // Pastikan skor berada dalam batas 0 - 100
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Menghitung tingkat risiko miopia dan kelelahan mata
 * @param {number} nearDuration
 * @param {number} farDuration
 * @returns {Object} - { myopiaRisk: string, fatigueRisk: string }
 */
const calculateRiskLevels = (nearDuration, farDuration) => {
  const total = nearDuration + farDuration;
  if (total === 0) {
    return { myopiaRisk: 'Rendah', fatigueRisk: 'Rendah' };
  }

  const nearRatio = nearDuration / total;

  let myopiaRisk = 'Rendah';
  if (nearRatio > 0.6) {
    myopiaRisk = 'Tinggi';
  } else if (nearRatio > 0.3) {
    myopiaRisk = 'Sedang';
  }

  let fatigueRisk = 'Rendah';
  if (total > 3600) {
    if (nearRatio > 0.5) {
      fatigueRisk = 'Tinggi';
    } else if (nearRatio > 0.25) {
      fatigueRisk = 'Sedang';
    }
  } else if (total > 1800) {
    // > 30 menit
    if (nearRatio > 0.4) {
      fatigueRisk = 'Sedang';
    }
  }

  return { myopiaRisk, fatigueRisk };
};

/**
 * Menghitung persentase kepatuhan istirahat berdasarkan aturan 20-20-20
 * Aturan 20-20-20: Istirahat setiap 20 menit selama 20 detik dengan memandang objek jauh
 * @param {Array} sessions - Daftar sesi dari DailyLog
 * @param {number} totalDuration - Total durasi monitoring sesi (detik)
 * @returns {number} - Persentase kepatuhan (0 - 100)
 */
const calculateRestCompliance = (sessions, totalDuration) => {
  if (!sessions || sessions.length === 0 || totalDuration < 1200) {
    // Jika tidak ada sesi atau total durasi kurang dari 20 menit (1200 detik), kepatuhan dianggap 100%
    return 100;
  }

  // Menghitung kepatuhan:
  // Kita bagi total durasi menjadi slot 20 menit.
  // Di setiap slot, kita cari apakah ada break (jeda antar sesi, atau sesi dengan peakDistance 'Jauh' > 20 detik).
  const slotDuration = 1200; // 20 menit dalam detik
  const numSlots = Math.floor(totalDuration / slotDuration);
  if (numSlots === 0) return 100;

  let compliantSlots = 0;

  // Urutkan sesi berdasarkan waktu mulai
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  for (let i = 0; i < numSlots; i++) {
    const slotStart = new Date(sortedSessions[0].startTime.getTime() + i * slotDuration * 1000);
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 1000);

    // Cari apakah ada break di dalam slot waktu ini
    // Cara 1: Ada jeda antara akhir sesi A dan awal sesi B sebesar >= 20 detik
    // Cara 2: Ada sesi dengan peakDistance === 'Jauh' yang berlangsung >= 20 detik
    let hasBreak = false;

    for (let j = 0; j < sortedSessions.length; j++) {
      const sess = sortedSessions[j];
      const sessStart = new Date(sess.startTime);
      const sessEnd = sess.endTime ? new Date(sess.endTime) : new Date();

      // Cek Cara 2 (Sesi jauh >= 20 detik di dalam slot)
      if (sess.peakDistance === 'Jauh' && sessStart >= slotStart && sessEnd <= slotEnd) {
        const durationSec = (sessEnd - sessStart) / 1000;
        if (durationSec >= 20) {
          hasBreak = true;
          break;
        }
      }

      // Cek Cara 1 (Jeda antarsesi di dalam slot)
      if (j < sortedSessions.length - 1) {
        const nextSess = sortedSessions[j + 1];
        const nextSessStart = new Date(nextSess.startTime);
        
        if (sessEnd >= slotStart && nextSessStart <= slotEnd) {
          const gapSec = (nextSessStart - sessEnd) / 1000;
          if (gapSec >= 20) {
            hasBreak = true;
            break;
          }
        }
      }
    }

    if (hasBreak) {
      compliantSlots++;
    }
  }

  return Math.round((compliantSlots / numSlots) * 100);
};

module.exports = {
  calculateEyeStatus,
  calculateEyeHealthScore,
  calculateRiskLevels,
  calculateRestCompliance
};
