// server.js
// Glavni server za igru "Zanimljiva Geografija"
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Učitavanje modula
const config = require('./server/config');
const logger = require('./server/logger');
const { initializeEventHandlers } = require('./server/eventHandlers');
const gameManager = require('./server/gameManager');

// Inicijalizacija Express aplikacije
const app = express();
const server = http.createServer(app);

// Dodaj ove linije za middleware konfiguraciju
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfiguracija Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',  // U produkciji ograničiti na konkretne domene
    methods: ['GET', 'POST']
  }
});

// Serviranje statičkih fajlova iz 'public' foldera
app.use(express.static(path.join(__dirname, 'public')));

// Osnovne rute
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API ruta za status servera
app.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeGames: gameManager.getActiveGamesCount(),
      connectedPlayers: gameManager.getConnectedPlayersCount(),
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Greška pri dohvatanju statusa', { error: error.message });
    res.status(500).json({ error: 'Interna greška servera' });
  }
});

// API ruta za dobijanje informacija o igri (samo u dev modu)
if (config.isDevelopment) {
  app.get('/api/games/:id', (req, res) => {
    try {
      const gameId = req.params.id;
      const gameData = gameManager.getGameInfo(gameId);
      
      if (gameData) {
        res.json(gameData);
      } else {
        res.status(404).json({ error: 'Igra nije pronađena' });
      }
    } catch (error) {
      logger.error('Greška pri dohvatanju informacija o igri', { error: error.message });
      res.status(500).json({ error: 'Interna greška servera' });
    }
  });
}

// Inicijalizacija Socket.io komunikacije
io.on('connection', (socket) => {
  logger.info('Nova Socket.io konekcija', { socketId: socket.id });
  
  // Inicijalizuj handlere za Socket.io događaje
  initializeEventHandlers(io, socket);
  
  // Obrada prekida konekcije
  socket.on('disconnect', () => {
    logger.info('Socket.io konekcija prekinuta', { socketId: socket.id });
    gameManager.handlePlayerDisconnect(socket.id);
  });
  
  // Obrada greške
  socket.on('error', (error) => {
    logger.error('Socket.io greška', { socketId: socket.id, error: error.message });
  });
});

// Periodično čišćenje neaktivnih igara
const cleanupInterval = config.inactiveGameCleanupInterval || 15 * 60 * 1000; // Default 15 minuta
setInterval(() => {
  try {
    const cleanedGames = gameManager.cleanInactiveGames();
    if (cleanedGames > 0) {
      logger.info(`Očišćeno ${cleanedGames} neaktivnih igara`);
    }
  } catch (error) {
    logger.error('Greška pri čišćenju neaktivnih igara', { error: error.message });
  }
}, cleanupInterval);

// Obrada greške servera
server.on('error', (error) => {
  logger.error('Greška servera', { error: error.message });
  
  // Izađi iz procesa u slučaju kritične greške
  if (error.code === 'EADDRINUSE') {
    logger.error('Port je već u upotrebi, izlazim iz procesa');
    process.exit(1);
  }
});

// Startovanje servera
const PORT = process.env.PORT || (config.defaultPort || 3000);
server.listen(PORT, () => {
  logger.info(`Server je pokrenut na portu ${PORT} u ${config.environment || 'development'} modu`);
  console.log(`Server je pokrenut na portu ${PORT}`);
});
