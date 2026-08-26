const {
  calculateEyeStatus,
  calculateRiskLevels,
  calculateRestCompliance
} = require('../src/services/eyeHealthEngine');

describe('Eye Health Engine Tests', () => {
  
  test('calculateEyeStatus should return normal when balance is good', () => {
    const status = calculateEyeStatus(10, 90); // 10% near
    expect(status).toBe('normal');
  });

  test('calculateEyeStatus should return risk_myopia when nearDuration > 60%', () => {
    const status = calculateEyeStatus(70, 30); // 70% near
    expect(status).toBe('risk_myopia');
  });

  test('calculateEyeStatus should return risk_fatigue when total > 1hr and near > 40%', () => {
    const status = calculateEyeStatus(2000, 2000); // total 4000s (>3600), 50% near (>40%)
    expect(status).toBe('risk_fatigue');
  });

  
  test('calculateRiskLevels should return correct risk categories', () => {
    const risks = calculateRiskLevels(70, 30); // 70% near
    expect(risks.myopiaRisk).toBe('Tinggi');
  });

  test('calculateRestCompliance should return 100% for short duration', () => {
    const compliance = calculateRestCompliance([], 500); // 500s (<1200s)
    expect(compliance).toBe(100);
  });
});
