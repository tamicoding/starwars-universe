let currentPageUrl = localStorage.getItem('charactersPage') || 'https://swapi.dev/api/people/';
let allCharacters = [];
let currentResponse = {};

window.onload = async () => {
  try {
    await loadCharacters(currentPageUrl);
  } catch (error) {
    console.log(error);
    alert('Erro ao carregar cards');
  }

  const nextButton = document.getElementById('next-button');
  nextButton.addEventListener('click', loadNextPage);

  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', loadPreviousPage);

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', filterCharacters);
};

async function loadCharacters(url) {
  try {
    const response = await fetch(url);
    const responseJson = await response.json();
    currentResponse = responseJson;
    allCharacters = responseJson.results;
    
    currentPageUrl = url;
    localStorage.setItem('charactersPage', url);
    displayCharacters(allCharacters);

    const nextButton = document.getElementById('next-button');
    const backButton = document.getElementById('back-button');

    nextButton.disabled = !responseJson.next;
    backButton.disabled = !responseJson.previous;
    backButton.style.visibility = responseJson.previous ? 'visible' : 'hidden';
  } catch (error) {
    console.log(error);
    throw new Error('Erro ao carregar personagens');
  }
}

function displayCharacters(characters) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '';

  characters.forEach((character, index) => {
    const pageNumber = new URL(currentPageUrl).searchParams.get('page') || '1';
    const characterIndex = (pageNumber - 1) * 10 + (index + 1);
    const card = document.createElement('div');
    const imagePath = `./assets/personagens/${characterIndex}.webp`;
    
    const img = new Image();
    img.onload = () => {
      card.style.backgroundImage = `url('${imagePath}')`;
    };
    img.onerror = () => {
      card.style.backgroundColor = '#f0f0f0';
      card.style.backgroundImage = `url('./assets/placeholder.svg')`;
    };
    img.src = imagePath;
    
    card.className = 'cards';

    const characterNameBG = document.createElement('div');
    characterNameBG.className = 'character-name-bg';

    const characterName = document.createElement('span');
    characterName.className = 'character-name';
    characterName.innerText = character.name;

    characterNameBG.appendChild(characterName);
    card.appendChild(characterNameBG);

    card.onclick = () => {
      const modal = document.getElementById('modal');
      modal.style.visibility = 'visible';

      const modalContent = document.getElementById('modal-content');
      modalContent.innerHTML = '';

      const characterImage = document.createElement('div');
      const imagePath = `./assets/personagens/${character.url.replace(/\D/g, '')}.webp`;
      
      const img = new Image();
      img.onload = () => {
        characterImage.style.backgroundImage = `url('${imagePath}')`;
      };
      img.onerror = () => {
        characterImage.style.backgroundColor = '#f0f0f0';
        characterImage.style.backgroundImage = `url('./assets/placeholder.svg')`;
      };
      img.src = imagePath;
      
      characterImage.className = 'character-image';

      const name = document.createElement('span');
      name.className = 'character-details';
      name.innerText = `Nome: ${character.name}`;

      const characterHeight = document.createElement('span');
      characterHeight.className = 'character-details';
      characterHeight.innerText = `Altura: ${convertHeight(character.height)}`;

      const mass = document.createElement('span');
      mass.className = 'character-details';
      mass.innerText = `Peso: ${convertMass(character.mass)}`;

      const eyeColor = document.createElement('span');
      eyeColor.className = 'character-details';
      eyeColor.innerText = `Cor dos olhos: ${convertEyeColor(character.eye_color)}`;

      const birthYear = document.createElement('span');
      birthYear.className = 'character-details';
      birthYear.innerText = `Nascimento: ${convertBirthYear(character.birth_year)}`;

      modalContent.appendChild(characterImage);
      modalContent.appendChild(name);
      modalContent.appendChild(characterHeight);
      modalContent.appendChild(mass);
      modalContent.appendChild(eyeColor);
      modalContent.appendChild(birthYear);
    };

    mainContent.appendChild(card);
  });
}

function filterCharacters() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const filtered = allCharacters.filter(character => 
    character.name.toLowerCase().includes(searchInput)
  );
  displayCharacters(filtered);
}

function hideModal() {
  const modal = document.getElementById('modal');
  modal.style.visibility = 'hidden';
}

function convertEyeColor(eyeColor) {
  const cores = {
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

  return cores[eyeColor.toLowerCase()] || eyeColor;
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

async function loadNextPage() {
  if (!currentResponse.next) return;
  await loadCharacters(currentResponse.next);
}

async function loadPreviousPage() {
  if (!currentResponse.previous) return;
  await loadCharacters(currentResponse.previous);
}