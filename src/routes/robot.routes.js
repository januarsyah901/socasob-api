const express = require('express');
const router = express.Router();
const net = require('net');
const validateIp = require('../middleware/validateIp');
const Settings = require('../models/Settings');
const { DEFAULT_USER_ID } = require('../config/constants');

/**
 * @swagger
 * tags:
 *   name: Robot
 *   description: Endpoint untuk koneksi dan monitoring perangkat ESP32-CAM
 */

/**
 * @swagger
 * /api/robot/connect:
 *   post:
 *     summary: Uji koneksi ke perangkat ESP32-CAM
 *     tags: [Robot]
 *     description: |
 *       Mencoba membuka koneksi TCP ke alamat IP ESP32-CAM di port 80.
 *       IP wajib berformat IPv4 yang valid. IP lokal server (`127.0.0.1`, `0.0.0.0`) diblokir
 *       untuk mencegah serangan **SSRF (Server-Side Request Forgery)**.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - robotIp
 *             properties:
 *               robotIp:
 *                 type: string
 *                 format: ipv4
 *                 description: Alamat IP ESP32-CAM yang akan dihubungkan
 *                 example: "192.168.1.105"
 *     responses:
 *       200:
 *         description: Berhasil terhubung ke ESP32-CAM
 *       400:
 *         description: Format IP tidak valid atau field wajib tidak dikirim
 *       408:
 *         description: Koneksi timeout — ESP32-CAM tidak merespons
 *       502:
 *         description: Gagal terhubung ke perangkat
 */
router.post('/connect', validateIp, async (req, res, next) => {
  const { robotIp } = req.body;

  const client = new net.Socket();
  let isConnected = false;

  client.setTimeout(2000);

  client.on('connect', () => {
    isConnected = true;
    client.destroy();
    res.status(200).json({
      success: true,
      message: `Berhasil terhubung ke ESP32-CAM di ${robotIp}:80`
    });
  });

  client.on('timeout', () => {
    client.destroy();
    if (!isConnected) {
      res.status(408).json({
        success: false,
        error: `Koneksi timeout ke ${robotIp}:80 (ESP32-CAM tidak merespons)`
      });
    }
  });

  client.on('error', (err) => {
    client.destroy();
    if (!isConnected) {
      res.status(502).json({
        success: false,
        error: `Gagal terhubung ke ${robotIp}:80 - ${err.message}`
      });
    }
  });

  client.connect(80, robotIp);
});

/**
 * @swagger
 * /api/robot/status:
 *   get:
 *     summary: Ambil status perangkat ESP32-CAM berdasarkan robotId
 *     tags: [Robot]
 *     description: |
 *       Mengambil informasi perangkat aktif yang terdaftar di settings.
 *       Wajib kirim query parameter `robotId`. Mengembalikan 404 jika tidak ditemukan
 *       atau null jika robot belum pernah connect. Tidak ada data dummy.
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot ESP32-CAM (MAC/Hardware ID)
 *         example: "fadfa566"
 *     responses:
 *       200:
 *         description: Berhasil mengambil status perangkat
 *       400:
 *         description: Parameter robotId tidak dikirim
 *       404:
 *         description: Robot tidak ditemukan di settings
 */
router.get('/status', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Parameter robotId wajib diisi. Contoh: /api/robot/status?robotId=fadfa566'
      });
    }

    const settings = await Settings.findOne({ robotId });

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: `Robot dengan ID '${robotId}' tidak ditemukan. Pastikan robot sudah terdaftar via Settings.`
      });
    }

    // Cek apakah robot aktif di Socket.io (in-memory map dari pythonHandler)
    let isOnline = false;
    try {
      const { getIO } = require('../sockets');
      const io = getIO();
      const rooms = io.sockets.adapter.rooms;
      isOnline = rooms.has(`robot:${robotId}`);
    } catch (_) {
      // Socket belum aktif — tidak masalah
    }

    res.status(200).json({
      success: true,
      data: {
        robotId: settings.robotId,
        ipAddress: settings.robotIp,
        isOnline,
        status: isOnline ? 'active' : 'offline'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robot/health:
 *   get:
 *     summary: Ambil informasi kesehatan sistem perangkat ESP32-CAM
 *     tags: [Robot]
 *     description: |
 *       Mengambil data monitoring hari ini dari robot yang diminta.
 *       Wajib kirim query parameter `robotId`. Mengembalikan 404 jika tidak ada data hari ini.
 *     parameters:
 *       - in: query
 *         name: robotId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unik robot ESP32-CAM
 *         example: "fadfa566"
 *     responses:
 *       200:
 *         description: Berhasil mengambil info kesehatan robot
 *       400:
 *         description: Parameter robotId tidak dikirim
 *       404:
 *         description: Belum ada data monitoring hari ini untuk robot ini
 */
router.get('/health', async (req, res, next) => {
  try {
    const { robotId } = req.query;
    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Parameter robotId wajib diisi. Contoh: /api/robot/health?robotId=fadfa566'
      });
    }

    const logService = require('../services/logService');
    const todayLog = await logService.getTodayLog(robotId);

    if (!todayLog) {
      return res.status(404).json({
        success: false,
        error: `Belum ada data monitoring hari ini untuk robot '${robotId}'.`
      });
    }

    const totalSec = todayLog.nearDuration + todayLog.farDuration;
    const totalMin = totalSec / 60;
    const blinkRate = totalMin > 0 ? Math.round((todayLog.blinkCount / totalMin) * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        robotId,
        date: todayLog.date,
        nearDuration: todayLog.nearDuration,
        farDuration: todayLog.farDuration,
        blinkCount: todayLog.blinkCount,
        blinkRate,
        eyeHealthStatus: todayLog.eyeHealthStatus,
        restCompliance: todayLog.restCompliance,
        totalMonitoringSeconds: totalSec,
        updatedAt: todayLog.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robot/alert:
 *   post:
 *     summary: Kirim notifikasi/peringatan uji coba ke room Socket.io FE
 *     tags: [Robot]
 */
router.post('/alert', async (req, res, next) => {
  try {
    const { robotId, status, score, message } = req.body;

    if (!robotId) {
      return res.status(400).json({
        success: false,
        error: 'Field robotId wajib diisi di body request.'
      });
    }

    const { getIO } = require('../sockets');

    try {
      const io = getIO();
      io.to(`robot:${robotId}`).emit('eye-status', {
        status: status || 'risk_myopia',
        score: score !== undefined ? score : 45,
        indicators: {
          eyeFatigue: 75,
          myopiaRisk: 85,
          postureWarning: true,
          blinkRate: 8.5
        },
        message: message || 'Peringatan uji coba: Jarak terlalu dekat terdeteksi!',
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: `Peringatan berhasil dikirim ke room robot:${robotId}`,
        data: { robotId, status, score, message }
      });
    } catch (err) {
      return res.status(503).json({
        success: false,
        error: `Socket.io belum aktif: ${err.message}`
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
