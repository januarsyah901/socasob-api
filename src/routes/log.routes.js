const express = require('express');
const router = express.Router();
const logService = require('../services/logService');

/**
 * @swagger
 * tags:
 *   name: Log
 *   description: Endpoint untuk mengambil data log monitoring mata
 */

/**
 * @swagger
 * /api/log/today:
 *   get:
 *     summary: Ambil rangkuman log hari ini
 *     tags: [Log]
 *     description: Mengambil data monitoring hari ini termasuk durasi tatap dekat/jauh, sesi, jumlah kedipan, dan status kesehatan mata.
 *     responses:
 *       200:
 *         description: Berhasil mengambil data log hari ini
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DailyLog'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/today', async (req, res, next) => {
  try {
    const log = await logService.getTodayLog();
    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/log/weekly:
 *   get:
 *     summary: Ambil riwayat log 7 hari terakhir
 *     tags: [Log]
 *     description: Mengambil riwayat monitoring selama 7 hari terakhir, bisa juga difilter dengan query parameter tanggal.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-07-01"
 *         description: Tanggal awal (YYYY-MM-DD). Opsional, default 7 hari yang lalu.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-07-07"
 *         description: Tanggal akhir (YYYY-MM-DD). Opsional, default hari ini.
 *     responses:
 *       200:
 *         description: Berhasil mengambil riwayat log mingguan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyLog'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/weekly', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await logService.getWeeklyLogs(startDate, endDate);
    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/log/{date}:
 *   get:
 *     summary: Ambil log pada tanggal tertentu
 *     tags: [Log]
 *     description: Mengambil data monitoring pada tanggal spesifik.
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-07-10"
 *         description: Tanggal yang ingin diambil dalam format YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Berhasil mengambil data log
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DailyLog'
 *       400:
 *         description: Format tanggal tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Log tidak ditemukan untuk tanggal tersebut
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Format tanggal harus YYYY-MM-DD'
      });
    }

    const log = await logService.getLogByDate(date);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: `Log untuk tanggal ${date} tidak ditemukan`
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
