// server/eventHandlers.js
// Handleri za Socket.io događaje

const gameManager = require('./gameManager');
const logger = require('./logger');
const validation = require('./validation');

// Inicijalizacija handlera za Socket.io događaje
function initializeEventHandlers(io, socket) {
  
  // Handler za kreiranje igre
  socket.on('createGame', (username) => {
    logger.debug('createGame event', { socketId: socket.id, username });
    
    // Validacija korisničkog imena
    if (!validation.isValidUsername(username)) {
      socket.emit('error', 'Nevalidno korisničko ime');
      return;
    }
    
    // Kreiraj igru
    const game = gameManager.createGame(socket.id, username);
    
    // Pošalji odgovor klijentu
    socket.emit('gameCreated', {
      gameId: game.id,
      players: game.getPlayersList(),
      categories: game.categories,
      isHost: true
    });
  });
  
  // Handler za pridruživanje igri
  socket.on('joinGame', (data) => {
    logger.debug('joinGame event', { socketId: socket.id, gameId: data.gameId, username: data.username });
    
    // Validacija podataka
    if (!data || !data.gameId || !data.username) {
      socket.emit('error', 'Nevalidni podaci');
      return;
    }
    
    // Validacija korisničkog imena
    if (!validation.isValidUsername(data.username)) {
      socket.emit('error', 'Nevalidno korisničko ime');
      return;
    }
    
    // Pridruži se igri
    const result = gameManager.joinGame(data.gameId, socket.id, data.username);
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Pridruži socket sobi
    socket.join(data.gameId);
    
    // Pošalji informacije novom igraču
    socket.emit('gameJoined', {
      gameId: data.gameId,
      players: result.players,
      categories: result.categories,
      isHost: result.isHost
    });
    
    // Obavesti ostale igrače
    socket.to(data.gameId).emit('playerJoined', {
      players: result.players
    });
  });
  
  // Handler za status "spreman"
  socket.on('playerReady', () => {
    logger.debug('playerReady event', { socketId: socket.id });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Označi igrača kao spremnog
    const result = game.setPlayerReady(socket.id);
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Obavesti sve igrače o promeni statusa
    io.to(game.id).emit('playerStatusChanged', {
      players: result.players
    });
    
    // Ako je igra započeta, obavesti sve igrače
    if (result.gameStarted) {
      io.to(game.id).emit('gameStarted', {
        status: game.getStatus(),
        currentPlayer: game.getCurrentPlayer()
      });
    }
  });
  
  // Handler za izbor slova
  socket.on('selectLetter', (letter) => {
    logger.debug('selectLetter event', { socketId: socket.id, letter });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Validacija slova
    if (!validation.isValidLetter(letter)) {
      socket.emit('error', 'Nevalidno slovo');
      return;
    }
    
    // Izaberi slovo
    const result = game.selectLetter(socket.id, letter);
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Obavesti sve igrače o početku runde
    io.to(game.id).emit('roundStarted', {
      letter: result.letter,
      roundTime: result.roundTime,
      categories: result.categories
    });
  });
  
  // Handler za slanje odgovora
  socket.on('submitAnswers', (answers) => {
    logger.debug('submitAnswers event', { socketId: socket.id });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Validacija odgovora
    if (!validation.areValidAnswers(answers, game.categories)) {
      socket.emit('error', 'Nevalidni odgovori');
      return;
    }
    
    // Pošalji odgovore
    const result = game.submitAnswers(socket.id, answers);
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Obavesti igrača da su odgovori primljeni
    socket.emit('answersSubmitted');
    
    // Obavesti ostale igrače da je ovaj igrač poslao odgovore
    const player = game.getPlayerBySocketId(socket.id);
    socket.to(game.id).emit('playerSubmitted', {
      username: player.username
    });
    
    // Ako su svi igrači poslali odgovore, završi rundu
    if (result.allSubmitted) {
      const roundResult = game.endRound();
      
      // Obavesti sve igrače o kraju runde
      io.to(game.id).emit('roundEnded', {
        answers: roundResult.answers,
        letter: roundResult.letter,
        categories: roundResult.categories
      });
    }
  });
  
  // Handler za validaciju odgovora
  socket.on('validateAnswers', (validations) => {
    logger.debug('validateAnswers event', { socketId: socket.id });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Validacija validacija
    if (!validation.areValidValidations(validations, game.players, game.categories)) {
      socket.emit('error', 'Nevalidne validacije');
      return;
    }
    
    // Validiraj odgovore
    const result = game.validateAnswers(socket.id, validations);
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Ako je kraj igre
    if (result.isGameEnd) {
      io.to(game.id).emit('gameEnded', {
        players: result.players,
        results: game.getAllRounds(),
        usedLetters: game.usedLetters,
        winner: result.winner
      });
    } else {
      // Obavesti sve igrače o validaciji runde
      io.to(game.id).emit('roundValidated', {
        players: result.players,
        results: result.results,
        nextStatus: result.nextStatus,
        currentPlayerIndex: result.currentPlayerIndex,
        currentPlayer: result.currentPlayer
      });
    }
  });
  
  // Handler za sledeću rundu
  socket.on('nextRound', () => {
    logger.debug('nextRound event', { socketId: socket.id });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Obavesti sve igrače o sledećoj rundi
    io.to(game.id).emit('nextRound', {
      usedLetters: game.usedLetters,
      currentPlayer: game.getCurrentPlayer()
    });
  });
  
  // Handler za novu igru
  socket.on('newGame', () => {
    logger.debug('newGame event', { socketId: socket.id });
    
    // Pronađi igru
    const game = gameManager.getGameBySocketId(socket.id);
    
    if (!game) {
      socket.emit('error', 'Igra nije pronađena');
      return;
    }
    
    // Proveri da li je igrač domaćin
    const player = game.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', 'Samo domaćin može započeti novu igru');
      return;
    }
    
    // Resetuj igru
    const result = game.resetGame();
    
    if (!result.success) {
      socket.emit('error', result.error);
      return;
    }
    
    // Obavesti sve igrače o novoj igri
    io.to(game.id).emit('gameReset', {
      players: result.players,
      categories: result.categories
    });
  });
}

module.exports = { initializeEventHandlers };
