// server/config.js
// Konfiguracija servera

// Učitaj environment varijable
const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development';

// Osnovne konfiguracije
const config = {
  // Opšte postavke
  environment,
  isDevelopment,
  defaultPort: 3000,
  
  // Igra
  gameSettings: {
    minPlayers: 2,
    maxPlayers: 8,
    roundDuration: 60, // sekundi
    pointsPerValidAnswer: 10,
    maxRounds: 10,
    inactivityTimeout: 5 * 60 * 1000, // 5 minuta
    reconnectWindow: 3 * 60 * 1000 // 3 minuta
  },
  
  // Server
  serverSettings: {
    trustProxy: true,
    maxRequestBodySize: '1mb'
  },
  
  // Logovanje
  logLevel: isDevelopment ? 'debug' : 'info',
  logToConsole: true,
  logToFile: !isDevelopment,
  logDir: 'logs',
  
  // Čišćenje
  inactiveGameCleanupInterval: 15 * 60 * 1000, // 15 minuta
  
  // Kategorije
  defaultCategories: [
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
  ],
  
  // Srpski alfabet
  serbianAlphabet: 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('')
};

module.exports = config;
