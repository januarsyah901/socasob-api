const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  generateReport,
  getReports,
  getReportById,
  deleteReport
} = require('../services/reportService');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Endpoint untuk pembuatan dan manajemen dokumen laporan medis klinis
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Ambil daftar seluruh laporan medis yang tersimpan
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter berdasarkan robotId
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar laporan medis
 */
router.get('/', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    const reports = await getReports(robotId);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Buat dan generate laporan medis baru berdasarkan data agregasi telemetri
 *     tags: [Reports]
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
 *               patientName:
 *                 type: string
 *                 example: "Bang Jan"
 *               period:
 *                 type: string
 *                 enum: [today, 7days, 30days, 6months]
 *                 example: "7days"
 *     responses:
 *       201:
 *         description: Laporan medis berhasil digenerate dan disimpan
 *       400:
 *         description: Input tidak valid
 */
router.post(
  '/',
  [
    body('robotId').notEmpty().withMessage('robotId wajib diisi'),
    body('period')
      .optional()
      .isIn(['today', '7days', '30days', '6months'])
      .withMessage('period harus salah satu dari: today, 7days, 30days, 6months'),
    body('patientName').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(e => e.msg)
        });
      }

      const { robotId, period } = req.body;

      // Auto-fill patientName dari user yang login (jika ada JWT token)
      let patientName = req.body.patientName;
      if (!patientName) {
        try {
          const jwt = require('jsonwebtoken');
          const User = require('../models/User');
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('fullName');
            if (user) patientName = user.fullName;
          }
        } catch (_) {
          // Tidak ada token atau token invalid — lanjut tanpa nama
        }
        patientName = patientName || 'Pasien';
      }

      const report = await generateReport({ robotId, patientName, period });

      res.status(201).json({
        success: true,
        message: 'Laporan medis berhasil dibuat.',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Ambil detail dokumen laporan medis berdasarkan ID laporan
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dokumen laporan (contoh SOCA-882104)
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail laporan medis
 *       404:
 *         description: Laporan tidak ditemukan
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: `Laporan dengan ID '${id}' tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Hapus dokumen laporan medis
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Laporan berhasil dihapus
 *       404:
 *         description: Laporan tidak ditemukan
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteReport(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Laporan dengan ID '${id}' tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Laporan '${id}' berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
