// modules/gameState.js
// Centralizovano mesto za čuvanje podataka o igri

// Globalni objekat za čuvanje stanja igre
export const gameState = {
  // Osnovni podaci o igri
  gameId: null,          // ID igre za pridruživanje
  players: [],           // Lista igrača u igri
  categories: [],        // Dostupne kategorije
  currentLetter: null,   // Trenutno izabrano slovo
  
  // Podaci o igraču
  isHost: false,         // Da li je trenutni igrač domaćin
  username: null,        // Korisničko ime trenutnog igrača
  
  // Podaci o rundi
  roundTime: 60,         // Vreme za odgovore (u sekundama)
  timerInterval: null,   // Interval za odbrojavanje
  usedLetters: [],       // Već korišćena slova
  
  // Podaci o odgovorima
  answers: {},           // Korisnikovi odgovori za trenutnu rundu
  submitted: false       // Da li su odgovori poslati
};

// Pomoćne funkcije za manipulaciju stanjem

// Resetuj sve odgovore
export function resetAnswers() {
  gameState.answers = {};
  gameState.submitted = false;
}

// Resetuj stanje igre za novu igru
export function resetGameState() {
  gameState.gameId = null;
  gameState.players = [];
  gameState.categories = [];
  gameState.currentLetter = null;
  gameState.usedLetters = [];
  resetAnswers();
  
  // Zaustavi timer ako postoji
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

// Dodavanje odgovora
export function addAnswer(category, answer) {
  gameState.answers[category] = answer;
}

// Provera da li su svi igrači spremni
export function areAllPlayersReady() {
  return gameState.players.every(player => player.ready);
}

// Pronalaženje igrača po ID-u
export function findPlayerById(playerId) {
  return gameState.players.find(player => player.id === playerId);
}

// Pronalaženje trenutnog igrača
export function getCurrentPlayer() {
  return findPlayerById(socket.id);
}

// Pronalaženje domaćina
export function getHostPlayer() {
  return gameState.players.find(player => player.isHost);
}

// Izvoz za upotrebu u drugim modulima
export default {
  gameState,
  resetAnswers,
  resetGameState,
  addAnswer,
  areAllPlayersReady,
  findPlayerById,
  getCurrentPlayer,
  getHostPlayer
};
