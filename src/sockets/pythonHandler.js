const logService = require('../services/logService');
const timerService = require('../services/timerService');
const frontendEmitter = require('./frontendEmitter');
const { calculateEyeHealthScore, calculateRiskLevels } = require('../services/eyeHealthEngine');

// State in-memory untuk menyimpan status deteksi terakhir
let currentDistance = 'Jauh';
let currentConfidence = 100;
let lastDetectionTime = null;
let watchdogInterval = null;

/**
 * Memulai watchdog untuk mendeteksi jika Python ML berhenti mengirim data (disconnected)
 */
const startWatchdog = (socket) => {
  if (watchdogInterval) clearInterval(watchdogInterval);
  
  // Periksa setiap 5 detik
  watchdogInterval = setInterval(async () => {
    if (lastDetectionTime && (new Date() - lastDetectionTime > 5000)) {
      // Jika tidak ada data dari Python > 5 detik, anggap disconnected
      console.log('Python ML stream timeout. Stopping timer.');
      timerService.stopTimer();
      await logService.closeActiveSession();
      
      // Emit status terputus ke frontend
      frontendEmitter.emitEyeStatus({
        status: 'disconnected',
        score: 0,
        indicators: { eyeFatigue: 0, myopiaRisk: 0, postureWarning: false, blinkRate: 0 },
        timestamp: new Date().toISOString()
      });
    }
  }, 5000);
};

/**
 * Menghentikan watchdog
 */
const stopWatchdog = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
};

/**
 * Mendaftarkan event listener untuk Python ML Socket
 * @param {Socket} socket - Instance socket client
 */
const registerPythonHandlers = (socket) => {
  socket.on('py-eye-detection', async (payload) => {
    // Validasi payload
    if (!payload || !payload.distance) return;

    currentDistance = payload.distance;
    currentConfidence = payload.confidence || 100;
    lastDetectionTime = new Date();

    // 1. Kirim status jarak real-time langsung ke frontend (latensi rendah)
    frontendEmitter.emitEyeDistance({
      distance: currentDistance,
      confidence: currentConfidence,
      timestamp: lastDetectionTime.toISOString()
    });

    // 2. Jika timer monitoring belum jalan, mulai sekarang
    if (!timerService.getIsActive()) {
      startWatchdog(socket);
      
      timerService.startTimer(async (timeData) => {
        // Callback per detik:
        // a. Emit timer ke frontend
        frontendEmitter.emitTimerUpdate(timeData);

        // b. Update durasi harian di MongoDB (increment 1 detik)
        await logService.updateDailyDuration(currentDistance);

        // c. Setiap 5 detik, kalkulasi ulang metrik dan emit ke frontend
        if (timeData.seconds % 5 === 0) {
          await logService.recalculateMetrics();
          const log = await logService.getTodayLog();
          
          const totalSec = log.nearDuration + log.farDuration;
          const risks = calculateRiskLevels(log.nearDuration, log.farDuration);
          const score = calculateEyeHealthScore(log.nearDuration, log.farDuration, log.blinkCount, log.restCompliance);
          
          // Blink rate per menit
          const totalMin = totalSec / 60;
          const blinkRate = totalMin > 0 ? (log.blinkCount / totalMin) : 0;

          frontendEmitter.emitEyeStatus({
            status: log.eyeHealthStatus,
            score,
            indicators: {
              eyeFatigue: risks.fatigueRisk === 'Tinggi' ? 85 : risks.fatigueRisk === 'Sedang' ? 45 : 10,
              myopiaRisk: risks.myopiaRisk === 'Tinggi' ? 85 : risks.myopiaRisk === 'Sedang' ? 45 : 10,
              postureWarning: false, // Default false, bisa diintegrasikan di masa depan
              blinkRate: Math.round(blinkRate * 10) / 10
            },
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  });

  socket.on('py-blink-detected', async () => {
    // Tambahkan jumlah kedipan ke database
    await logService.incrementBlink();
  });

  // Saat socket terputus
  socket.on('disconnect', async () => {
    console.log(`Python client disconnected: ${socket.id}`);
    stopWatchdog();
    timerService.stopTimer();
    await logService.closeActiveSession();
  });
};

module.exports = { registerPythonHandlers };
