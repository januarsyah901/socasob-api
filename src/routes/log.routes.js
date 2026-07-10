const express = require('express');
const router = express.Router();
const logService = require('../services/logService');

// GET /api/log/today - Rangkuman data hari ini
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

// GET /api/log/weekly - Riwayat 7 hari terakhir
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

// GET /api/log/:date - Rangkuman tanggal spesifik (YYYY-MM-DD)
router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    
    // Validasi format YYYY-MM-DD sederhana
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
