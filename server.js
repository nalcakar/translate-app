require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL bağlantısı (Neon.tech)
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CORS ayarı
app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));

app.use(express.json());

// Session ayarları
app.use(session({
  secret: "my-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));

// 🔐 Kullanıcı kontrolü
app.get("/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.json({ isPatron: false });
  }
});

// Patreon login yönlendirme
app.get("/login", (req, res) => {
  const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${process.env.PATREON_CLIENT_ID}&redirect_uri=${process.env.PATREON_REDIRECT_URI}&scope=identity identity.memberships`;
  res.redirect(authUrl);
});

// Patreon callback
app.get("/auth/patreon/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const tokenRes = await axios.post("https://www.patreon.com/api/oauth2/token",
      new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: process.env.PATREON_CLIENT_ID,
        client_secret: process.env.PATREON_CLIENT_SECRET,
        redirect_uri: process.env.PATREON_REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokenData = tokenRes.data;
    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=full_name,email&fields[member]=patron_status",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    const userData = userRes.data;
    const isPatron = Array.isArray(userData?.included) && userData.included[0]?.attributes?.patron_status === "active_patron";

    req.session.user = {
      name: userData?.data?.attributes?.full_name || "Bilinmiyor",
      email: userData?.data?.attributes?.email || "",
      isPatron,
      tier: isPatron ? "Aktif Üye" : null
    };

    res.redirect("/index.html");
  } catch (err) {
    console.error("Patreon callback hatası:", err);
    res.status(500).send("Patreon login hatası");
  }
});

// Çıkış
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/index.html");
  });
});

// 🔸 /translate endpoint
app.post("/translate", async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) return res.status(400).json({ error: "Eksik parametre" });
  try {
    const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
      q: text,
      target,
      source: "tr"
    });
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (err) {
    console.error("Çeviri hatası:", err.response?.data || err.message);
    res.status(500).json({ error: "Çeviri başarısız" });
  }
});

// 🔸 /tts endpoint
app.post("/tts", async (req, res) => {
  const { text, languageCode, ssmlGender } = req.body;
  if (!text || !languageCode || !ssmlGender) return res.status(400).json({ error: "Eksik parametre" });
  try {
    const response = await axios.post(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`, {
      input: { text },
      voice: { languageCode, ssmlGender },
      audioConfig: { audioEncoding: "MP3" }
    });
    res.json({ audioContent: response.data.audioContent });
  } catch (err) {
    console.error("TTS hatası:", err.response?.data || err.message);
    res.status(500).json({ error: "TTS başarısız" });
  }
});

// 🔸 /openai endpoint
app.post("/openai", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt eksik" });
  try {
    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert language tutor." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    }, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI hatası:", err.response?.data || err.message);
    res.status(500).json({ error: "OpenAI başarısız" });
  }
});

// 🔸 /save-question endpoint
app.post("/save-question", async (req, res) => {
  const { title, questions } = req.body;
  const user = req.session.user;
  if (!user || !user.email) return res.status(401).json({ error: "Giriş yapılmamış" });

  try {
    const kontrol = await db.query(
      "SELECT * FROM questions WHERE user_email = $1 AND title = $2",
      [user.email, title]
    );

    if (kontrol.rows.length > 0) {
      return res.status(409).json({ error: "Bu başlıkla zaten kayıt var." });
    }

    await db.query(
      "INSERT INTO questions (user_email, title, data) VALUES ($1, $2, $3)",
      [user.email, title, questions]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Soru kaydetme hatası:", err);
    res.status(500).json({ error: "Veritabanı hatası" });
  }
});

// Sunucu başlat
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
