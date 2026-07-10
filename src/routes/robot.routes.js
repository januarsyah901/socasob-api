const express = require('express');
const router = express.Router();
const net = require('net');
const validateIp = require('../middleware/validateIp');
const Settings = require('../models/Settings');
const { DEFAULT_USER_ID } = require('../config/constants');

// POST /api/robot/connect - Menguji koneksi soket ke alamat IP robot/ESP32-CAM
router.post('/connect', validateIp, async (req, res, next) => {
  const { robotIp } = req.body;

  // Coba buat koneksi socket TCP ke IP robot di port 80 (standard HTTP port ESP32-CAM)
  const client = new net.Socket();
  let isConnected = false;

  client.setTimeout(2000); // Timeout 2 detik

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

// GET /api/robot/status - Mengambil informasi perangkat aktif dari DB
router.get('/status', async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ userId: DEFAULT_USER_ID });
    const ip = settings ? settings.robotIp : '192.168.1.100';

    res.status(200).json({
      success: true,
      data: {
        ipAddress: ip,
        macAddress: '24:0A:C4:B3:52:1A',
        rssi: -58, // Kekuatan sinyal Wi-Fi dBm (bagus)
        firmwareVersion: 'v1.0.0-socasob',
        status: 'active'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/robot/health - Mengambil info kesehatan sistem
router.get('/health', async (req, res, next) => {
  try {
    // Memberikan statistik real-time simulasi perangkat
    res.status(200).json({
      success: true,
      data: {
        uptime: '2d 4h 12m',
        cpuTemperature: 42.5, // Celcius
        wifiStrength: 'Bagus (-58 dBm)',
        fps: 24, // Video frame rate
        mlModelAccuracy: 95.2 // Persentase akurasi model ML
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
