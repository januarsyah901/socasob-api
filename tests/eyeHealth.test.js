const {
  calculateEyeStatus,
  calculateRiskLevels,
  calculateRestCompliance
} = require('../src/services/eyeHealthEngine');

describe('calculateEyeStatus', () => {
  test('returns normal when no data', () => {
    expect(calculateEyeStatus(0, 0)).toBe('normal');
  });

  test('returns normal when near ratio < 60%', () => {
    expect(calculateEyeStatus(50, 60)).toBe('normal');
  });

  test('returns risk_myopia when near ratio > 60%', () => {
    expect(calculateEyeStatus(61, 39)).toBe('risk_myopia');
  });

  test('returns normal at exactly 60% near (strict > boundary)', () => {
    expect(calculateEyeStatus(60, 40)).toBe('normal');
  });

  test('returns risk_fatigue when total > 1hr and near > 40%', () => {
    expect(calculateEyeStatus(2000, 2000)).toBe('risk_fatigue');
  });

  test('returns normal when total > 1hr but near < 40%', () => {
    expect(calculateEyeStatus(1000, 3000)).toBe('normal');
  });

  test('risk_myopia takes priority over risk_fatigue', () => {
    expect(calculateEyeStatus(4000, 1000)).toBe('risk_myopia');
  });
});

describe('calculateRiskLevels', () => {
  test('returns Rendah for both when no data', () => {
    const r = calculateRiskLevels(0, 0);
    expect(r.myopiaRisk).toBe('Rendah');
    expect(r.fatigueRisk).toBe('Rendah');
  });

  test('myopiaRisk is Tinggi when near > 60%', () => {
    expect(calculateRiskLevels(70, 30).myopiaRisk).toBe('Tinggi');
  });

  test('myopiaRisk is Sedang when near between 30-60%', () => {
    expect(calculateRiskLevels(40, 60).myopiaRisk).toBe('Sedang');
  });

  test('myopiaRisk is Rendah when near < 30%', () => {
    expect(calculateRiskLevels(20, 80).myopiaRisk).toBe('Rendah');
  });

  test('fatigueRisk is Tinggi when total > 1hr and near > 50%', () => {
    expect(calculateRiskLevels(2400, 1600).fatigueRisk).toBe('Tinggi');
  });

  test('fatigueRisk is Sedang when total > 30min and near > 40%', () => {
    expect(calculateRiskLevels(900, 1100).fatigueRisk).toBe('Sedang');
  });

  test('fatigueRisk is Rendah when total < 30min', () => {
    expect(calculateRiskLevels(500, 500).fatigueRisk).toBe('Rendah');
  });
});

describe('calculateRestCompliance', () => {
  test('returns 100% for empty sessions under 20min', () => {
    expect(calculateRestCompliance([], 600)).toBe(100);
  });

  test('returns 100% when total duration < 1200s', () => {
    expect(calculateRestCompliance([], 1199)).toBe(100);
  });

  test('detects compliance via far session >= 20s within slot', () => {
    const sessions = [
      {
        startTime: new Date('2026-09-01T08:00:00Z'),
        endTime:   new Date('2026-09-01T08:15:00Z'),
        peakDistance: 'Dekat'
      },
      {
        startTime: new Date('2026-09-01T08:15:00Z'),
        endTime:   new Date('2026-09-01T08:15:25Z'),
        peakDistance: 'Jauh'
      }
    ];
    const compliance = calculateRestCompliance(sessions, 1500);
    expect(compliance).toBe(100);
  });
});
