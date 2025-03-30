// server/gameRoom.js
// Klasa koja predstavlja jednu sobu/igru

const config = require('./config');
const logger = require('./logger');
const utils = require('./utils');
const validation = require('./validation');

// Status igre
const GAME_STATUS = {
  WAITING: 'waiting',
  LETTER_SELECTION: 'letter_selection',
  PLAYING: 'playing',
  ROUND_RESULTS: 'round_results',
  GAME_END: 'game_end'
};

class GameRoom {
  constructor(id, options = {}) {
    this.id = id;
    this.players = [];
    this.categories = options.categories || config.defaultCategories;
    this.status = GAME_STATUS.WAITING;
    this.rounds = [];
    this.usedLetters = [];
    this.currentLetter = null;
    this.currentPlayerIndex = 0;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.roundTime = options.roundTime || config.gameSettings.roundDuration;
    
    // Dodaj domaćina igre
    if (options.hostSocketId && options.hostUsername) {
      this.addPlayer(options.hostSocketId, options.hostUsername, true);
    }
    
    // Timeouts
    this.roundTimeout = null;
  }
  
  // Upravljanje igračima
  
  // Dodaj igrača u igru
  addPlayer(socketId, username, isHost = false) {
    // Proveri da li igra dozvoljava pridruživanje
    if (!this.canJoin()) {
      return { success: false, error: this.getJoinError() };
    }
    
    // Proveri da li korisničko ime već postoji
    if (this.hasPlayer(username)) {
      return { success: false, error: 'Korisničko ime već postoji u igri' };
    }
    
    // Kreiraj igrača
    const player = {
      id: socketId,
      username,
      isHost,
      score: 0,
      ready: false,
      connected: true,
      joinedAt: Date.now()
    };
    
    // Dodaj igrača u niz
    this.players.push(player);
    this.updateActivity();
    
    logger.debug(`Igrač dodat u igru`, { gameId: this.id, username, isHost });
    
    return { 
      success: true, 
      players: this.getPlayersList(), 
      categories: this.categories,
      isHost
    };
  }
  
  // Proveri da li korisničko ime već postoji
  hasPlayer(username) {
    return this.players.some(player => 
      player.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  // Pronađi igrača po Socket ID-u
  getPlayerBySocketId(socketId) {
    return this.players.find(player => player.id === socketId);
  }
  
  // Označi igrača kao spremnog
  setPlayerReady(socketId) {
    const player = this.getPlayerBySocketId(socketId);
    
    if (!player) {
      return { success: false, error: 'Igrač nije pronađen' };
    }
    
    player.ready = true;
    this.updateActivity();
    
    logger.debug(`Igrač označen kao spreman`, { gameId: this.id, username: player.username });
    
    // Proveri da li su svi igrači spremni
    const allReady = this.areAllPlayersReady();
    
    // Ako su svi spremni i ima dovoljno igrača, započni igru
    if (allReady && this.players.length >= config.gameSettings.minPlayers) {
      this.startGame();
    }
    
    return { 
      success: true, 
      players: this.getPlayersList(),
      allReady,
      gameStarted: this.status !== GAME_STATUS.WAITING
    };
  }
  
  // Proveri da li su svi igrači spremni
  areAllPlayersReady() {
    return this.players.every(player => player.ready);
  }
  
  // Obradi diskonektovanje igrača
  handlePlayerDisconnect(socketId) {
    const playerIndex = this.players.findIndex(player => player.id === socketId);
    
    if (playerIndex === -1) {
      return { success: false, error: 'Igrač nije pronađen' };
    }
    
    const player = this.players[playerIndex];
    const wasHost = player.isHost;
    const username = player.username;
    
    // Ako je igra u toku, označi igrača kao diskonektovanog
    if (this.status !== GAME_STATUS.WAITING) {
      player.connected = false;
      
      // Ako je igrač na potezu, prebaci na sledećeg
      if (this.status === GAME_STATUS.LETTER_SELECTION && 
          this.currentPlayerIndex === playerIndex) {
        this.moveToNextPlayer();
      }
      
      logger.debug(`Igrač diskonektovan iz igre u toku`, { 
        gameId: this.id, 
        username
      });
      
      return { 
        success: true, 
        removed: false, 
        wasHost,
        username,
        shouldRemoveGame: false,
        players: this.getPlayersList()
      };
    } else {
      // Ako igra nije započeta, ukloni igrača
      this.players.splice(playerIndex, 1);
      
      logger.debug(`Igrač uklonjen iz igre`, { 
        gameId: this.id, 
        username
      });
      
      // Ako je bio domaćin, dodeli domaćina sledećem igraču
      if (wasHost && this.players.length > 0) {
        this.players[0].isHost = true;
        logger.debug(`Novi domaćin igre`, { 
          gameId: this.id, 
          username: this.players[0].username
        });
      }
      
      // Ažuriraj aktivnost
      this.updateActivity();
      
      return { 
        success: true, 
        removed: true, 
        wasHost,
        username,
        shouldRemoveGame: this.players.length === 0,
        players: this.getPlayersList()
      };
    }
  }
  
  // Vrati broj povezanih igrača
  getConnectedPlayersCount() {
    return this.players.filter(player => player.connected).length;
  }
  
  // Vrati broj igrača
  getPlayerCount() {
    return this.players.length;
  }
  
  // Dobijanje liste igrača (bez ID-a)
  getPlayersList() {
    return this.players.map(player => ({
      id: player.id,
      username: player.username,
      isHost: player.isHost,
      score: player.score,
      ready: player.ready,
      connected: player.connected
    }));
  }
  
  // Dobijanje svih igrača
  getAllPlayers() {
    return [...this.players];
  }
  
  // Upravljanje igrom
  
  // Započni igru
  startGame() {
    if (this.status !== GAME_STATUS.WAITING) {
      return { success: false, error: 'Igra je već započeta' };
    }
    
    // Proveri da li ima dovoljno igrača
    if (this.players.length < config.gameSettings.minPlayers) {
      return { 
        success: false, 
        error: `Potrebno je najmanje ${config.gameSettings.minPlayers} igrača`
      };
    }
    
    // Proveri da li su svi igrači spremni
    if (!this.areAllPlayersReady()) {
      return { success: false, error: 'Nisu svi igrači spremni' };
    }
    
    // Postavi status igre
    this.status = GAME_STATUS.LETTER_SELECTION;
    
    // Postavi prvog igrača na potezu (može biti slučajan)
    this.currentPlayerIndex = 0;
    
    this.updateActivity();
    
    logger.info(`Igra započeta`, { 
      gameId: this.id, 
      playersCount: this.players.length 
    });
    
    return { 
      success: true, 
      status: this.status, 
      currentPlayer: this.getCurrentPlayer()
    };
  }
  
  // Izaberi slovo za rundu
  selectLetter(socketId, letter) {
    // Proveri status igre
    if (this.status !== GAME_STATUS.LETTER_SELECTION) {
      return { success: false, error: 'Igra nije u fazi izbora slova' };
    }
    
    // Proveri da li je igrač na potezu
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: 'Igrač nije pronađen' };
    }
    
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== socketId) {
      return { success: false, error: 'Nije tvoj red za izbor slova' };
    }
    
    // Proveri da li je slovo već korišćeno
    if (this.usedLetters.includes(letter)) {
      return { success: false, error: 'Ovo slovo je već iskorišćeno' };
    }
    
    // Proveri da li je slovo validno
    if (!config.serbianAlphabet.includes(letter)) {
      return { success: false, error: 'Nevalidno slovo' };
    }
    
    this.currentLetter = letter;
    this.usedLetters.push(letter);
    this.status = GAME_STATUS.PLAYING;
    
    // Kreiraj novu rundu
    const roundData = {
      letter,
      answers: {},
      results: {},
      startTime: Date.now(),
      endTime: null
    };
    
    // Inicijalizuj odgovore za svakog igrača
    this.players.forEach(p => {
      roundData.answers[p.id] = {
        submitted: false,
        categories: {}
      };
      
      // Inicijalizuj kategorije
      this.categories.forEach(category => {
        roundData.answers[p.id].categories[category] = '';
      });
    });
    
    this.rounds.push(roundData);
    this.updateActivity();
    
    // Postavi timer za kraj runde
    this.setRoundTimer();
    
    logger.info(`Runda započeta, slovo: ${letter}`, { 
      gameId: this.id,
      letter,
      roundIndex: this.rounds.length - 1
    });
    
    return {
      success: true,
      letter,
      roundTime: this.roundTime,
      categories: this.categories
    };
  }
  
  // Pošalji odgovore na kraju runde
  submitAnswers(socketId, answers) {
    // Proveri status igre
    if (this.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'Igra nije u fazi igranja' };
    }
    
    // Proveri da li je igrač u igri
    const player = this.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, error: 'Igrač nije pronađen' };
    }
    
    // Dobij trenutnu rundu
    const currentRound = this.getCurrentRound();
    if (!currentRound) {
      return { success: false, error: 'Runda nije pronađena' };
    }
    
    // Sačuvaj odgovore
    currentRound.answers[socketId].submitted = true;
    
    Object.keys(answers).forEach(category => {
      if (this.categories.includes(category)) {
        const answer = answers[category] ? answers[category].trim() : '';
        currentRound.answers[socketId].categories[category] = answer;
      }
    });
    
    this.updateActivity();
    
    logger.debug(`Igrač je poslao odgovore`, { 
      gameId: this.id,
      username: player.username,
      letter: currentRound.letter
    });
    
    // Proveri da li su svi igrači poslali odgovore
    const allSubmitted = Object.values(currentRound.answers).every(a => a.submitted);
    
    if (allSubmitted) {
      this.endRound();
    }
    
    return { 
      success: true,
      allSubmitted
    };
  }
  
  // Završetak runde
  endRound() {
    // Očisti timer ako postoji
    if (this.roundTimeout) {
      clearTimeout(this.roundTimeout);
      this.roundTimeout = null;
    }
    
    // Dobij trenutnu rundu
    const currentRound = this.getCurrentRound();
    if (!currentRound) {
      return { success: false, error: 'Runda nije pronađena' };
    }
    
    // Označi kraj runde
    currentRound.endTime = Date.now();
    this.status = GAME_STATUS.ROUND_RESULTS;
    
    this.updateActivity();
    
    logger.info(`Runda završena, slovo: ${currentRound.letter}`, { 
      gameId: this.id,
      letter: currentRound.letter,
      roundIndex: this.rounds.length - 1
    });
    
    return {
      success: true,
      answers: currentRound.answers,
      letter: currentRound.letter,
      categories: this.categories
    };
  }
  
  // Validacija odgovora
  validateAnswers(socketId, validations) {
    // Proveri status igre
    if (this.status !== GAME_STATUS.ROUND_RESULTS) {
      return { success: false, error: 'Igra nije u fazi rezultata runde' };
    }
    
    // Proveri da li je igrač domaćin
    const player = this.getPlayerBySocketId(socketId);
    if (!player || !player.isHost) {
      return { success: false, error: 'Samo domaćin može validirati odgovore' };
    }
    
    // Dobij trenutnu rundu
    const currentRound = this.getCurrentRound();
    if (!currentRound) {
      return { success: false, error: 'Runda nije pronađena' };
    }
    
    // Sačuvaj validacije i dodaj bodove
    this.players.forEach(p => {
      let roundScore = 0;
      
      Object.keys(currentRound.answers[p.id].categories).forEach(category => {
        const answer = currentRound.answers[p.id].categories[category];
        const isValid = validations[p.id] && 
                        validations[p.id][category] !== undefined ? 
                        validations[p.id][category] : 
                        false;
        
        // Dodeli bodove ako je odgovor validan
        if (isValid && answer && answer.trim() !== '') {
          roundScore += config.gameSettings.pointsPerValidAnswer;
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
    
    this.updateActivity();
    
    // Proveri da li je kraj igre
    const isGameEnd = this.shouldEndGame();
    
    if (isGameEnd) {
      this.status = GAME_STATUS.GAME_END;
      
      logger.info(`Igra završena`, { 
        gameId: this.id,
        rounds: this.rounds.length
      });
      
      return {
        success: true,
        isGameEnd: true,
        players: this.getPlayersList(),
        results: currentRound.results,
        winner: this.getWinner()
      };
    } else {
      // Pripremi sledeću rundu
      this.prepareNextRound();
      
      logger.info(`Runda validirana, sledeća na redu`, { 
        gameId: this.id,
        letter: currentRound.letter,
        nextPlayer: this.getCurrentPlayer().username
      });
      
      return {
        success: true,
        isGameEnd: false,
        players: this.getPlayersList(),
        results: currentRound.results,
        nextStatus: this.status,
        currentPlayerIndex: this.currentPlayerIndex,
        currentPlayer: this.getCurrentPlayer()
      };
    }
  }
  
  // Priprema sledeće runde
  prepareNextRound() {
    // Prebaci potez na sledećeg igrača
    this.moveToNextPlayer();
    this.status = GAME_STATUS.LETTER_SELECTION;
    this.updateActivity();
  }
  
  // Prebaci potez na sledećeg igrača
  moveToNextPlayer() {
    // Pronađi sledećeg aktivnog igrača
    let nextPlayerIndex = this.currentPlayerIndex;
    let tries = 0;
    
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
      tries++;
      
      // Ako smo prošli kroz sve igrače i niko nije povezan, uzmi prvog
      if (tries >= this.players.length) {
        nextPlayerIndex = 0;
        break;
      }
    } while (!this.players[nextPlayerIndex].connected);
    
    this.currentPlayerIndex = nextPlayerIndex;
  }
  
  // Resetovanje igre za novu igru
  resetGame() {
    // Očisti timer ako postoji
    if (this.roundTimeout) {
      clearTimeout(this.roundTimeout);
      this.roundTimeout = null;
    }
    
    // Resetuj igru
    this.status = GAME_STATUS.WAITING;
    this.rounds = [];
    this.usedLetters = [];
    this.currentLetter = null;
    this.currentPlayerIndex = 0;
    
    // Resetuj igrače
    this.players.forEach(player => {
      player.score = 0;
      player.ready = false;
    });
    
    this.updateActivity();
    
    logger.info(`Igra resetovana`, { gameId: this.id });
    
    return {
      success: true,
      players: this.getPlayersList(),
      categories: this.categories
    };
  }
  
  // Pomoćne funkcije
  
  // Postavi timer za kraj runde
  setRoundTimer() {
    // Očisti postojeći timer ako postoji
    if (this.roundTimeout) {
      clearTimeout(this.roundTimeout);
    }
    
    // Postavi novi timer
    this.roundTimeout = setTimeout(() => {
      // Proveri da li je igra još uvek u toku
      if (this.status === GAME_STATUS.PLAYING) {
        this.endRound();
        
        logger.info(`Runda završena zbog isteka vremena`, { 
          gameId: this.id,
          letter: this.currentLetter
        });
      }
    }, this.roundTime * 1000);
  }
  
  // Dobij igrača koji je trenutno na potezu
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }
  
  // Dobij trenutnu rundu
  getCurrentRound() {
    if (this.rounds.length === 0) {
      return null;
    }
    
    return this.rounds[this.rounds.length - 1];
  }
  
  // Dobij sve runde
  getAllRounds() {
    return [...this.rounds];
  }
  
  // Proveri da li treba završiti igru
  shouldEndGame() {
    // Ako su sva slova iskorišćena ili nema više slova za izbor, završi igru
    const remainingLetters = config.serbianAlphabet.filter(
      letter => !this.usedLetters.includes(letter)
    );
    
    return remainingLetters.length === 0 || 
           this.rounds.length >= config.gameSettings.maxRounds;
  }
  
  // Dobijanje pobednika
  getWinner() {
    // Sortiraj igrače po bodovima
    const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
    return sortedPlayers[0] || null;
  }
  
  // Proveri da li igra dozvoljava pridruživanje
  canJoin() {
    // Igra ne dozvoljava pridruživanje ako:
    // 1. Igra je već počela
    // 2. Dostignut je maksimalni broj igrača
    
    if (this.status !== GAME_STATUS.WAITING) {
      return false;
    }
    
    if (this.players.length >= config.gameSettings.maxPlayers) {
      return false;
    }
    
    return true;
  }
  
  // Dobij razlog zašto se nije moguće pridružiti
  getJoinError() {
    if (this.status !== GAME_STATUS.WAITING) {
      return 'Igra je već počela';
    }
    
    if (this.players.length >= config.gameSettings.maxPlayers) {
      return 'Igra je puna';
    }
    
    return 'Nije moguće pridružiti se igri';
  }
  
  // Ažuriraj vreme poslednje aktivnosti
  updateActivity() {
    this.lastActivity = Date.now();
  }
  
  // Dobijanje javnih informacija o igri
  getPublicInfo() {
    return {
      id: this.id,
      players: this.getPlayersList(),
      categories: this.categories,
      status: this.status,
      currentLetter: this.currentLetter,
      usedLetters: this.usedLetters,
      roundsPlayed: this.rounds.length,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
  
  // Vrati vreme kreiranja igre
  getCreationTime() {
    return this.createdAt;
  }
  
  // Vrati vreme poslednje aktivnosti
  getLastActivityTime() {
    return this.lastActivity;
  }
  
  // Vrati status igre
  getStatus() {
    return this.status;
  }
}

module.exports = GameRoom;
