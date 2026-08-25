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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Mesin Respon AI Spesialis Ergonomi & Kesehatan Mata (Clinical Ophthalmology Knowledge Engine)
 */
const generateExpertResponse = async ({ query, telemetry, patientName = 'Bang Jan' }) => {
  if (!process.env.GEMINI_API_KEY) {
    return `Halo ${patientName}! Maaf, GEMINI_API_KEY belum dikonfigurasi di backend. Fitur chatbot pintar sedang tidak aktif.`;
  }

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
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini API Error:", e);
    return `Maaf ${patientName}, saat ini AI Teman Soca sedang mengalami gangguan sistem saat menghubungi server Gemini.`;
  }
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
