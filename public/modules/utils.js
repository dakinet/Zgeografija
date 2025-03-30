// modules/utils.js
// Pomoćne funkcije

// Generisanje slučajnog ID-a
export function generateRandomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return id;
}

// Generisanje slučajnog slova iz alfabeta
export function getRandomLetter(alphabet, exclude = []) {
  const availableLetters = alphabet.filter(letter => !exclude.includes(letter));
  
  if (availableLetters.length === 0) {
    return null;
  }
  
  return availableLetters[Math.floor(Math.random() * availableLetters.length)];
}

// Provera ispravnosti odgovora
export function isValidAnswer(answer, letter) {
  // Prazan odgovor nije validan
  if (!answer || answer.trim() === '') {
    return false;
  }
  
  // Odgovor mora počinjati zadatim slovom
  const firstLetter = answer.trim().charAt(0).toUpperCase();
  return firstLetter === letter.toUpperCase();
}

// Formatiranje bodova
export function formatPoints(points) {
  return `${points} ${getPointsText(points)}`;
}

// Pomoćna funkcija za pravilan oblik reči "poen"
function getPointsText(points) {
  // Pravilo za srpski jezik
  if (points % 10 === 1 && points % 100 !== 11) {
    return 'poen';
  } else if (
    (points % 10 >= 2 && points % 10 <= 4) && 
    !(points % 100 >= 12 && points % 100 <= 14)
  ) {
    return 'poena';
  } else {
    return 'poena';
  }
}

// Formatiranje vremena
export function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Sigurno dohvatanje HTML elementa
export function getElement(id) {
  const element = document.getElementById(id);
  
  if (!element) {
    console.warn(`Element sa ID-om '${id}' nije pronađen`);
  }
  
  return element;
}

// Bezbedno dodavanje event listenera
export function addEventListenerSafe(elementId, event, handler) {
  const element = getElement(elementId);
  
  if (element) {
    element.addEventListener(event, handler);
    return true;
  }
  
  return false;
}

// Kopiranje teksta u clipboard
export function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    // Moderan pristup sa Clipboard API
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(err => reject(err));
    } else {
      // Fallback na stariji pristup
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = 0;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }
  });
}

// Debounce funkcija za ograničavanje učestalosti poziva
export function debounce(func, wait = 300) {
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

// Provera da li je objekat prazan
export function isEmptyObject(obj) {
  return obj && Object.keys(obj).length === 0;
}

// Izvoz za upotrebu u drugim modulima
export default {
  generateRandomId,
  getRandomLetter,
  isValidAnswer,
  formatPoints,
  formatTime,
  getElement,
  addEventListenerSafe,
  copyToClipboard,
  debounce,
  isEmptyObject
};
