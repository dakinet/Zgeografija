// modules/debugger.js
// Modul za debugiranje igre

// Konstante
const DEBUG_ENABLED = true;    // Globalni prekidač za debugiranje
const LOG_TO_CONSOLE = true;   // Da li logujemo u konzolu
const MAX_LOG_ENTRIES = 50;    // Maksimalan broj logova u debugger div-u

// Elementi debuggera
let debuggerDiv;
let debuggerEvents;
let debuggerSocketId;
let debuggerStatus;
let debuggerToggleBtn;
let showDebuggerBtn;

// Funkcija za postavljanje debuggera
export function setupDebugger() {
  if (!DEBUG_ENABLED) return;
  
  // Pronađi elemente debuggera
  debuggerDiv = document.getElementById('debug-info');
  debuggerEvents = document.getElementById('debug-events');
  debuggerSocketId = document.getElementById('debug-socket-id');
  debuggerStatus = document.getElementById('debug-status');
  debuggerToggleBtn = document.getElementById('debug-toggle-btn');
  showDebuggerBtn = document.getElementById('show-debug-btn');
  
  // Postavi event listenere za kontrolu debuggera
  if (showDebuggerBtn) {
    showDebuggerBtn.addEventListener('click', toggleDebugger);
  }
  
  if (debuggerToggleBtn) {
    debuggerToggleBtn.addEventListener('click', hideDebugger);
  }
  
  logDebug('Debugger inicijalizovan');
}

// Funkcija za log debugger poruke
export function logDebug(message) {
  if (!DEBUG_ENABLED) return;
  
  // Loguj u konzolu ako je omogućeno
  if (LOG_TO_CONSOLE) {
    console.log(`[DEBUG] ${message}`);
  }
  
  // Dodaj u debugger div ako postoji
  if (debuggerEvents) {
    const time = new Date().toLocaleTimeString();
    const logEntry = `${time}: ${message}`;
    
    // Dodaj novi log na početak
    debuggerEvents.innerHTML = `<div>${logEntry}</div>` + debuggerEvents.innerHTML;
    
    // Ograniči broj logova
    const logEntries = debuggerEvents.querySelectorAll('div');
    if (logEntries.length > MAX_LOG_ENTRIES) {
      for (let i = MAX_LOG_ENTRIES; i < logEntries.length; i++) {
        if (logEntries[i]) {
          logEntries[i].remove();
        }
      }
    }
  }
}

// Funkcija za log grešaka
export function logError(error, message = '') {
  const errorMsg = message ? `${message}: ${error.message}` : error.message;
  
  // Uvek loguj greške u konzolu
  console.error(`[ERROR] ${errorMsg}`, error);
  
  // Dodaj u debugger div ako postoji
  if (debuggerEvents) {
    const time = new Date().toLocaleTimeString();
    const logEntry = `${time}: ERROR - ${errorMsg}`;
    
    // Dodaj novi log na početak (crveni tekst za greške)
    debuggerEvents.innerHTML = `<div style="color: red;">${logEntry}</div>` + debuggerEvents.innerHTML;
  }
}

// Funkcija za ažuriranje statusa
export function updateStatus(status) {
  if (debuggerStatus) {
    debuggerStatus.textContent = status;
  }
}

// Funkcija za ažuriranje Socket ID-a
export function updateSocketId(socketId) {
  if (debuggerSocketId) {
    debuggerSocketId.textContent = socketId || 'Nepovezan';
  }
}

// Funkcija za prikazivanje debuggera
export function showDebugger() {
  if (debuggerDiv) {
    debuggerDiv.style.display = 'block';
  }
  
  if (showDebuggerBtn) {
    showDebuggerBtn.textContent = 'Sakrij debugger';
  }
}

// Funkcija za sakrivanje debuggera
export function hideDebugger() {
  if (debuggerDiv) {
    debuggerDiv.style.display = 'none';
  }
  
  if (showDebuggerBtn) {
    showDebuggerBtn.textContent = 'Prikaži debugger';
  }
}

// Funkcija za toggle debuggera
export function toggleDebugger() {
  if (debuggerDiv) {
    const isVisible = debuggerDiv.style.display !== 'none';
    if (isVisible) {
      hideDebugger();
    } else {
      showDebugger();
    }
  }
}

// Funkcija za čišćenje debugger logova
export function clearDebugLogs() {
  if (debuggerEvents) {
    debuggerEvents.innerHTML = '';
  }
}

// Funkcija za logovanje Socket.io događaja
export function logSocketEvent(event, data) {
  logDebug(`Socket event: ${event}`);
  
  // Ako je uključen verbose mode, ispiši i podatke
  if (typeof data !== 'undefined') {
    if (LOG_TO_CONSOLE) {
      console.log(`Socket data:`, data);
    }
  }
}

// Funkcija za logovanje HTTP zahteva
export function logHttpRequest(method, url, status, duration) {
  const statusColor = status >= 200 && status < 300 ? 'green' : 'red';
  const message = `HTTP ${method} ${url} → ${status} (${duration}ms)`;
  
  if (LOG_TO_CONSOLE) {
    console.log(`[HTTP] ${message}`);
  }
  
  if (debuggerEvents) {
    const time = new Date().toLocaleTimeString();
    const logEntry = `${time}: ${message}`;
    
    debuggerEvents.innerHTML = `<div style="color: ${statusColor};">${logEntry}</div>` + debuggerEvents.innerHTML;
  }
}

// Funkcija za logovanje igračkih akcija
export function logPlayerAction(player, action, details = {}) {
  const message = `Player [${player}]: ${action}`;
  logDebug(message);
  
  if (LOG_TO_CONSOLE && details) {
    console.log(`Action details:`, details);
  }
}

// Funkcija za merenje performansi
export function measurePerformance(label, callback) {
  if (!DEBUG_ENABLED) {
    return callback();
  }
  
  const startTime = performance.now();
  const result = callback();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logDebug(`Performance [${label}]: ${duration.toFixed(2)}ms`);
  
  return result;
}

// Funkcija za deep inspect objekta (sa limitiranom dubinom)
export function inspectObject(obj, label = 'Object', depth = 2) {
  if (!DEBUG_ENABLED || !LOG_TO_CONSOLE) {
    return;
  }
  
  console.group(`[DEBUG] ${label} Inspection`);
  
  try {
    // Funkcija za serijalizaciju objekta sa ograničenom dubinom
    function serialize(obj, currentDepth = 0) {
      if (currentDepth >= depth) {
        return typeof obj === 'object' && obj !== null ? '[Object]' : obj;
      }
      
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item, currentDepth + 1));
      }
      
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = serialize(obj[key], currentDepth + 1);
        }
      }
      
      return result;
    }
    
    console.log(serialize(obj));
  } catch (error) {
    console.error('Error inspecting object:', error);
  }
  
  console.groupEnd();
}

// Funkcija za trace stanja igre
export function traceGameState(gameState, action) {
  if (!DEBUG_ENABLED) return;
  
  const traceData = {
    action,
    timestamp: new Date().toISOString(),
    gameId: gameState.gameId,
    playersCount: gameState.players?.length || 0,
    currentLetter: gameState.currentLetter,
    usedLetters: [...(gameState.usedLetters || [])],
    roundsPlayed: gameState.rounds?.length || 0
  };
  
  logDebug(`GameState trace: ${action}`);
  
  if (LOG_TO_CONSOLE) {
    console.log('[TRACE]', traceData);
  }
}

// Funkcija za dodavanje custom log poruke iz koda
export function logCustom(category, message, color = 'blue') {
  if (!DEBUG_ENABLED) return;
  
  const formattedMessage = `[${category.toUpperCase()}] ${message}`;
  
  if (LOG_TO_CONSOLE) {
    console.log(`%c${formattedMessage}`, `color: ${color}`);
  }
  
  if (debuggerEvents) {
    const time = new Date().toLocaleTimeString();
    const logEntry = `${time}: ${formattedMessage}`;
    
    debuggerEvents.innerHTML = `<div style="color: ${color};">${logEntry}</div>` + debuggerEvents.innerHTML;
  }
}

// Izvoz za upotrebu u drugim modulima
export default {
  setupDebugger,
  logDebug,
  logError,
  updateStatus,
  updateSocketId,
  showDebugger,
  hideDebugger,
  toggleDebugger,
  clearDebugLogs,
  logSocketEvent,
  logHttpRequest,
  logPlayerAction,
  measurePerformance,
  inspectObject,
  traceGameState,
  logCustom
};
