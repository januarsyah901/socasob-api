const express = require('express');
const router = express.Router();
const net = require('net');
const validateIp = require('../middleware/validateIp');
const Robot = require('../models/Robot');
const Settings = require('../models/Settings');
const { refreshActiveRobotCache, isRobotValidAndActive } = require('../services/robotService');

/**
 * Helper untuk mengecek apakah robot online di Socket.io
 */
const checkIsOnline = (robotId) => {
  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    const rooms = io.sockets.adapter.rooms;
    return rooms.has(`robot:${robotId}`);
  } catch (_) {
    return false;
  }
};

/**
 * @swagger
 * tags:
 *   name: Robots
 *   description: Endpoint untuk manajemen registrasi dan monitoring perangkat ESP32-CAM
 */

// ============================================================
// 1. SPECIFIC STATIC ROUTES FIRST (Wajib sebelum parameterized /:robotId)
// ============================================================

/**
 * @swagger
 * /api/robots:
 *   get:
 *     summary: Ambil daftar seluruh robot yang terdaftar
 *     tags: [Robots]
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar robot
 */
router.get('/', async (req, res, next) => {
  try {
    const robots = await Robot.find().sort({ createdAt: -1 }).lean();

    const formatted = robots.map(r => ({
      ...r,
      // Pastikan ownerId ter-expose ke frontend (untuk filter per-user)
      ownerId: r.ownerId ? r.ownerId.toString() : null,
      isOnline: checkIsOnline(r.robotId)
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robots:
 *   post:
 *     summary: Registrasi robot / perangkat ESP32-CAM baru
 *     tags: [Robots]
 */
router.post('/', async (req, res, next) => {
  try {
    const { robotId, name, ipAddress, description, status } = req.body;

    if (!robotId || !robotId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Field robotId wajib diisi.'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Field name (nama robot) wajib diisi.'
      });
    }

    const cleanRobotId = robotId.trim();

    const existing = await Robot.findOne({ robotId: cleanRobotId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Robot dengan ID '${cleanRobotId}' sudah terdaftar.`
      });
    }

    const newRobot = await Robot.create({
      robotId: cleanRobotId,
      name: name.trim(),
      ipAddress: ipAddress ? ipAddress.trim() : '',
      description: description ? description.trim() : '',
      status: status === 'inactive' ? 'inactive' : 'active'
    });

    await refreshActiveRobotCache();

    res.status(201).json({
      success: true,
      message: `Robot '${newRobot.name}' (${newRobot.robotId}) berhasil didaftarkan.`,
      data: {
        ...newRobot.toObject(),
        isOnline: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robot/connect:
 *   post:
 *     summary: Uji koneksi TCP ke perangkat ESP32-CAM
 *     tags: [Robots]
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
 *     tags: [Robots]
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

    // Cek di tabel Robot dulu, jika tidak ada fallback ke Settings
    const robot = await Robot.findOne({ robotId }).lean();
    const settings = !robot ? await Settings.findOne({ robotId }) : null;

    if (!robot && !settings) {
      return res.status(404).json({
        success: false,
        error: `Robot dengan ID '${robotId}' tidak ditemukan di sistem.`
      });
    }

    const isOnline = checkIsOnline(robotId);

    res.status(200).json({
      success: true,
      data: {
        robotId: robot ? robot.robotId : settings.robotId,
        name: robot ? robot.name : 'ESP32 Device',
        ipAddress: robot ? robot.ipAddress : settings.robotIp,
        isOnline,
        status: isOnline ? 'active' : (robot ? robot.status : 'offline')
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
 *     tags: [Robots]
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
 *     tags: [Robots]
 */
router.post('/alert', async (req, res, next) => {
  try {
    const { robotId, status, message } = req.body;

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
        indicators: {
          eyeFatigue: 75,
          myopiaRisk: 85,
          postureWarning: true,
          blinkRate: 8.5
        },
        message: message || 'Peringatan uji coba: Jarak terlalu dekat terdeteksi!',
        timestamp: new Date().toISOString()
      });

      const trigger = req.body.trigger || (status === 'dry_eye' || status === 'dry' ? 'dry' : status === 'fatigue_10m' || status === '10' ? '10' : status === 'fatigue_5m' || status === '5' ? '5' : 'normal');
      io.to(`robot:${robotId}`).emit('hardware-status', {
        robot_id: robotId,
        robot_trigger: trigger,
        lcd_command: status || 'normal',
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: `Peringatan berhasil dikirim ke room robot:${robotId}`,
        data: { robotId, status, trigger, message }
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

/**
 * @swagger
 * /api/robots/validate/{robotId}:
 *   get:
 *     summary: Cek apakah ID robot valid dan terdaftar
 *     tags: [Robots]
 */
router.get('/validate/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const isValid = await isRobotValidAndActive(robotId);

    if (!isValid) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: `Robot dengan ID '${robotId}' tidak terdaftar atau sedang dinonaktifkan.`
      });
    }

    const robot = await Robot.findOne({ robotId }).lean();
    res.status(200).json({
      success: true,
      valid: true,
      data: {
        robotId: robot.robotId,
        name: robot.name,
        status: robot.status,
        isOnline: checkIsOnline(robot.robotId)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// 2. PARAMETERIZED ROUTES (/:robotId) AT THE BOTTOM
// ============================================================

/**
 * @swagger
 * /api/robots/{robotId}:
 *   get:
 *     summary: Ambil detail 1 robot
 *     tags: [Robots]
 */
router.get('/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const robot = await Robot.findOne({ robotId }).lean();

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: `Robot dengan ID '${robotId}' tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...robot,
        isOnline: checkIsOnline(robot.robotId)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robots/{robotId}:
 *   put:
 *     summary: Update data robot terdaftar
 *     tags: [Robots]
 */
router.put('/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const { name, ipAddress, description, status } = req.body;

    const robot = await Robot.findOne({ robotId });
    if (!robot) {
      return res.status(404).json({
        success: false,
        error: `Robot dengan ID '${robotId}' tidak ditemukan.`
      });
    }

    if (name) robot.name = name.trim();
    if (ipAddress !== undefined) robot.ipAddress = ipAddress.trim();
    if (description !== undefined) robot.description = description.trim();
    if (status && ['active', 'inactive'].includes(status)) robot.status = status;

    await robot.save();
    await refreshActiveRobotCache();

    res.status(200).json({
      success: true,
      message: `Data robot '${robot.robotId}' berhasil diperbarui.`,
      data: {
        ...robot.toObject(),
        isOnline: checkIsOnline(robot.robotId)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/robots/{robotId}:
 *   delete:
 *     summary: Hapus robot dari sistem
 *     tags: [Robots]
 */
router.delete('/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const deleted = await Robot.findOneAndDelete({ robotId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Robot dengan ID '${robotId}' tidak ditemukan.`
      });
    }

    await refreshActiveRobotCache();

    res.status(200).json({
      success: true,
      message: `Robot '${deleted.name}' (${deleted.robotId}) berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
