// Glavni klijentski kod za Zanimljivu Geografiju
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
  const copyGameIdBtn = document.getElementById('copy-game-id');
  const debugToggleBtn = document.getElementById('debug-toggle-btn');
  
  // Elementi za različite ekrane
  const gameIdDisplay = document.getElementById('game-id-display');
  const playersList = document.getElementById('players-list');
  const categoriesList = document.getElementById('categories-list');
  const waitingMessage = document.getElementById('waiting-message');
  const lettersGrid = document.getElementById('letters-grid');
  const currentPlayerMessage = document.getElementById('current-player-message');
  const spectatorMessage = document.getElementById('spectator-message');
  const currentLetterDisplay = document.getElementById('current-letter');
  const timerDisplay = document.getElementById('timer');
  const categoriesInputs = document.getElementById('categories-inputs');
  const submitBtn = document.getElementById('submit-btn');
  const resultLetterDisplay = document.getElementById('result-letter');
  const validationControls = document.getElementById('validation-controls');
  const validateBtn = document.getElementById('validate-btn');
  const resultsTable = document.getElementById('results-table');
  const nextRoundBtn = document.getElementById('next-round-btn');
  const nextPlayerMessage = document.getElementById('next-player-message');
  const winnerDisplay = document.getElementById('winner-display');
  const finalScores = document.getElementById('final-scores');
  const newGameBtn = document.getElementById('new-game-btn');
  
  // Pomoćne funkcije
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId + '-screen').classList.add('active');
    logDebug(`Prikaz ekrana: ${screenId}`);
    
    // Zaustavi timer kod promene ekrana
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
    }
  }
  
  function logDebug(event) {
    const time = new Date().toLocaleTimeString();
    debugEvents.innerHTML = `${time}: ${event}<br>` + debugEvents.innerHTML;
    console.log(`[DEBUG] ${event}`);
  }
  
  function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Autohide nakon 3 sekunde
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
    
    logDebug(`Notifikacija: ${message}`);
  }
  
  function clearInputs() {
    const inputs = document.querySelectorAll('#categories-inputs input');
    inputs.forEach(input => {
      input.value = '';
    });
    gameState.answers = {};
    gameState.submitted = false;
  }
  
  function renderPlayersInLobby() {
    playersList.innerHTML = '';
    
    gameState.players.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="player-item">
          <span class="player-name">${player.username}</span>
          <div>
            ${player.isHost ? '<span class="player-status host">Domaćin</span>' : ''}
            ${player.ready ? '<span class="player-status ready">Spreman</span>' : ''}
          </div>
        </div>
      `;
      playersList.appendChild(li);
    });
  }
  
  function renderCategoriesInLobby() {
    categoriesList.innerHTML = '';
    
    gameState.categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      categoriesList.appendChild(li);
    });
  }
  
  function renderLettersGrid() {
    lettersGrid.innerHTML = '';
    
    // Slova srpskog alfabeta
    const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('');
    
    allLetters.forEach(letter => {
      const button = document.createElement('button');
      button.classList.add('letter-btn');
      button.textContent = letter;
      
      // Dodaj klasu ako je slovo već korišćeno
      if (gameState.usedLetters.includes(letter)) {
        button.classList.add('used');
        button.disabled = true;
      } else {
        button.addEventListener('click', () => {
          socket.emit('selectLetter', letter);
          logDebug(`Izabrano slovo: ${letter}`);
        });
      }
      
      lettersGrid.appendChild(button);
    });
  }
  
  function renderCategoriesInputs() {
    categoriesInputs.innerHTML = '';
    
    gameState.categories.forEach(category => {
      const div = document.createElement('div');
      div.classList.add('category-input');
      
      const label = document.createElement('label');
      label.textContent = category;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `${category} na ${gameState.currentLetter}...`;
      input.dataset.category = category;
      
      // Dodavanje autofokusa na prvi input
      if (category === gameState.categories[0]) {
        input.autofocus = true;
      }
      
      // Event listener za automatsko prebacivanje na sledeći input
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const inputs = document.querySelectorAll('#categories-inputs input');
          const currentIndex = Array.from(inputs).indexOf(e.target);
          
          if (currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          } else {
            submitAnswers();
          }
        }
      });
      
      // Sačuvaj odgovor u gameState.answers na promenu
      input.addEventListener('input', (e) => {
        gameState.answers[category] = e.target.value;
      });
      
      div.appendChild(label);
      div.appendChild(input);
      categoriesInputs.appendChild(div);
    });
  }
  
  function submitAnswers() {
    // Prikupi odgovore iz inputa
    const inputs = document.querySelectorAll('#categories-inputs input');
    
    inputs.forEach(input => {
      gameState.answers[input.dataset.category] = input.value.trim();
    });
    
    socket.emit('submitAnswers', gameState.answers);
    gameState.submitted = true;
    submitBtn.disabled = true;
    
    // Onemogući inpute
    inputs.forEach(input => {
      input.disabled = true;
    });
    
    logDebug(`Odgovori poslati`);
  }
  
  function renderResultsTable(answers, players, categories) {
    resultsTable.innerHTML = '';
    
    // Kreiranje zaglavlja tabele
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Prva ćelija zaglavlja je prazna
    const blankHeader = document.createElement('th');
    headerRow.appendChild(blankHeader);
    
    // Dodaj igrače u zaglavlje
    players.forEach(player => {
      const th = document.createElement('th');
      th.textContent = player.username;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    resultsTable.appendChild(thead);
    
    // Kreiranje tela tabele
    const tbody = document.createElement('tbody');
    
    // Za svaku kategoriju dodaj red
    categories.forEach(category => {
      const row = document.createElement('tr');
      
      // Prva ćelija je naziv kategorije
      const categoryCell = document.createElement('td');
      categoryCell.textContent = category;
      categoryCell.style.fontWeight = 'bold';
      row.appendChild(categoryCell);
      
      // Za svakog igrača dodaj ćeliju sa odgovorom
      players.forEach(player => {
        const cell = document.createElement('td');
        cell.classList.add('answer-cell');
        
        const playerAnswers = answers[player.id];
        const answer = playerAnswers && playerAnswers.categories && playerAnswers.categories[category] ? 
                      playerAnswers.categories[category] : '';
        
        // Ako je domaćin, dodaj kontrole za validaciju
        if (gameState.isHost) {
          const answerDiv = document.createElement('div');
          answerDiv.classList.add('answer-validation');
          
          const answerSpan = document.createElement('span');
          answerSpan.textContent = answer;
          
          const validBtn = document.createElement('button');
          validBtn.classList.add('validation-btn', 'valid');
          validBtn.innerHTML = '<i class="fas fa-check"></i>';
          validBtn.dataset.playerId = player.id;
          validBtn.dataset.category = category;
          validBtn.dataset.valid = 'true';
          
          const invalidBtn = document.createElement('button');
          invalidBtn.classList.add('validation-btn', 'invalid');
          invalidBtn.innerHTML = '<i class="fas fa-times"></i>';
          invalidBtn.dataset.playerId = player.id;
          invalidBtn.dataset.category = category;
          invalidBtn.dataset.valid = 'false';
          
          // Dodaj listener za validaciju
          [validBtn, invalidBtn].forEach(btn => {
            btn.addEventListener('click', (e) => {
              const validationButtons = document.querySelectorAll(`.validation-btn[data-player-id="${player.id}"][data-category="${category}"]`);
              
              validationButtons.forEach(b => {
                b.classList.remove('active');
              });
              
              e.target.closest('.validation-btn').classList.add('active');
            });
          });
          
          answerDiv.appendChild(answerSpan);
          answerDiv.appendChild(validBtn);
          answerDiv.appendChild(invalidBtn);
          
          cell.appendChild(answerDiv);
        } else {
          cell.textContent = answer;
        }
        
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    resultsTable.appendChild(tbody);
  }
  
  function collectValidations() {
    const validations = {};
    
    // Za svakog igrača
    gameState.players.forEach(player => {
      validations[player.id] = {};
      
      // Za svaku kategoriju
      gameState.categories.forEach(category => {
        const validBtn = document.querySelector(`.validation-btn[data-player-id="${player.id}"][data-category="${category}"][data-valid="true"].active`);
        const invalidBtn = document.querySelector(`.validation-btn[data-player-id="${player.id}"][data-category="${category}"][data-valid="false"].active`);
        
        // Podrazumevano odgovor nije validan
        validations[player.id][category] = !!validBtn;
      });
    });
    
    return validations;
  }
  
  function renderFinalResults(players) {
    winnerDisplay.innerHTML = '';
    finalScores.innerHTML = '';
    
    // Sortiraj igrače po bodovima
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Prikaz pobednika
    const winner = sortedPlayers[0];
    
    // Kreiraj prikaz pobednika
    const winnerTitle = document.createElement('h3');
    winnerTitle.textContent = 'Pobednik';
    
    const winnerName = document.createElement('div');
    winnerName.classList.add('winner-name');
    winnerName.textContent = winner.username;
    
    const winnerScore = document.createElement('div');
    winnerScore.textContent = `${winner.score} poena`;
    
    winnerDisplay.appendChild(winnerTitle);
    winnerDisplay.appendChild(winnerName);
    winnerDisplay.appendChild(winnerScore);
    
    // Prikaz svih rezultata
    sortedPlayers.forEach((player, index) => {
      const playerDiv = document.createElement('div');
      playerDiv.classList.add('final-scores-item');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${index + 1}. ${player.username}`;
      
      const scoreSpan = document.createElement('span');
      scoreSpan.classList.add('final-score-value');
      scoreSpan.textContent = `${player.score} poena`;
      
      playerDiv.appendChild(nameSpan);
      playerDiv.appendChild(scoreSpan);
      
      finalScores.appendChild(playerDiv);
    });
  }
  
  function startTimer(seconds) {
    // Zaustavi prethodni timer ako postoji
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }
    
    // Postavi početno vreme
    timerDisplay.textContent = seconds;
    timerDisplay.classList.remove('warning');
    
    // Startuj odbrojavanje
    gameState.timerInterval = setInterval(() => {
      const currentTime = parseInt(timerDisplay.textContent);
      
      if (currentTime <= 0) {
        clearInterval(gameState.timerInterval);
        
        // Ako nismo poslali odgovore, šaljemo prazne
        if (!gameState.submitted) {
          submitAnswers();
        }
        return;
      }
      
      // Dodaj upozorenje kad je manje od 10 sekundi
      if (currentTime <= 10) {
        timerDisplay.classList.add('warning');
      }
      
      timerDisplay.textContent = currentTime - 1;
    }, 1000);
  }
