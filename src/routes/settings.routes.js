const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const validateIp = require('../middleware/validateIp');
const { DEFAULT_USER_ID } = require('../config/constants');

// GET /api/settings - Mengambil pengaturan pengguna
router.get('/', async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: DEFAULT_USER_ID });
    
    if (!settings) {
      // Buat default settings jika belum ada
      settings = await Settings.create({
        userId: DEFAULT_USER_ID,
        robotIp: '192.168.1.100', // Default IP
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

// POST /api/settings - Memperbarui pengaturan pengguna (dengan validasi IP)
router.post('/', validateIp, async (req, res, next) => {
  try {
    const { robotIp, audioVolume, audioEnabled, notificationEnabled } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { userId: DEFAULT_USER_ID },
      {
        robotIp,
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

module.exports = router;
