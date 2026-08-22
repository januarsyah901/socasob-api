const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const validateIp = require('../middleware/validateIp');
const { DEFAULT_USER_ID } = require('../config/constants');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Endpoint untuk manajemen pengaturan pengguna
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Ambil pengaturan pengguna
 *     tags: [Settings]
 *     description: Mengambil konfigurasi preferensi pengguna dari database. Jika belum ada, akan dibuat pengaturan default secara otomatis.
 *     responses:
 *       200:
 *         description: Berhasil mengambil pengaturan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Settings'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Perbarui pengaturan pengguna
 *     tags: [Settings]
 *     description: |
 *       Memperbarui konfigurasi preferensi pengguna. IP Address robot **wajib** berupa IPv4 yang valid
 *       untuk mencegah serangan SSRF. IP `127.0.0.1` dan `0.0.0.0` diblokir.
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
 *                 description: Alamat IP ESP32-CAM (wajib format IPv4)
 *                 example: "192.168.1.100"
 *               audioVolume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Volume alarm peringatan (0–100)
 *                 example: 70
 *               audioEnabled:
 *                 type: boolean
 *                 description: Aktifkan/matikan suara peringatan
 *                 example: true
 *               notificationEnabled:
 *                 type: boolean
 *                 description: Aktifkan/matikan notifikasi browser
 *                 example: true
 *     responses:
 *       200:
 *         description: Pengaturan berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Format IP tidak valid atau field wajib tidak dikirim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get('/', async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: DEFAULT_USER_ID });

    if (!settings) {
      settings = await Settings.create({
        userId: DEFAULT_USER_ID,
        robotId: 'fadfa566',
        robotIp: '192.168.1.100',
        audioVolume: 50,
        audioEnabled: true,
        notificationEnabled: true
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});


router.post('/', async (req, res, next) => {
  try {
    const { robotId, robotIp, audioVolume, audioEnabled, notificationEnabled } = req.body;

    // Validasi IP opsional — hanya jika dikirim
    if (robotIp && robotIp.trim()) {
      const net = require('net');
      const isIPv4 = net.isIPv4(robotIp);
      const isBlocked = ['127.0.0.1', '0.0.0.0', 'localhost'].includes(robotIp.toLowerCase());
      if (!isIPv4 || isBlocked) {
        return res.status(400).json({ success: false, error: 'Format IP Address tidak valid (wajib IPv4)' });
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId: DEFAULT_USER_ID },
      {
        ...(robotId && { robotId }),
        ...(robotIp && { robotIp }),
        audioVolume: audioVolume !== undefined ? Number(audioVolume) : 50,
        audioEnabled: audioEnabled !== undefined ? Boolean(audioEnabled) : true,
        notificationEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Pengaturan berhasil diperbarui'
    });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
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
      { userId: DEFAULT_USER_ID },
      {
        ...(robotId && { robotId }),
        ...(robotIp && { robotIp }),
        audioVolume: audioVolume !== undefined ? Number(audioVolume) : 50,
        audioEnabled: audioEnabled !== undefined ? Boolean(audioEnabled) : true,
        notificationEnabled: notificationEnabled !== undefined ? Boolean(notificationEnabled) : true
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Pengaturan berhasil diperbarui (via PUT)'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
