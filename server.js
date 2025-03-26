require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS middleware – Özelleştirilmiş (kritik!)
app.use(cors({
  origin: "http://localhost:3001", // ya da frontend URL'in
  credentials: true
}));

app.use(express.json());

// ✅ API Keys (dotenv üzerinden)
const { GOOGLE_TRANSLATE_API_KEY, GOOGLE_TTS_API_KEY, OPENAI_API_KEY } = process.env;

// Debug
if (!OPENAI_API_KEY) console.error('❗ OPENAI_API_KEY yok!');
if (!GOOGLE_TTS_API_KEY) console.error('❗ GOOGLE_TTS_API_KEY yok!');
if (!GOOGLE_TRANSLATE_API_KEY) console.error('❗ GOOGLE_TRANSLATE_API_KEY yok!');

// ✅ /translate → Google Translate API
app.post('/translate', async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) {
    return res.status(400).json({ error: 'Missing required parameters: text and target.' });
  }
  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        target,
        source: 'tr'
      }
    );
    const translatedText = response.data.data.translations[0].translatedText;
    res.json({ translatedText });
  } catch (error) {
    console.error("🔴 Translate API hatası:", error.response?.data || error.message);
    res.status(500).json({ error: 'Translation failed.' });
  }
});

// ✅ /tts → Google TTS API
app.post('/tts', async (req, res) => {
  const { text, languageCode, ssmlGender } = req.body;
  if (!text || !languageCode || !ssmlGender) {
    return res.status(400).json({ error: 'Missing required parameters: text, languageCode, and ssmlGender.' });
  }

  try {
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        input: { text },
        voice: { languageCode, ssmlGender },
        audioConfig: { audioEncoding: 'MP3' }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json({ audioContent: response.data.audioContent });
  } catch (error) {
    console.error("🔴 TTS API hatası:", error.response?.data || error.message);
    res.status(500).json({ error: 'TTS failed.' });
  }
});

// 🔧 Yardımcı: OpenAI yanıtı
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

// ✅ /openai → ChatGPT yanıtı
app.post('/openai', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  try {
    const reply = await fetchOpenAIResponse(prompt);
    res.json({ reply });
  } catch (error) {
    console.error("🔴 OpenAI hatası:", error.response?.data || error.message);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// ✅ Sunucu başlat
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});
