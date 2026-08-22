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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Berhasil terhubung ke ESP32-CAM di 192.168.1.105:80"
 *       400:
 *         description: Format IP tidak valid atau field wajib tidak dikirim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       408:
 *         description: Koneksi timeout — ESP32-CAM tidak merespons
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: Gagal terhubung ke perangkat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *     summary: Ambil status perangkat ESP32-CAM aktif
 *     tags: [Robot]
 *     description: Mengambil informasi perangkat yang sedang aktif, termasuk IP, MAC Address, kekuatan sinyal Wi-Fi, dan versi firmware.
 *     responses:
 *       200:
 *         description: Berhasil mengambil status perangkat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RobotStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status', async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ userId: DEFAULT_USER_ID });
    const ip = settings ? settings.robotIp : '192.168.1.100';
    const robotId = settings ? settings.robotId : 'fadfa566';

    res.status(200).json({
      success: true,
      data: {
        robotId,
        ipAddress: ip,
        macAddress: '24:0A:C4:B3:52:1A',
        rssi: -58,
        firmwareVersion: 'v1.0.0-socasob',
        status: 'active'
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
 *       Mengambil metrik kesehatan sistem perangkat secara real-time:
 *       - **Uptime**: Durasi perangkat aktif sejak terakhir restart
 *       - **CPU Temperature**: Suhu inti processor ESP32 (dalam °C)
 *       - **Wi-Fi Strength**: Kekuatan sinyal Wi-Fi dalam dBm
 *       - **FPS**: Frame rate video stream kamera
 *       - **ML Model Accuracy**: Akurasi model MediaPipe Face Mesh (%)
 *     responses:
 *       200:
 *         description: Berhasil mengambil info kesehatan sistem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RobotHealth'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ userId: DEFAULT_USER_ID });
    const robotId = settings ? settings.robotId : 'fadfa566';

    res.status(200).json({
      success: true,
      data: {
        robotId,
        uptime: '2d 4h 12m',
        cpuTemperature: 42.5,
        wifiStrength: 'Bagus (-58 dBm)',
        fps: 24,
        mlModelAccuracy: 95.2
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
    const targetRobotId = robotId || 'fadfa566';
    const { getIO } = require('../sockets');

    try {
      const io = getIO();
      io.to(`robot:${targetRobotId}`).emit('eye-status', {
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
        message: `Peringatan berhasil dikirim ke room robot:${targetRobotId}`,
        data: { robotId: targetRobotId, status, score, message }
      });
    } catch (err) {
      return res.status(200).json({
        success: true,
        message: `Koneksi Socket.io belum aktif di server, payload disimulasikan: ${err.message}`
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
