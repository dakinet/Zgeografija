const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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

const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZ'.split('');
let games = {}; // Čuvanje aktivnih igara

// Ruta za glavnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io logika - pojednostavljena za testiranje
io.on('connection', (socket) => {
  console.log('Novi korisnik se povezao:', socket.id);
  
  // Kreiranje nove igre - OSNOVNA FUNKCIONALNOST
  socket.on('createGame', (username) => {
    console.log(`Pokušaj kreiranja igre za korisnika: ${username}`);
    
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    games[gameId] = {
      id: gameId,
      players: [{
        id: socket.id,
        username: username,
        isHost: true,
        score: 0,
        ready: false
      }],
      categories: [...categories]
    };
    
    socket.join(gameId);
    socket.gameId = gameId;
    
    // Kritična linija - slanje odgovora klijentu
    socket.emit('gameCreated', {
      gameId: gameId, 
      players: games[gameId].players,
      categories: games[gameId].categories
    });
    
    console.log(`Igra kreirana: ${gameId} za korisnika ${username}`);
  });
  
  // Pridruživanje igri - OSNOVNA FUNKCIONALNOST
  socket.on('joinGame', (data) => {
    const { gameId, username } = data;
    console.log(`Pokušaj pridruživanja: ${username} za igru ${gameId}`);
    
    if (!games[gameId]) {
      socket.emit('error', 'Igra ne postoji!');
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
    
    // Šalji informacije novom igraču
    socket.emit('gameJoined', {
      gameId: gameId,
      players: games[gameId].players,
      categories: games[gameId].categories
    });
    
    // Obavesti ostale igrače
    socket.to(gameId).emit('playerJoined', {
      players: games[gameId].players
    });
    
    console.log(`Igrač ${username} se pridružio igri ${gameId}`);
  });
  
  // Ostali handleri...
});

// Pokreni server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server je pokrenut na portu ${PORT}`);
});