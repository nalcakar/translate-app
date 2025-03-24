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
if (!GOOGLE_TTS_API_KEY) {
  console.error('Error: GOOGLE_TTS_API_KEY is not set in the environment variables.');
}
if (!GOOGLE_TRANSLATE_API_KEY) {
  console.error('Error: GOOGLE_TRANSLATE_API_KEY is not set in the environment variables.');
}

// 📌 /translate route - implemented using Google Cloud Translation API
app.post('/translate', async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) {
    return res.status(400).json({ error: 'Missing required parameters: text and target.' });
  }
  try {
    const translationResponse = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        target: target,
        source: 'tr'
      }
    );
    const translatedText = translationResponse.data.data.translations[0].translatedText;
    res.json({ translatedText });
  } catch (error) {
    console.error('Error calling Google Translate API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Translation request failed.' });
  }
});

// 📌 /tts route - implemented using Google TTS API
app.post('/tts', async (req, res) => {
  const { text, languageCode, ssmlGender } = req.body;
  if (!text || !languageCode || !ssmlGender) {
    return res.status(400).json({ error: 'Missing required parameters: text, languageCode, and ssmlGender.' });
  }
  try {
    const ttsResponse = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        input: { text },
        voice: { languageCode, ssmlGender },
        audioConfig: { audioEncoding: 'MP3' }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    const audioContent = ttsResponse.data.audioContent;
    res.json({ audioContent });
  } catch (error) {
    console.error('Error calling Google TTS API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'TTS request failed.' });
  }
});

// Helper function for OpenAI request
const fetchOpenAIResponse = async (prompt) => {
  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert language tutor.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.7
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  };

  const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
  return response.data.choices[0].message.content;
};

// 📌 /openai endpoint
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
