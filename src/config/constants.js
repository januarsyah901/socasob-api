module.exports = {
  // Threshold jarak aman mata ke monitor (cm)
  SAFE_DISTANCE_THRESHOLD: 30,

  // Deteksi mata dekat dianggap berisiko myopia jika melebihi 60% total waktu monitoring
  MYOPIA_RISK_RATIO: 0.6,

  // Deteksi kelelahan mata (fatigue)
  FATIGUE_TIME_THRESHOLD: 3600, // 1 jam = 3600 detik
  FATIGUE_RISK_RATIO: 0.4,       // jika tatap dekat melebihi 40% dalam 1 jam

  // Interval simpan otomatis ke database (detik)
  AUTOSAVE_INTERVAL_SEC: 60,

  // Nilai default untuk user
  DEFAULT_USER_ID: 'default_user'
};
