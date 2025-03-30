const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serviranje statičkih fajlova
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
  'Hrana',
  'Predmet',
  'Zanimanje', 
  'Muzička grupa'
];

const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZ'.split('');
let games = {}; // Čuvanje aktivnih igara
let connections = {}; // Praćenje aktivnih konekcija

// Ruta za glavnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta za status servera
app.get('/status', (req, res) => {
  const activeGames = Object.keys(games).length;
  const activePlayers = Object.values(games).reduce((total, game) => total + game.players.length, 0);
  
  res.json({
    status: 'ok',
    activeGames,
    activePlayers,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Socket.io logika
io.on('connection', (socket) => {
  console.log('Novi korisnik se povezao:', socket.id);
  connections[socket.id] = { lastActive: Date.now() };
  
  // Čuvamo instance povezanih korisnika
  socket.on('heartbeat', () => {
    if (socket.gameId && games[socket.gameId]) {
      games[socket.gameId].lastActivity = Date.now();
    }
    connections[socket.id].lastActive = Date.now();
  });
  
  // Kreiranje nove igre
  socket.on('createGame', (username) => {
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
      availableLetters: [...allLetters],
      usedLetters: [],
      currentLetter: null,
      currentRound: 0,
      roundAnswers: {},
      timePerRound: 60, // sekundi
      started: false,
      roundInProgress: false,
      categories: [...categories],
      lastActivity: Date.now() // Dodajemo praćenje aktivnosti
    };
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    console.log(`Kreiranje igre: Igra ${gameId} kreirana za igrača ${username} (${socket.id})`);
    socket.emit('gameCreated', {
      gameId: gameId, 
      players: games[gameId].players,
      categories: games[gameId].categories
    });
    
    console.log(`Igra kreirana: ${gameId}`);
  });
  
  // Pridruživanje postojećoj igri
  socket.on('joinGame', (data) => {
    const { gameId, username } = data;
    
    if (!games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    if (games[gameId].started) {
      socket.emit('error', 'Igra je već počela!');
      return;
    }
    
    games[gameId].players.push({
      id: socket.id,
      username: username,
      isHost: false,
      score: 0,
      ready: false
    });
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    io.to(gameId).emit('playerJoined', {
      players: games[gameId].players,
      categories: games[gameId].categories
    });
    
    console.log(`Igrač ${username} se pridružio igri ${gameId}`);
  });
  
  // Igrač je spreman
  socket.on('playerReady', () => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) return;
    
    const playerIndex = games[gameId].players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    games[gameId].players[playerIndex].ready = true;
    
    // Proveri da li su svi igrači spremni
    const allReady = games[gameId].players.every(p => p.ready);
    
    io.to(gameId).emit('playersUpdate', {
      players: games[gameId].players,
      allReady: allReady
    });
    
    if (allReady && games[gameId].players.length >= 2 && !games[gameId].started) {
      startGame(gameId);
    }
  });
  
  // Izbor slova
  socket.on('chooseLetter', (letter) => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) return;
    
    const game = games[gameId];
    
    // Proveri da li je ovaj igrač na redu
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const currentPlayerIndex = game.currentRound % game.players.length;
    if (playerIndex !== currentPlayerIndex) {
      socket.emit('error', 'Nije tvoj red za izbor slova!');
      return;
    }
    
    if (game.roundInProgress) {
      socket.emit('error', 'Runda je već u toku!');
      return;
    }
    
    // Proveri da li je slovo dostupno
    if (!game.availableLetters.includes(letter)) {
      socket.emit('error', 'Ovo slovo je već korišćeno!');
      return;
    }
    
    startRound(gameId, letter);
  });
  
  // Slanje odgovora za rundu
  socket.on('submitAnswers', (answers) => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) return;
    
    const game = games[gameId];
    
    if (!game.roundInProgress) {
      socket.emit('error', 'Runda nije u toku!');
      return;
    }
    
    game.roundAnswers[socket.id] = answers;
    
    // Proveri da li su svi igrači poslali odgovore
    if (Object.keys(game.roundAnswers).length === game.players.length) {
      endRound(gameId);
    } else {
      io.to(gameId).emit('playerSubmitted', 
        game.players.find(p => p.id === socket.id).username
      );
    }
  });
  
  // Ocenjivanje odgovora
  socket.on('validateAnswers', (validationData) => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) return;
    
    const game = games[gameId];
    
    // Ažuriraj rezultate na osnovu validacije
    Object.keys(validationData).forEach(playerId => {
      const playerIndex = game.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        const playerScore = Object.values(validationData[playerId]).reduce((sum, isValid) => {
          return sum + (isValid ? 10 : 0);
        }, 0);
        
        games[gameId].players[playerIndex].score += playerScore;
      }
    });
    
    // Objavi rezultate
    io.to(gameId).emit('roundResults', {
      players: game.players,
      answers: game.roundAnswers,
      validation: validationData
    });
    
    // Pripremi za sledeću rundu
    game.roundInProgress = false;
    game.currentRound++;
    game.roundAnswers = {};
    
    // Proveri da li je kraj igre (nema više slova)
    if (game.availableLetters.length === 0) {
      endGame(gameId);
    } else {
      io.to(gameId).emit('waitForNextRound', {
        nextPlayerIndex: game.currentRound % game.players.length,
        nextPlayer: game.players[game.currentRound % game.players.length].username
      });
    }
  });
  
  // Izlazak iz igre
  socket.on('disconnect', () => {
    const gameId = socket.gameId;
    delete connections[socket.id];
    console.log(`Korisnik se diskonektovao: ${socket.id}`);
    
    if (!gameId || !games[gameId]) return;
    
    const playerIndex = games[gameId].players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const player = games[gameId].players[playerIndex];
    games[gameId].players.splice(playerIndex, 1);
    
    console.log(`Igrač ${player.username} je napustio igru ${gameId}`);
    
    // Ako nema više igrača, obriši igru
    if (games[gameId].players.length === 0) {
      delete games[gameId];
      console.log(`Igra ${gameId} je obrisana`);
      return;
    }
    
    // Ako je host napustio, postavi novog hosta
    if (player.isHost && games[gameId].players.length > 0) {
      games[gameId].players[0].isHost = true;
    }
    
    // Obavesti ostale igrače
    io.to(gameId).emit('playerLeft', {
      username: player.username,
      players: games[gameId].players
    });
    
    // Ako je igra u toku i nema dovoljno igrača, završi igru
    if (games[gameId].started && games[gameId].players.length < 2) {
      endGame(gameId);
    }
  });
});

// Pomoćne funkcije
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function startGame(gameId) {
  if (!games[gameId]) return;
  
  games[gameId].started = true;
  
  io.to(gameId).emit('gameStarted', {
    firstPlayerIndex: 0,
    firstPlayer: games[gameId].players[0].username,
    availableLetters: games[gameId].availableLetters
  });
  
  console.log(`Igra ${gameId} je počela`);
}

function startRound(gameId, letter) {
  if (!games[gameId]) return;
  
  const game = games[gameId];
  
  // Ažuriraj status slova
  const letterIndex = game.availableLetters.indexOf(letter);
  game.availableLetters.splice(letterIndex, 1);
  game.usedLetters.push(letter);
  game.currentLetter = letter;
  game.roundInProgress = true;
  game.roundAnswers = {};
  
  // Obavesti igrače
  io.to(gameId).emit('roundStarted', {
    letter: letter,
    timePerRound: game.timePerRound,
    availableLetters: game.availableLetters,
    usedLetters: game.usedLetters
  });
  
  // Postavi tajmer za kraj runde
  setTimeout(() => {
    if (games[gameId] && games[gameId].roundInProgress) {
      endRound(gameId);
    }
  }, game.timePerRound * 1000);
  
  console.log(`Runda u igri ${gameId} je počela sa slovom ${letter}`);
}

function endRound(gameId) {
  if (!games[gameId] || !games[gameId].roundInProgress) return;
  
  const game = games[gameId];
  game.roundInProgress = false;
  
  // Prikaži odgovore svim igračima
  io.to(gameId).emit('roundEnded', {
    answers: game.roundAnswers,
    letter: game.currentLetter,
    categories: game.categories
  });
  
  console.log(`Runda u igri ${gameId} je završena`);
}

function endGame(gameId) {
  if (!games[gameId]) return;
  
  // Sortiraj igrače po rezultatu
  const sortedPlayers = [...games[gameId].players].sort((a, b) => b.score - a.score);
  
  io.to(gameId).emit('gameEnded', {
    players: sortedPlayers,
    winner: sortedPlayers[0]
  });
  
  console.log(`Igra ${gameId} je završena. Pobednik: ${sortedPlayers[0].username}`);
  
  // Obriši igru nakon 5 minuta
  setTimeout(() => {
    if (games[gameId]) {
      delete games[gameId];
      console.log(`Igra ${gameId} je obrisana iz memorije`);
    }
  }, 5 * 60 * 1000);
}

// Pokreni server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server je pokrenut na portu ${PORT}`);
  console.log(`Sve aktivne igre: ${Object.keys(games).length}`);
  
  // Dodajemo interval koji će periodično čistiti zastarele igre
  setInterval(() => {
    const now = Date.now();
    let cleanedGames = 0;
    let cleanedConnections = 0;
    
    // Čišćenje zastarelih igara
    Object.keys(games).forEach(gameId => {
      const game = games[gameId];
      // Brisanje igara koje su neaktivne duže od 2 sata
      if (game.lastActivity && (now - game.lastActivity > 2 * 60 * 60 * 1000)) {
        delete games[gameId];
        cleanedGames++;
      }
    });
    
    // Čišćenje zastarelih konekcija
    Object.keys(connections).forEach(socketId => {
      if (now - connections[socketId].lastActive > 30 * 60 * 1000) { // 30 minuta
        delete connections[socketId];
        cleanedConnections++;
      }
    });
    
    if (cleanedGames > 0 || cleanedConnections > 0) {
      console.log(`Čišćenje: Obrisano ${cleanedGames} neaktivnih igara i ${cleanedConnections} neaktivnih konekcija.`);
      console.log(`Preostalo igara: ${Object.keys(games).length}, konekcija: ${Object.keys(connections).length}`);
    }
  }, 10 * 60 * 1000); // Provera na svakih 10 minuta
});