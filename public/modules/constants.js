// modules/constants.js
// Konstantne vrednosti koje se koriste u igri

// Osnovne konstante za igru
export const GAME_SETTINGS = {
  DEFAULT_ROUND_TIME: 60,     // Trajanje runde u sekundama
  MIN_PLAYERS: 2,             // Minimalan broj igrača za početak igre
  MAX_PLAYERS: 8,             // Maksimalan broj igrača po sobi
  POINTS_PER_VALID_ANSWER: 10 // Broj poena za tačan odgovor
};

// Status igre
export const GAME_STATUS = {
  WAITING: 'waiting',           // Čekanje na igrače
  LETTER_SELECTION: 'letter_selection', // Izbor slova
  PLAYING: 'playing',           // Unos odgovora u toku
  ROUND_RESULTS: 'round_results', // Prikaz rezultata runde
  GAME_END: 'game_end'          // Kraj igre
};

// Srpski alfabet - za izbor slova
export const SERBIAN_ALPHABET = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('');

// Defaultne kategorije
export const DEFAULT_CATEGORIES = [
  'Zastava', 
  'Država', 
  'Grad', 
  'Reka', 
  'Planina', 
  'Biljka', 
  'Životinja', 
  'Hrana',
  'Predmet',
  'Zanimanje'
];

// Selektori za DOM elemente
export const DOM_SELECTORS = {
  screens: {
    welcome: 'welcome-screen',
    lobby: 'lobby-screen',
    letterSelection: 'letter-selection-screen',
    play: 'play-screen',
    roundResults: 'round-results-screen',
    finalResults: 'final-results-screen'
  },
  elements: {
    gameIdDisplay: 'game-id-display',
    playersList: 'players-list',
    categoriesList: 'categories-list',
    lettersGrid: 'letters-grid',
    currentLetter: 'current-letter',
    timer: 'timer',
    categoriesInputs: 'categories-inputs',
    resultsTable: 'results-table',
    winnerDisplay: 'winner-display',
    finalScores: 'final-scores',
    notification: 'notification'
  },
  buttons: {
    createGame: 'create-game-btn',
    joinGame: 'join-game-btn',
    ready: 'ready-btn',
    copyGameId: 'copy-game-id',
    submit: 'submit-btn',
    validate: 'validate-btn',
    nextRound: 'next-round-btn',
    newGame: 'new-game-btn'
  },
  inputs: {
    username: 'username-input',
    gameId: 'game-id-input'
  },
  messages: {
    waiting: 'waiting-message',
    currentPlayer: 'current-player-message',
    spectator: 'spectator-message',
    nextPlayer: 'next-player-message'
  },
  debugger: {
    container: 'debug-info',
    socketId: 'debug-socket-id',
    status: 'debug-status',
    events: 'debug-events',
    toggleBtn: 'debug-toggle-btn',
    showBtn: 'show-debug-btn'
  }
};

// Vremenski intervali
export const TIMERS = {
  NOTIFICATION_DISPLAY: 3000,    // Vreme prikazivanja notifikacije (ms)
  ROUND_WARNING_THRESHOLD: 10,   // Sekundi nakon kojih se prikazuje upozorenje na timer-u
  CONNECTION_TIMEOUT: 10000,     // Timeout za konekciju na server (ms)
  RECONNECT_INTERVAL: 2000,      // Interval za pokušaj ponovnog povezivanja (ms)
  MAX_RECONNECT_ATTEMPTS: 5      // Maksimalan broj pokušaja ponovnog povezivanja
};

// CSS klase za elemente
export const CSS_CLASSES = {
  active: 'active',
  hidden: 'hidden',
  warning: 'warning',
  used: 'used',
  valid: 'valid',
  invalid: 'invalid',
  host: 'host',
  ready: 'ready'
};

// Izvoz za upotrebu u drugim modulima
export default {
  GAME_SETTINGS,
  GAME_STATUS,
  SERBIAN_ALPHABET,
  DEFAULT_CATEGORIES,
  DOM_SELECTORS,
  TIMERS,
  CSS_CLASSES
};
