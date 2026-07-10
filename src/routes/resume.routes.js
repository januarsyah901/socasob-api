const express = require('express');
const router = express.Router();
const DailyLog = require('../models/DailyLog');
const {
  calculateEyeHealthScore,
  calculateRiskLevels
} = require('../services/eyeHealthEngine');

// GET /api/resume - Mengambil resume analitik 6 bulan terakhir
router.get('/', async (req, res, next) => {
  try {
    // Cari tanggal 6 bulan yang lalu
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Ambil semua log dalam rentang 6 bulan terakhir
    const logs = await DailyLog.find({
      date: { $gte: sixMonthsAgoStr }
    });

    if (logs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          myopiaRisk: 'Rendah',
          fatigueRisk: 'Rendah',
          avgDistance: 35, // default
          restCompliance: 100,
          nearPercent: 0,
          farPercent: 100,
          eyeHealthScore: 100,
          totalHours: 0
        }
      });
    }

    // Akumulasi data
    let totalNear = 0;
    let totalFar = 0;
    let totalBlinks = 0;
    let totalCompliance = 0;

    logs.forEach(log => {
      totalNear += log.nearDuration || 0;
      totalFar += log.farDuration || 0;
      totalBlinks += log.blinkCount || 0;
      totalCompliance += log.restCompliance || 100;
    });

    const totalSec = totalNear + totalFar;
    const totalHours = totalSec / 3600;
    const avgRestCompliance = Math.round(totalCompliance / logs.length);

    // Hitung persentase dekat vs jauh
    const nearPercent = totalSec > 0 ? Math.round((totalNear / totalSec) * 100) : 0;
    const farPercent = totalSec > 0 ? 100 - nearPercent : 100;

    // Kalkulasi skor kesehatan dan tingkat risiko
    const eyeHealthScore = calculateEyeHealthScore(totalNear, totalFar, totalBlinks, avgRestCompliance);
    const risks = calculateRiskLevels(totalNear, totalFar);

    // Jarak rata-rata (cm) - estimasi berdasarkan porsi jauh-dekat
    // Jika dominan dekat (<30cm), asumsikan rata-rata ~25cm. Jika dominan jauh (>=30cm), asumsikan ~40cm.
    const avgDistance = totalSec > 0 
      ? Math.round(((totalNear * 25) + (totalFar * 40)) / totalSec) 
      : 35;

    res.status(200).json({
      success: true,
      data: {
        myopiaRisk: risks.myopiaRisk,
        fatigueRisk: risks.fatigueRisk,
        avgDistance,
        restCompliance: avgRestCompliance,
        nearPercent,
        farPercent,
        eyeHealthScore,
        totalHours: Math.round(totalHours * 10) / 10
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
