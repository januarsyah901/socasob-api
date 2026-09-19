/**
 * Threshold Medis Pemantauan Risiko Mata (SocaSob)
 * PENTING: Threshold berikut sudah disetujui dokter. 
 * Jangan mengubah angka, operator perbandingan, maupun logikanya.
 */

const THRESHOLDS = {
  FATIGUE: {
    SCREEN_TIME_MINUTES: 360, // > 6 jam
    CONT_GAZE_MINUTES: 20, // > 20 menit
    DISTANCE_CM: 50 // < 50 cm
  },
  DRY_EYE: {
    SCREEN_TIME_MINUTES: 360, // > 6 jam
    INCOMPLETE_BLINK_RATIO: 40, // >= 40%
    BLINK_RATE: 10 // <= 10
  },
  MYOPIA: {
    SCREEN_TIME_MINUTES: 240, // >= 4 jam
    DISTANCE_CM: 20, // < 20 cm
    CONT_GAZE_MINUTES: 20 // > 20 menit
  }
};

const MESSAGES = {
  FATIGUE: {
    HIGH_SCREEN_TIME: "Screen time >6 jam (>360 menit)",
    HIGH_CONT_GAZE: "Durasi tatap kontinu >20 menit tanpa jeda",
    LOW_DISTANCE: "Jarak mata ke layar <50 cm selama minimal 10 detik"
  },
  DRY_EYE: {
    HIGH_SCREEN_TIME: "Screen time >6 jam (>360 menit)",
    HIGH_INCOMPLETE_BLINK: "Kedipan tidak sempurna tinggi (≥40%)",
    LOW_BLINK_RATE: "Frekuensi kedipan rendah (≤10 kedip/menit)"
  },
  MYOPIA: {
    HIGH_SCREEN_TIME: "Screen time ≥4 jam (≥240 menit)",
    LOW_DISTANCE: "Jarak kerja terlalu dekat (<20 cm)",
    HIGH_CONT_GAZE: "Kerja dekat atau tatap kontinu >20 menit tanpa jeda"
  }
};

module.exports = {
  THRESHOLDS,
  MESSAGES
};
