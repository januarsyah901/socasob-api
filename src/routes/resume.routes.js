const express = require('express');
const router = express.Router();
const DailyLog = require('../models/DailyLog');
const {
  calculateEyeHealthScore,
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
 *     summary: Ambil ringkasan analitik kesehatan mata 6 bulan terakhir
 *     tags: [Resume]
 *     description: |
 *       Mengagregasi data monitoring dari 6 bulan terakhir dan menghitung:
 *       - Tingkat risiko miopia dan kelelahan mata
 *       - Skor kesehatan mata akumulatif (0–100)
 *       - Persentase distribusi jarak dekat vs jauh
 *       - Rata-rata jarak mata ke layar (cm)
 *       - Kepatuhan aturan istirahat 20-20-20
 *       - Total jam monitoring
 *     responses:
 *       200:
 *         description: Berhasil mengambil ringkasan analitik kesehatan mata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResumeData'
 *             example:
 *               success: true
 *               data:
 *                 myopiaRisk: "Sedang"
 *                 fatigueRisk: "Rendah"
 *                 avgDistance: 34
 *                 restCompliance: 87
 *                 nearPercent: 35
 *                 farPercent: 65
 *                 eyeHealthScore: 78
 *                 totalHours: 120.5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const logs = await DailyLog.find({
      date: { $gte: sixMonthsAgoStr }
    });

    if (logs.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          myopiaRisk: 'Rendah',
          fatigueRisk: 'Rendah',
          avgDistance: 35,
          restCompliance: 100,
          nearPercent: 0,
          farPercent: 100,
          eyeHealthScore: 100,
          totalHours: 0
        }
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

    const eyeHealthScore = calculateEyeHealthScore(totalNear, totalFar, totalBlinks, avgRestCompliance);
    const risks = calculateRiskLevels(totalNear, totalFar);

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
