// Osnovni klijentski kod - pojednostavljen za testiranje
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM učitan, inicijalizacija klijenta...');
    
    // Socket.io inicijalizacija - NAJVAŽNIJI DEO
    const socket = io();
    
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
    const welcomeScreen = document.getElementById('welcome-screen');
    const lobbyScreen = document.getElementById('lobby-screen');
    
    // Pomoćne funkcije
    function showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
      });
      document.getElementById(screenId + '-screen').classList.add('active');
    }
    
    function addDebugEvent(event) {
      const time = new Date().toLocaleTimeString();
      debugEvents.innerHTML = `${time}: ${event}<br>` + debugEvents.innerHTML;
    }
    
    function showNotification(message) {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.style.display = 'block';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }
    
    // Event listeneri
    showDebugBtn.addEventListener('click', () => {
      debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
      showDebugBtn.textContent = debugInfo.style.display === 'none' ? 'Prikaži debugger' : 'Sakrij debugger';
      console.log('Debug toggle clicked');
    });
    
    createGameBtn.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (!username) {
        showNotification('Unesite korisničko ime!');
        return;
      }
      
      console.log('Kreiranje igre za korisnika:', username);
      addDebugEvent(`Pokušaj kreiranja igre za: ${username}`);
      
      // Pošalji zahtev serveru
      socket.emit('createGame', username);
    });
    
    joinGameBtn.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      const gameId = gameIdInput.value.trim().toUpperCase();
      
      if (!username) {
        showNotification('Unesite korisničko ime!');
        return;
      }
      
      if (!gameId) {
        showNotification('Unesite kod igre!');
        return;
      }
      
      console.log('Pridruživanje igri:', gameId, 'kao', username);
      addDebugEvent(`Pokušaj pridruživanja igri: ${gameId}`);
      
      socket.emit('joinGame', { gameId, username });
    });
    
    // Socket.io event handleri
    socket.on('connect', () => {
      console.log('Povezan na server sa ID:', socket.id);
      debugSocketId.textContent = socket.id;
      debugStatus.textContent = 'Povezan';
      addDebugEvent('Povezan na server');
    });
    
    socket.on('disconnect', () => {
      console.log('Prekinuta veza sa serverom');
      debugStatus.textContent = 'Prekinuta veza';
      addDebugEvent('Veza sa serverom prekinuta');
    });
    
    socket.on('gameCreated', (data) => {
      console.log('Primljen gameCreated event:', data);
      addDebugEvent(`Igra kreirana: ${data.gameId}`);
      
      // Prebaci na ekran čekaonice
      showScreen('lobby');
      
      // Postavi osnovne informacije
      document.getElementById('game-id-display').textContent = data.gameId;
      
      // Prikazi igrače
      const playersList = document.getElementById('players-list');
      playersList.innerHTML = '';
      data.players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="player-item">
            <span class="player-name">${player.username}</span>
            <div>
              ${player.isHost ? '<span class="player-status host">Domaćin</span>' : ''}
            </div>
          </div>
        `;
        playersList.appendChild(li);
      });
      
      // Prikaži kategorije
      const categoriesList = document.getElementById('categories-list');
      categoriesList.innerHTML = '';
      data.categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        categoriesList.appendChild(li);
      });
    });
    
    socket.on('gameJoined', (data) => {
      console.log('Primljen gameJoined event:', data);
      addDebugEvent(`Pridružen igri: ${data.gameId}`);
      
      // Prebaci na ekran čekaonice
      showScreen('lobby');
      
      // Postavi osnovne informacije
      document.getElementById('game-id-display').textContent = data.gameId;
      
      // Prikazi igrače
      const playersList = document.getElementById('players-list');
      playersList.innerHTML = '';
      data.players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="player-item">
            <span class="player-name">${player.username}</span>
            <div>
              ${player.isHost ? '<span class="player-status host">Domaćin</span>' : ''}
            </div>
          </div>
        `;
        playersList.appendChild(li);
      });
      
      // Prikaži kategorije
      const categoriesList = document.getElementById('categories-list');
      categoriesList.innerHTML = '';
      data.categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        categoriesList.appendChild(li);
      });
    });
    
    socket.on('error', (message) => {
      console.error('Primljena greška od servera:', message);
      showNotification(message);
      addDebugEvent(`Greška: ${message}`);
    });
    
    // Inicijalizacija debuggera
    console.log('Klijent inicijalizovan');
  });