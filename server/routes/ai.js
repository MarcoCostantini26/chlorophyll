const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// Configurazione AI
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// POST /api/ai/chat - Chatbot Generico
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body; // Riceviamo il messaggio attuale e la storia (opzionale)

    if (!groq) {
      return res.json({ message: "Mi dispiace, il mio cervello quantistico (API Key) è spento al momento." });
    }

    // Costruiamo il contesto per l'AI
    const systemPrompt = {
      role: "system",
      content: "Sei Dr. Chlorophyll, un assistente virtuale esperto di botanica, ecologia e foreste urbane per l'app 'Chlorophyll'. Sei simpatico, usi emoji, e rispondi in modo conciso ma utile. Se ti chiedono cose fuori tema (politica, calcio), riporta gentilmente l'argomento sulla natura."
    };

    // Uniamo il prompt di sistema con la storia della chat (ultimi 4 messaggi per contesto)
    const conversation = [systemPrompt, ...(history || []), { role: "user", content: message }];

    const chatCompletion = await groq.chat.completions.create({
      messages: conversation,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 200
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Non ho capito, riprova.";
    
    res.json({ message: aiResponse });

  } catch (error) {
    console.error("Errore Groq:", error);
    res.status(500).json({ error: "Errore comunicazione AI" });
  }
});

module.exports = router;