require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Keys from environment
const { GOOGLE_TRANSLATE_API_KEY, GOOGLE_TTS_API_KEY, OPENAI_API_KEY } = process.env;

// Debug: log if API keys are loaded
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in the environment variables.');
}

// 📌 Existing /translate route (placeholder)
app.post('/translate', async (req, res) => {
  // TODO: Implement your translate functionality here
  res.json({ message: 'Translate route not implemented yet.' });
});

// 📌 Existing /tts route (placeholder)
app.post('/tts', async (req, res) => {
  // TODO: Implement your TTS functionality here
  res.json({ message: 'TTS route not implemented yet.' });
});

// Helper function for OpenAI request
const fetchOpenAIResponse = async (prompt) => {
  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert language tutor.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 150,
    temperature: 0.7
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  };

  const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
  return response.data.choices[0].message.content;
};

// 📌 OpenAI endpoint
app.post('/openai', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  try {
    const reply = await fetchOpenAIResponse(prompt);
    res.json({ reply });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
