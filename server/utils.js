// server/utils.js
// Pomoćne funkcije za server

// Generisanje slučajnog ID-a igre
function generateGameId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return id;
}

// Generisanje slučajnog slova iz alfabeta
function getRandomLetter(alphabet, exclude = []) {
  const availableLetters = alphabet.filter(letter => !exclude.includes(letter));
  
  if (availableLetters.length === 0) {
    return null;
  }
  
  return availableLetters[Math.floor(Math.random() * availableLetters.length)];
}

// Formatiranje datuma
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  return date.toISOString();
}

// Formatiranje vremena u obliku "X min Y sec"
function formatTimeElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds} sec`;
  }
  
  return `${minutes} min ${remainingSeconds} sec`;
}

// Prečišćavanje string vrednosti (trimovanje, uklanjanje višestrukih razmaka)
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str.trim().replace(/\s+/g, ' ');
}

// Generisanje slučajnog broja u opsegu (min uključen, max isključen)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

// Merenje vremena izvršavanja funkcije
function measureExecutionTime(fn, ...args) {
  const start = process.hrtime();
  const result = fn(...args);
  const diff = process.hrtime(start);
  const timeInMs = (diff[0] * 1e9 + diff[1]) / 1e6;
  
  return {
    result,
    executionTime: timeInMs
  };
}

// Zamešaj niz
function shuffleArray(array) {
  const newArray = [...array];
  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  
  return newArray;
}

// Provera ispravnosti odgovora (da počinje zadatim slovom)
function isValidAnswerForLetter(answer, letter) {
  if (!answer || typeof answer !== 'string') {
    return false;
  }
  
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return false;
  }
  
  const firstLetter = trimmedAnswer.charAt(0).toUpperCase();
  return firstLetter === letter.toUpperCase();
}

// Ukloni duplikate iz niza
function removeDuplicates(array) {
  return [...new Set(array)];
}

// Grupiranje niza po određenom kriterijumu
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    
    result[groupKey].push(item);
    return result;
  }, {});
}

// Ograničavanje izvršavanja funkcije
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Transformisanje vremena u ljudski čitljiv format
function humanReadableTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
}

module.exports = {
  generateGameId,
  getRandomLetter,
  formatDate,
  formatTimeElapsed,
  sanitizeString,
  getRandomInt,
  measureExecutionTime,
  shuffleArray,
  isValidAnswerForLetter,
  removeDuplicates,
  groupBy,
  debounce,
  humanReadableTime
};
