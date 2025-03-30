const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Inicijalizacija servera
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Podešavanje logovanja
const logsDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory);
}

// Funkcija za čuvanje log-a
function saveLog(type, message, data = {}) {
  const logFile = path.join(logsDirectory, `${new Date().toISOString().split('T')[0]}.log`);
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    data
  };

  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  console.log(`[${timestamp}] [${type}] ${message}`);
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
  'Hrana',
  'Predmet',
  'Zanimanje', 
  'Muzička grupa'
];

// Srpska latinica i ćirilica
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

function getPlayerBySocketId(gameId, socketId) {
  if (!games[gameId]) return null;
  return games[gameId].players.find(player => player.id === socketId);
}

function getHostPlayer(gameId) {
  if (!games[gameId]) return null;
  return games[gameId].players.find(player => player.isHost);
}

function areAllPlayersReady(gameId) {
  if (!games[gameId]) return false;
  return games[gameId].players.every(player => player.ready);
}

function cleanUpGame(gameId) {
  // Provera da li postoji igra za brisanje
  if (games[gameId]) {
    saveLog('GAME_CLEANUP', `Čišćenje igre`, { gameId });
    delete games[gameId];
  }
}

// Periodicno ciscenje neaktivnih igara
setInterval(() => {
  const now = Date.now();
  Object.keys(games).forEach(gameId => {
    // Ako igra nije ažurirana u poslednja 2 sata
    if (games[gameId].lastUpdate && now - games[gameId].lastUpdate > 7200000) {
      saveLog('GAME_INACTIVE', `Brisanje neaktivne igre`, { gameId });
      cleanUpGame(gameId);
    }
  });
}, 3600000); // Provera na svaki sat

// Ruta za glavnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  
  // Igrač je spreman
  socket.on('playerReady', () => {
    const gameId = socket.gameId;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    const player = getPlayerBySocketId(gameId, socket.id);
    if (!player) {
      socket.emit('error', 'Igrač nije pronađen!');
      return;
    }
    
    player.ready = true;
    games[gameId].lastUpdate = Date.now();
    
    // Obavesti sve igrače o statusu
    io.to(gameId).emit('playerStatusChanged', {
      players: games[gameId].players
    });
    
    saveLog('PLAYER_READY', `Igrač ${player.username} je spreman`, {
      socketId: socket.id,
      gameId,
      username: player.username
    });
    
    // Proveri da li su svi igrači spremni
    if (areAllPlayersReady(gameId) && games[gameId].players.length >= 2) {
      // Započni igru
      games[gameId].status = 'letter_selection';
      
      // Prvi igrač bira slovo
      const firstPlayerIndex = 0; // Možemo promeniti na random ako želimo
      games[gameId].currentPlayerIndex = firstPlayerIndex;
      
      // Obavesti sve igrače
      io.to(gameId).emit('gameStarted', {
        status: games[gameId].status,
        currentPlayer: games[gameId].players[firstPlayerIndex]
      });
      
      saveLog('GAME_STARTED', `Igra ${gameId} je započeta`, {
        gameId,
        playersCount: games[gameId].players.length
      });
    }
  });
  
  // Izbor slova
  socket.on('selectLetter', (letter) => {
    const gameId = socket.gameId;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    if (games[gameId].status !== 'letter_selection') {
      socket.emit('error', 'Igra nije u fazi izbora slova!');
      return;
    }
    
    const player = getPlayerBySocketId(gameId, socket.id);
    if (!player) {
      socket.emit('error', 'Igrač nije pronađen!');
      return;
    }
    
    // Proveri da li je ovaj igrač na redu
    const currentPlayer = games[gameId].players[games[gameId].currentPlayerIndex];
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', 'Nije tvoj red za izbor slova!');
      return;
    }
    
    // Proveri da li je slovo već korišćeno
    if (games[gameId].usedLetters.includes(letter)) {
      socket.emit('error', 'Ovo slovo je već iskorišćeno!');
      return;
    }
    
    games[gameId].currentLetter = letter;
    games[gameId].usedLetters.push(letter);
    games[gameId].status = 'playing';
    games[gameId].lastUpdate = Date.now();
    
    // Kreiraj novu rundu
    const newRound = {
      letter: letter,
      answers: {},
      results: {},
      startTime: Date.now(),
      endTime: null
    };
    
    // Inicijalizuj odgovore za sve igrače
    games[gameId].players.forEach(p => {
      newRound.answers[p.id] = {
        submitted: false,
        categories: {}
      };
      
      // Inicijalizuj kategorije
      games[gameId].categories.forEach(category => {
        newRound.answers[p.id].categories[category] = '';
      });
    });
    
    games[gameId].rounds.push(newRound);
    
    // Obavesti sve igrače
    io.to(gameId).emit('roundStarted', {
      letter: letter,
      roundTime: games[gameId].roundTime,
      categories: games[gameId].categories
    });
    
    saveLog('ROUND_STARTED', `Runda započeta sa slovom ${letter}`, {
      gameId,
      letter,
      roundIndex: games[gameId].rounds.length - 1
    });
    
    // Postavi tajmer za rundu
    setTimeout(() => {
      // Proveri da li je runda još uvek aktivna
      if (games[gameId] && games[gameId].status === 'playing') {
        endRound(gameId);
        saveLog('ROUND_TIMEOUT', `Runda sa slovom ${letter} je završena zbog isteka vremena`, {
          gameId,
          letter
        });
      }
    }, games[gameId].roundTime * 1000);
  });
  
  // Slanje odgovora
  socket.on('submitAnswers', (answers) => {
    const gameId = socket.gameId;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    if (games[gameId].status !== 'playing') {
      socket.emit('error', 'Igra nije u toku!');
      return;
    }
    
    const player = getPlayerBySocketId(gameId, socket.id);
    if (!player) {
      socket.emit('error', 'Igrač nije pronađen!');
      return;
    }
    
    const currentRound = games[gameId].rounds[games[gameId].rounds.length - 1];
    if (!currentRound) {
      socket.emit('error', 'Runda nije pronađena!');
      return;
    }
    
    // Sačuvaj odgovore
    currentRound.answers[player.id].submitted = true;
    
    Object.keys(answers).forEach(category => {
      if (games[gameId].categories.includes(category)) {
        const answer = answers[category] ? answers[category].trim() : '';
        currentRound.answers[player.id].categories[category] = answer;
      }
    });
    
    games[gameId].lastUpdate = Date.now();
    
    // Obavesti igrača
    socket.emit('answersSubmitted');
    
    // Obavesti ostale igrače
    socket.to(gameId).emit('playerSubmitted', {
      username: player.username
    });
    
    saveLog('ANSWERS_SUBMITTED', `Igrač ${player.username} je predao odgovore`, {
      gameId,
      socketId: socket.id,
      letter: currentRound.letter
    });
    
    // Proveri da li su svi igrači predali odgovore
    const allSubmitted = Object.values(currentRound.answers).every(a => a.submitted);
    
    if (allSubmitted) {
      endRound(gameId);
      saveLog('ROUND_COMPLETE', `Svi igrači su predali odgovore za slovo ${currentRound.letter}`, {
        gameId,
        letter: currentRound.letter
      });
    }
  });
  
  // Validacija odgovora
  socket.on('validateAnswers', (validations) => {
    const gameId = socket.gameId;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    const player = getPlayerBySocketId(gameId, socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', 'Samo domaćin može validirati odgovore!');
      return;
    }
    
    if (games[gameId].status !== 'round_results') {
      socket.emit('error', 'Igra nije u fazi rezultata runde!');
      return;
    }
    
    const currentRound = games[gameId].rounds[games[gameId].rounds.length - 1];
    if (!currentRound) {
      socket.emit('error', 'Runda nije pronađena!');
      return;
    }
    
    // Sačuvaj validacije i bodove
    games[gameId].players.forEach(p => {
      let roundScore = 0;
      
      Object.keys(currentRound.answers[p.id].categories).forEach(category => {
        const answer = currentRound.answers[p.id].categories[category];
        const isValid = validations[p.id] && 
                        validations[p.id][category] !== undefined ? 
                        validations[p.id][category] : 
                        false;
        
        // Dodeli bodove ako je odgovor validan
        if (isValid && answer && answer.trim() !== '') {
          roundScore += 10;
        }
        
        // Sačuvaj rezultat
        if (!currentRound.results[p.id]) {
          currentRound.results[p.id] = {
            categories: {}
          };
        }
        
        currentRound.results[p.id].categories[category] = {
          answer: answer,
          isValid: isValid
        };
      });
      
      // Dodaj bodove igraču
      p.score += roundScore;
      currentRound.results[p.id].score = roundScore;
    });
    
    games[gameId].lastUpdate = Date.now();
    
    // Proveri da li je kraj igre
    const isGameEnd = shouldEndGame(gameId);
    
    if (isGameEnd) {
      games[gameId].status = 'game_end';
      
      // Obavesti sve igrače
      io.to(gameId).emit('gameEnded', {
        players: games[gameId].players,
        results: games[gameId].rounds,
        usedLetters: games[gameId].usedLetters,
        winner: getWinner(gameId)
      });
      
      saveLog('GAME_ENDED', `Igra ${gameId} je završena`, {
        gameId,
        winner: getWinner(gameId).username,
        rounds: games[gameId].rounds.length
      });
    } else {
      // Pripremi sledeću rundu
      prepareNextRound(gameId);
      
      // Obavesti sve igrače
      io.to(gameId).emit('roundValidated', {
        players: games[gameId].players,
        results: currentRound.results,
        nextStatus: games[gameId].status,
        currentPlayerIndex: games[gameId].currentPlayerIndex,
        currentPlayer: games[gameId].players[games[gameId].currentPlayerIndex]
      });
      
      saveLog('ROUND_VALIDATED', `Runda sa slovom ${currentRound.letter} je validirana`, {
        gameId,
        letter: currentRound.letter
      });
    }
  });
  
  // Nova igra (posle završetka)
  socket.on('newGame', () => {
    const gameId = socket.gameId;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
      return;
    }
    
    const player = getPlayerBySocketId(gameId, socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', 'Samo domaćin može započeti novu igru!');
      return;
    }
    
    // Resetuj igru
    games[gameId] = {
      id: gameId,
      players: games[gameId].players.map(p => ({
        ...p,
        score: 0,
        ready: false
      })),
      categories: [...categories],
      status: 'waiting',
      rounds: [],
      usedLetters: [],
      currentLetter: null,
      currentPlayerIndex: 0,
      lastUpdate: Date.now(),
      roundTime: 60
    };
    
    // Obavesti sve igrače
    io.to(gameId).emit('gameReset', {
      players: games[gameId].players,
      categories: games[gameId].categories
    });
    
    saveLog('GAME_RESET', `Igra ${gameId} je resetovana`, {
      gameId,
      host: player.username
    });
  });
  
  // Diskonektovanje
  socket.on('disconnect', () => {
    const gameId = socket.gameId;
    
    saveLog('SOCKET_DISCONNECT', 'Korisnik se diskonektovao', {
      socketId: socket.id,
      gameId
    });
    
    if (gameId && games[gameId]) {
      const playerIndex = games[gameId].players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = games[gameId].players[playerIndex];
        const wasHost = player.isHost;
        
        // Ukloni igrača
        games[gameId].players.splice(playerIndex, 1);
        
        saveLog('PLAYER_LEFT', `Igrač ${player.username} je napustio igru ${gameId}`, {
          socketId: socket.id,
          gameId,
          playersLeft: games[gameId].players.length
        });
        
        // Ako nema više igrača, očisti igru
        if (games[gameId].players.length === 0) {
          cleanUpGame(gameId);
          return;
        }
        
        // Ako je bio domaćin, dodeli domaćina sledećem igraču
        if (wasHost && games[gameId].players.length > 0) {
          games[gameId].players[0].isHost = true;
          
          saveLog('HOST_CHANGED', `Novi domaćin igre ${gameId} je ${games[gameId].players[0].username}`, {
            gameId,
            newHost: games[gameId].players[0].username
          });
        }
        
        // Ako je igra u toku i igrač je bio na potezu, prebaci potez na sledećeg
        if (games[gameId].status === 'letter_selection' && games[gameId].currentPlayerIndex === playerIndex) {
          games[gameId].currentPlayerIndex = games[gameId].currentPlayerIndex % games[gameId].players.length;
        }
        
        games[gameId].lastUpdate = Date.now();
        
        // Obavesti ostale igrače
        io.to(gameId).emit('playerLeft', {
          players: games[gameId].players,
          leftUsername: player.username
        });
      }
    }
  });
});

// Pomoćne funkcije za igru
function endRound(gameId) {
  if (!games[gameId]) return;
  
  const currentRound = games[gameId].rounds[games[gameId].rounds.length - 1];
  currentRound.endTime = Date.now();
  
  games[gameId].status = 'round_results';
  
  // Obavesti sve igrače
  io.to(gameId).emit('roundEnded', {
    answers: currentRound.answers,
    letter: currentRound.letter,
    categories: games[gameId].categories
  });
}

function prepareNextRound(gameId) {
  if (!games[gameId]) return;
  
  // Prebaci potez na sledećeg igrača
  games[gameId].currentPlayerIndex = (games[gameId].currentPlayerIndex + 1) % games[gameId].players.length;
  games[gameId].status = 'letter_selection';
}

function shouldEndGame(gameId) {
  if (!games[gameId]) return false;
  
  // Ako su sva slova iskorišćena ili nema više slova za izbor, završi igru
  const remainingLetters = allLetters.filter(l => !games[gameId].usedLetters.includes(l));
  return remainingLetters.length === 0 || games[gameId].rounds.length >= 10;
}

function getWinner(gameId) {
  if (!games[gameId]) return null;
  
  // Pronađi igrača sa najviše bodova
  const sortedPlayers = [...games[gameId].players].sort((a, b) => b.score - a.score);
  return sortedPlayers[0] || null;
}

// Pokreni server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  saveLog('SERVER_START', `Server je pokrenut na portu ${PORT}`);
  console.log(`Server je pokrenut na portu ${PORT}`);
});
