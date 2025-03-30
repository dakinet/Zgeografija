// server/logger.js
// Modul za logovanje

const fs = require('fs');
const path = require('path');
const config = require('./config');

// Nivoi logovanja
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Trenutni nivo logovanja
const currentLogLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

// Podesi direktorijum za logove
let logDir;
if (config.logToFile) {
  logDir = path.join(__dirname, '..', config.logDir);
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (err) {
      console.error(`Greška pri kreiranju log direktorijuma: ${err.message}`);
      config.logToFile = false;
    }
  }
}

// Format datuma za logove
function formatDate(date) {
  return date.toISOString();
}

// Format log datoteke
function getLogFilename() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}.log`;
}

// Formatiranje log poruke
function formatLogMessage(level, message, meta = {}) {
  const timestamp = formatDate(new Date());
  const logLevel = level.toUpperCase();
  
  // Dodaj ID igre ako postoji
  let metaString = '';
  if (Object.keys(meta).length > 0) {
    metaString = ' ' + JSON.stringify(meta);
  }
  
  return `[${timestamp}] [${logLevel}] ${message}${metaString}`;
}

// Funkcija za zapisivanje loga u datoteku
function writeToFile(logMessage) {
  if (!config.logToFile) return;
  
  const logFilePath = path.join(logDir, getLogFilename());
  
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error(`Greška pri pisanju loga: ${err.message}`);
    }
  });
}

// Funkcija za zapisivanje u konzolu
function writeToConsole(level, logMessage) {
  if (!config.logToConsole) return;
  
  const consoleMethod = level === 'error' ? 'error' : 
                        level === 'warn' ? 'warn' : 'log';
  
  console[consoleMethod](logMessage);
}

// Glavna funkcija za logovanje
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLogLevel) return;
  
  const logMessage = formatLogMessage(level, message, meta);
  
  writeToConsole(level, logMessage);
  writeToFile(logMessage);
}

// Interfejs za logovanje različitih nivoa
const logger = {
  error: (message, meta = {}) => log('error', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  info: (message, meta = {}) => log('info', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
  
  // Log koji se uvek zapisuje bez obzira na nivo
  critical: (message, meta = {}) => {
    const logMessage = formatLogMessage('CRITICAL', message, meta);
    console.error(logMessage);
    writeToFile(logMessage);
  },
  
  // Log za igru koji uključuje ID igre
  game: (gameId, message, meta = {}) => {
    const gameData = { gameId, ...meta };
    log('info', `[GAME] ${message}`, gameData);
  }
};

module.exports = logger;
