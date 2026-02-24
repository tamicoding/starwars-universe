function formatPopulation(population) {
  if (population === 'unknown') {
    return 'desconhecida';
  }

  return parseInt(population, 10).toLocaleString('pt-BR');
}

function getPlanetImageSlug(planet) {
  return planet.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const planetsPage = createSwapiResourcePage({
  resource: 'planets',
  storageKey: 'planetsPage',
  nameBgClass: 'planet-name-bg',
  nameClass: 'planet-name',
  modalImageClass: 'planet-image',
  detailsClass: 'planet-details',
  loadErrorAlert: 'Erro ao carregar cards',
  loadErrorLogPrefix: 'Erro ao carregar planetas:',
  loadErrorMessage: 'Falha ao carregar planetas. Por favor, tente novamente mais tarde.',
  getName: (planet) => planet.name,
  getCardImagePath: (planet) => `./assets/planetas/${getPlanetImageSlug(planet)}.webp`,
  getModalImagePath: (planet) => `./assets/planetas/${getPlanetImageSlug(planet)}.webp`,
  getDetails: (planet) => [
    { label: 'Nome', value: planet.name },
    { label: 'Clima', value: planet.climate },
    { label: 'Terreno', value: planet.terrain },
    { label: 'Populacao', value: formatPopulation(planet.population) },
  ],
});

window.onload = planetsPage.init;
