require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS and JSON Middleware
app.use(cors());
app.use(express.json());

// Existing environment variables for Google APIs
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// 📌 Existing /translate route
app.post('/translate', async (req, res) => {
  // ... your existing code
});

// 📌 Existing /tts route
app.post('/tts', async (req, res) => {
  // ... your existing code
});

// 📌 NEW: OpenAI endpoint
app.post('/openai', async (req, res) => {
  try {
    // For example, we expect the client to send a "prompt" or "messages"
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    // Call the OpenAI Chat Completions endpoint
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert language tutor.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Extract the text from the response
    const openaiReply = response.data.choices[0].message.content;

    res.json({ reply: openaiReply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
