// modules/socket.js
// Modul za Socket.io komunikaciju

// Socket.io instanca
export let socket;

// Funkcija za inicijalizaciju Socket.io konekcije
export function initializeSocket() {
  // Provera da li je Socket.io biblioteka učitana
  if (typeof io === 'undefined') {
    console.error('Socket.io biblioteka nije učitana!');
    return null;
  }
  
  // Inicijalizacija Socket.io sa dodatnim opcijama za bolje povezivanje
  socket = io({
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
  });
  
  // Dodaj log da znamo da je inicijalizacija pokrenuta
  console.log('Socket.io inicijalizacija pokrenuta');
  
  // Osnovna konfiguracija
  socket.on('connect', () => {
    console.log('Uspešno povezan na server sa ID:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Greška pri povezivanju sa serverom:', error.message);
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log(`Uspešno ponovno povezivanje nakon ${attemptNumber} pokušaja`);
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Pokušaj ponovnog povezivanja #${attemptNumber}`);
  });
  
  socket.on('reconnect_error', (error) => {
    console.error('Greška pri ponovnom povezivanju:', error.message);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('Neuspešno ponovno povezivanje nakon svih pokušaja');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Prekinuta veza sa serverom. Razlog:', reason);
  });
  
  return socket;
}

// Funkcija za slanje zahteva za kreiranje igre
export function createGame(username) {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('createGame', username);
}

// Funkcija za slanje zahteva za pridruživanje igri
export function joinGame(username, gameId) {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('joinGame', { username, gameId });
}

// Funkcija za slanje statusa "spreman"
export function sendReadyStatus() {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('playerReady');
}

// Funkcija za slanje izabranog slova
export function selectLetter(letter) {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('selectLetter', letter);
}

// Funkcija za slanje odgovora
export function submitAnswers(answers) {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('submitAnswers', answers);
}

// Funkcija za slanje validacije odgovora
export function validateAnswers(validations) {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('validateAnswers', validations);
}

// Funkcija za slanje zahteva za sledeću rundu
export function requestNextRound() {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('nextRound');
}

// Funkcija za slanje zahteva za novu igru
export function requestNewGame() {
  if (!socket || !socket.connected) {
    console.error('Socket nije inicijalizovan ili nije povezan!');
    return;
  }
  
  socket.emit('newGame');
}

// Izvoz za upotrebu u drugim modulima
export default {
  socket,
  initializeSocket,
  createGame,
  joinGame,
  sendReadyStatus,
  selectLetter,
  submitAnswers,
  validateAnswers,
  requestNextRound,
  requestNewGame
};
