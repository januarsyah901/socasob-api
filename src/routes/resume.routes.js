const express = require('express');
const router = express.Router();
const DailyLog = require('../models/DailyLog');
const {
  calculateRiskLevels
} = require('../services/eyeHealthEngine');

/**
 * @swagger
 * tags:
 *   name: Resume
 *   description: Endpoint untuk ringkasan analitik kesehatan mata jangka panjang
 */

/**
 * @swagger
 * /api/resume:
 *   get:
 *     summary: Ambil ringkasan analitik kesehatan mata 6 bulan terakhir untuk robot tertentu
 *     tags: [Resume]
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot
 *         example: "fadfa566"
 *     description: |
 *       Mengagregasi data monitoring dari 6 bulan terakhir dan menghitung:
 *       - Tingkat risiko miopia dan kelelahan mata
 *       - Skor kesehatan mata akumulatif (0–100)
 *       - Persentase distribusi jarak dekat vs jauh
 *       - Kepatuhan aturan istirahat 20-20-20
 *       - Total jam monitoring
 *     responses:
 *       200:
 *         description: Berhasil mengambil ringkasan analitik kesehatan mata
 *       400:
 *         description: robotId wajib diisi
 *       404:
 *         description: Belum ada data monitoring untuk robot ini
 */
router.get('/', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter robotId wajib diisi. Contoh: /api/resume?robotId=fadfa566'
      });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const logs = await DailyLog.find({
      robotId,
      date: { $gte: sixMonthsAgoStr }
    });

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Belum ada data monitoring 6 bulan terakhir untuk robot '${robotId}'.`
      });
    }

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

    const nearPercent = totalSec > 0 ? Math.round((totalNear / totalSec) * 100) : 0;
    const farPercent = totalSec > 0 ? 100 - nearPercent : 100;

    const risks = calculateRiskLevels(totalNear, totalFar);

    const avgDistance = totalSec > 0
      ? Math.round(((totalNear * 25) + (totalFar * 40)) / totalSec)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        robotId,
        myopiaRisk: risks.myopiaRisk,
        fatigueRisk: risks.fatigueRisk,
        avgDistance,
        restCompliance: avgRestCompliance,
        nearPercent,
        farPercent,
        totalHours: Math.round(totalHours * 10) / 10,
        totalDaysMonitored: logs.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
