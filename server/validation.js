// server/validation.js
// Validacija podataka

const config = require('./config');

// Validacija korisničkog imena
function isValidUsername(username) {
  // Provera da li je username string
  if (typeof username !== 'string') {
    return false;
  }
  
  // Provera da li je username prazan
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return false;
  }
  
  // Provera dužine
  if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
    return false;
  }
  
  // Provera dozvoljenih karaktera (slova, brojevi, razmaci, crtice i podvlake)
  const usernameRegex = /^[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\s\-_]+$/;
  return usernameRegex.test(trimmedUsername);
}

// Validacija ID-a igre
function isValidGameId(gameId) {
  // Provera da li je gameId string
  if (typeof gameId !== 'string') {
    return false;
  }
  
  // Provera da li je gameId prazan
  const trimmedGameId = gameId.trim();
  if (!trimmedGameId) {
    return false;
  }
  
  // Provera dužine (6 karaktera)
  if (trimmedGameId.length !== 6) {
    return false;
  }
  
  // Provera dozvoljenih karaktera (velika slova i brojevi)
  const gameIdRegex = /^[A-Z0-9]+$/;
  return gameIdRegex.test(trimmedGameId);
}

// Validacija slova
function isValidLetter(letter) {
  // Provera da li je letter string
  if (typeof letter !== 'string') {
    return false;
  }
  
  // Provera da li je letter prazan
  const trimmedLetter = letter.trim();
  if (!trimmedLetter) {
    return false;
  }
  
  // Provera dužine (1 ili 2 karaktera za digrafe)
  if (trimmedLetter.length > 2) {
    return false;
  }
  
  // Provera da li je letter u srpskom alfabetu
  return config.serbianAlphabet.includes(trimmedLetter.toUpperCase());
}

// Validacija odgovora
function isValidAnswer(answer, letter) {
  // Prazan odgovor je validan (samo ne donosi poene)
  if (!answer || answer.trim() === '') {
    return true;
  }
  
  // Odgovor mora biti string
  if (typeof answer !== 'string') {
    return false;
  }
  
  // Odgovor mora počinjati zadatim slovom
  const trimmedAnswer = answer.trim();
  const firstLetter = trimmedAnswer.charAt(0).toUpperCase();
  
  // Provera digrafova (NJ, LJ, DŽ)
  if (letter === 'LJ' || letter === 'NJ' || letter === 'DŽ') {
    return trimmedAnswer.substring(0, 2).toUpperCase() === letter;
  }
  
  return firstLetter === letter.toUpperCase();
}

// Validacija svih odgovora
function areValidAnswers(answers, categories) {
  // Provera da li su odgovori objekat
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return false;
  }
  
  // Provera da li su sve kategorije validne
  for (const category in answers) {
    if (!categories.includes(category)) {
      return false;
    }
    
    // Odgovor mora biti string ili null
    const answer = answers[category];
    if (answer !== null && typeof answer !== 'string') {
      return false;
    }
  }
  
  return true;
}

// Validacija validacija odgovora
function areValidValidations(validations, players, categories) {
  // Provera da li su validacije objekat
  if (!validations || typeof validations !== 'object' || Array.isArray(validations)) {
    return false;
  }
  
  // Provera da li su svi igrači validni
  for (const playerId in validations) {
    // Provera da li igrač postoji
    const playerExists = players.some(player => player.id === playerId);
    if (!playerExists) {
      return false;
    }
    
    // Provera da li su validacije za igrača objekat
    const playerValidations = validations[playerId];
    if (!playerValidations || typeof playerValidations !== 'object' || Array.isArray(playerValidations)) {
      return false;
    }
    
    // Provera da li su sve kategorije validne
    for (const category in playerValidations) {
      if (!categories.includes(category)) {
        return false;
      }
      
      // Validacija mora biti boolean
      const validation = playerValidations[category];
      if (typeof validation !== 'boolean') {
        return false;
      }
    }
  }
  
  return true;
}

// Validacija vremena igranja
function isValidRoundTime(seconds) {
  // Provera da li je seconds broj
  if (typeof seconds !== 'number') {
    return false;
  }
  
  // Provera da li je seconds pozitivan broj
  if (seconds <= 0) {
    return false;
  }
  
  // Provera da li je seconds u razumnim granicama
  if (seconds < 10 || seconds > 300) {
    return false;
  }
  
  return true;
}

// Validacija kategorija
function areValidCategories(categories) {
  // Provera da li su kategorije niz
  if (!Array.isArray(categories)) {
    return false;
  }
  
  // Provera da li ima bar jednu kategoriju
  if (categories.length === 0) {
    return false;
  }
  
  // Provera da li su sve kategorije stringovi
  for (const category of categories) {
    if (typeof category !== 'string' || !category.trim()) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  isValidUsername,
  isValidGameId,
  isValidLetter,
  isValidAnswer,
  areValidAnswers,
  areValidValidations,
  isValidRoundTime,
  areValidCategories
};
