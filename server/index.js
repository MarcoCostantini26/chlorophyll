require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Setup App
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// Socket.io
const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT", "DELETE"] } 
});

// Init Logica Socket (dal file separato)
require('./socket/socketHandler')(io);

// Init Meteo (dal service)
const { startWeatherSimulation } = require('./services/weatherService');
startWeatherSimulation(io);

// Routes
// Iniettiamo 'io' nelle rotte per poter emettere eventi (es. dopo create/update HTTP)
app.use((req, res, next) => { 
  req.io = io; 
  next(); 
});

app.use('/api/trees', require('./routes/trees'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

// Start Server
server.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));