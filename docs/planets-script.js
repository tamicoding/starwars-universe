let currentPageUrl = localStorage.getItem('planetsPage') || 'https://swapi.dev/api/planets/';
let allPlanets = [];
let currentResponse = {};

// ---- API fallback (swapi.dev -> swapi.alternative.dev) ----
function ensureStatusEl() {
  let el = document.getElementById("api-status");
  if (el) return el;

  const container = document.querySelector(".main-container") || document.body;
  el = document.createElement("div");
  el.id = "api-status";
  el.style.margin = "10px 0 18px";
  el.style.fontSize = "0.95rem";
  el.style.opacity = "0.9";
  container.insertBefore(el, container.querySelector("#main-content") || container.firstChild);
  return el;
}

function setStatus(text) {
  const el = ensureStatusEl();
  el.textContent = text;
}

async function fetchJsonWithFallback(url, { timeoutMs = 8000 } = {}) {
  const primaryUrl = url;
  const fallbackUrl = url.includes("swapi.dev")
    ? url.replace("swapi.dev", "swapi.alternative.dev")
    : url;

  const tryFetch = async (u) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(u, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  };

  try {
    const json = await tryFetch(primaryUrl);
    return { json, api: "swapi.dev" };
  } catch {
    const json = await tryFetch(fallbackUrl);
    return { json, api: "swapi.alternative.dev" };
  }
}
// ---------------------------------------------------------

window.onload = async () => {
  try {
    await loadPlanets(currentPageUrl);
  } catch (error) {
    console.log(error);
    alert('Erro ao carregar cards');
  }

  const nextButton = document.getElementById('next-button');
  nextButton.addEventListener('click', loadNextPage);

  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', loadPreviousPage);

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', filterPlanets);
};

async function loadPlanets(url) {
  try {
    const { json: responseJson, api } = await fetchJsonWithFallback(url);
    currentResponse = responseJson;
    allPlanets = responseJson.results;
    
    currentPageUrl = url;
    localStorage.setItem('planetsPage', url);
    displayPlanets(allPlanets);

    updatePaginationButtons(responseJson);
  } catch (error) {
    console.error('Erro ao carregar planetas:', error);
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<p>Falha ao carregar planetas. Por favor, tente novamente mais tarde.</p>';
  }
}

function displayPlanets(planets) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '';

  planets.forEach((planet, index) => {
    const pageNumber = new URL(currentPageUrl).searchParams.get('page') || '1';
    const planetIndex = (pageNumber - 1) * 10 + (index + 1);
    const card = document.createElement("div");
    card.className = "cards";
    setPlanetImage(card, planet, planetIndex);

    const planetNameBG = document.createElement("div");
    planetNameBG.className = "planet-name-bg";
    const planetName = document.createElement("span");
    planetName.className = "planet-name";
    planetName.innerText = `${planet.name}`;
    planetNameBG.appendChild(planetName);
    card.appendChild(planetNameBG);

    card.onclick = () => {
      displayPlanetModal(planet, planetIndex);
    };
    mainContent.appendChild(card);
  });
}

function filterPlanets() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const filtered = allPlanets.filter(planet => 
    planet.name.toLowerCase().includes(searchInput)
  );
  displayPlanets(filtered);
}

function setPlanetImage(card, planet, planetIndex) {
  const imagePath = `./assets/planetas/${planetIndex}.webp`;
  
  const img = new Image();
  img.onload = () => {
    card.style.backgroundImage = `url('${imagePath}')`;
  };
  img.onerror = () => {
    card.style.backgroundColor = '#f0f0f0';
    card.style.backgroundImage = `url('https://via.placeholder.com/300x300?text=Sem+Imagem')`;
  };
  img.src = imagePath;
}

function displayPlanetModal(planet, planetIndex) {
  const modal = document.getElementById("modal");
  modal.style.visibility = "visible";
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = '';

  const planetImage = document.createElement("div");
  planetImage.className = "planet-image";
  
  // Usar o mesmo índice que o card usa
  const imagePath = `./assets/planetas/${planetIndex}.webp`;
  
  const img = new Image();
  img.onload = () => {
    planetImage.style.backgroundImage = `url('${imagePath}')`;
  };
  img.onerror = () => {
    planetImage.style.backgroundColor = '#f0f0f0';
    planetImage.style.backgroundImage = `url('https://via.placeholder.com/300x300?text=${planet.name}')`;
  };
  img.src = imagePath;

  const name = createDetailElement("Nome", planet.name);
  const climate = createDetailElement("Clima", planet.climate);
  const terrain = createDetailElement("Terreno", planet.terrain);
  const population = createDetailElement("População", formatPopulation(planet.population));

  [planetImage, name, climate, terrain, population].forEach(el => modalContent.appendChild(el));
}

function createDetailElement(label, value) {
  const element = document.createElement("span");
  element.className = "planet-details";
  element.innerText = `${label}: ${value}`;
  return element;
}

function hideModal() {
  const modal = document.getElementById("modal");
  modal.style.visibility = "hidden";
}

function formatPopulation(population) {
  if (population === "unknown") {
    return "desconhecida";
  }
  return parseInt(population).toLocaleString('pt-BR');
}

function updatePaginationButtons(responseJson) {
  const nextButton = document.getElementById('next-button');
  const backButton = document.getElementById('back-button');
  nextButton.disabled = !responseJson.next;
  backButton.disabled = !responseJson.previous;
  backButton.style.visibility = responseJson.previous ? "visible" : "hidden";
}

async function loadNextPage() {
  if (!currentResponse.next) return;
  await loadPlanets(currentResponse.next);
}

async function loadPreviousPage() {
  if (!currentResponse.previous) return;
  await loadPlanets(currentResponse.previous);
}
