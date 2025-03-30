// modules/gameActions.js
// Modul za akcije u igri

import { gameState } from './gameState.js';
import { socket } from './socket.js';
import { logDebug } from './debugger.js';

// Funkcija za startovanje tajmera
export function startTimer(seconds) {
  // Zaustavi prethodni timer ako postoji
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  const timerDisplay = document.getElementById('timer');
  if (!timerDisplay) return;
  
  // Postavi početno vreme
  timerDisplay.textContent = seconds;
  timerDisplay.classList.remove('warning');
  
  // Startuj odbrojavanje
  gameState.timerInterval = setInterval(() => {
    const currentTime = parseInt(timerDisplay.textContent);
    
    if (currentTime <= 0) {
      clearInterval(gameState.timerInterval);
      
      // Ako nismo poslali odgovore, šaljemo trenutne
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

// Funkcija za slanje odgovora
export function submitAnswers() {
  // Prikupi odgovore iz inputa
  const inputs = document.querySelectorAll('#categories-inputs input');
  
  if (inputs.length > 0) {
    // Prikupi odgovore iz HTML forme
    inputs.forEach(input => {
      if (input.dataset.category) {
        gameState.answers[input.dataset.category] = input.value.trim();
      }
    });
  }
  
  // Pošalji odgovore na server
  socket.emit('submitAnswers', gameState.answers);
  gameState.submitted = true;
  
  // Onemogući dugme za slanje
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
  }
  
  // Onemogući inpute
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  logDebug(`Odgovori poslati`);
}

// Funkcija za sakupljanje validacija
export function collectValidations() {
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

// Funkcija za početak nove runde
export function startNextRound() {
  socket.emit('nextRound');
  
  // Resetuj stanje za novu rundu
  gameState.submitted = false;
  gameState.answers = {};
  
  // Onemogući dugme za sledeću rundu
  const nextRoundBtn = document.getElementById('next-round-btn');
  if (nextRoundBtn) {
    nextRoundBtn.disabled = true;
    nextRoundBtn.textContent = 'Čekanje...';
  }
  
  logDebug('Zahtev za sledeću rundu');
}

// Funkcija za početak nove igre
export function startNewGame() {
  socket.emit('newGame');
  logDebug('Zahtev za novu igru');
}

// Funkcija za pripremu tačnih odgovora
export function prepareValidCategories() {
  const categories = gameState.categories;
  const allLetters = 'ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWZŽ'.split('');
  
  // Podaci za primere tačnih odgovora
  const exampleData = {
    'Država': {
      'A': ['Austrija', 'Angola', 'Argentina', 'Australija'],
      'B': ['Belgija', 'Bolivija', 'Brazil', 'Bugarska'],
      'C': ['Crna Gora', 'Češka'],
      'D': ['Danska', 'Dominikanska Republika'],
      'E': ['Egipat', 'Ekvador', 'Estonija', 'Etiopija'],
      'F': ['Finska', 'Francuska', 'Filipini'],
      'G': ['Grčka', 'Gruzija', 'Gana', 'Grčka'],
      'H': ['Holandija', 'Honduras', 'Haiti'],
      'I': ['Italija', 'Indija', 'Irak', 'Iran', 'Irska', 'Island'],
      'J': ['Japan', 'Jamajka', 'Jordan', 'Južna Koreja', 'Južna Afrika'],
      'K': ['Kanada', 'Kina', 'Kolumbija', 'Kuba', 'Kazahstan', 'Kenija'],
      'L': ['Liban', 'Libija', 'Litvanija', 'Luksemburg', 'Letonija'],
      'M': ['Mađarska', 'Makedonija', 'Malta', 'Maroko', 'Meksiko', 'Moldavija'],
      'N': ['Nemačka', 'Nigerija', 'Norveška', 'Nepal', 'Novi Zeland'],
      'P': ['Pakistan', 'Panama', 'Paragvaj', 'Peru', 'Poljska', 'Portugal'],
      'R': ['Rumunija', 'Rusija', 'Ruanda'],
      'S': ['SAD', 'Sirija', 'Slovačka', 'Slovenija', 'Srbija', 'Švedska', 'Švajcarska'],
      'T': ['Tajland', 'Tajvan', 'Turska', 'Tunis'],
      'U': ['Uganda', 'Ukrajina', 'Urugvaj', 'Uzbekistan'],
      'V': ['Velika Britanija', 'Vijetnam', 'Venecuela'],
      'Z': ['Zambija', 'Zimbabve']
    },
    'Grad': {
      'A': ['Amsterdam', 'Atina', 'Ankara', 'Aleksandrija'],
      'B': ['Beograd', 'Berlin', 'Beč', 'Barselona', 'Boston', 'Baku'],
      'C': ['Cirih', 'Čikago'],
      'D': ['Dablin', 'Dabliin', 'Damask', 'Delhi'],
      'M': ['Madrid', 'Milano', 'Montreal', 'Moskva', 'Minhen', 'Miami'],
      'P': ['Pariz', 'Prag', 'Peking', 'Podgorica', 'Porto']
    },
    'Životinja': {
      'A': ['Antilopa', 'Albatros', 'Ajkula'],
      'B': ['Bik', 'Belouška', 'Buba', 'Bakalar'],
      'C': ['Cvrčak', 'Cipol'],
      'D': ['Delfin', 'Dabar', 'Drozd'],
      'M': ['Majmun', 'Medved', 'Mravojed', 'Mis'],
      'P': ['Panter', 'Papagaj', 'Pauk', 'Pile']
    }
  };
  
  // Vraća moguće tačne odgovore za kategoriju i slovo
  function getSuggestionsForLetter(category, letter) {
    // Prvo proveri da li imamo primere za ovu kategoriju i slovo
    if (exampleData[category] && exampleData[category][letter]) {
      return exampleData[category][letter];
    }
    
    return [];
  }
  
  return {
    getSuggestionsForLetter
  };
}

// Izvoz za upotrebu u drugim modulima
export default {
  startTimer,
  submitAnswers,
  collectValidations,
  startNextRound,
  startNewGame,
  prepareValidCategories
};
