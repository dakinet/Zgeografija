// Inicijalizacija Socket.io konekcije
const socket = io();

// Glavne komponente aplikacije
document.addEventListener('DOMContentLoaded', () => {
  // DOM elementi
  const screens = {
    welcome: document.getElementById('welcome-screen'),
    lobby: document.getElementById('lobby-screen'),
    letterSelection: document.getElementById('letter-selection-screen'),
    play: document.getElementById('play-screen'),
    roundResults: document.getElementById('round-results-screen'),
    finalResults: document.getElementById('final-results-screen')
  };

  // Dugmići i forme
  const createGameBtn = document.getElementById('create-game-btn');
  const joinGameBtn = document.getElementById('join-game-btn');
  const readyBtn = document.getElementById('ready-btn');
  const usernameInput = document.getElementById('username-input');
  const gameIdInput = document.getElementById('game-id-input');
  const gameIdDisplay = document.getElementById('game-id-display');
  const copyGameIdBtn = document.getElementById('copy-game-id');
  const playersList = document.getElementById('players-list');
  const categoriesList = document.getElementById('categories-list');
  const lettersGrid = document.getElementById('letters-grid');
  const currentPlayerMessage = document.getElementById('current-player-message');
  const spectatorMessage = document.getElementById('spectator-message');
  const currentLetterDisplay = document.getElementById('current-letter');
  const timerDisplay = document.getElementById('timer');
  const answersForm = document.getElementById('answers-form');
  const categoriesInputs = document.getElementById('categories-inputs');
  const submitBtn = document.getElementById('submit-btn');
  const resultsTable = document.getElementById('results-table');
  const resultLetterDisplay = document.getElementById('result-letter');
  const validationControls = document.getElementById('validation-controls');
  const validateBtn = document.getElementById('validate-btn');
  const nextRoundBtn = document.getElementById('next-round-btn');
  const nextPlayerMessage = document.getElementById('next-player-message');
  const winnerDisplay = document.getElementById('winner-display');
  const finalScores = document.getElementById('final-scores');
  const newGameBtn = document.getElementById('new-game-btn');
  const waitingMessage = document.getElementById('waiting-message');

  // Stanje igre
  let gameState = {
    username: '',
    gameId: '',
    players: [],
    categories: [],
    currentPlayer: null,
    currentLetters: [],
    currentLetter: '',
    isMyTurn: false,
    myId: '',
    roundTime: 60,
    timer: null,
    answers: {},
    roundEnded: false,
    validationData: {},
    flagsCache: {} // Keš za zastave
  };

  // Pomoćne funkcije
  function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
      screen.classList.remove('active');
    });
    screens[screenId].classList.add('active');
  }

  function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, duration);
  }

  // Inicijalizacija igre
  createGameBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
      gameState.username = username;
      socket.emit('createGame', username);
    } else {
      showNotification('Unesite korisničko ime!');
    }
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
    
    gameState.username = username;
    gameState.gameId = gameId;
    
    // Onemogući dugme dok se ne dobije odgovor od servera
    joinGameBtn.disabled = true;
    joinGameBtn.textContent = 'Pridruživanje...';
    
    socket.emit('joinGame', { gameId, username });
    
    // Postavi timeout za vraćanje dugmeta u normalno stanje ako nema odgovora
    setTimeout(() => {
      joinGameBtn.disabled = false;
      joinGameBtn.textContent = 'Pridruži se';
    }, 5000);
  });

  copyGameIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(gameState.gameId)
      .then(() => {
        showNotification('Kod igre je kopiran!');
      })
      .catch(err => {
        console.error('Greška pri kopiranju:', err);
      });
  });

  readyBtn.addEventListener('click', () => {
    socket.emit('playerReady');
    readyBtn.disabled = true;
    waitingMessage.classList.remove('hidden');
  });

  // Funkcije za postavljanje UI elemenata
  function setupLobby(data) {
    gameIdDisplay.textContent = gameState.gameId;
    updatePlayersList(data.players);
    updateCategoriesList(data.categories);
  }

  function updatePlayersList(players) {
    playersList.innerHTML = '';
    players.forEach(player => {
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

  function updateCategoriesList(categories) {
    categoriesList.innerHTML = '';
    categories.forEach(category => {
      const li = document.createElement('li');
      li.textContent = category;
      categoriesList.appendChild(li);
    });
  }

  function setupLetterSelection(data) {
    const { firstPlayerIndex, firstPlayer, availableLetters } = data;
    gameState.currentLetters = availableLetters;
    
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myId);
    gameState.isMyTurn = currentPlayerIndex === firstPlayerIndex;
    
    currentPlayerMessage.textContent = gameState.isMyTurn ? 
      'Tvoj red - izaberi slovo:' : 
      `Na potezu: ${firstPlayer}`;
    
    spectatorMessage.classList.toggle('hidden', gameState.isMyTurn);
    
    renderLettersGrid();
  }

  function renderLettersGrid() {
    lettersGrid.innerHTML = '';
    
    const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZ'.split('');
    allLetters.forEach(letter => {
      const isAvailable = gameState.currentLetters.includes(letter);
      
      const button = document.createElement('button');
      button.classList.add('letter-btn');
      button.textContent = letter;
      
      if (!isAvailable) {
        button.classList.add('used');
        button.disabled = true;
      } else if (gameState.isMyTurn) {
        button.addEventListener('click', () => {
          socket.emit('chooseLetter', letter);
        });
      } else {
        button.disabled = true;
      }
      
      lettersGrid.appendChild(button);
    });
  }

  function setupPlayScreen(data) {
    const { letter, timePerRound } = data;
    gameState.currentLetter = letter;
    gameState.roundTime = timePerRound;
    gameState.roundEnded = false;
    
    currentLetterDisplay.textContent = letter;
    
    // Resetuj timer
    clearInterval(gameState.timer);
    setupTimer();
    
    renderCategoryInputs();
  }

  function setupTimer() {
    timerDisplay.textContent = gameState.roundTime;
    timerDisplay.classList.remove('warning');
    
    gameState.timer = setInterval(() => {
      gameState.roundTime--;
      timerDisplay.textContent = gameState.roundTime;
      
      if (gameState.roundTime <= 10) {
        timerDisplay.classList.add('warning');
      }
      
      if (gameState.roundTime <= 0) {
        clearInterval(gameState.timer);
        if (!gameState.roundEnded) {
          submitAnswers();
        }
      }
    }, 1000);
  }

  function renderCategoryInputs() {
    categoriesInputs.innerHTML = '';
    
    gameState.categories.forEach(category => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('category-input');
      
      const label = document.createElement('label');
      label.textContent = category;
      label.setAttribute('for', `input-${category}`);
      
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `input-${category}`;
      input.name = category;
      input.autocomplete = 'off';
      input.placeholder = `${category} na ${gameState.currentLetter}...`;
      
      // Poseban slučaj za zastave
      if (category === 'Zastava') {
        input.addEventListener('focus', () => showFlagSelector(input));
      }
      
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      
      // Ako je kategorija zastava, dodaj container za prikazivanje zastava
      if (category === 'Zastava') {
        const flagContainer = document.createElement('div');
        flagContainer.classList.add('flag-container');
        flagContainer.id = 'flag-container';
        flagContainer.style.display = 'none';
        wrapper.appendChild(flagContainer);
      }
      
      categoriesInputs.appendChild(wrapper);
    });
  }

  // Funkcija za prikazivanje selektora zastava
  async function showFlagSelector(input) {
    const flagContainer = document.getElementById('flag-container');
    
    // Prikaži kontejner
    flagContainer.style.display = 'flex';
    
    // Ako već imamo keširane zastave, prikaži ih
    if (Object.keys(gameState.flagsCache).length > 0) {
      renderFlags(gameState.flagsCache, input);
      return;
    }
    
    try {
      // Učitaj zastave sa REST Countries API-ja
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,cca2');
      const countries = await response.json();
      
      // Filtriraj samo one koji počinju sa trenutnim slovom
      const filteredCountries = countries.filter(country => {
        const countryName = country.name.common;
        return countryName.charAt(0).toUpperCase() === gameState.currentLetter;
      });
      
      // Keširaj zastave
      const flagsData = {};
      filteredCountries.forEach(country => {
        flagsData[country.name.common] = {
          name: country.name.common,
          flag: country.flags.png
        };
      });
      
      gameState.flagsCache = flagsData;
      
      renderFlags(flagsData, input);
    } catch (error) {
      console.error('Greška pri učitavanju zastava:', error);
      flagContainer.innerHTML = `<p>Greška pri učitavanju zastava. Molimo unesite ime zemlje ručno.</p>`;
    }
  }

  function renderFlags(flagsData, input) {
    const flagContainer = document.getElementById('flag-container');
    flagContainer.innerHTML = '';
    
    // Ako nema zastava za ovo slovo
    if (Object.keys(flagsData).length === 0) {
      flagContainer.innerHTML = `<p>Nema dostupnih zastava za slovo ${gameState.currentLetter}.</p>`;
      return;
    }
    
    // Prikaži sve zastave
    Object.values(flagsData).forEach(countryData => {
      const flagItem = document.createElement('div');
      flagItem.classList.add('flag-item');
      
      flagItem.innerHTML = `
        <img src="${countryData.flag}" alt="${countryData.name}" class="flag-image">
        <span class="flag-name">${countryData.name}</span>
      `;
      
      flagItem.addEventListener('click', () => {
        input.value = countryData.name;
        flagContainer.style.display = 'none';
        
        // Označimo ovu zastavu kao izabranu
        document.querySelectorAll('.flag-item').forEach(item => {
          item.classList.remove('selected');
        });
        flagItem.classList.add('selected');
      });
      
      flagContainer.appendChild(flagItem);
    });
  }

  // Slanje odgovora
  answersForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitAnswers();
  });

  function submitAnswers() {
    if (gameState.roundEnded) return;
    
    const formData = new FormData(answersForm);
    const answers = {};
    
    for (const [category, answer] of formData.entries()) {
      answers[category] = answer.trim();
    }
    
    socket.emit('submitAnswers', answers);
    submitBtn.disabled = true;
    gameState.roundEnded = true;
    
    showNotification('Odgovori poslati!');
  }

  function setupRoundResults(data) {
    const { answers, letter, categories } = data;
    gameState.answers = answers;
    resultLetterDisplay.textContent = letter;
    
    renderResultsTable(answers, categories);
    
    // Proveri da li je trenutni igrač host za prikazivanje kontrola validacije
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myId);
    const isHost = currentPlayerIndex !== -1 && gameState.players[currentPlayerIndex].isHost;
    
    validationControls.classList.toggle('hidden', !isHost);
    
    // Inicijalizuj validaciju (samo za hosta)
    if (isHost) {
      initValidation();
    }
  }

  function renderResultsTable(answers, categories) {
    resultsTable.innerHTML = '';
    
    // Kreiraj header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const playerHeaderCell = document.createElement('th');
    playerHeaderCell.textContent = 'Igrač';
    headerRow.appendChild(playerHeaderCell);
    
    categories.forEach(category => {
      const th = document.createElement('th');
      th.textContent = category;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    resultsTable.appendChild(thead);
    
    // Kreiraj body
    const tbody = document.createElement('tbody');
    
    Object.entries(answers).forEach(([playerId, playerAnswers]) => {
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;
      
      const row = document.createElement('tr');
      
      const playerCell = document.createElement('td');
      playerCell.textContent = player.username;
      row.appendChild(playerCell);
      
      categories.forEach(category => {
        const td = document.createElement('td');
        td.classList.add('answer-cell');
        
        const answer = playerAnswers[category] || '-';
        
        // Poseban slučaj za zastave
        if (category === 'Zastava' && answer !== '-' && gameState.flagsCache[answer]) {
          td.innerHTML = `
            <div class="flag-answer">
              <img src="${gameState.flagsCache[answer].flag}" alt="${answer}" class="flag-image" style="width: 40px; height: 25px;">
              <span>${answer}</span>
            </div>
          `;
        } else {
          td.textContent = answer;
        }
        
        // Dodaj kontrole za validaciju (samo za hosta)
        const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myId);
        const isHost = currentPlayerIndex !== -1 && gameState.players[currentPlayerIndex].isHost;
        
        if (isHost && answer !== '-') {
          const validationDiv = document.createElement('div');
          validationDiv.classList.add('answer-validation');
          
          validationDiv.innerHTML = `
            <span>${answer}</span>
            <div>
              <button type="button" class="validation-btn valid" data-player="${playerId}" data-category="${category}" data-action="valid">
                <i class="fas fa-check"></i>
              </button>
              <button type="button" class="validation-btn invalid" data-player="${playerId}" data-category="${category}" data-action="invalid">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
          
          td.innerHTML = '';
          td.appendChild(validationDiv);
        }
        
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    });
    
    resultsTable.appendChild(tbody);
  }

  function initValidation() {
    gameState.validationData = {};
    
    // Inicijalizuj objekte validacije
    Object.keys(gameState.answers).forEach(playerId => {
      gameState.validationData[playerId] = {};
      
      Object.entries(gameState.answers[playerId]).forEach(([category, answer]) => {
        if (answer && answer.trim() !== '') {
          // Podrazumevano je sve tačno
          gameState.validationData[playerId][category] = true;
        }
      });
    });
    
    // Dodaj event listenere za dugmiće validacije
    document.querySelectorAll('.validation-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const playerId = btn.dataset.player;
        const category = btn.dataset.category;
        const action = btn.dataset.action;
        
        // Postavi validaciju
        gameState.validationData[playerId][category] = action === 'valid';
        
        // Vizuelno obeleži aktivno dugme
        const parentDiv = btn.parentNode;
        parentDiv.querySelectorAll('.validation-btn').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });
    });
    
    // Dodaj event listener za dugme potvrde
    validateBtn.addEventListener('click', () => {
      socket.emit('validateAnswers', gameState.validationData);
      validateBtn.disabled = true;
    });
  }

  function displayRoundResults(data) {
    const { players, answers, validation } = data;
    
    gameState.players = players;
    
    // Ažuriraj rezultate u tabeli
    Object.entries(validation).forEach(([playerId, categoryValidation]) => {
      Object.entries(categoryValidation).forEach(([category, isValid]) => {
        const cell = document.querySelector(`td.answer-cell button[data-player="${playerId}"][data-category="${category}"]`);
        
        if (cell) {
          const parentCell = cell.closest('.answer-cell');
          const answer = answers[playerId][category];
          
          parentCell.innerHTML = '';
          
          // Poseban slučaj za zastave
          if (category === 'Zastava' && gameState.flagsCache[answer]) {
            parentCell.innerHTML = `
              <div class="flag-answer" style="display: flex; align-items: center; gap: 5px;">
                <img src="${gameState.flagsCache[answer].flag}" alt="${answer}" class="flag-image" style="width: 40px; height: 25px;">
                <span>${answer}</span>
                <span class="validation-icon" style="margin-left: auto; color: ${isValid ? 'green' : 'red'}">
                  <i class="fas fa-${isValid ? 'check' : 'times'}"></i>
                </span>
              </div>
            `;
          } else {
            parentCell.innerHTML = `
              <div style="display: flex; justify-content: space-between;">
                <span>${answer}</span>
                <span style="color: ${isValid ? 'green' : 'red'}">
                  <i class="fas fa-${isValid ? 'check' : 'times'}"></i>
                </span>
              </div>
            `;
          }
        }
      });
    });
    
    // Sakrij kontrole za validaciju
    validationControls.classList.add('hidden');
    
    // Prikaži kontrole za sledeću rundu
    const nextPlayerIndex = gameState.currentRound % players.length;
    const nextPlayer = players[nextPlayerIndex];
    
    nextPlayerMessage.textContent = nextPlayer.id === gameState.myId ? 
      'Tvoj red je za izbor slova!' : 
      `Na potezu: ${nextPlayer.username}`;
    
    nextRoundBtn.classList.toggle('hidden', nextPlayer.id !== gameState.myId);
    nextRoundBtn.addEventListener('click', () => {
      showScreen('letterSelection');
      nextRoundBtn.classList.add('hidden');
    });
  }

  function displayFinalResults(data) {
    const { players, winner } = data;
    
    // Prikaži pobednika
    winnerDisplay.innerHTML = `
      <p>Pobednik je:</p>
      <div class="winner-name">${winner.username}</div>
      <p>sa ${winner.score} poena!</p>
    `;
    
    // Prikaži finalne rezultate
    finalScores.innerHTML = '';
    players.forEach((player, index) => {
      const div = document.createElement('div');
      div.classList.add('final-scores-item');
      
      div.innerHTML = `
        <span>${index + 1}. ${player.username}</span>
        <span class="final-score-value">${player.score}</span>
      `;
      
      finalScores.appendChild(div);
    });
  }

  // Socket.io event handleri
  socket.on('connect', () => {
    gameState.myId = socket.id;
  });

  socket.on('gameCreated', (data) => {
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    
    setupLobby(data);
    showScreen('lobby');
  });
  
  socket.on('gameJoined', (data) => {
    gameState.gameId = data.gameId;
    gameState.players = data.players;
    gameState.categories = data.categories;
    
    setupLobby(data);
    showScreen('lobby');
  });

  socket.on('playerJoined', (data) => {
    gameState.players = data.players;
    updatePlayersList(data.players);
  });

  socket.on('playersUpdate', (data) => {
    gameState.players = data.players;
    updatePlayersList(data.players);
  });

  socket.on('gameStarted', (data) => {
    gameState.currentRound = 0;
    setupLetterSelection(data);
    showScreen('letterSelection');
  });

  socket.on('roundStarted', (data) => {
    gameState.currentLetters = data.availableLetters;
    gameState.flagsCache = {}; // Resetuj keš zastava za novo slovo
    
    setupPlayScreen(data);
    showScreen('play');
  });

  socket.on('playerSubmitted', (username) => {
    showNotification(`${username} je poslao odgovore!`);
  });

  socket.on('roundEnded', (data) => {
    clearInterval(gameState.timer);
    setupRoundResults(data);
    showScreen('roundResults');
  });

  socket.on('roundResults', (data) => {
    displayRoundResults(data);
  });

  socket.on('waitForNextRound', (data) => {
    gameState.currentRound = data.nextPlayerIndex;
    gameState.isMyTurn = data.nextPlayer === gameState.username;
  });

  socket.on('gameEnded', (data) => {
    displayFinalResults(data);
    showScreen('finalResults');
  });

  socket.on('error', (message) => {
    showNotification(message);
    
    // Vrati dugmad u normalno stanje
    joinGameBtn.disabled = false;
    joinGameBtn.textContent = 'Pridruži se';
    
    createGameBtn.disabled = false;
    readyBtn.disabled = false;
  });

  socket.on('playerLeft', (data) => {
    gameState.players = data.players;
    updatePlayersList(data.players);
    showNotification(`${data.username} je napustio igru.`);
  });

  // Povratak na početnu stranicu
  newGameBtn.addEventListener('click', () => {
    window.location.reload();
  });

  // Event listeneri za klik izvan flag containera
  document.addEventListener('click', (e) => {
    const flagContainer = document.getElementById('flag-container');
    if (flagContainer && !flagContainer.contains(e.target) && e.target.id !== 'input-Zastava') {
      flagContainer.style.display = 'none';
    }
  });
});