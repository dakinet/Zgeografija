// server/gameManager.js
// Upravljanje igrama

const GameRoom = require('./gameRoom');
const logger = require('./logger');
const utils = require('./utils');
const config = require('./config');

// Skladište aktivnih igara
const activeGames = new Map();

// Skladište za praćenje igrača i njihovih igara
const playerGameMap = new Map();

// Kreiranje nove igre
function createGame(hostSocketId, hostUsername) {
  // Generiši jedinstveni ID za igru
  let gameId;
  do {
    gameId = utils.generateGameId();
  } while (activeGames.has(gameId));
  
  // Kreiraj novu igru
  const game = new GameRoom(gameId, {
    hostSocketId,
    hostUsername,
    categories: config.defaultCategories
  });
  
  // Dodaj igru u mapu aktivnih igara
  activeGames.set(gameId, game);
  
  // Poveži igrača sa igrom
  playerGameMap.set(hostSocketId, gameId);
  
  logger.info(`Nova igra kreirana`, { gameId, hostSocketId, hostUsername });
  return game;
}

// Pridruživanje igrača postojećoj igri
function joinGame(gameId, socketId, username) {
  const game = activeGames.get(gameId);
  
  if (!game) {
    logger.warn(`Pokušaj pridruživanja nepostojećoj igri`, { gameId, socketId, username });
    return { success: false, error: 'Igra ne postoji' };
  }
  
  // Proveri da li igra dozvoljava pridruživanje
  if (!game.canJoin()) {
    logger.warn(`Pokušaj pridruživanja igri koja ne dozvoljava pridruživanje`, { gameId, socketId, username });
    return { success: false, error: game.getJoinError() };
  }
  
  // Proveri da li korisničko ime već postoji
  if (game.hasPlayer(username)) {
    logger.warn(`Pokušaj pridruživanja igri sa zauzetim korisničkim imenom`, { gameId, socketId, username });
    return { success: false, error: 'Korisničko ime već postoji u igri' };
  }
  
  // Dodaj igrača u igru
  const result = game.addPlayer(socketId, username);
  
  if (result.success) {
    // Poveži igrača sa igrom
    playerGameMap.set(socketId, gameId);
    logger.info(`Igrač pridružen igri`, { gameId, socketId, username });
  } else {
    logger.warn(`Neuspešno pridruživanje igri`, { gameId, socketId, username, error: result.error });
  }
  
  return result;
}

// Dobijanje igre prema ID-u
function getGame(gameId) {
  return activeGames.get(gameId);
}

// Dobijanje igre prema Socket ID-u igrača
function getGameBySocketId(socketId) {
  const gameId = playerGameMap.get(socketId);
  if (gameId) {
    return activeGames.get(gameId);
  }
  return null;
}

// Uklanjanje igre
function removeGame(gameId) {
  const game = activeGames.get(gameId);
  
  if (game) {
    // Ukloni sve igrače iz mape
    game.getAllPlayers().forEach(player => {
      playerGameMap.delete(player.id);
    });
    
    // Ukloni igru iz mape
    activeGames.delete(gameId);
    logger.info(`Igra uklonjena`, { gameId });
    return true;
  }
  
  return false;
}

// Postupak u slučaju diskonektovanja igrača
function handlePlayerDisconnect(socketId) {
  const gameId = playerGameMap.get(socketId);
  
  if (!gameId) {
    return;
  }
  
  const game = activeGames.get(gameId);
  
  if (!game) {
    playerGameMap.delete(socketId);
    return;
  }
  
  // Obavesti igru o diskonektovanju igrača
  const result = game.handlePlayerDisconnect(socketId);
  
  // Ukloni vezu igrača i igre
  playerGameMap.delete(socketId);
  
  // Ako je igra prazna ili završena, ukloni je
  if (result.shouldRemoveGame) {
    removeGame(gameId);
  }
  
  return result;
}

// Čišćenje neaktivnih igara
function cleanInactiveGames() {
  const now = Date.now();
  let removedCount = 0;
  
  activeGames.forEach((game, gameId) => {
    const lastActivity = game.getLastActivityTime();
    const inactiveTime = now - lastActivity;
    
    // Ako je igra neaktivna duže od konfiguracionog vremena
    if (inactiveTime > config.gameSettings.inactivityTimeout) {
      if (removeGame(gameId)) {
        removedCount++;
        logger.info(`Igra uklonjena zbog neaktivnosti`, { 
          gameId, 
          inactiveTime: Math.round(inactiveTime / 1000) 
        });
      }
    }
  });
  
  return removedCount;
}

// Dobijanje broja aktivnih igara
function getActiveGamesCount() {
  return activeGames.size;
}

// Dobijanje broja povezanih igrača
function getConnectedPlayersCount() {
  return playerGameMap.size;
}

// Dobijanje informacija o igri (za API)
function getGameInfo(gameId) {
  const game = activeGames.get(gameId);
  
  if (!game) {
    return null;
  }
  
  return game.getPublicInfo();
}

// Dobijanje liste aktivnih igara (za admin panel)
function getActiveGamesList() {
  const games = [];
  
  activeGames.forEach((game, gameId) => {
    games.push({
      id: gameId,
      players: game.getPlayerCount(),
      status: game.getStatus(),
      createdAt: game.getCreationTime(),
      lastActivity: game.getLastActivityTime()
    });
  });
  
  return games;
}

module.exports = {
  createGame,
  joinGame,
  getGame,
  getGameBySocketId,
  removeGame,
  handlePlayerDisconnect,
  cleanInactiveGames,
  getActiveGamesCount,
  getConnectedPlayersCount,
  getGameInfo,
  getActiveGamesList
};
