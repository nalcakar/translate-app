require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS ve JSON Middleware
app.use(cors());
app.use(express.json());

// Google API Anahtarı
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// Çeviri API'si
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

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
