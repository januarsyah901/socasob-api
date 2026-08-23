/**
 * SocaSob - Database Seed Script
 *
 * Mengisi database MongoDB dengan data dummy realistis yang mensimulasikan
 * output dari Python ML Pipeline (MediaPipe Face Mesh) selama 30 hari.
 *
 * Data mencakup:
 * - DailyLog: Log monitoring harian dengan sesi Dekat/Jauh, jumlah kedipan,
 *   status kesehatan mata, dan kepatuhan istirahat
 * - Settings: Konfigurasi default pengguna
 *
 * Cara pakai:
 *   node scripts/seed.js
 * Atau reset + seed ulang:
 *   node scripts/seed.js --reset
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DailyLog = require('../src/models/DailyLog');
const Settings = require('../src/models/Settings');
const Robot = require('../src/models/Robot');

const RESET = process.argv.includes('--reset');

const robotIdArg = process.argv.find(arg => arg.startsWith('--robotId='));
const ROBOT_ID = robotIdArg ? robotIdArg.split('=')[1] : 'fadfa566';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Menambah/mengurangi hari dari tanggal
 */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Format tanggal ke YYYY-MM-DD
 */
const formatDate = (date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

/**
 * Menghasilkan angka acak antara min dan max
 */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

/**
 * Menentukan status kesehatan mata berdasarkan rasio tatap dekat
 */
const getEyeHealthStatus = (nearDuration, farDuration) => {
  const total = nearDuration + farDuration;
  if (total === 0) return 'normal';
  const nearRatio = nearDuration / total;
  if (nearRatio > 0.6) return 'risk_myopia';
  if (total > 3600 && nearRatio > 0.4) return 'risk_fatigue';
  return 'normal';
};

/**
 * Menghasilkan array sesi monitoring realistis untuk satu hari kerja.
 * Simulasi output dari Python ML Pipeline: pergantian posisi Dekat/Jauh
 * setiap beberapa menit.
 */
const generateSessions = (dayStart, totalNearSec, totalFarSec) => {
  const sessions = [];
  let currentTime = new Date(dayStart);
  currentTime.setHours(8, rand(0, 30), 0, 0); // Mulai jam 08.xx pagi

  const totalSec = totalNearSec + totalFarSec;
  let remainingNear = totalNearSec;
  let remainingFar = totalFarSec;

  while (remainingNear + remainingFar > 30) {
    // Tentukan apakah sesi ini Dekat atau Jauh
    // Bobot sesuai proporsi sisa durasi
    const totalRemaining = remainingNear + remainingFar;
    const useNear = Math.random() < (remainingNear / totalRemaining);
    const distance = useNear ? 'Dekat' : 'Jauh';

    // Durasi sesi: 1-12 menit, proporsional terhadap sisa
    const maxDur = useNear ? remainingNear : remainingFar;
    const sessionDurSec = Math.min(rand(60, 720), maxDur);

    const startTime = new Date(currentTime);
    const endTime = new Date(currentTime.getTime() + sessionDurSec * 1000);

    sessions.push({ startTime, endTime, peakDistance: distance });

    if (useNear) remainingNear -= sessionDurSec;
    else remainingFar -= sessionDurSec;

    // Jeda kecil antara sesi (simulasi pergantian posisi)
    currentTime = new Date(endTime.getTime() + rand(5, 60) * 1000);
  }

  return sessions;
};

// ============================================================
// SEED DATA GENERATORS
// ============================================================

/**
 * Menghasilkan data DailyLog realistis untuk satu hari
 */
const generateDayLog = (dateObj, profile = 'normal', robotId = ROBOT_ID) => {
  const dateStr = formatDate(dateObj);

  // Profile pengguna menentukan pola pemakaian:
  // - 'normal': penggunaan seimbang
  // - 'heavy': banyak tatap dekat, risiko miopia
  // - 'light': penggunaan ringan, istirahat teratur
  let nearDuration, farDuration, blinkCount, restCompliance;

  switch (profile) {
    case 'heavy':
      nearDuration = rand(5400, 10800); // 1.5 - 3 jam dekat
      farDuration  = rand(1800, 5400);  // 0.5 - 1.5 jam jauh
      blinkCount   = rand(80, 180);     // Kurang berkedip (kelelahan)
      restCompliance = rand(20, 55);    // Jarang istirahat
      break;
    case 'light':
      nearDuration = rand(600, 2400);   // 10 - 40 menit dekat
      farDuration  = rand(5400, 10800); // 1.5 - 3 jam jauh
      blinkCount   = rand(300, 600);    // Blink rate sehat
      restCompliance = rand(80, 100);   // Patuh istirahat
      break;
    default: // normal
      nearDuration = rand(2400, 5400);  // 40 menit - 1.5 jam dekat
      farDuration  = rand(5400, 9000);  // 1.5 - 2.5 jam jauh
      blinkCount   = rand(180, 350);    // Blink rate cukup
      restCompliance = rand(55, 85);    // Kadang istirahat
  }

  const sessions = generateSessions(dateObj, nearDuration, farDuration);
  const eyeHealthStatus = getEyeHealthStatus(nearDuration, farDuration);

  return {
    robotId,
    date: dateStr,
    nearDuration,
    farDuration,
    blinkCount,
    sessions,
    eyeHealthStatus,
    restCompliance
  };
};

/**
 * Data dummy Settings (konfigurasi perangkat ESP32-CAM)
 */
const settingsSeedData = {
  userId: 'default_user',
  robotId: ROBOT_ID,
  robotIp: '192.168.1.105',
  audioVolume: 70,
  audioEnabled: true,
  notificationEnabled: true
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

const seed = async () => {
  try {
    console.log('🌱 SocaSob Seeder starting...');
    console.log(`🤖 Target Robot ID: ${ROBOT_ID}`);
    console.log(`📦 Connecting to MongoDB: ${process.env.MONGO_URI || 'mongodb://localhost:27017/socasob'}`);

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/socasob');
    console.log('✅ MongoDB Connected!\n');

    // --- RESET ---
    if (RESET) {
      console.log('🗑️  --reset flag detected. Clearing existing data...');
      await DailyLog.deleteMany({});
      await Settings.deleteMany({});
      await Robot.deleteMany({});
      console.log('✅ Cleared DailyLog, Settings, and Robot collections.\n');
    }

    // ============================================================
    // SEED: Robot
    // ============================================================
    console.log('🤖 Seeding Robot...');
    await Robot.findOneAndUpdate(
      { robotId: ROBOT_ID },
      {
        robotId: ROBOT_ID,
        name: 'SocaSob ESP32 Utama',
        status: 'active',
        ipAddress: '192.168.1.105',
        description: 'Robot monitoring default'
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Robot '${ROBOT_ID}' seeded.\n`);

    // ============================================================
    // SEED: Settings
    // ============================================================
    console.log('⚙️  Seeding Settings...');
    await Settings.findOneAndUpdate(
      { userId: 'default_user' },
      settingsSeedData,
      { upsert: true, new: true }
    );
    console.log('✅ Settings seeded.\n');

    // ============================================================
    // SEED: DailyLog - 30 hari terakhir
    // ============================================================
    console.log(`📅 Seeding DailyLog (30 hari ke belakang untuk robot '${ROBOT_ID}')...`);

    const today = new Date();
    const dailyLogs = [];

    // Pola pemakaian selama 30 hari (simulasi pengguna nyata):
    // - Hari kerja (Senin-Jumat): banyak penggunaan layar
    // - Akhir pekan: lebih santai
    // - Minggu pertama: heavy usage (sebelum pengguna sadar)
    // - Minggu ke-3/4: lebih normal (mulai sadar pola pemakaian)
    // - Minggu ke-1 (terakhir / paling baru): lebih sehat

    for (let i = 29; i >= 0; i--) {
      const dateObj = addDays(today, -i);
      const dayOfWeek = dateObj.getDay(); // 0=Minggu, 6=Sabtu
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let profile;
      if (i >= 22) {
        // Minggu ke-4 (terlama): banyak tatap dekat
        profile = isWeekend ? 'normal' : 'heavy';
      } else if (i >= 15) {
        // Minggu ke-3: mulai parah
        profile = isWeekend ? 'light' : 'heavy';
      } else if (i >= 7) {
        // Minggu ke-2: sedang membaik
        profile = isWeekend ? 'light' : 'normal';
      } else {
        // Minggu ke-1 (terakhir / paling baru): lebih sehat
        profile = isWeekend ? 'light' : 'normal';
      }

      const logData = generateDayLog(dateObj, profile, ROBOT_ID);
      dailyLogs.push(logData);
    }

    // Bulk insert semua log (skip jika tanggal & robotId sudah ada)
    let inserted = 0;
    let skipped = 0;
    for (const logData of dailyLogs) {
      const exists = await DailyLog.findOne({ robotId: logData.robotId, date: logData.date });
      if (!exists) {
        await DailyLog.create(logData);
        inserted++;
        console.log(`   ✅ ${logData.date} | ${logData.eyeHealthStatus.padEnd(12)} | Dekat: ${Math.round(logData.nearDuration/60)}m | Jauh: ${Math.round(logData.farDuration/60)}m | Blink: ${logData.blinkCount} | Rest: ${logData.restCompliance}%`);
      } else {
        skipped++;
        console.log(`   ⏭️  ${logData.date} — sudah ada, dilewati.`);
      }
    }

    console.log(`\n📊 DailyLog Summary:`);
    console.log(`   Inserted : ${inserted}`);
    console.log(`   Skipped  : ${skipped}`);
    console.log(`   Total    : ${inserted + skipped}`);

    // ============================================================
    // RINGKASAN
    // ============================================================
    const totalLogs = await DailyLog.countDocuments();
    const totalSettings = await Settings.countDocuments();

    console.log('\n====================================================');
    console.log('🎉 Seed selesai!');
    console.log(`   📄 DailyLog di DB : ${totalLogs} dokumen`);
    console.log(`   ⚙️  Settings di DB  : ${totalSettings} dokumen`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Seed gagal:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.');
    process.exit(0);
  }
};

seed();
