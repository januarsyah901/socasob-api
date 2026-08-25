const {
  generateExpertResponse
} = require('../src/services/companionService');

describe('Companion AI Service Tests', () => {
  test('should generate thoughtful clinical response for 20-20-20 rule query', () => {
    const reply = generateExpertResponse({
      query: 'Bagaimana cara melakukan aturan 20-20-20?',
      patientName: 'Bang Jan'
    });

    expect(reply).toBeDefined();
    expect(reply).toContain('20-20-20');
    expect(reply.toLowerCase()).toContain('otot siliaris');
  });

  test('should incorporate telemetry data when asked about today monitoring', () => {
    const reply = generateExpertResponse({
      query: 'Bagaimana kondisi mataku hari ini?',
      patientName: 'Bang Jan',
      telemetry: {
        nearDuration: 1800,
        farDuration: 3600,
        restCompliance: 85,
        blinkCount: 420,
        eyeHealthStatus: 'normal'
      }
    });

    expect(reply).toBeDefined();
    expect(reply).toContain('Bang Jan');
    expect(reply).toContain('Tatap Dekat');
    expect(reply).toContain('85%');
  });
});
