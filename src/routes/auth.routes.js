const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Robot = require('../models/Robot');
const { protect, sendTokenResponse } = require('../middleware/authMiddleware');
const { refreshActiveRobotCache } = require('../services/robotService');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoint untuk autentikasi pengguna (register, login, profil)
 */

// ============================================================
// POST /api/auth/register — Daftarkan user baru
// ============================================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Daftarkan akun pengguna baru
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Bang Jan"
 *               email:
 *                 type: string
 *                 example: "bangjan@email.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               phoneNumber:
 *                 type: string
 *                 example: "08123456789"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-01-15"
 *     responses:
 *       201:
 *         description: Akun berhasil dibuat, JWT token dikembalikan
 *       400:
 *         description: Validasi gagal atau email sudah terdaftar
 */
router.post(
  '/register',
  [
    body('fullName').notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password minimal 6 karakter')
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

      const { fullName, email, password, phoneNumber, dateOfBirth } = req.body;

      // Cek apakah email sudah terdaftar
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.'
        });
      }

      const user = await User.create({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        phoneNumber: phoneNumber || '',
        dateOfBirth: dateOfBirth || null
      });

      sendTokenResponse(user, 201, res);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /api/auth/login — Login user
// ============================================================

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login dengan email dan password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "bangjan@email.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login berhasil, JWT token dikembalikan
 *       401:
 *         description: Email atau password salah
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi')
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

      const { email, password } = req.body;

      // Cari user, sertakan password (select: false di schema)
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password salah.'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Email atau password salah.'
        });
      }

      sendTokenResponse(user, 200, res);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /api/auth/me — Ambil profil user yang sedang login
// ============================================================

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Ambil data profil pengguna yang sedang login
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data profil
 *       401:
 *         description: Tidak terautentikasi
 */
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

// ============================================================
// PUT /api/auth/profile — Update profil user
// ============================================================

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Perbarui data profil pengguna
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { fullName, phoneNumber, dateOfBirth, emergencyContact } = req.body;

    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/pair-robot — Pairing robot via Serial Number
// ============================================================

/**
 * @swagger
 * /api/auth/pair-robot:
 *   post:
 *     summary: Pairing robot ke akun pengguna via Serial Number
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serialNumber
 *             properties:
 *               serialNumber:
 *                 type: string
 *                 example: "SOCA-X7B9"
 *     responses:
 *       200:
 *         description: Robot berhasil di-pairing ke akun ini
 *       404:
 *         description: Serial Number tidak ditemukan
 *       409:
 *         description: Robot sudah dimiliki oleh akun lain
 */
router.post('/pair-robot', protect, async (req, res, next) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber || !serialNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Serial Number wajib diisi.'
      });
    }

    const robot = await Robot.findOne({ serialNumber: serialNumber.trim().toUpperCase() });

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: `Serial Number '${serialNumber}' tidak ditemukan. Pastikan kode yang dimasukkan sudah benar.`
      });
    }

    // Cek apakah sudah dipair ke akun lain
    if (robot.ownerId && robot.ownerId.toString() !== req.user._id.toString()) {
      return res.status(409).json({
        success: false,
        error: 'Robot ini sudah terhubung ke akun lain. Hubungi tim support jika ini adalah kesalahan.'
      });
    }

    // Jika sudah milik user ini sendiri
    if (robot.ownerId && robot.ownerId.toString() === req.user._id.toString()) {
      return res.status(200).json({
        success: true,
        message: 'Robot ini sudah terhubung ke akun Anda.',
        data: { robotId: robot.robotId, name: robot.name, serialNumber: robot.serialNumber }
      });
    }

    // Lakukan pairing
    robot.ownerId = req.user._id;
    robot.status = 'active';
    await robot.save();
    await refreshActiveRobotCache();

    res.status(200).json({
      success: true,
      message: `Robot '${robot.name}' berhasil terhubung ke akun Anda!`,
      data: {
        robotId: robot.robotId,
        name: robot.name,
        serialNumber: robot.serialNumber
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DELETE /api/auth/unpair-robot — Lepas pairing robot dari akun
// ============================================================
router.delete('/unpair-robot', protect, async (req, res, next) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber) {
      return res.status(400).json({ success: false, error: 'Serial Number wajib diisi.' });
    }

    const robot = await Robot.findOne({
      serialNumber: serialNumber.trim().toUpperCase(),
      ownerId: req.user._id
    });

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot tidak ditemukan atau bukan milik akun Anda.'
      });
    }

    robot.ownerId = null;
    robot.status = 'inactive';
    await robot.save();
    await refreshActiveRobotCache();

    res.status(200).json({
      success: true,
      message: `Robot '${robot.name}' berhasil dilepas dari akun Anda.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
