const {
  calculateRiskLevels,
  calculateEyeStatus
} = require('../src/services/eyeHealthEngine');

describe('Report Generation & Telemetry Calculation Tests', () => {
  test('should calculate correct metrics for 7-day period', () => {
    const totalNearSec = 3600; // 60 mins
    const totalFarSec = 14400; // 240 mins
    const totalBlinks = 3500;
    const restCompliance = 85;
    const risks = calculateRiskLevels(totalNearSec, totalFarSec);
    expect(risks.myopiaRisk).toBe('Rendah');
    expect(risks.fatigueRisk).toBe('Rendah');
  });

  test('should flag high myopia risk when near duration dominates', () => {
    const totalNearSec = 18000; // 300 mins
    const totalFarSec = 3600;   // 60 mins

    const risks = calculateRiskLevels(totalNearSec, totalFarSec);
    expect(risks.myopiaRisk).toBe('Tinggi');
  });
});
