const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware autentikasi — wajib dipanggil di setiap route yang butuh login.
 * Mengecek JWT token dari header Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak. Silakan login terlebih dahulu.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak valid. Pengguna tidak ditemukan.'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token tidak valid atau sudah kadaluarsa. Silakan login ulang.'
    });
  }
};

/**
 * Helper: buat dan kirim JWT token sebagai response
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const userData = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    emergencyContact: user.emergencyContact,
    createdAt: user.createdAt
  };

  res.status(statusCode).json({
    success: true,
    token,
    data: userData
  });
};

module.exports = { protect, sendTokenResponse };
