require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS ve JSON Middleware
app.use(cors());
app.use(express.json());

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// 📌 Çeviri API'si
app.post('/translate', async (req, res) => {
    try {
        const { text, targetLang } = req.body;

        if (!text || !targetLang) {
            return res.status(400).json({ error: 'Lütfen metin ve hedef dili belirtin' });
        }

        const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2`,
            {},
            {
                params: {
                    q: text,
                    target: targetLang,
                    key: GOOGLE_TRANSLATE_API_KEY
                }
            }
        );

        res.json({ translatedText: response.data.data.translations[0].translatedText });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Çeviri yapılamadı' });
    }
});

// 📌 TTS API (Metni Sese Dönüştürme)
app.post('/tts', async (req, res) => {
    try {
        const { text, languageCode, ssmlGender } = req.body;

        if (!text || !languageCode) {
            return res.status(400).json({ error: 'Lütfen metin ve dil kodunu belirtin' });
        }

        const response = await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
            {
                input: { text },
                voice: { languageCode, ssmlGender: ssmlGender || "NEUTRAL" },
                audioConfig: { audioEncoding: "MP3" }
            }
        );

        const audioContent = response.data.audioContent;

        if (!audioContent) {
            return res.status(500).json({ error: 'Ses oluşturulamadı' });
        }

        res.json({ audioContent });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'TTS işlemi başarısız oldu' });
    }
});


app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
