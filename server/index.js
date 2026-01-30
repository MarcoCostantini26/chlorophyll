require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT", "DELETE"] } 
});

require('./socket/socketHandler')(io);

const { startWeatherSimulation } = require('./services/weatherService');
startWeatherSimulation(io);

app.use((req, res, next) => { 
  req.io = io; 
  next(); 
});

app.use('/api/trees', require('./routes/trees'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

server.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));