const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5005';
console.log(`Connecting to SocaSob Backend at ${SERVER_URL}...`);

const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log('\n=============================================');
  console.log(`CONNECTED to server with Socket ID: ${socket.id}`);
  console.log('Starting simulation of Python ML Pipeline...');
  console.log('=============================================\n');

  // Mulai simulasi event dari Python
  startSimulation();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});

// Dengarkan event yang dipancarkan server untuk verifikasi
socket.on('timer-update', (data) => {
  console.log(`[Timer Broadcast] Total Monitor Time: ${data.hours}h ${data.minutes}m ${data.seconds}s`);
});

socket.on('eye-distance', (data) => {
  console.log(`[Distance Broadcast] Jarak: ${data.distance} | Confidence: ${data.confidence}%`);
});

socket.on('eye-status', (data) => {
  console.log(`\n---------------------------------------------`);
  console.log(`[Eye Status Broadcast]`);
  console.log(`  - Status: ${data.status.toUpperCase()}`);
  console.log(`  - Score: ${data.score}/100`);
  console.log(`  - Fatigue Risk: ${data.indicators.eyeFatigue}%`);
  console.log(`  - Myopia Risk: ${data.indicators.myopiaRisk}%`);
  console.log(`  - Blink Rate: ${data.indicators.blinkRate} bpm`);
  console.log(`---------------------------------------------\n`);
});

function startSimulation() {
  let tickCount = 0;

  // 1. Emit py-eye-detection setiap 1 detik
  const detectionInterval = setInterval(() => {
    tickCount++;
    
    // Simulasikan pengguna berada "Dekat" (<30cm) setiap kelipatan 4-6 detik
    // Sisanya "Jauh" (aman)
    const distance = (tickCount % 5 === 0 || tickCount % 6 === 0) ? 'Dekat' : 'Jauh';
    const confidence = Math.round(90 + Math.random() * 9); // 90% - 99%

    console.log(`[Simulate Python] Sending eye detection: ${distance} (${confidence}%)`);
    socket.emit('py-eye-detection', { distance, confidence });

    // Hentikan simulasi setelah 30 detik agar tidak berjalan selamanya
    if (tickCount >= 30) {
      clearInterval(detectionInterval);
      clearInterval(blinkInterval);
      console.log('\nSimulation completed. Closing socket...');
      socket.disconnect();
      process.exit(0);
    }
  }, 1000);

  // 2. Simulasikan kedipan mata setiap 4 detik
  const blinkInterval = setInterval(() => {
    console.log('[Simulate Python] Sending blink event');
    socket.emit('py-blink-detected');
  }, 4000);
}
