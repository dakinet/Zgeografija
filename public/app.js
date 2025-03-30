// Pojednostavljen klijentski kod za Zanimljivu Geografiju
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM učitan, inicijalizacija klijenta...');
  
  // Socket.io inicijalizacija
  const socket = io();
  
  // Globalni podaci igre
  const gameState = {
    gameId: null,
    players: [],
    categories: [],
    currentLetter: null,
    isHost: false,
    username: null,
    roundTime: 60,
    timerInterval: null,
    usedLetters: [],
    answers: {},
    submitted: false
  };
  
  // Element debugger-a
  const debugInfo = document.getElementById('debug-info');
  const debugSocketId = document.getElementById('debug-socket-id');
  const debugStatus = document.getElementById('debug-status');
  const debugEvents = document.getElementById('debug-events');
  const showDebugBtn = document.getElementById('show-debug-btn');
  
  // Glavni elementi
  const createGameBtn = document.getElementById('create-game-btn');
  const joinGameBtn = document.getElementById('join-game-btn');
  const usernameInput = document.getElementById('username-input');
  const gameIdInput = document.getElementById('game-id-input');
  const readyBtn = document.getElementById('ready-btn');
  
  // Pomoćne funkcije
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId + '-screen').classList.add('active');
    logDebug(`Prikaz ekrana: ${screenId}`);
  }
  
  function logDebug(event) {
    const time = new Date().toLocaleTimeString();
    if (debugEvents) {
      debugEvents.innerHTML = `${time}: ${event}<br>` + debugEvents.innerHTML;
    }
    console.log(`[DEBUG] ${event}`);
  }
  
  function showNotification(message) {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.style.display = 'block';
      
      // Autohide nakon 3 sekunde
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }
    logDebug(`Notifikacija: ${message}`);
  }
  
  // Event listeneri
  if (showDebugBtn) {
    showDebugBtn.addEventListener('click', () => {
      debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
      showDebugBtn.textContent = debugInfo.style.display === 'none' ? 'Prikaži debugger' : 'Sakrij debugger';
      console.log('Debug toggle clicked');
    });
  }
  
  if (createGameBtn) {
    createGameBtn.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (!username) {
        showNotification('Unesite korisničko ime!');
        return;
      }
      
      console.log('Kreiranje igre za korisnika:', username);
      logDebug(`Pokušaj kreiranja igre za: ${username}`);
      
      // Pošalji zahtev serveru
      socket.emit('createGame', username);
    });
  }
  
  if (joinGameBtn) {
    joinGameBtn.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      const gameId = gameIdInput ? gameIdInput.value.trim().toUpperCase() : '';
      
      if (!username) {
        showNotification('Unesite korisničko ime!');
        return;
      }
      
      if (!gameId) {
        showNotification('Unesite kod igre!');
        return;
      }
      
      console.log('Pridruživanje igri:', gameId, 'kao', username);
      logDebug(`Pokušaj pridruživanja igri: ${gameId}`);
      
      socket.emit('joinGame', { gameId, username });
    });
  }
  
  // Socket.io event handleri
  socket.on('connect', () => {
    console.log('Povezan na server sa ID:', socket.id);
    if (debugSocketId) {
      debugSocketId.textContent = socket.id;
    }
    if (debugStatus) {
      debugStatus.textContent = 'Povezan';
    }
    logDebug('Povezan na server');
  });
  
  socket.on('disconnect', () => {
    console.log('Prekinuta veza sa serverom');
    if (debugStatus) {
      debugStatus.textContent = 'Prekinuta veza';
    }
    logDebug('Veza sa serverom prekinuta');
    showNotification('Veza sa serverom je prekinuta. Pokušajte ponovo.');
  });
  
  socket.on('gameCreated', (data) => {
    console.log('Primljen gameCreated event:', data);
    logDebug(`Igra kreirana: ${data.gameId}`);
    
    // Sačuvaj podatke u gameState
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    gameState.isHost = data.isHost;
    gameState.username = data.players.find(p => p.id === socket.id).username;
    
    // Prebaci na ekran čekaonice
    showScreen('lobby');
    
    // Postavi osnovne informacije
    const gameIdDisplay = document.getElementById('game-id-display');
    if (gameIdDisplay) {
      gameIdDisplay.textContent = data.gameId;
    }
    
    // Domaćin može videti posebne opcije
    if (data.isHost) {
      showNotification('Vi ste domaćin igre. Podelite kod igre sa prijateljima.');
    }
  });
  
  socket.on('gameJoined', (data) => {
    console.log('Primljen gameJoined event:', data);
    logDebug(`Pridružen igri: ${data.gameId}`);
    
    // Sačuvaj podatke u gameState
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    gameState.isHost = data.isHost;
    gameState.username = data.players.find(p => p.id === socket.id).username;
    
    // Prebaci na ekran čekaonice
    showScreen('lobby');
    
    // Postavi osnovne informacije
    const gameIdDisplay = document.getElementById('game-id-display');
    if (gameIdDisplay) {
      gameIdDisplay.textContent = data.gameId;
    }
    
    // Notifikacija
    showNotification('Uspešno ste se pridružili igri!');
  });
  
  socket.on('error', (message) => {
    console.error('Primljena greška od servera:', message);
    showNotification(message);
    logDebug(`Greška: ${message}`);
  });
  
  // Inicijalizacija debuggera
  console.log('Klijent inicijalizovan');
  logDebug('Klijent inicijalizovan i spreman');
});
