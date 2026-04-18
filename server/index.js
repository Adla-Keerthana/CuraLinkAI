const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const researchService = require('./services/researchService');
const aiService = require('./services/aiService');
const Chat = require('./models/Chat');

// Middleware
app.use(cors());
app.use(express.json());

/**
 * List All Chat Sessions
 */
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Chat.find({}, { sessionId: 1, 'messages.text': 1, updatedAt: 1 })
      .sort({ updatedAt: -1 });
    
    // Process summaries for the sidebar
    const summary = sessions.map(s => ({
      sessionId: s.sessionId,
      lastUpdate: s.updatedAt,
      preview: s.messages[0]?.text?.substring(0, 30) + '...' || 'New Research'
    }));
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * Fetch Chat History
 */
app.get('/api/chat/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    res.json(chat || { messages: [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/**
 * Main Research Endpoint (With Context Persistence)
 */
app.post('/api/research', async (req, res) => {
  const { query, context, sessionId } = req.body;
  const sid = sessionId || 'default-session';

  try {
    // 1. Get History from DB
    let chat = await Chat.findOne({ sessionId: sid });
    if (!chat) chat = new Chat({ sessionId: sid, messages: [], context });
    
    // 2. Expand Query (Using History)
    const structuredQuery = await aiService.expandQuery(query, context, chat.messages);
    console.log(`Structured Search Criteria:`, JSON.stringify(structuredQuery));

    // 3. Fetch Data
    const researchData = await researchService.searchAll(structuredQuery);

    // 4. Generate Summary (Using History)
    const summary = await aiService.generateResearchSummary(query, researchData, context, chat.messages);

    // 5. Save to History
    chat.messages.push({ role: 'user', text: query });
    chat.messages.push({ role: 'assistant', text: summary, results: researchData });
    await chat.save();

    res.json({
      expandedQuery: structuredQuery.searchTerm, // Return the search string for UI feedback
      summary,
      results: researchData,
      sessionId: sid
    });
  } catch (error) {
    console.error("Pipeline Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
