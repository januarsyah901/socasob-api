const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ConversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: [true, 'conversationId wajib diisi'],
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: 'default_user',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Judul percakapan wajib diisi'],
    trim: true,
    default: 'Konsultasi Kesehatan Mata'
  },
  messages: [MessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', ConversationSchema);
