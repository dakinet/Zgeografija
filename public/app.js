// app.js - Glavni fajl za Zanimljiva Geografija igru
import { initializeSocket, socket } from './modules/socket.js';
import { gameState } from './modules/gameState.js';
import { 
  setupUI, 
  showScreen, 
  showNotification,
  renderPlayersInLobby,
  renderCategoriesInLobby,
  renderLettersGrid,
  renderCategoriesInputs,
  renderResultsTable,
  renderFinalResults
} from './modules/ui.js';
import { 
  startTimer, 
  submitAnswers, 
  collectValidations
} from './modules/gameActions.js';
import { setupDebugger, logDebug } from './modules/debugger.js';

// Čekaj učitavanje DOM-a pre inicijalizacije
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM učitan, inicijalizacija klijenta...');
  
  // Inicijalizacija Socket.io
  initializeSocket();
  
  // Postavljanje UI elemenata i eventova
  setupUI();
  
  // Postavljanje debuggera
  setupDebugger();
  
  // Event listeneri za glavne akcije
  setupEventListeners();
  
  // Inicijalizacija Socket.io listenera
  setupSocketListeners();
  
  console.log('Klijent inicijalizovan');
  logDebug('Klijent inicijalizovan i spreman');
});

// Funkcija za postavljanje glavnih event listenera
function setupEventListeners() {
  // Kreiraj igru
  const createGameBtn = document.getElementById('create-game-btn');
  if (createGameBtn) {
    createGameBtn.addEventListener('click', () => {
      const usernameInput = document.getElementById('username-input');
      const username = usernameInput?.value.trim();
      
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
  
  // Pridruži se igri
  const joinGameBtn = document.getElementById('join-game-btn');
  if (joinGameBtn) {
    joinGameBtn.addEventListener('click', () => {
      const usernameInput = document.getElementById('username-input');
      const gameIdInput = document.getElementById('game-id-input');
      const username = usernameInput?.value.trim();
      const gameId = gameIdInput?.value.trim().toUpperCase();
      
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
  
  // Spreman
  const readyBtn = document.getElementById('ready-btn');
  if (readyBtn) {
    readyBtn.addEventListener('click', () => {
      socket.emit('playerReady');
      readyBtn.disabled = true;
      readyBtn.textContent = 'Čekanje ostalih igrača...';
      logDebug('Poslat status "spreman"');
    });
  }
  
  // Kopiraj kod igre
  const copyGameIdBtn = document.getElementById('copy-game-id');
  if (copyGameIdBtn) {
    copyGameIdBtn.addEventListener('click', () => {
      const gameIdDisplay = document.getElementById('game-id-display');
      const gameId = gameIdDisplay?.textContent;
      
      if (gameId) {
        navigator.clipboard.writeText(gameId)
          .then(() => {
            showNotification('Kod igre kopiran u clipboard!');
          })
          .catch(err => {
            console.error('Greška pri kopiranju:', err);
            showNotification('Greška pri kopiranju koda');
          });
      }
    });
  }
  
  // Forma za odgovore
  const answersForm = document.getElementById('answers-form');
  if (answersForm) {
    answersForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitAnswers();
    });
  }
  
  // Validacija odgovora
  const validateBtn = document.getElementById('validate-btn');
  if (validateBtn) {
    validateBtn.addEventListener('click', () => {
      const validations = collectValidations();
      socket.emit('validateAnswers', validations);
      validateBtn.disabled = true;
      logDebug('Poslate validacije odgovora');
    });
  }
  
  // Sledeća runda
  const nextRoundBtn = document.getElementById('next-round-btn');
  if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
      nextRoundBtn.disabled = true;
      nextRoundBtn.textContent = 'Čekanje...';
      socket.emit('nextRound');
      logDebug('Zahtev za sledeću rundu');
    });
  }
  
  // Nova igra
  const newGameBtn = document.getElementById('new-game-btn');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      socket.emit('newGame');
      logDebug('Zahtev za novu igru');
    });
  }
}

// Funkcija za postavljanje Socket.io listenera
function setupSocketListeners() {
  // Povezivanje na server
  socket.on('connect', () => {
    console.log('Povezan na server sa ID:', socket.id);
    const debugSocketId = document.getElementById('debug-socket-id');
    const debugStatus = document.getElementById('debug-status');
    
    if (debugSocketId) {
      debugSocketId.textContent = socket.id;
    }
    
    if (debugStatus) {
      debugStatus.textContent = 'Povezan';
    }
    
    logDebug('Povezan na server');
  });
  
  // Prekid veze
  socket.on('disconnect', () => {
    console.log('Prekinuta veza sa serverom');
    const debugStatus = document.getElementById('debug-status');
    
    if (debugStatus) {
      debugStatus.textContent = 'Prekinuta veza';
    }
    
    logDebug('Veza sa serverom prekinuta');
    showNotification('Veza sa serverom je prekinuta. Pokušajte ponovo.');
  });
  
  // Kreirana igra
  socket.on('gameCreated', (data) => {
    console.log('Primljen gameCreated event:', data);
    logDebug(`Igra kreirana: ${data.gameId}`);
    
    // Sačuvaj podatke u gameState
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    gameState.isHost = data.isHost;
    gameState.username = data.players.find(p => p.id === socket.id)?.username;
    
    // Prebaci na ekran čekaonice
    showScreen('lobby');
    
    // Postavi osnovne informacije
    const gameIdDisplay = document.getElementById('game-id-display');
    if (gameIdDisplay) {
      gameIdDisplay.textContent = data.gameId;
    }
    
    // Render igrača i kategorija
    renderPlayersInLobby();
    renderCategoriesInLobby();
    
    // Domaćin može videti posebne opcije
    if (data.isHost) {
      showNotification('Vi ste domaćin igre. Podelite kod igre sa prijateljima.');
    }
  });
  
  // Pridružen igri
  socket.on('gameJoined', (data) => {
    console.log('Primljen gameJoined event:', data);
    logDebug(`Pridružen igri: ${data.gameId}`);
    
    // Sačuvaj podatke u gameState
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    gameState.isHost = data.isHost;
    gameState.username = data.players.find(p => p.id === socket.id)?.username;
    
    // Prebaci na ekran čekaonice
    showScreen('lobby');
    
    // Postavi osnovne informacije
    const gameIdDisplay = document.getElementById('game-id-display');
    if (gameIdDisplay) {
      gameIdDisplay.textContent = data.gameId;
    }
    
    // Render igrača i kategorija
    renderPlayersInLobby();
    renderCategoriesInLobby();
    
    // Notifikacija
    showNotification('Uspešno ste se pridružili igri!');
  });
  
  // Greška
  socket.on('error', (message) => {
    console.error('Primljena greška od servera:', message);
    showNotification(message);
    logDebug(`Greška: ${message}`);
  });
  
  // Statusne promene igrača
  socket.on('playerStatusChanged', (data) => {
    gameState.players = data.players;
    renderPlayersInLobby();
    logDebug('Status igrača ažuriran');
    
    // Ako su svi igrači spremni, prikaži odgovarajuću poruku
    const allReady = gameState.players.every(player => player.ready);
    if (allReady) {
      const waitingMessage = document.getElementById('waiting-message');
      if (waitingMessage) {
        waitingMessage.textContent = 'Svi igrači su spremni! Igra će uskoro početi...';
        waitingMessage.classList.remove('hidden');
      }
    }
  });
  
  // Novi igrač se pridružio
  socket.on('playerJoined', (data) => {
    gameState.players = data.players;
    renderPlayersInLobby();
    
    const newPlayer = data.players[data.players.length - 1];
    showNotification(`${newPlayer.username} se pridružio igri`);
    logDebug(`Novi igrač se pridružio: ${newPlayer.username}`);
  });
  
  // Igrač je napustio igru
  socket.on('playerLeft', (data) => {
    gameState.players = data.players;
    renderPlayersInLobby();
    logDebug(`Igrač ${data.leftUsername} je napustio igru`);
    showNotification(`${data.leftUsername} je napustio igru`);
  });
  
  // Igra je započeta
  socket.on('gameStarted', (data) => {
    // Postavi status igre
    if (data.status === 'letter_selection') {
      // Prebaci na ekran za izbor slova
      showScreen('letter-selection');
      
      // Postavi poruku o igraču na potezu
      const currentPlayerMessage = document.getElementById('current-player-message');
      const spectatorMessage = document.getElementById('spectator-message');
      
      if (currentPlayerMessage && spectatorMessage) {
        const isCurrentPlayer = data.currentPlayer.id === socket.id;
        
        if (isCurrentPlayer) {
          currentPlayerMessage.textContent = 'Ti si na potezu! Izaberi slovo:';
          spectatorMessage.classList.add('hidden');
        } else {
          currentPlayerMessage.textContent = `${data.currentPlayer.username} bira slovo...`;
          spectatorMessage.classList.remove('hidden');
        }
      }
      
      // Prikaži grid slova
      renderLettersGrid();
    }
    
    logDebug('Igra je započeta');
  });
  
  // Runda je započeta (slovo je izabrano)
  socket.on('roundStarted', (data) => {
    // Sačuvaj podatke
    gameState.currentLetter = data.letter;
    gameState.roundTime = data.roundTime;
    gameState.answers = {};
    gameState.submitted = false;
    
    // Prebaci na ekran igre
    showScreen('play');
    
    // Postavi slovo
    const currentLetterDisplay = document.getElementById('current-letter');
    if (currentLetterDisplay) {
      currentLetterDisplay.textContent = data.letter;
    }
    
    // Render inputa za kategorije
    renderCategoriesInputs();
    
    // Startuj timer
    startTimer(data.roundTime);
    
    // Reset dugmeta za slanje
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }
    
    logDebug(`Runda započeta sa slovom ${data.letter}`);
  });
  
  // Igrač je predao odgovore
  socket.on('playerSubmitted', (data) => {
    showNotification(`${data.username} je predao odgovore`);
    logDebug(`${data.username} je predao odgovore`);
  });
  
  // Odgovori predati
  socket.on('answersSubmitted', () => {
    showNotification('Odgovori uspešno predati!');
    logDebug('Odgovori uspešno predati');
  });
  
  // Kraj runde
  socket.on('roundEnded', (data) => {
    // Prebaci na ekran rezultata
    showScreen('round-results');
    
    // Postavi slovo
    const resultLetterDisplay = document.getElementById('result-letter');
    if (resultLetterDisplay) {
      resultLetterDisplay.textContent = data.letter;
    }
    
    // Render tabele rezultata
    renderResultsTable(data.answers, gameState.players, data.categories);
    
    // Ako je domaćin, prikaži kontrole za validaciju
    const validationControls = document.getElementById('validation-controls');
    const validateBtn = document.getElementById('validate-btn');
    const nextPlayerMessage = document.getElementById('next-player-message');
    
    if (gameState.isHost && validationControls && validateBtn) {
      validationControls.classList.remove('hidden');
      validateBtn.disabled = false;
    } else if (validationControls && nextPlayerMessage) {
      validationControls.classList.add('hidden');
      nextPlayerMessage.textContent = 'Čekanje domaćina da potvrdi rezultate...';
    }
    
    logDebug('Runda je završena');
  });
  
  // Validacija runde
  socket.on('roundValidated', (data) => {
    // Ažuriraj igrače sa novim rezultatima
    gameState.players = data.players;
    
    // Sakrij kontrole validacije
    const validationControls = document.getElementById('validation-controls');
    if (validationControls) {
      validationControls.classList.add('hidden');
    }
    
    // Ako je sledeća faza biranje slova
    if (data.nextStatus === 'letter_selection') {
      // Prikaži dugme za sledeću rundu
      const nextRoundBtn = document.getElementById('next-round-btn');
      const nextPlayerMessage = document.getElementById('next-player-message');
      
      if (nextRoundBtn && nextPlayerMessage) {
        nextRoundBtn.classList.remove('hidden');
        nextRoundBtn.disabled = false;
        
        // Postavi poruku o sledećem igraču
        const nextPlayer = data.currentPlayer;
        nextPlayerMessage.textContent = `Sledeći na potezu: ${nextPlayer.username}`;
        
        // Ako smo mi sledeći na potezu
        if (nextPlayer.id === socket.id) {
          nextPlayerMessage.textContent += ' (Ti si na potezu!)';
        }
      }
    }
    
    logDebug('Runda validirana');
  });
  
  // Automatski prelaz na novu rundu
  socket.on('nextRound', (data) => {
    // Status igre je letter_selection
    showScreen('letter-selection');
    
    // Ažuriraj korišćena slova
    gameState.usedLetters = data.usedLetters;
    
    // Postavi poruku o igraču na potezu
    const currentPlayerMessage = document.getElementById('current-player-message');
    const spectatorMessage = document.getElementById('spectator-message');
    
    if (currentPlayerMessage && spectatorMessage) {
      const isCurrentPlayer = data.currentPlayer.id === socket.id;
      
      if (isCurrentPlayer) {
        currentPlayerMessage.textContent = 'Ti si na potezu! Izaberi slovo:';
        spectatorMessage.classList.add('hidden');
      } else {
        currentPlayerMessage.textContent = `${data.currentPlayer.username} bira slovo...`;
        spectatorMessage.classList.remove('hidden');
      }
    }
    
    // Prikaži grid slova
    renderLettersGrid();
    
    logDebug('Sledeća runda započeta');
  });
  
  // Kraj igre
  socket.on('gameEnded', (data) => {
    showScreen('final-results');
    
    // Render konačnih rezultata
    renderFinalResults(data.players);
    
    logDebug('Igra je završena');
  });
  
  // Reset igre
  socket.on('gameReset', (data) => {
    // Ažuriraj podatke
    gameState.players = data.players;
    gameState.categories = data.categories;
    gameState.usedLetters = [];
    gameState.currentLetter = null;
    
    // Prebaci na ekran čekaonice
    showScreen('lobby');
    
    // Render igrača i kategorija
    renderPlayersInLobby();
    renderCategoriesInLobby();
    
    // Reset kontrola
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
      readyBtn.disabled = false;
      readyBtn.textContent = 'Spreman';
    }
    
    logDebug('Igra je resetovana');
    showNotification('Nova igra je spremna!');
  });
}
