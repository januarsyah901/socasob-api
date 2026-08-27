const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Robot = require('../models/Robot');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Semua route di file ini wajib login dan berstatus admin
router.use(protect, adminOnly);

// ============================================================
// ADMIN STATS
// ============================================================

/**
 * GET /api/admin/stats
 * Ringkasan statistik sistem (jumlah user, robot, dll.)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalRobots, activeRobots, pairedRobots] = await Promise.all([
      User.countDocuments(),
      Robot.countDocuments(),
      Robot.countDocuments({ status: 'active' }),
      Robot.countDocuments({ ownerId: { $ne: null } })
    ]);

    res.status(200).json({
      success: true,
      data: { totalUsers, totalRobots, activeRobots, pairedRobots }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// ADMIN USER MANAGEMENT
// ============================================================

/**
 * GET /api/admin/users?page=1&limit=20
 * List semua user dengan pagination
 */
router.get('/users', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Detail satu user + daftar robot yang dimilikinya
 */
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    const robots = await Robot.find({ ownerId: req.params.id }).lean();

    res.status(200).json({
      success: true,
      data: { ...user, robots }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id
 * Update data user (fullName, email, role, phoneNumber)
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const { fullName, email, role, phoneNumber } = req.body;
    const allowed = {};

    if (fullName    !== undefined) allowed.fullName    = fullName;
    if (email       !== undefined) allowed.email       = email;
    if (phoneNumber !== undefined) allowed.phoneNumber = phoneNumber;
    if (role        !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: "Role harus 'user' atau 'admin'." });
      }
      allowed.role = role;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: allowed },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Hapus user dan lepas semua robot miliknya (ownerId -> null)
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    // Lepas kepemilikan robot sebelum hapus user
    await Robot.updateMany({ ownerId: req.params.id }, { $set: { ownerId: null } });
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: `User '${user.fullName}' berhasil dihapus dan robot-nya telah di-unpair.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Ubah role user { role: 'admin' | 'user' }
 */
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: "Role harus 'user' atau 'admin'." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
    }

    res.status(200).json({
      success: true,
      message: `Role user '${user.fullName}' berhasil diubah menjadi '${role}'.`,
      data: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// ADMIN ROBOT MANAGEMENT
// ============================================================

/**
 * Helper: generate serialNumber format 'SOCA-XXXX' (4 karakter random uppercase)
 */
const generateSerialNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SOCA-${suffix}`;
};

/**
 * GET /api/admin/robots
 * List semua robot dengan info pemilik (fullName, email)
 */
router.get('/robots', async (req, res, next) => {
  try {
    const robots = await Robot.find()
      .sort({ createdAt: -1 })
      .populate('ownerId', 'fullName email')
      .lean();

    res.status(200).json({ success: true, count: robots.length, data: robots });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/robots
 * Buat robot baru — serialNumber di-generate otomatis jika tidak diisi
 */
router.post('/robots', async (req, res, next) => {
  try {
    const { robotId, name, serialNumber, ipAddress, description, status } = req.body;

    if (!robotId || !robotId.trim()) {
      return res.status(400).json({ success: false, error: 'Field robotId wajib diisi.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Field name (nama robot) wajib diisi.' });
    }

    const cleanRobotId = robotId.trim();

    const existing = await Robot.findOne({ robotId: cleanRobotId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Robot dengan ID '${cleanRobotId}' sudah terdaftar.`
      });
    }

    // Generate serialNumber unik jika tidak diberikan
    let sn = serialNumber ? serialNumber.trim().toUpperCase() : null;
    if (!sn) {
      let attempts = 0;
      do {
        sn = generateSerialNumber();
        attempts++;
        if (attempts > 20) break; // safety valve
      } while (await Robot.exists({ serialNumber: sn }));
    }

    const robot = await Robot.create({
      robotId: cleanRobotId,
      name: name.trim(),
      serialNumber: sn,
      ipAddress: ipAddress ? ipAddress.trim() : '',
      description: description ? description.trim() : '',
      status: status === 'inactive' ? 'inactive' : 'active'
    });

    res.status(201).json({
      success: true,
      message: `Robot '${robot.name}' (${robot.robotId}) berhasil dibuat.`,
      data: robot
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/robots/:robotId/unpair
 * Lepas pairing robot dari owner (ownerId -> null)
 * MUST come before PUT /robots/:robotId to avoid conflict
 */
router.put('/robots/:robotId/unpair', async (req, res, next) => {
  try {
    const { robotId } = req.params;

    const robot = await Robot.findOneAndUpdate(
      { robotId },
      { $set: { ownerId: null } },
      { new: true }
    );

    if (!robot) {
      return res.status(404).json({ success: false, error: `Robot '${robotId}' tidak ditemukan.` });
    }

    res.status(200).json({
      success: true,
      message: `Robot '${robot.robotId}' berhasil di-unpair.`,
      data: robot
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/robots/:robotId
 * Update data robot (name, serialNumber, ipAddress, description, status)
 */
router.put('/robots/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const { name, serialNumber, ipAddress, description, status } = req.body;

    const robot = await Robot.findOne({ robotId });
    if (!robot) {
      return res.status(404).json({ success: false, error: `Robot '${robotId}' tidak ditemukan.` });
    }

    if (name         !== undefined) robot.name         = name.trim();
    if (serialNumber !== undefined) robot.serialNumber = serialNumber.trim().toUpperCase();
    if (ipAddress    !== undefined) robot.ipAddress    = ipAddress.trim();
    if (description  !== undefined) robot.description  = description.trim();
    if (status && ['active', 'inactive'].includes(status)) robot.status = status;

    await robot.save();

    res.status(200).json({
      success: true,
      message: `Robot '${robot.robotId}' berhasil diperbarui.`,
      data: robot
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/robots/:robotId
 * Hapus robot dari sistem
 */
router.delete('/robots/:robotId', async (req, res, next) => {
  try {
    const { robotId } = req.params;
    const deleted = await Robot.findOneAndDelete({ robotId });

    if (!deleted) {
      return res.status(404).json({ success: false, error: `Robot '${robotId}' tidak ditemukan.` });
    }

    res.status(200).json({
      success: true,
      message: `Robot '${deleted.name}' (${deleted.robotId}) berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// ADMIN ML CONFIG (proxy ke ML server)
// ============================================================

/**
 * GET /api/admin/ml-config
 * Ambil konfigurasi dari ML server
 */
router.get('/ml-config', async (req, res, next) => {
  try {
    const mlUrl = process.env.ML_URL || 'http://srv-captain--socasob-ml:5000';

    const response = await fetch(`${mlUrl}/api/config`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Gagal mengambil konfigurasi ML');
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      error: `Koneksi ke ML Server gagal: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /api/admin/ml-config:
 *   post:
 *     summary: Update konfigurasi ML Server
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/ml-config', async (req, res, next) => {
  try {
    const mlUrl = process.env.ML_URL || 'http://srv-captain--socasob-ml:5000';

    const response = await fetch(`${mlUrl}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();

    res.status(response.status).json({ success: response.ok, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
