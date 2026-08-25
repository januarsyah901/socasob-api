const express = require('express');
const router = express.Router();
const logService = require('../services/logService');
const DailyLog = require('../models/DailyLog');

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
 *     summary: Ambil rangkuman log hari ini untuk robot tertentu
 *     tags: [Log]
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot
 *         example: "fadfa566"
 *     responses:
 *       200:
 *         description: Berhasil mengambil data log hari ini
 *       400:
 *         description: robotId wajib diisi
 *       404:
 *         description: Belum ada data monitoring hari ini
 */
router.get('/today', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter robotId wajib diisi. Contoh: /api/log/today?robotId=fadfa566'
      });
    }

    const log = await logService.getTodayLog(robotId);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: `Belum ada data monitoring hari ini untuk robot '${robotId}'.`
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

/**
 * @swagger
 * /api/log/weekly:
 *   get:
 *     summary: Ambil riwayat log 7 hari terakhir untuk robot tertentu
 *     tags: [Log]
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot
 *         example: "fadfa566"
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
 *       400:
 *         description: robotId wajib diisi
 */
router.get('/weekly', async (req, res, next) => {
  try {
    const { robotId, startDate, endDate } = req.query;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter robotId wajib diisi. Contoh: /api/log/weekly?robotId=fadfa566'
      });
    }

    const logs = await logService.getWeeklyLogs(robotId, startDate, endDate);
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
 *     summary: Ambil log pada tanggal tertentu untuk robot tertentu
 *     tags: [Log]
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-07-10"
 *         description: Tanggal yang ingin diambil (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Berhasil mengambil data log
 *       400:
 *         description: Format tanggal tidak valid atau robotId kosong
 *       404:
 *         description: Log tidak ditemukan
 */
router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const { robotId } = req.query;

    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter robotId wajib diisi. Contoh: /api/log/2026-08-22?robotId=fadfa566'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Format tanggal harus YYYY-MM-DD'
      });
    }

    const log = await logService.getLogByDate(robotId, date);
    if (!log) {
      return res.status(404).json({
        success: false,
        error: `Log untuk robot '${robotId}' pada tanggal ${date} tidak ditemukan`
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

/**
 * @swagger
 * /api/log/manual:
 *   post:
 *     summary: Tambah/update log harian secara manual (untuk pengujian)
 *     tags: [Log]
 */
router.post('/manual', async (req, res, next) => {
  try {
    const { robotId, date, nearDuration, farDuration, blinkCount, eyeHealthStatus } = req.body;

    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Field robotId wajib diisi di body request.'
      });
    }

    const targetDate = date || logService.getLocalDateString();
    const updatedLog = await DailyLog.findOneAndUpdate(
      { robotId, date: targetDate },
      {
        $inc: {
          nearDuration: Number(nearDuration) || 0,
          farDuration: Number(farDuration) || 0,
          blinkCount: Number(blinkCount) || 0,
        },
        ...(eyeHealthStatus && { eyeHealthStatus })
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `Log untuk robot '${robotId}' tanggal ${targetDate} berhasil diperbarui`,
      data: updatedLog
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/log/{date}:
 *   delete:
 *     summary: Hapus log pada tanggal tertentu (untuk pengujian)
 *     tags: [Log]
 */
router.delete('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const { robotId } = req.query;

    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter robotId wajib diisi.'
      });
    }

    const result = await DailyLog.deleteOne({ robotId, date });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: `Log untuk robot '${robotId}' pada tanggal ${date} tidak ditemukan`
      });
    }

    res.status(200).json({
      success: true,
      message: `Log untuk robot '${robotId}' tanggal ${date} berhasil dihapus`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/log:
 *   delete:
 *     summary: Hapus seluruh log harian (reset database untuk pengujian)
 *     tags: [Log]
 */
router.delete('/', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    const filter = robotId ? { robotId } : {};
    const result = await DailyLog.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `Seluruh data log${robotId ? ` untuk robot '${robotId}'` : ''} (${result.deletedCount} dokumen) berhasil dihapus`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/log/break:
 *   post:
 *     summary: Catat penyelesaian sesi istirahat mata (Micro-Break 20-20-20)
 *     tags: [Log]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - robotId
 *             properties:
 *               robotId:
 *                 type: string
 *                 example: "fadfa566"
 *               duration:
 *                 type: number
 *                 example: 20
 *     responses:
 *       200:
 *         description: Berhasil mencatat sesi istirahat
 */
router.post('/break', async (req, res, next) => {
  try {
    const { robotId, duration = 20 } = req.body;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'robotId wajib diisi'
      });
    }

    const updatedLog = await logService.recordBreak(robotId, duration);

    res.status(200).json({
      success: true,
      message: 'Sesi istirahat mata 20-20-20 berhasil dicatat.',
      data: updatedLog
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
