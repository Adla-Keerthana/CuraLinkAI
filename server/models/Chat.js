const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant'], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      results: { type: Object } // Store raw search results if needed for context
    }
  ],
  context: {
    disease: String,
    intent: String,
    metadata: Object
  }
}, { timestamps: true });

module.exports = mongoose.model('Chat', ChatSchema);
