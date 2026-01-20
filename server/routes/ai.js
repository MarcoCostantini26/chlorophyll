const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Tree = require('../models/Tree');

// Configurazione AI locale al file (o globale se preferisci)
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// POST /api/ai/consult
router.post('/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    if (groq) {
      try {
        // Prompt migliorato con le categorie
        const cat = tree.category || 'pianta';
        const prompt = `Sei Dr. Chlorophyll. Analizza questa ${cat}: "${tree.name}". Specie: ${tree.species}. Acqua/Stato: ${tree.waterLevel}%. Dammi un consiglio breve (max 20 parole) e leggermente sarcastico o divertente su come curarla.`;
        
        const chatCompletion = await groq.chat.completions.create({ 
            messages: [{ "role": "user", "content": prompt }], 
            model: "llama-3.3-70b-versatile", 
            temperature: 0.7, 
            max_tokens: 100 
        });
        
        const aiMessage = chatCompletion.choices[0]?.message?.content || "Nessun consiglio.";
        return res.json({ message: aiMessage });
      } catch (aiError) { 
          console.error("Errore Groq:", aiError.message); 
      }
    }
    
    // Fallback se no API Key o errore
    let backupMsg = tree.waterLevel < 30 ? "⚠️ Serve un intervento urgente!" : "✅ La pianta sta bene.";
    res.json({ message: backupMsg });
  } catch (error) { res.status(500).json({ error: "Errore AI" }); }
});

module.exports = router;