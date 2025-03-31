// modules/ui.js
// Modul za upravljanje korisničkim interfejsom

import { gameState } from './gameState.js';
import { socket, selectLetter } from './socket.js';
import { logDebug } from './debugger.js';
import { submitAnswers } from './gameActions.js';

// Funkcija za postavljanje UI elemenata i eventova
export function setupUI() {
  // Postavljanje event handlera za glavne UI elemente
  setupShowDebuggerButton();
  setupCopyGameIdButton();
}

// Funkcija za prikaz odabranog ekrana
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  const targetScreen = document.getElementById(screenId + '-screen');
  if (targetScreen) {
    targetScreen.classList.add('active');
    logDebug(`Prikaz ekrana: ${screenId}`);
  } else {
    console.error(`Ekran ${screenId}-screen nije pronađen!`);
  }
  
  // Zaustavi timer kod promene ekrana
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
  }
}

// Funkcija za prikaz notifikacije
export function showNotification(message) {
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

// Funkcija za prikaz igrača u čekaonici
export function renderPlayersInLobby() {
  const playersList = document.getElementById('players-list');
  if (!playersList) return;
  
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
  
  logDebug(`Ažuriran prikaz igrača: ${gameState.players.length} igrača`);
}

// Funkcija za prikaz kategorija u čekaonici
export function renderCategoriesInLobby() {
  const categoriesList = document.getElementById('categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  gameState.categories.forEach(category => {
    const li = document.createElement('li');
    li.textContent = category;
    categoriesList.appendChild(li);
  });
  
  logDebug(`Ažuriran prikaz kategorija: ${gameState.categories.length} kategorija`);
}

// Funkcija za prikaz grida slova
export function renderLettersGrid() {
  const lettersGrid = document.getElementById('letters-grid');
  if (!lettersGrid) return;
  
  lettersGrid.innerHTML = '';
  
  // Slova srpskog alfabeta
  const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('');
  
  // Proveri da li je trenutni korisnik na potezu
  const currentPlayer = gameState.players.find(p => p.id === socket.id);
  const currentPlayerOnTurn = gameState.players.find(p => 
    gameState.players.indexOf(p) === gameState.currentPlayerIndex
  );
  const isMyTurn = currentPlayerOnTurn && currentPlayerOnTurn.id === socket.id;
  
  allLetters.forEach(letter => {
    const button = document.createElement('button');
    button.classList.add('letter-btn');
    button.textContent = letter;
    
    // Dodaj klasu ako je slovo već korišćeno
    if (gameState.usedLetters && gameState.usedLetters.includes(letter)) {
      button.classList.add('used');
      button.disabled = true;
    } else if (!isMyTurn) {
      // Ako nije igrač na potezu, onemogući dugme
      button.disabled = true;
      button.classList.add('disabled');
    } else {
      button.addEventListener('click', () => {
        selectLetter(letter);
        logDebug(`Izabrano slovo: ${letter}`);
      });
    }
    
    lettersGrid.appendChild(button);
  });
  
  logDebug('Prikazan grid slova');
}

// Funkcija za prikaz input polja za kategorije
export function renderCategoriesInputs() {
  const categoriesInputs = document.getElementById('categories-inputs');
  if (!categoriesInputs) return;
  
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

// Funkcija za prikaz tabele rezultata
export function renderResultsTable(answers, players, categories) {
  const resultsTable = document.getElementById('results-table');
  if (!resultsTable) return;
  
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

// Funkcija za prikaz konačnih rezultata
export function renderFinalResults(players) {
  const winnerDisplay = document.getElementById('winner-display');
  const finalScores = document.getElementById('final-scores');
  
  if (!winnerDisplay || !finalScores) return;
  
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

// Pomoćne funkcije za UI komponente

// Postavljanje dugmeta za prikaz debuggera
function setupShowDebuggerButton() {
  const showDebugBtn = document.getElementById('show-debug-btn');
  const debugInfo = document.getElementById('debug-info');
  
  if (showDebugBtn && debugInfo) {
    showDebugBtn.addEventListener('click', () => {
      const isVisible = debugInfo.style.display !== 'none';
      
      debugInfo.style.display = isVisible ? 'none' : 'block';
      showDebugBtn.textContent = isVisible ? 'Prikaži debugger' : 'Sakrij debugger';
    });
  }
  
  const debugToggleBtn = document.getElementById('debug-toggle-btn');
  if (debugToggleBtn && debugInfo) {
    debugToggleBtn.addEventListener('click', () => {
      debugInfo.style.display = 'none';
      if (showDebugBtn) {
        showDebugBtn.textContent = 'Prikaži debugger';
      }
    });
  }
}

// Postavljanje dugmeta za kopiranje ID-a igre
function setupCopyGameIdButton() {
  const copyGameIdBtn = document.getElementById('copy-game-id');
  
  if (copyGameIdBtn) {
    copyGameIdBtn.addEventListener('click', () => {
      const gameIdDisplay = document.getElementById('game-id-display');
      if (gameIdDisplay && gameIdDisplay.textContent) {
        navigator.clipboard.writeText(gameIdDisplay.textContent)
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
}

// Izvoz za upotrebu u drugim modulima
export default {
  setupUI,
  showScreen,
  showNotification,
  renderPlayersInLobby,
  renderCategoriesInLobby,
  renderLettersGrid,
  renderCategoriesInputs,
  renderResultsTable,
  renderFinalResults
};
