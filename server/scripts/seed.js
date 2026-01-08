// server/scripts/seed.js
const mongoose = require('mongoose');
// Qui importerai i tuoi modelli (User, Tree) quando li avremo creati

// Esempio dati finti
const users = [
  { name: "Gabriele", role: "admin", email: "gabriele@unibo.it" },
  { name: "Marco", role: "green_guardian", email: "marco@unibo.it" },
  { name: "Utente Monitor", role: "public_monitor", email: "guest@unibo.it" }
];

// Logica di connessione e salvataggio...
console.log("Database popolato con successo! 🌱");