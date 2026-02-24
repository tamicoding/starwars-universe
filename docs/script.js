function convertEyeColor(eyeColor) {
  const colors = {
    blue: 'azul',
    brown: 'castanho',
    green: 'verde',
    yellow: 'amarelo',
    black: 'preto',
    pink: 'rosa',
    red: 'vermelho',
    orange: 'laranja',
    hazel: 'avela',
    unknown: 'desconhecida',
  };

  return colors[eyeColor.toLowerCase()] || eyeColor;
}

function convertHeight(height) {
  if (height === 'unknown') {
    return 'desconhecida';
  }

  return `${(height / 100).toFixed(2)} m`;
}

function convertMass(mass) {
  if (mass === 'unknown') {
    return 'desconhecido';
  }

  return `${mass} kg`;
}

function convertBirthYear(birthYear) {
  if (birthYear === 'unknown') {
    return 'desconhecido';
  }

  return birthYear;
}

function getCharacterImageSlug(character) {
  return character.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const charactersPage = createSwapiResourcePage({
  resource: 'people',
  storageKey: 'charactersPage',
  nameBgClass: 'character-name-bg',
  nameClass: 'character-name',
  modalImageClass: 'character-image',
  detailsClass: 'character-details',
  loadErrorAlert: 'Erro ao carregar cards',
  loadErrorLogPrefix: 'Erro ao carregar personagens:',
  loadErrorMessage: 'Falha ao carregar personagens. Por favor, tente novamente mais tarde.',
  getName: (character) => character.name,
  getCardImagePath: (character) => `./assets/personagens/${getCharacterImageSlug(character)}.webp`,
  getModalImagePath: (character) => `./assets/personagens/${getCharacterImageSlug(character)}.webp`,
  getDetails: (character) => [
    { label: 'Nome', value: character.name },
    { label: 'Altura', value: convertHeight(character.height) },
    { label: 'Peso', value: convertMass(character.mass) },
    { label: 'Cor dos olhos', value: convertEyeColor(character.eye_color) },
    { label: 'Nascimento', value: convertBirthYear(character.birth_year) },
  ],
});

window.onload = charactersPage.init;
