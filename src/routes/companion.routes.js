const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  sendMessage,
  getConversations,
  getConversationById,
  deleteConversation
} = require('../services/companionService');

/**
 * @swagger
 * tags:
 *   name: Companion
 *   description: Endpoint untuk Teman Soca AI Companion & Edukasi Kesehatan Mata
 */

/**
 * Helper: ekstrak userId dari JWT (opsional — tidak throw error jika tidak ada token)
 */
const extractUserFromToken = (req) => {
  try {
    const jwt = require('jsonwebtoken');
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      return jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch (_) {}
  return null;
};

/**
 * @swagger
 * /api/companion/conversations:
 *   get:
 *     summary: Ambil daftar riwayat percakapan AI Companion milik user yang login
 *     tags: [Companion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar percakapan
 */
router.get('/conversations', async (req, res, next) => {
  try {
    // Prioritas: JWT token → query param (legacy) → 'default_user'
    const decoded = extractUserFromToken(req);
    const userId = decoded?.id || req.query.userId || 'default_user';

    const list = await getConversations(userId);

    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/companion/conversations/{id}:
 *   get:
 *     summary: Ambil detail riwayat percakapan beserta seluruh pesan
 *     tags: [Companion]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil percakapan
 *       404:
 *         description: Percakapan tidak ditemukan
 */
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await getConversationById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: `Percakapan '${id}' tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/companion/chat:
 *   post:
 *     summary: Kirim pertanyaan ke AI Teman Soca dan dapatkan balasan cerdas
 *     tags: [Companion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Bagaimana cara merelaksasi mata yang lelah?"
 *               conversationId:
 *                 type: string
 *                 example: "conv-12345"
 *               robotId:
 *                 type: string
 *                 example: "fadfa566"
 *               patientName:
 *                 type: string
 *                 example: "Bang Jan"
 *     responses:
 *       200:
 *         description: Balasan berhasil didapatkan
 *       400:
 *         description: Input tidak valid
 */
router.post(
  '/chat',
  [
    body('message').notEmpty().withMessage('Pesan wajib diisi'),
    body('conversationId').optional().isString(),
    body('robotId').optional().isString(),
    body('patientName').optional().isString()
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

      const { message, conversationId, robotId } = req.body;

      // Auto-fill userId & patientName dari JWT jika ada token
      const decoded = extractUserFromToken(req);
      let userId = req.body.userId || 'default_user';
      let patientName = req.body.patientName;

      if (decoded?.id) {
        userId = decoded.id;
        // Ambil nama user dari DB jika patientName tidak dikirim
        if (!patientName) {
          try {
            const User = require('../models/User');
            const user = await User.findById(decoded.id).select('fullName');
            if (user) patientName = user.fullName;
          } catch (_) {}
        }
      }

      patientName = patientName || 'Pengguna';

      const result = await sendMessage({
        message,
        conversationId,
        robotId,
        patientName,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/companion/conversations/{id}:
 *   delete:
 *     summary: Hapus riwayat percakapan
 *     tags: [Companion]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Percakapan berhasil dihapus
 *       404:
 *         description: Percakapan tidak ditemukan
 */
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteConversation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Percakapan '${id}' tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Percakapan '${id}' berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
