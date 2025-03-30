const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Inicijalizacija servera
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Dozvoljava pristup svim domenima - pogodno za razvoj
    methods: ["GET", "POST"]
  }
});

// Podešavanje logovanja
const logsDirectory = path.join(__dirname, 'logs');
try {
  if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory);
  }
} catch (err) {
  console.error('Greška pri kreiranju logs direktorijuma:', err);
}

// Funkcija za čuvanje log-a
function saveLog(type, message, data = {}) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message,
      data
    };
    
    console.log(`[${timestamp}] [${type}] ${message}`, data);
    
    // Čuvanje u fajl može biti opciono - komentarisano da bi se izbegao problem sa dozvolama
    /*
    const logFile = path.join(logsDirectory, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    */
  } catch (err) {
    console.error('Greška pri čuvanju loga:', err);
  }
}

// Middleware za logovanje zahteva
app.use((req, res, next) => {
  saveLog('HTTP', `${req.method} ${req.url}`, { ip: req.ip });
  next();
});

// Serviranje statičkih fajlova iz 'public' foldera
app.use(express.static(path.join(__dirname, 'public')));

// Osnovni podaci igre
const categories = [
  'Zastava', 
  'Država', 
  'Grad', 
  'Reka', 
  'Planina', 
  'Biljka', 
  'Životinja', 
  'Hrana'
];

// Srpska latinica
const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('');
let games = {}; // Čuvanje aktivnih igara

// Utility funkcije
function generateGameId() {
  // Generisanje jedinstvenog ID-a za igru
  let gameId;
  do {
    gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (games[gameId]);
  
  return gameId;
}

// Ruta za glavnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta za testiranje API-ja
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    games: Object.keys(games).length,
    uptime: process.uptime()
  });
});

// Ruta za testiranje pojedinačne igre
app.get('/api/game/:id', (req, res) => {
  const gameId = req.params.id;
  if (games[gameId]) {
    // Vraća bezbednu verziju igre (bez osetljivih podataka)
    const safeGame = {
      id: games[gameId].id,
      players: games[gameId].players.map(p => ({
        username: p.username,
        isHost: p.isHost,
        score: p.score,
        ready: p.ready
      })),
      categories: games[gameId].categories,
      status: games[gameId].status,
      usedLetters: games[gameId].usedLetters,
      currentLetter: games[gameId].currentLetter,
      roundsPlayed: games[gameId].rounds ? games[gameId].rounds.length : 0,
      createdAt: games[gameId].createdAt,
      lastUpdate: games[gameId].lastUpdate
    };
    res.json(safeGame);
  } else {
    res.status(404).json({ error: 'Igra nije pronađena' });
  }
});

// Socket.io logika
io.on('connection', (socket) => {
  saveLog('SOCKET_CONNECT', 'Novi korisnik se povezao', { socketId: socket.id });
  
  // Kreiranje nove igre
  socket.on('createGame', (username) => {
    if (!username || username.trim() === '') {
      socket.emit('error', 'Korisničko ime je obavezno!');
      saveLog('GAME_CREATE_ERROR', 'Pokušaj kreiranja igre bez korisničkog imena', { socketId: socket.id });
      return;
    }
    
    saveLog('GAME_CREATE', `Pokušaj kreiranja igre za korisnika: ${username}`, { socketId: socket.id });
    
    const gameId = generateGameId();
    
    games[gameId] = {
      id: gameId,
      players: [{
        id: socket.id,
        username: username,
        isHost: true,
        score: 0,
        ready: false
      }],
      categories: [...categories],
      status: 'waiting', // waiting, letter_selection, playing, round_results, game_end
      rounds: [],
      usedLetters: [],
      currentLetter: null,
      currentPlayerIndex: 0,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      roundTime: 60 // 60 sekundi za svaku rundu
    };
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    // Slanje odgovora klijentu
    socket.emit('gameCreated', {
      gameId: gameId, 
      players: games[gameId].players,
      categories: games[gameId].categories,
      isHost: true
    });
    
    saveLog('GAME_CREATED', `Igra kreirana: ${gameId} za korisnika ${username}`, { 
      gameId, 
      host: username,
      socketId: socket.id 
    });
  });
  
  // Pridruživanje igri
  socket.on('joinGame', (data) => {
    const { gameId, username } = data;
    
    if (!username || username.trim() === '') {
      socket.emit('error', 'Korisničko ime je obavezno!');
      saveLog('GAME_JOIN_ERROR', 'Pokušaj pridruživanja bez korisničkog imena', { 
        socketId: socket.id,
        gameId
      });
      return;
    }
    
    saveLog('GAME_JOIN', `Pokušaj pridruživanja: ${username} za igru ${gameId}`, {
      socketId: socket.id,
      gameId
    });
    
    // Provera da li igra postoji
    if (!games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      saveLog('GAME_JOIN_ERROR', 'Pokušaj pridruživanja nepostojećoj igri', {
        socketId: socket.id,
        gameId,
        username
      });
      return;
    }
    
    // Provera da li je igra već počela
    if (games[gameId].status !== 'waiting') {
      socket.emit('error', 'Igra je već počela!');
      saveLog('GAME_JOIN_ERROR', 'Pokušaj pridruživanja igri koja je već počela', {
        socketId: socket.id,
        gameId,
        username
      });
      return;
    }
    
    // Provera da li korisničko ime već postoji
    const existingPlayer = games[gameId].players.find(player => player.username === username);
    if (existingPlayer) {
      socket.emit('error', 'Korisničko ime već postoji u igri!');
      saveLog('GAME_JOIN_ERROR', 'Pokušaj pridruživanja sa duplikatom korisničkog imena', {
        socketId: socket.id,
        gameId,
        username
      });
      return;
    }
    
    // Dodavanje igrača
    games[gameId].players.push({
      id: socket.id,
      username: username,
      isHost: false,
      score: 0,
      ready: false
    });
    
    games[gameId].lastUpdate = Date.now();
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    // Šalji informacije novom igraču
    socket.emit('gameJoined', {
      gameId: gameId,
      players: games[gameId].players,
      categories: games[gameId].categories,
      isHost: false
    });
    
    // Obavesti ostale igrače
    socket.to(gameId).emit('playerJoined', {
      players: games[gameId].players
    });
    
    saveLog('GAME_JOINED', `Igrač ${username} se pridružio igri ${gameId}`, {
      socketId: socket.id,
      gameId,
      playersCount: games[gameId].players.length
    });
  });
  
  // Diskonektovanje
  socket.on('disconnect', () => {
    const gameId = socket.gameId;
    
    saveLog('SOCKET_DISCONNECT', 'Korisnik se diskonektovao', {
      socketId: socket.id,
      gameId
    });
  });
});

// Pokreni server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  saveLog('SERVER_START', `Server je pokrenut na portu ${PORT}`);
  console.log(`Server je pokrenut na portu ${PORT}`);
});
