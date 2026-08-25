const Conversation = require('../models/Conversation');
const DailyLog = require('../models/DailyLog');

/**
 * Format tanggal hari ini lokal YYYY-MM-DD
 */
const getLocalDateString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

/**
 * Mesin Respon AI Spesialis Ergonomi & Kesehatan Mata (Clinical Ophthalmology Knowledge Engine)
 */
const generateExpertResponse = ({ query, telemetry, patientName = 'Bang Jan' }) => {
  const q = query.toLowerCase();

  // 1. Cek jika user menanyakan kondisi monitoring hari ini
  if (
    q.includes('hari ini') ||
    q.includes('kondisi saya') ||
    q.includes('mataku') ||
    q.includes('data saya') ||
    q.includes('skor') ||
    q.includes('pantau')
  ) {
    if (telemetry) {
      const nearMin = Math.round((telemetry.nearDuration || 0) / 60);
      const farMin = Math.round((telemetry.farDuration || 0) / 60);
      const compliance = telemetry.restCompliance ?? 100;
      const blinks = telemetry.blinkCount || 0;
      const statusText =
        telemetry.eyeHealthStatus === 'risk_myopia'
          ? '⚠️ Terlalu Banyak Tatap Dekat (< 30cm)'
          : telemetry.eyeHealthStatus === 'risk_fatigue'
          ? '⚠️ Kelelahan Mata Layar Terdeteksi'
          : '✅ Normal & Sehat';

      return (
        `Halo ${patientName}! Berikut ringkasan telemetri pemantauan mata Anda hari ini:\n\n` +
        `📊 **Data Monitoring Real-Time Hari Ini:**\n` +
        `• **Tatap Dekat (<30cm):** ${nearMin} menit\n` +
        `• **Tatap Jarak Aman (≥30cm):** ${farMin} menit\n` +
        `• **Total Kedipan Terdeteksi:** ${blinks} kali\n` +
        `• **Kepatuhan Aturan 20-20-20:** ${compliance}%\n` +
        `• **Status Saat Ini:** ${statusText}\n\n` +
        `💡 **Rekomendasi Medis:**\n` +
        (compliance < 70
          ? `Kepatuhan istirahat Anda (${compliance}%) masih di bawah target 70%. Yuk lakukan **Senam Mata** di dashboard sekarang selama 20 detik untuk merelaksasi otot siliaris netra!`
          : `Kerja bagus! Kepatuhan istirahat Anda mencapai ${compliance}%. Pertahankan posisi jarak monitor minimal 30–50 cm.`)
      );
    }
  }

  // 2. Pertanyaan seputar Aturan 20-20-20
  if (q.includes('20-20-20') || q.includes('aturan 20') || q.includes('istirahat') || q.includes('jeda')) {
    return (
      `🌿 **Panduan Aturan 20-20-20 (Gold Standard Ergonomi Visual):**\n\n` +
      `Setiap **20 menit** Anda menatap layar monitor, alihkan pandangan ke suatu objek berjarak minimal **20 kaki (sekitar 6 meter)** selama minimal **20 detik**.\n\n` +
      `**Mengapa hal ini sangat krusial?**\n` +
      `1. **Relaksasi Otot Siliaris:** Menatap dekat terus-menerus membuat otot akomodasi mata tegang (spasme akomodasi), pemicu utama minus/miopia bertambah.\n` +
      `2. **Penyebaran Lapisan Lipid:** Memberi jeda bagi kelenjar meibom untuk melumasi seluruh permukaan kornea.\n` +
      `3. **Tips Praktis:** Buka modul **Senam Mata** di SocaSob untuk dipandu video & timer 20 detik secara interaktif!`
    );
  }

  // 3. Jarak Aman & Posisi Monitor
  if (q.includes('jarak') || q.includes('dekat') || q.includes('cm') || q.includes('posisi') || q.includes('layar')) {
    return (
      `📏 **Standar Jarak Aman Layar & Posisi Duduk Ergonomis:**\n\n` +
      `1. **Jarak Ideal:** Minimal **30–50 cm** (kira-kira sepanjang satu rentangan lengan orang dewasa).\n` +
      `2. **Tinggi Monitor:** Bagian atas layar berada sejajar atau sedikit di bawah horizontal mata (sudut pandang 10–15° ke bawah). Ini mengurangi luas permukaan mata yang terpapar udara sehingga mencegah mata kering.\n` +
      `3. **Sistem Peringatan SocaSob:** Kamera sensor AI kami akan otomatis berbunyi dan memberi notifikasi saat jarak Anda terdeteksi < 30 cm.`
    );
  }

  // 4. Frekuensi Kedip & Mata Kering
  if (q.includes('kedip') || q.includes('blink') || q.includes('kering') || q.includes('perih') || q.includes('merah')) {
    return (
      `💧 **Frekuensi Berkedip & Pencegahan Sindrom Mata Kering:**\n\n` +
      `Dalam kondisi santai, manusia berkedip **15–20 kali per menit**. Namun saat fokus bekerja di depan layar, frekuensi kedipan turun drastis hingga **5–7 kali per menit** (>60% penurunan)!\n\n` +
      `**Dampaknya:**\n` +
      `• Lapisan film air mata (*tear film*) cepat menguap, memicu rasa perih, sensasi berpasir, dan mata merah.\n` +
      `• **Solusi:** Lakukan latihan *conscious blinking* (berkedip penuh dan rapat setiap kali berpindah tugas/membuka tab baru), atau gunakan tetes mata penyegar (*artificial tears* tanpa pengawet).`
    );
  }

  // 5. CVS & Kelelahan Mata
  if (q.includes('cvs') || q.includes('lelah') || q.includes('pusing') || q.includes('fatigue') || q.includes('buram')) {
    return (
      `👁️ **Computer Vision Syndrome (CVS) & Solusi Cepatnya:**\n\n` +
      `CVS adalah sekumpulan gejala kelelahan okular akibat paparan layar berlebih. Gejala umumnya:\n` +
      `• Penglihatan kabur (*blurred vision*) sementara saat berpindah fokus.\n` +
      `• Sakit kepala di area dahi atau belakang bola mata.\n` +
      `• Leher kaku dan bahu tegang.\n\n` +
      `**Langkah Penanganan Mandiri:**\n` +
      `1. Lakukan teknik **Palming** (gosok kedua telapak tangan hingga hangat lalu tempelkan lembut di atas mata terpejam selama 30 detik).\n` +
      `2. Periksa skor *Eye Health Score* Anda di menu **Resume** untuk melihat akumulasi beban mata.\n` +
      `3. Atur pencahayaan ruangan agar kontras layar tidak terlalu menyilaukan.`
    );
  }

  // 6. Miopia / Rabun Jauh
  if (q.includes('miopia') || q.includes('rabun') || q.includes('minus') || q.includes('anak') || q.includes('kacamata')) {
    return (
      `🔍 **Pencegahan Progresi Miopia (Rabun Jauh):**\n\n` +
      `Miopia dipicu oleh pemanjangan aksial sumbu bola mata (*axial elongation*) akibat aktivitas tatap dekat (*near-work*) intensif tanpa jeda.\n\n` +
      `**Rekomendasi Klinis:**\n` +
      `• Batasi sesi tatap dekat terus-menerus maksimal 45 menit sebelum mengambil jeda 5 menit.\n` +
      `• Luangkan waktu beraktivitas di bawah cahaya alami luar ruangan (*outdoor daylight*) minimal 1–2 jam per hari.\n` +
      `• Manfaatkan fitur **Ekspor Laporan Medis (PDF)** di SocaSob untuk membawa rekaman telemetri saat konsultasi dengan dokter spesialis mata (Sp.M).`
    );
  }

  // 7. Pencahayaan & Ergonomi Ruangan
  if (q.includes('cahaya') || q.includes('lampu') || q.includes('gelap') || q.includes('silau') || q.includes('ruangan')) {
    return (
      `💡 **Ergonomi Pencahayaan Ruang Kerja:**\n\n` +
      `• **Hindari Bekerja di Ruang Gelap Gulita:** Kontras tajam antara layar yang menyala terang dan ruangan gelap memaksa pupil mata terus berkontraksi, mempercepat kelelahan visual.\n` +
      `• **Cegah Silau (Glare):** Posisikan layar tegak lurus terhadap jendela (jangan membelakangi atau menghadap langsung ke arah sumber cahaya tanpa gorden/tirai).\n` +
      `• **Gunakan Pencahayaan Ambient:** Lampu dengan temperatur warna netral (*warm white* / 4000K) sangat nyaman untuk menjaga stabilitas penglihatan.`
    );
  }

  // Jawaban Default yang Ramah & Personal
  return (
    `Halo ${patientName}! Terima kasih telah berkonsultasi dengan **Teman Soca**.\n\n` +
    `Mengenai pertanyaan Anda: *" ${query} "*\n\n` +
    `Untuk memelihara kesehatan mata Anda saat menggunakan perangkat digital, ingatlah 3 prinsip utama:\n` +
    `1. **Jaga Jarak Layar:** Minimal **30–50 cm** dari posisi wajah Anda.\n` +
    `2. **Micro-Break Teratur:** Terapkan aturan **20-20-20** dan lakukan peregangan otot mata berkala.\n` +
    `3. **Pencahayaan Seimbang:** Sesuaikan kecerahan layar agar seimbang dengan cahaya sekitar ruangan.\n\n` +
    `Anda bisa memantau telemetri real-time di Dashboard, atau membuka menu **Senam Mata** untuk panduan relaksasi interaktif!`
  );
};

/**
 * Kirim pesan dan dapatkan balasan AI cerdas
 */
const sendMessage = async ({ conversationId, userId = 'default_user', message, robotId, patientName = 'Bang Jan' }) => {
  const cleanMsg = (message || '').trim();
  if (!cleanMsg) throw new Error('Pesan tidak boleh kosong');

  const today = getLocalDateString();
  let telemetry = null;

  if (robotId) {
    telemetry = await DailyLog.findOne({ robotId, date: today }).lean();
  }

  // Generate response
  const replyContent = generateExpertResponse({
    query: cleanMsg,
    telemetry,
    patientName
  });

  const userMsg = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: cleanMsg,
    createdAt: new Date()
  };

  const assistantMsg = {
    id: `msg-${Date.now() + 1}`,
    role: 'assistant',
    content: replyContent,
    createdAt: new Date()
  };

  let conv = null;
  const targetId = conversationId || `conv-${Date.now()}`;

  conv = await Conversation.findOne({ conversationId: targetId });

  if (conv) {
    conv.messages.push(userMsg, assistantMsg);
    await conv.save();
  } else {
    const title = cleanMsg.length > 35 ? cleanMsg.slice(0, 35) + '…' : cleanMsg;
    conv = new Conversation({
      conversationId: targetId,
      userId,
      title,
      messages: [userMsg, assistantMsg]
    });
    await conv.save();
  }

  return {
    conversationId: conv.conversationId,
    title: conv.title,
    reply: replyContent,
    messages: conv.messages,
    source: 'clinical_ai_engine'
  };
};

/**
 * Ambil daftar semua percakapan
 */
const getConversations = async (userId = 'default_user') => {
  return await Conversation.find({ userId }).sort({ updatedAt: -1 }).lean();
};

/**
 * Ambil percakapan berdasarkan ID
 */
const getConversationById = async (conversationId) => {
  return await Conversation.findOne({ conversationId }).lean();
};

/**
 * Hapus percakapan berdasarkan ID
 */
const deleteConversation = async (conversationId) => {
  return await Conversation.findOneAndDelete({ conversationId });
};

module.exports = {
  generateExpertResponse,
  sendMessage,
  getConversations,
  getConversationById,
  deleteConversation
};
