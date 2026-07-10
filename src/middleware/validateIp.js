const net = require('net');

/**
 * Middleware untuk memvalidasi alamat IP (mencegah SSRF)
 */
const validateIp = (req, res, next) => {
  const { robotIp } = req.body;

  if (!robotIp) {
    return res.status(400).json({
      success: false,
      error: 'robotIp wajib dikirimkan'
    });
  }

  // Gunakan modul bawaan Node.js 'net' untuk validasi IPv4
  const isIPv4 = net.isIPv4(robotIp);

  if (!isIPv4) {
    return res.status(400).json({
      success: false,
      error: 'Format IP Address tidak valid (wajib IPv4)'
    });
  }

  // Pengamanan tambahan: mencegah IP loopback/lokal tertentu jika diperlukan.
  // Karena ESP32-CAM biasanya di jaringan lokal (e.g. 192.168.x.x), kita mengizinkan IP lokal.
  // Tapi kita memblokir localhost 127.0.0.1 untuk mencegah akses server internal
  if (robotIp === '127.0.0.1' || robotIp === '0.0.0.0' || robotIp.toLowerCase() === 'localhost') {
    return res.status(400).json({
      success: false,
      error: 'Akses ke alamat IP lokal server diblokir demi keamanan'
    });
  }

  next();
};

module.exports = validateIp;
