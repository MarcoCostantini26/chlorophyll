const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Tree = require('../models/Tree');

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

router.post('/chat', async (req, res) => {
  try {
    const { message, history, context, isAdmin } = req.body;

    if (!groq) {
      return res.json({ message: "Mi dispiace, il mio cervello (API Key) è spento al momento." });
    }

    let systemPromptContent = "";

    if (isAdmin) {
      systemPromptContent = `
        Sei "City Brain", l'intelligenza artificiale operativa per la gestione del verde urbano.
        Sei analitico, preciso e professionale.
        
        DATI STATISTICI CITTÀ:
        - Totale Alberi: ${context?.totalTrees || 'N/D'}
        - Critici: ${context?.criticalTrees || 0}
        - Assetati: ${context?.thirstyTrees || 0}
        - Media Acqua: ${context?.avgWater || 0}%
        
        📜 ELENCO COMPLETO ALBERI (Nome [Stato, Acqua%]):
        ${context?.fullTreeList || 'Nessun albero censito.'}
        
        OBIETTIVI:
        1. Se l'admin chiede di un albero specifico per nome (es. "Come sta la Quercia?"), cerca nella lista e rispondi con i suoi dati precisi.
        2. Se chiede un riepilogo generale, usa le statistiche.
        3. Mantieni le risposte concise.
      `;
    } else {
      systemPromptContent = `
        Sei Dr. Chlorophyll 🌿, botanico esperto e simpatico.
        
        CONTESTO:
        - Meteo: ${context?.weather || 'N/D'}
        
        🔴 LE PIANTE DELL'UTENTE:
        ${context?.trees_summary || "Nessuna."}
        
        ISTRUZIONI CRUCIALI:
        1. Guarda SEMPRE il tag tra parentesi quadre [TIPO].
        2. SINONIMI: 
           - Se l'utente chiede "Siepi", cerca anche [🌿 Cespuglio] o [✂️ Siepe].
           - Se chiede "Fioriere", cerca [🪴 Fioriera] o [🪴 Vaso].
           - Se chiede "Alberi", includi tutto ciò che è legnoso.
        3. Se una categoria è [🌱 Pianta Generica], dì all'utente che non sai esattamente cos'è ma dagli comunque lo stato di salute.
        4. Sii breve e usa emoji.
      `;
    }

    const cleanHistory = (history || []).map(msg => ({
      role: msg.role,
      content: msg.content || msg.text || "" 
    }));

    const conversation = [
      { role: "system", content: systemPromptContent },
      ...cleanHistory,
      { role: "user", content: message }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: conversation,
      model: "llama-3.3-70b-versatile",
      temperature: isAdmin ? 0.3 : 0.7,
      max_tokens: 300
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Non ho dati sufficienti per rispondere.";
    
    res.json({ message: aiResponse });

  } catch (error) {
    console.error("Errore Groq /chat:", error);
    res.json({ message: "Ho avuto un piccolo malfunzionamento nei circuiti. Riprova tra poco!" });
  }
});

router.post('/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    if (groq) {
      try {
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
    
    let backupMsg = tree.waterLevel < 30 ? "⚠️ Serve un intervento urgente!" : "✅ La pianta sta bene.";
    res.json({ message: backupMsg });
  } catch (error) { res.status(500).json({ error: "Errore AI" }); }
});

module.exports = router;