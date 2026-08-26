const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Endpoint untuk manajemen pengaturan pengguna
 */

/**
 * Helper: ekstrak userId dari JWT (opsional — tidak throw error jika tidak ada token)
 */
const extractUserId = (req) => {
  try {
    const jwt = require('jsonwebtoken');
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id;
    }
  } catch (_) {}
  return null;
};

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Ambil pengaturan pengguna yang sedang login
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil pengaturan
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Token diperlukan untuk mengambil pengaturan.' });
    }

    let settings = await Settings.findOne({ userId });
    if (!settings) {
      settings = await Settings.create({
        userId,
        robotId: '',
        robotIp: '192.168.1.100',
        audioVolume: 50,
        audioEnabled: true,
        notificationEnabled: true
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Perbarui pengaturan pengguna
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               robotIp:
 *                 type: string
 *                 format: ipv4
 *                 example: "192.168.1.100"
 *               audioVolume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 70
 *               audioEnabled:
 *                 type: boolean
 *               notificationEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pengaturan berhasil diperbarui
 *       400:
 *         description: Format IP tidak valid
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Token diperlukan untuk memperbarui pengaturan.' });
    }

    const { robotId, robotIp, audioVolume, audioEnabled, notificationEnabled } = req.body;

    if (robotIp && robotIp.trim()) {
      const net = require('net');
      const isIPv4 = net.isIPv4(robotIp);
      const isBlocked = ['127.0.0.1', '0.0.0.0', 'localhost'].includes(robotIp.toLowerCase());
      if (!isIPv4 || isBlocked) {
        return res.status(400).json({ success: false, error: 'Format IP Address tidak valid (wajib IPv4)' });
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId },
      {
        ...(robotId !== undefined && { robotId }),
        ...(robotIp && { robotIp }),
        audioVolume: audioVolume !== undefined ? Number(audioVolume) : 50,
        audioEnabled: audioEnabled !== undefined ? Boolean(audioEnabled) : true,
        notificationEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: settings, message: 'Pengaturan berhasil diperbarui' });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Token diperlukan untuk memperbarui pengaturan.' });
    }

    const { robotId, robotIp, audioVolume, audioEnabled, notificationEnabled } = req.body;

    if (robotIp && robotIp.trim()) {
      const net = require('net');
      const isIPv4 = net.isIPv4(robotIp);
      const isBlocked = ['127.0.0.1', '0.0.0.0', 'localhost'].includes(robotIp.toLowerCase());
      if (!isIPv4 || isBlocked) {
        return res.status(400).json({ success: false, error: 'Format IP Address tidak valid (wajib IPv4)' });
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId },
      {
        ...(robotId !== undefined && { robotId }),
        ...(robotIp && { robotIp }),
        audioVolume: audioVolume !== undefined ? Number(audioVolume) : 50,
        audioEnabled: audioEnabled !== undefined ? Boolean(audioEnabled) : true,
        notificationEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: settings, message: 'Pengaturan berhasil diperbarui (via PUT)' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
