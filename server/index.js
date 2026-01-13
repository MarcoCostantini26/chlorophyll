// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
//const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configurazione CORS per accettare richieste dal Frontend (Vue)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Porta standard di Vite
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

 mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chlorophyll')
   .then(() => console.log('🍃 MongoDB Connesso'))
   .catch(err => console.error('Errore MongoDB:', err));

// WebSocket: Gestione connessioni
io.on('connection', (socket) => {
  console.log(`Utente connesso: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log('Utente disconnesso');
  });
});

// Rotta di test
app.get('/', (req, res) => {
  res.send('Chlorophyll Backend is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});