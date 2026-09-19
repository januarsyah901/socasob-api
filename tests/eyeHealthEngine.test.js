const { evaluateDailyRisks } = require('../src/services/eyeHealthEngine');
const { THRESHOLDS, MESSAGES } = require('../src/config/socaSobThresholds');

describe('eyeHealthEngine - evaluateDailyRisks', () => {
  it('harus mengembalikan YA untuk semua risiko berdasarkan contoh kasus wajib lulus', () => {
    const input = {
      screenTimeMinutes: 380, // > 360
      longestContinuousGazeMinutes: 52, // > 20
      dominantDistanceCm: 42,
      blinkRatePerMinute: 16, // > 10 (tidak masalah)
      incompleteBlinkRatio: 45, // >= 40
      distanceBelow20CmDetected: false,
      distanceBelow50CmForAtLeast10Seconds: true
    };

    const result = evaluateDailyRisks(input);

    // Risiko Mata Lelah
    expect(result.eyeFatigueRisk.status).toBe('YA');
    expect(result.eyeFatigueRisk.reasons).toContain(MESSAGES.FATIGUE.HIGH_SCREEN_TIME);
    expect(result.eyeFatigueRisk.reasons).toContain(MESSAGES.FATIGUE.HIGH_CONT_GAZE);
    expect(result.eyeFatigueRisk.reasons).toContain(MESSAGES.FATIGUE.LOW_DISTANCE);

    // Risiko Mata Kering
    expect(result.dryEyeRisk.status).toBe('YA');
    expect(result.dryEyeRisk.reasons).toContain(MESSAGES.DRY_EYE.HIGH_SCREEN_TIME);
    expect(result.dryEyeRisk.reasons).toContain(MESSAGES.DRY_EYE.HIGH_INCOMPLETE_BLINK);
    expect(result.dryEyeRisk.reasons).not.toContain(MESSAGES.DRY_EYE.LOW_BLINK_RATE); // Karena 16 > 10

    // Paparan Risiko Miopia
    expect(result.myopiaExposureRisk.status).toBe('YA');
    expect(result.myopiaExposureRisk.reasons).toContain(MESSAGES.MYOPIA.HIGH_SCREEN_TIME); // >= 240
    expect(result.myopiaExposureRisk.reasons).toContain(MESSAGES.MYOPIA.HIGH_CONT_GAZE);
    expect(result.myopiaExposureRisk.reasons).not.toContain(MESSAGES.MYOPIA.LOW_DISTANCE);
  });

  it('harus mengembalikan TIDAK jika semua metrik aman', () => {
    const input = {
      screenTimeMinutes: 120, // < 240
      longestContinuousGazeMinutes: 15, // < 20
      blinkRatePerMinute: 20, // > 10
      incompleteBlinkRatio: 10, // < 40
      distanceBelow50CmForAtLeast10Seconds: false,
      distanceBelow20CmDetected: false
    };

    const result = evaluateDailyRisks(input);

    expect(result.eyeFatigueRisk.status).toBe('TIDAK');
    expect(result.eyeFatigueRisk.reasons).toHaveLength(0);

    expect(result.dryEyeRisk.status).toBe('TIDAK');
    expect(result.dryEyeRisk.reasons).toHaveLength(0);

    expect(result.myopiaExposureRisk.status).toBe('TIDAK');
    expect(result.myopiaExposureRisk.reasons).toHaveLength(0);
  });

  it('harus mendeteksi batas (boundaries) dengan tepat (misal screen time tepat 360 => TIDAK kena mata lelah karena > 360)', () => {
    const input = {
      screenTimeMinutes: 360, // Batas tepat 360, aturan > 360, jadi TIDAK
      longestContinuousGazeMinutes: 20, // Batas tepat 20, aturan > 20, jadi TIDAK
      blinkRatePerMinute: 10, // Batas <= 10, jadi YA (dry eye)
      incompleteBlinkRatio: 40, // Batas >= 40, jadi YA (dry eye)
      distanceBelow50CmForAtLeast10Seconds: false,
      distanceBelow20CmDetected: true // YA (miopia)
    };

    const result = evaluateDailyRisks(input);

    // Fatigue
    expect(result.eyeFatigueRisk.status).toBe('TIDAK');

    // Dry Eye
    expect(result.dryEyeRisk.status).toBe('YA');
    expect(result.dryEyeRisk.reasons).toContain(MESSAGES.DRY_EYE.HIGH_INCOMPLETE_BLINK);
    expect(result.dryEyeRisk.reasons).toContain(MESSAGES.DRY_EYE.LOW_BLINK_RATE);

    // Myopia Exposure (360 >= 240 => YA)
    expect(result.myopiaExposureRisk.status).toBe('YA');
    expect(result.myopiaExposureRisk.reasons).toContain(MESSAGES.MYOPIA.HIGH_SCREEN_TIME);
    expect(result.myopiaExposureRisk.reasons).toContain(MESSAGES.MYOPIA.LOW_DISTANCE);
  });
});
