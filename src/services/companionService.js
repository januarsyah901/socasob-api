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

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Fallback knowledge engine jika API Gemini tidak aktif/bermasalah
 */
const getFallbackKnowledgeResponse = ({ query, telemetry, patientName = 'Pengguna' }) => {
  const q = query.toLowerCase();

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

  if (q.includes('20-20-20') || q.includes('aturan 20') || q.includes('istirahat') || q.includes('jeda')) {
    return (
      `🌿 **Panduan Aturan 20-20-20 (Gold Standard Ergonomi Visual):**\n\n` +
      `Setiap **20 menit** Anda menatap layar monitor, alihkan pandangan ke suatu objek berjarak minimal **20 kaki (sekitar 6 meter)** selama minimal **20 detik**.\n\n` +
      `**Mengapa hal ini sangat krusial?**\n` +
      `1. **Relaksasi Otot Siliaris:** Menatap dekat terus-menerus membuat otot akomodasi mata tegang (spasme akomodasi).\n` +
      `2. **Penyebaran Lapisan Lipid:** Memberi jeda bagi kelenjar meibom untuk melumasi seluruh permukaan kornea.\n` +
      `3. **Tips Praktis:** Buka modul **Senam Mata** di SocaSob untuk dipandu video & timer 20 detik!`
    );
  }

  if (q.includes('jarak') || q.includes('dekat') || q.includes('cm') || q.includes('posisi') || q.includes('layar')) {
    return (
      `📏 **Standar Jarak Aman Layar & Posisi Duduk Ergonomis:**\n\n` +
      `1. **Jarak Ideal:** Minimal **30–50 cm** (kira-kira satu rentangan lengan orang dewasa).\n` +
      `2. **Tinggi Monitor:** Bagian atas layar berada sejajar atau sedikit di bawah horizontal mata (sudut pandang 10–15° ke bawah).\n` +
      `3. **Sistem Peringatan SocaSob:** Kamera sensor AI kami otomatis berbunyi dan memberi notifikasi saat jarak terdeteksi < 30 cm.`
    );
  }

  return (
    `Halo ${patientName}! Terima kasih telah berkonsultasi dengan **Teman Soca**.\n\n` +
    `Mengenai pertanyaan Anda: *" ${query} "*\n\n` +
    `Untuk memelihara kesehatan mata Anda saat menggunakan perangkat digital, ingatlah 3 prinsip utama:\n` +
    `1. **Jaga Jarak Layar:** Minimal **30–50 cm** dari posisi wajah Anda.\n` +
    `2. **Micro-Break Teratur:** Terapkan aturan **20-20-20** dan lakukan peregangan otot mata berkala.\n` +
    `3. **Pencahayaan Seimbang:** Sesuaikan kecerahan layar agar seimbang dengan cahaya sekitar ruangan.`
  );
};

/**
 * Mesin Respon AI Spesialis Ergonomi & Kesehatan Mata (Gemini 2.5/Flash + Knowledge Fallback)
 */
const generateExpertResponse = async ({ query, telemetry, patientName = 'Pengguna' }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getFallbackKnowledgeResponse({ query, telemetry, patientName });
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const telemetryData = telemetry ? 
    `Data telemetry pengguna hari ini: 
     - Tatap dekat (<30cm): ${Math.round((telemetry.nearDuration || 0) / 60)} menit
     - Tatap jarak aman (>=30cm): ${Math.round((telemetry.farDuration || 0) / 60)} menit
     - Kedipan: ${telemetry.blinkCount || 0} kali
     - Kepatuhan istirahat (20-20-20): ${telemetry.restCompliance ?? 100}%
     - Status kesehatan mata: ${telemetry.eyeHealthStatus}` 
    : "Tidak ada data telemetri hari ini.";

  const prompt = `Anda adalah 'Teman Soca', asisten AI ahli ergonomi visual dan kesehatan mata (Ophthalmology). 
Nama pengguna adalah ${patientName}. 
Jawab pertanyaan pengguna dengan ramah, berempati, dan berdasarkan ilmu medis yang valid.
Gunakan markdown untuk format teks.
Jika pertanyaan berkaitan dengan telemetri hari ini, kondisi mata, atau sejenisnya, berikan rangkuman dan saran spesifik berdasarkan data berikut:
${telemetryData}

Pertanyaan pengguna: "${query}"`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: modelName });
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini API Error (model: " + modelName + "):", e.message || e);
    // Coba fallback ke knowledge engine jika Gemini error
    return getFallbackKnowledgeResponse({ query, telemetry, patientName });
  }
};

/**
 * Kirim pesan dan dapatkan balasan AI cerdas
 */
const sendMessage = async ({ conversationId, userId = 'default_user', message, robotId, patientName = 'Pengguna' }) => {
  const cleanMsg = (message || '').trim();
  if (!cleanMsg) throw new Error('Pesan tidak boleh kosong');

  const today = getLocalDateString();
  let telemetry = null;

  if (robotId) {
    telemetry = await DailyLog.findOne({ robotId, date: today }).lean();
  }

  // Generate response
  const replyContent = await generateExpertResponse({
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
