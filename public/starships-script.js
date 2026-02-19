let currentPageUrl = localStorage.getItem('starshipsPage') || 'https://swapi.dev/api/starships/';
let allStarships = [];
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
    await loadStarships(currentPageUrl);
  } catch (error) {
    console.log(error);
    alert('Erro ao carregar cards');
  }

  const nextButton = document.getElementById('next-button');
  nextButton.addEventListener('click', loadNextPage);

  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', loadPreviousPage);

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', filterStarships);
};

async function loadStarships(url) {
  try {
    const { json: responseJson, api } = await fetchJsonWithFallback(url);
    currentResponse = responseJson;
    allStarships = responseJson.results;
    
    currentPageUrl = url;
    localStorage.setItem('starshipsPage', url);
    displayStarships(allStarships);

    updatePaginationButtons(responseJson);
  } catch (error) {
    console.error('Erro ao carregar naves:', error);
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<p>Falha ao carregar naves. Por favor, tente novamente mais tarde.</p>';
  }
}

function displayStarships(starships) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = ''; 

  starships.forEach((starship, index) => {
    const pageNumber = new URL(currentPageUrl).searchParams.get('page') || '1';
    const starshipIndex = (pageNumber - 1) * 10 + (index + 1);
    const card = document.createElement("div");
    card.className = "cards";
    setStarshipImage(card, starship, starshipIndex);

    const starshipNameBG = document.createElement("div");
    starshipNameBG.className = "starship-name-bg";
    const starshipName = document.createElement("span");
    starshipName.className = "starship-name";
    starshipName.innerText = `${starship.name}`;
    starshipNameBG.appendChild(starshipName);
    card.appendChild(starshipNameBG);

    card.onclick = () => {
      displayStarshipModal(starship);
    };
    mainContent.appendChild(card);
  });
}

function filterStarships() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const filtered = allStarships.filter(starship => 
    starship.name.toLowerCase().includes(searchInput)
  );
  displayStarships(filtered);
}

function setStarshipImage(card, starship, starshipIndex) {
  const imagePath = `./assets/naves/${starshipIndex}.webp`;
  
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

function displayStarshipModal(starship) {
  const modal = document.getElementById("modal");
  modal.style.visibility = "visible";
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = '';

  const starshipImage = document.createElement("div");
  starshipImage.className = "starship-image";
  setStarshipImage(starshipImage, starship);

  const name = createDetailElement("Nome", starship.name);
  const model = createDetailElement("Modelo", starship.model);
  const manufacturer = createDetailElement("Fabricante", starship.manufacturer);
  const costInCredits = createDetailElement("Custo em créditos", formatCost(starship.cost_in_credits));
  const length = createDetailElement("Comprimento", `${starship.length} m`);
  const maxAtmospheringSpeed = createDetailElement("Velocidade máxima na atmosfera", formatSpeed(starship.max_atmosphering_speed));
  const crew = createDetailElement("Tripulação", starship.crew);
  const passengers = createDetailElement("Passageiros", starship.passengers);

  [starshipImage, name, model, manufacturer, costInCredits, length, maxAtmospheringSpeed, crew, passengers].forEach(el => modalContent.appendChild(el));
}

function createDetailElement(label, value) {
  const element = document.createElement("span");
  element.className = "starship-details";
  element.innerText = `${label}: ${value}`;
  return element;
}

function hideModal() {
  const modal = document.getElementById("modal");
  modal.style.visibility = "hidden";
}

function formatCost(cost) {
  if (cost === "unknown") {
    return "desconhecido";
  }
  return parseInt(cost).toLocaleString('pt-BR') + " créditos";
}

function formatSpeed(speed) {
  if (speed === "unknown") {
    return "desconhecida";
  }
  if (speed === "n/a") {
    return "não aplicável";
  }
  return speed + " km/h";
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
  await loadStarships(currentResponse.next);
}

async function loadPreviousPage() {
  if (!currentResponse.previous) return;
  await loadStarships(currentResponse.previous);
}