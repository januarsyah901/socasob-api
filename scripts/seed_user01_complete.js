/**
 * SocaSob - Seeder Lengkap Khusus user01@example.com
 *
 * Mengisi database dengan:
 * 1. Akun User 01 lengkap (profil, no telp, kontak darurat, tanggal lahir)
 * 2. Pairing 2 Robot (ROBOT-01 utama & fadfa566 hardware backup)
 * 3. Konfigurasi Settings user01
 * 4. 90 hari DailyLogs detail (lengkap dengan metrik baru + legacy + sessions)
 * 5. Medical Reports lengkap (Hari ini, 7 Hari, 30 Hari, 6 Bulan)
 * 6. Riwayat konsultasi Teman Soca AI Companion
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../src/models/User');
const Robot = require('../src/models/Robot');
const Settings = require('../src/models/Settings');
const DailyLog = require('../src/models/DailyLog');
const Report = require('../src/models/Report');
const Conversation = require('../src/models/Conversation');
const { generateReport } = require('../src/services/reportService');

const USER_EMAIL = 'user01@example.com';
const USER_ID_HEX = '6aa0039cea5efb1927881f96';
const ROBOT_PRIMARY = 'ROBOT-01';
const ROBOT_BACKUP = 'fadfa566';

// Helper acak
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const formatDate = (date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

const generateSessions = (dateObj, nearDurSec, farDurSec) => {
  const sessions = [];
  let currentTime = new Date(dateObj);
  currentTime.setHours(8, rand(10, 40), 0, 0);

  let remNear = nearDurSec;
  let remFar = farDurSec;

  while (remNear + remFar > 60) {
    const isNear = Math.random() < (remNear / (remNear + remFar || 1));
    const distance = isNear ? 'Dekat' : 'Jauh';
    const durSec = Math.min(rand(120, 600), isNear ? remNear : remFar);

    const startTime = new Date(currentTime);
    const endTime = new Date(currentTime.getTime() + durSec * 1000);
    sessions.push({ startTime, endTime, peakDistance: distance });

    if (isNear) remNear -= durSec;
    else remFar -= durSec;

    currentTime = new Date(endTime.getTime() + rand(15, 120) * 1000);
  }

  return sessions;
};

const generateLogForDate = (dateObj, dayIndex, robotId) => {
  const dateStr = formatDate(dateObj);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Pola 3 tahap (90 hari):
  // 60-90 hari lalu: Heavy (banyak tatap dekat, kelelahan)
  // 30-59 hari lalu: Transisi (mulai sadar dan istirahat)
  // 0-29 hari lalu: Sehat & Patuh (aturan 20-20-20 terjaga)
  let profile = 'normal';
  if (dayIndex >= 60) {
    profile = isWeekend ? 'normal' : 'heavy';
  } else if (dayIndex >= 30) {
    profile = isWeekend ? 'light' : 'normal';
  } else {
    profile = isWeekend ? 'light' : 'healthy';
  }

  let nearSec, farSec, blinkCount, restCompliance;
  let dominantDist, longestGaze, incompleteRatio, blinkRate;
  let distBelow50Sec = false;
  let distBelow20Sec = false;

  switch (profile) {
    case 'heavy':
      nearSec = rand(6000, 11000); // 1.6 - 3 jam dekat
      farSec = rand(1500, 4500);
      blinkRate = rand(10, 14);
      incompleteRatio = rand(25, 45);
      dominantDist = rand(36, 44);
      longestGaze = rand(35, 65);
      restCompliance = rand(25, 50);
      distBelow50Sec = true;
      distBelow20Sec = Math.random() < 0.4;
      break;

    case 'light':
      nearSec = rand(900, 2400); // 15 - 40 menit dekat
      farSec = rand(3600, 8000);
      blinkRate = rand(18, 26);
      incompleteRatio = rand(5, 15);
      dominantDist = rand(55, 68);
      longestGaze = rand(10, 20);
      restCompliance = rand(85, 100);
      distBelow50Sec = false;
      distBelow20Sec = false;
      break;

    case 'healthy':
      nearSec = rand(2400, 4500); // 40 - 75 menit dekat
      farSec = rand(5400, 9500);
      blinkRate = rand(17, 24);
      incompleteRatio = rand(8, 18);
      dominantDist = rand(52, 62);
      longestGaze = rand(15, 25);
      restCompliance = rand(80, 98);
      distBelow50Sec = Math.random() < 0.2;
      distBelow20Sec = false;
      break;

    default: // normal
      nearSec = rand(3000, 6000);
      farSec = rand(4500, 8000);
      blinkRate = rand(14, 19);
      incompleteRatio = rand(15, 25);
      dominantDist = rand(46, 54);
      longestGaze = rand(22, 35);
      restCompliance = rand(60, 80);
      distBelow50Sec = Math.random() < 0.5;
      distBelow20Sec = false;
  }

  const totalMin = Math.round((nearSec + farSec) / 60);
  blinkCount = Math.round((blinkRate || 16) * totalMin);

  let eyeHealthStatus = 'normal';
  const nearRatio = nearSec / (nearSec + farSec || 1);
  if (nearRatio > 0.6 || dominantDist < 42) {
    eyeHealthStatus = 'risk_myopia';
  } else if (nearSec + farSec > 10000 || restCompliance < 50) {
    eyeHealthStatus = 'risk_fatigue';
  }

  const sessions = generateSessions(dateObj, nearSec, farSec);

  return {
    robotId,
    date: dateStr,
    screenTimeMinutes: totalMin,
    longestContinuousGazeMinutes: longestGaze,
    blinkRatePerMinute: blinkRate,
    incompleteBlinkRatio: incompleteRatio,
    dominantDistanceCm: dominantDist,
    distanceBelow50CmForAtLeast10Seconds: distBelow50Sec,
    distanceBelow20CmDetected: distBelow20Sec,
    nearDuration: nearSec,
    farDuration: farSec,
    blinkCount,
    sessions,
    eyeHealthStatus,
    restCompliance
  };
};

async function seedUser01() {
  try {
    console.log('🚀 Memulai seeding lengkap untuk user01@example.com...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/socasob');
    console.log('✅ Terkoneksi ke MongoDB');

    // 1. SEED / UPDATE USER 01
    console.log('👤 Memproses data User 01...');
    let user = await User.findOne({ email: USER_EMAIL });

    if (!user) {
      user = new User({
        _id: new mongoose.Types.ObjectId(USER_ID_HEX),
        fullName: 'User 01 (Budi Santoso)',
        email: USER_EMAIL,
        password: 'password',
        phoneNumber: '081234567890',
        dateOfBirth: new Date('2001-08-17'),
        emergencyContact: {
          name: 'Siti Rahma (Keluarga)',
          phone: '081298765432'
        },
        role: 'user'
      });
      await user.save();
      console.log('   ✅ Akun User 01 berhasil dibuat baru.');
    } else {
      user.fullName = 'User 01 (Budi Santoso)';
      user.phoneNumber = '081234567890';
      user.dateOfBirth = new Date('2001-08-17');
      user.emergencyContact = {
        name: 'Siti Rahma (Keluarga)',
        phone: '081298765432'
      };
      user.password = 'password';
      await user.save();
      console.log('   ✅ Akun User 01 berhasil diperbarui lengkap.');
    }

    const userId = user._id;

    // 2. SEED ROBOTS & PAIRING
    console.log('🤖 Mendaftarkan & melakukan pairing Robot...');
    
    // Robot 1: ROBOT-01 (Utama)
    await Robot.findOneAndUpdate(
      { robotId: ROBOT_PRIMARY },
      {
        robotId: ROBOT_PRIMARY,
        serialNumber: 'SOCA-U01',
        name: 'SocaSob ESP32 Utama (Meja Belajar)',
        status: 'active',
        ownerId: userId,
        ipAddress: '192.168.1.101',
        description: 'Robot utama untuk pemantauan fokus belajar harian',
        lastSeenAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`   ✅ Paired ${ROBOT_PRIMARY} (SOCA-U01) -> User 01`);

    // Robot 2: fadfa566 (Cadangan / Hardware ESP32-CAM)
    await Robot.findOneAndUpdate(
      { robotId: ROBOT_BACKUP },
      {
        robotId: ROBOT_BACKUP,
        serialNumber: 'SOCA-TEST',
        name: 'SocaSob Hardware ESP32 Cadangan',
        status: 'active',
        ownerId: userId,
        ipAddress: '192.168.1.105',
        description: 'Perangkat keras ESP32-CAM fisik portabel',
        lastSeenAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`   ✅ Paired ${ROBOT_BACKUP} (SOCA-TEST) -> User 01`);

    // 3. SETTINGS
    console.log('⚙️  Mengonfigurasi Settings...');
    await Settings.findOneAndUpdate(
      { userId },
      {
        userId,
        robotId: ROBOT_PRIMARY,
        robotIp: '192.168.1.101',
        audioVolume: 80,
        audioEnabled: true,
        notificationEnabled: true
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('   ✅ Settings User 01 tersimpan.');

    // 4. SEED 90 HARI DAILY LOGS (Untuk ROBOT-01 & fadfa566)
    console.log('📅 Mengisi DailyLog 90 hari ke belakang...');
    const robotsToSeed = [ROBOT_PRIMARY, ROBOT_BACKUP];
    const today = new Date();

    for (const rId of robotsToSeed) {
      console.log(`   📊 Seeding log untuk perangkat '${rId}'...`);
      let count = 0;
      for (let i = 89; i >= 0; i--) {
        const dateObj = addDays(today, -i);
        const logData = generateLogForDate(dateObj, i, rId);

        await DailyLog.findOneAndUpdate(
          { robotId: rId, date: logData.date },
          logData,
          { upsert: true, returnDocument: 'after' }
        );
        count++;
      }
      console.log(`   ✅ Berhasil menyimpan ${count} hari log untuk '${rId}'.`);
    }

    // 5. SEED MEDICAL REPORTS
    console.log('📑 Menghasilkan Dokumen Medical Reports...');
    for (const rId of robotsToSeed) {
      // Hapus report lama robot ini agar fresh
      await Report.deleteMany({ robotId: rId });

      const periods = ['today', '7days', '30days', '6months'];
      for (const p of periods) {
        await generateReport({
          robotId: rId,
          patientName: 'Budi Santoso (User 01)',
          period: p
        });
      }
      console.log(`   ✅ 4 Medical Reports (today, 7days, 30days, 6months) dibuat untuk '${rId}'.`);
    }

    // 6. SEED CONVERSATION (TEMAN SOCA AI COMPANION)
    console.log('💬 Mengisi riwayat obrolan Teman Soca AI Companion...');
    await Conversation.deleteMany({ userId });

    const conversations = [
      {
        conversationId: `conv-${crypto.randomBytes(6).toString('hex')}`,
        userId,
        title: 'Konsultasi Mata Lelah Saat Coding',
        createdAt: addDays(today, -3),
        messages: [
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'user',
            content: 'Halo SocaSob, akhir-akhir ini mataku sering terasa perih dan tegang kalau sore hari setelah kerja depan laptop.',
            createdAt: addDays(today, -3)
          },
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'assistant',
            content: 'Halo Budi! Gejala perih dan tegang merupakan indikasi umum Digital Eye Strain atau kelelahan mata akibat menatap layar terlalu lama tanpa jeda.\n\nBeberapa langkah cepat yang bisa kamu terapkan sekarang:\n1. Terapkan aturan 20-20-20: Tiap 20 menit, alihkan pandangan sejauh minimal 6 meter (20 kaki) selama 20 detik.\n2. Perhatikan frekuensi kedipan. Saat fokus di layar, kedipan kita berkurang hingga 50% yang memicu mata kering.\n3. Atur kecerahan layar agar seimbang dengan pencahayaan ruangan sekitar.',
            createdAt: addDays(today, -3)
          },
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'user',
            content: 'Oke siap, apakah robot SocaSob akan otomatis membunyikan alarm kalau aku kelamaan menatap dekat?',
            createdAt: addDays(today, -3)
          },
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'assistant',
            content: 'Tepat sekali! Robot SocaSob akan memantau jarak wajahmu. Jika kamu menatap lebih dekat dari 50 cm selama lebih dari 10 detik atau belum istirahat selama 20 menit berturut-turut, robot akan membunyikan audio peringatan dan menampilkan ikon relaksasi di layar LCD.',
            createdAt: addDays(today, -3)
          }
        ]
      },
      {
        conversationId: `conv-${crypto.randomBytes(6).toString('hex')}`,
        userId,
        title: 'Panduan Jarak Monitor Ideal',
        createdAt: addDays(today, -1),
        messages: [
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'user',
            content: 'Berapa jarak ideal antara mata dan monitor 24 inci?',
            createdAt: addDays(today, -1)
          },
          {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            role: 'assistant',
            content: 'Untuk monitor ukuran 24 inci, jarak ideal yang disarankan adalah 50 hingga 70 cm (kira-kira sepanjang rentangan satu lengan tangan orang dewasa).\n\nPastikan juga posisi tepi atas monitor sejajar atau sedikit di bawah garis horizontal mata agar leher dan otot mata tidak tegang saat membaca.',
            createdAt: addDays(today, -1)
          }
        ]
      }
    ];

    for (const c of conversations) {
      await Conversation.create(c);
    }
    console.log('   ✅ 2 Riwayat percakapan AI Companion berhasil ditambahkan.');

    console.log('\n=============================================================');
    console.log('🎉 SEEDING USER 01 SUKSES PENUH!');
    console.log(`👤 Email Login  : ${USER_EMAIL}`);
    console.log('🔑 Password     : password');
    console.log(`🤖 Robot Utama  : ${ROBOT_PRIMARY} (Serial: SOCA-U01)`);
    console.log(`🤖 Robot Backup : ${ROBOT_BACKUP} (Serial: SOCA-TEST)`);
    console.log('📊 Histori Log  : 90 hari data telemetri realistis');
    console.log('📑 Laporan Medis: 4 periode (Today, 7 Days, 30 Days, 6 Months)');
    console.log('💬 Teman Soca   : 2 sesi konsultasi kesehatan mata');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('❌ Gagal menjalankan seeder:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Koneksi MongoDB ditutup.');
    process.exit(0);
  }
}

seedUser01();
