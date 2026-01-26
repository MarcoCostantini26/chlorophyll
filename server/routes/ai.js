const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Tree = require('../models/Tree');

// Configurazione AI
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// --- ROTTA 1: CHATBOT INTELLIGENTE (USER + ADMIN) ---
router.post('/chat', async (req, res) => {
  try {
    // Riceviamo isAdmin per decidere la personalità
    const { message, history, context, isAdmin } = req.body;

    if (!groq) {
      return res.json({ message: "Mi dispiace, il mio cervello (API Key) è spento al momento." });
    }

    // 1. DEFINIZIONE PERSONALITÀ (SYSTEM PROMPT)
    let systemPromptContent = "";

    if (isAdmin) {
      // --- MODALITÀ ADMIN: CITY BRAIN ---
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
      // --- MODALITÀ UTENTE: DR. CHLOROPHYLL ---
      systemPromptContent = `
        Sei Dr. Chlorophyll 🌿, un esperto botanico simpatico, empatico e leggermente ironico.
        Parli con un cittadino ("Green Guardian") che ha adottato degli alberi.
        
        CONTESTO UTENTE:
        - Meteo attuale: ${context?.weather || 'N/D'}
        - Le sue piante: ${JSON.stringify(context?.trees_summary || [])}
        
        OBIETTIVI:
        1. Rispondi in modo amichevole e motivante.
        2. Usa emoji pertinenti (🌿, 💧, 🌞).
        3. Dai consigli pratici ma brevi sulla cura delle piante basandoti sul meteo e stato dell'albero.
      `;
    }

    // 2. PULIZIA STORIA (Fix per l'errore "property 'text' is unsupported")
    // Groq accetta solo 'content', non 'text'. Mappiamo tutto per sicurezza.
    const cleanHistory = (history || []).map(msg => ({
      role: msg.role,
      content: msg.content || msg.text || "" 
    }));

    // 3. COSTRUZIONE CONVERSAZIONE
    const conversation = [
      { role: "system", content: systemPromptContent },
      ...cleanHistory,
      { role: "user", content: message }
    ];

    // 4. CHIAMATA A GROQ
    const chatCompletion = await groq.chat.completions.create({
      messages: conversation,
      model: "llama-3.3-70b-versatile",
      temperature: isAdmin ? 0.3 : 0.7, // Admin più freddo (0.3), Utente più creativo (0.7)
      max_tokens: 300
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "Non ho dati sufficienti per rispondere.";
    
    res.json({ message: aiResponse });

  } catch (error) {
    console.error("Errore Groq /chat:", error);
    res.json({ message: "Ho avuto un piccolo malfunzionamento nei circuiti. Riprova tra poco!" });
  }
});

// --- ROTTA 2: CONSULTAZIONE SINGOLA (LEGACY) ---
// Mantenuta per compatibilità con il codice esistente
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
    
    // Fallback se no API Key
    let backupMsg = tree.waterLevel < 30 ? "⚠️ Serve un intervento urgente!" : "✅ La pianta sta bene.";
    res.json({ message: backupMsg });
  } catch (error) { res.status(500).json({ error: "Errore AI" }); }
});

module.exports = router;