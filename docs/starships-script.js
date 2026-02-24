function formatCost(cost) {
  if (cost === 'unknown') {
    return 'desconhecido';
  }

  return `${parseInt(cost, 10).toLocaleString('pt-BR')} creditos`;
}

function formatSpeed(speed) {
  if (speed === 'unknown') {
    return 'desconhecida';
  }

  if (speed === 'n/a') {
    return 'nao aplicavel';
  }

  return `${speed} km/h`;
}

function getStarshipImageSlug(starship) {
  return starship.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const starshipsPage = createSwapiResourcePage({
  resource: 'starships',
  storageKey: 'starshipsPage',
  nameBgClass: 'starship-name-bg',
  nameClass: 'starship-name',
  modalImageClass: 'starship-image',
  detailsClass: 'starship-details',
  loadErrorAlert: 'Erro ao carregar cards',
  loadErrorLogPrefix: 'Erro ao carregar naves:',
  loadErrorMessage: 'Falha ao carregar naves. Por favor, tente novamente mais tarde.',
  getName: (starship) => starship.name,
  getCardImagePath: (starship) => `./assets/naves/${getStarshipImageSlug(starship)}.webp`,
  getModalImagePath: (starship) => `./assets/naves/${getStarshipImageSlug(starship)}.webp`,
  getDetails: (starship) => [
    { label: 'Nome', value: starship.name },
    { label: 'Modelo', value: starship.model },
    { label: 'Fabricante', value: starship.manufacturer },
    { label: 'Custo em creditos', value: formatCost(starship.cost_in_credits) },
    { label: 'Comprimento', value: `${starship.length} m` },
    {
      label: 'Velocidade maxima na atmosfera',
      value: formatSpeed(starship.max_atmosphering_speed),
    },
    { label: 'Tripulacao', value: starship.crew },
    { label: 'Passageiros', value: starship.passengers },
  ],
});

window.onload = starshipsPage.init;
