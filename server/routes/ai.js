const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// Configurazione AI
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!groq) {
      return res.json({ message: "Il mio cervello quantistico è offline (Manca API Key)." });
    }

    // --- COSTRUZIONE DEL CONTESTO (DATI) ---
    let weatherString = "Sconosciuto";
    let treesString = "Nessuna pianta trovata.";

    if (context) {
      weatherString = context.weather 
        ? (context.weather === 'rainy' ? 'Pioggia 🌧️' : context.weather === 'sunny' ? 'Soleggiato ☀️' : 'Nuvoloso ☁️')
        : "Sconosciuto";
      
      if (context.trees && context.trees.length > 0) {
        treesString = context.trees.map(t => 
          `- ${t.name} (${t.category}): H2O ${t.waterLevel}% [Stato: ${t.status}]`
        ).join('\n');
      }
    }

    // --- IL NUOVO "CERVELLO" (SYSTEM PROMPT AVANZATO) ---
    const systemPrompt = {
      role: "system",
      content: `
        Sei Dr. Chlorophyll, un botanico virtuale eccentrico, saggio e premuroso dell'app 'Chlorophyll'.
        Non sei un robot che legge dati, sei un "Dottore delle Piante".

        DATI ATTUALI:
        -----------------------
        Meteo: ${weatherString}
        Pazienti (Piante):
        ${treesString}
        -----------------------

        LINEE GUIDA PER LE RISPOSTE:
        1. NON ripetere mai i dati a elenco (es. non dire "Gino ha il 50%"). INTERPRETA i dati.
        2. Incrocia sempre TIPO DI PIANTA + METEO + STATO.
           - Esempio: Se è un Cactus e piove: "Per fortuna non l'hai innaffiato, i cactus odiano l'umidità!"
           - Esempio: Se è una Quercia e c'è il sole: "Con questo sole la quercia berrà molto, controllala spesso."
           - Esempio: Se è "Healthy" ma l'acqua è al 50%: "Sta bene, ma non farla scendere troppo."
        3. Se l'utente chiede "Come stanno le mie piante?", fai un riassunto generale emotivo (es. "La maggior parte sta alla grande, ma Gino mi preoccupa un po'...").
        4. Usa un tono colloquiale, usa emoji, sii breve (max 3 frasi).
        5. Se una pianta è CRITICA (<30%), sii allarmista e drammatico! 🚑

        Rispondi alla domanda dell'utente basandoti su queste regole.
      `
    };

    // Uniamo la storia della conversazione
    const conversation = [systemPrompt, ...(history || []), { role: "user", content: message }];

    const chatCompletion = await groq.chat.completions.create({
      messages: conversation,
      model: "llama-3.3-70b-versatile",
      temperature: 0.8, // Aumentata creatività (da 0.7 a 0.8)
      max_tokens: 350
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Mmm, le mie foglie non captano il segnale. Riprova.";
    
    res.json({ message: aiResponse });

  } catch (error) {
    console.error("Errore Groq:", error);
    res.status(500).json({ error: "Errore comunicazione AI" });
  }
});

module.exports = router;