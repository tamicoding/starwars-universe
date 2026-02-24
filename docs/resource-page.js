function createSwapiResourcePage(config) {
  const storage = window.sessionStorage;
  let currentPageUrl =
    sanitizeStoredUrl(storage.getItem(config.storageKey), config.resource) ||
    `https://swapi.dev/api/${config.resource}/`;
  let allItems = [];
  let currentResponse = {};
  let lastFocusedElement = null;
  let searchRequestId = 0;
  let searchDebounceTimeout = null;
  let activeSearchQuery = '';

  async function init() {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modal.setAttribute('role', 'presentation');
    modalContent.setAttribute('role', 'dialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('tabindex', '-1');

    try {
      await loadItems(currentPageUrl);
    } catch (error) {
      console.log(error);
      alert(config.loadErrorAlert);
    }

    const nextButton = document.getElementById('next-button');
    nextButton.addEventListener('click', loadNextPage);

    const backButton = document.getElementById('back-button');
    backButton.addEventListener('click', loadPreviousPage);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', handleSearchInput);

    document.addEventListener('keydown', handleGlobalKeydown);

    window.hideModal = hideModal;
  }

  function sanitizeStoredUrl(url, resource) {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.protocol === 'http:') {
        parsedUrl.protocol = 'https:';
      }

      if (
        parsedUrl.hostname !== 'swapi.dev' &&
        parsedUrl.hostname !== 'swapi.alternative.dev' &&
        parsedUrl.hostname !== 'swapi.info'
      ) {
        return `https://swapi.dev/api/${resource}/`;
      }

      if (parsedUrl.hostname === 'swapi.info') {
        const page = parsedUrl.searchParams.get('page') || '1';
        return page === '1'
          ? `https://swapi.dev/api/${resource}/`
          : `https://swapi.dev/api/${resource}/?page=${page}`;
      }

      return parsedUrl.toString();
    } catch (error) {
      return `https://swapi.dev/api/${config.resource}/`;
    }
  }

  async function fetchJsonWithFallback(url, { timeoutMs = 8000 } = {}) {
    const primaryUrl =
      sanitizeStoredUrl(url, config.resource) || `https://swapi.dev/api/${config.resource}/`;
    const fallbackUrl = primaryUrl.includes('swapi.dev')
      ? primaryUrl.replace('swapi.dev', 'swapi.alternative.dev')
      : primaryUrl;
    const finalFallbackUrl = buildSwapiInfoUrl(primaryUrl);

    const tryFetch = async (requestUrl) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      const json = await tryFetch(primaryUrl);
      return { json, resolvedUrl: primaryUrl };
    } catch {
      try {
        const json = await tryFetch(fallbackUrl);
        return { json, resolvedUrl: fallbackUrl };
      } catch {
        const json = await fetchSwapiInfoPage(finalFallbackUrl, { timeoutMs });
        return {
          json,
          resolvedUrl: buildCanonicalSwapiDevUrl(finalFallbackUrl),
        };
      }
    }
  }

  function buildCanonicalSwapiDevUrl(url) {
    const parsedUrl = new URL(url);
    const page = parsedUrl.searchParams.get('page') || '1';
    return page === '1'
      ? `https://swapi.dev/api/${config.resource}/`
      : `https://swapi.dev/api/${config.resource}/?page=${page}`;
  }

  function buildSwapiInfoUrl(url) {
    const parsedUrl = new URL(
      sanitizeStoredUrl(url, config.resource) || `https://swapi.dev/api/${config.resource}/`
    );
    const page = Number(parsedUrl.searchParams.get('page') || '1');
    return `https://swapi.info/api/${config.resource}?page=${page}`;
  }

  async function fetchSwapiInfoPage(url, { timeoutMs = 8000 } = {}) {
    const parsedUrl = new URL(url);
    const page = Number(parsedUrl.searchParams.get('page') || '1');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`https://swapi.info/api/${config.resource}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const items = await response.json();
      return buildPaginatedResponseFromArray(items, page);
    } finally {
      clearTimeout(timeout);
    }
  }

  function buildPaginatedResponseFromArray(items, page, pageSize = 10) {
    const safePage = Math.max(1, page);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const results = items.slice(startIndex, endIndex).map(normalizeSwapiInfoItem);
    const totalPages = Math.ceil(items.length / pageSize);

    return {
      count: items.length,
      next:
        safePage < totalPages ? `https://swapi.info/api/${config.resource}?page=${safePage + 1}` : null,
      previous:
        safePage > 1 ? `https://swapi.info/api/${config.resource}?page=${safePage - 1}` : null,
      results,
    };
  }

  function normalizeSwapiInfoItem(item) {
    const normalizedUrl = item.url
      ? item.url.replace(`https://swapi.info/api/${config.resource}/`, `https://swapi.dev/api/${config.resource}/`) + '/'
      : '';

    return {
      ...item,
      url: normalizedUrl,
    };
  }

  async function loadItems(url) {
    renderLoadingState();

    try {
      const { json: responseJson, resolvedUrl } = await fetchJsonWithFallback(url);
      currentResponse = responseJson;
      allItems = responseJson.results;

      currentPageUrl = resolvedUrl;
      storage.setItem(config.storageKey, resolvedUrl);
      displayItems(allItems);
      updatePaginationButtons(responseJson);
    } catch (error) {
      console.error(config.loadErrorLogPrefix, error);
      renderErrorState();
      throw error;
    }
  }

  function renderLoadingState() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';

    for (let index = 0; index < 10; index += 1) {
      const skeletonCard = document.createElement('div');
      skeletonCard.className = 'cards skeleton-card';
      skeletonCard.setAttribute('aria-hidden', 'true');

      const skeletonFooter = document.createElement('div');
      skeletonFooter.className = `${config.nameBgClass} skeleton-name-bg`;

      const skeletonLine = document.createElement('span');
      skeletonLine.className = 'skeleton-line';

      skeletonFooter.appendChild(skeletonLine);
      skeletonCard.appendChild(skeletonFooter);
      mainContent.appendChild(skeletonCard);
    }
  }

  function renderErrorState(options = {}) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';

    const errorBox = document.createElement('div');
    errorBox.className = 'error-state';

    const errorTitle = document.createElement('h3');
    errorTitle.className = 'error-state-title';
    errorTitle.innerText = options.title || config.errorTitle || 'Nao foi possivel carregar os dados';

    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-state-message';
    errorMessage.innerText = options.message || config.loadErrorMessage;

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'error-state-button';
    retryButton.innerText = 'Tentar novamente';
    retryButton.onclick = () => {
      loadItems(currentPageUrl);
    };

    errorBox.appendChild(errorTitle);
    errorBox.appendChild(errorMessage);
    errorBox.appendChild(retryButton);
    mainContent.appendChild(errorBox);
  }

  function renderEmptyState(query) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';

    const emptyBox = document.createElement('div');
    emptyBox.className = 'error-state empty-state';

    const emptyTitle = document.createElement('h3');
    emptyTitle.className = 'error-state-title';
    emptyTitle.innerText = 'Nenhum resultado encontrado';

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'error-state-message';
    emptyMessage.innerText = `Nao encontramos resultados para "${query}".`;

    emptyBox.appendChild(emptyTitle);
    emptyBox.appendChild(emptyMessage);
    mainContent.appendChild(emptyBox);
  }

  function displayItems(items) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';

    items.forEach((item, index) => {
      const pageNumber = Number(new URL(currentPageUrl).searchParams.get('page') || '1');
      const assetIndex = (pageNumber - 1) * 10 + (index + 1);
      const card = document.createElement('div');
      const imagePath = config.getCardImagePath(item, assetIndex, getItemId);

      card.className = 'cards';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Abrir detalhes de ${config.getName(item)}`);

      applyBackgroundImage(card, imagePath);

      const nameBg = document.createElement('div');
      nameBg.className = config.nameBgClass;

      const name = document.createElement('span');
      name.className = config.nameClass;
      setHighlightedText(name, config.getName(item), activeSearchQuery);

      nameBg.appendChild(name);
      card.appendChild(nameBg);

      card.onclick = () => openModal(item, assetIndex);
      card.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal(item, assetIndex);
        }
      };

      mainContent.appendChild(card);
    });
  }

  function getItemId(item) {
    if (!item || !item.url) {
      return null;
    }

    const matches = item.url.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return null;
    }

    return matches[matches.length - 1];
  }

  function setHighlightedText(element, text, query) {
    element.innerHTML = '';

    if (!query) {
      element.innerText = text;
      return;
    }

    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const matchIndex = normalizedText.indexOf(normalizedQuery);

    if (matchIndex === -1) {
      element.innerText = text;
      return;
    }

    const before = text.slice(0, matchIndex);
    const match = text.slice(matchIndex, matchIndex + query.length);
    const after = text.slice(matchIndex + query.length);

    if (before) {
      element.appendChild(document.createTextNode(before));
    }

    const highlight = document.createElement('mark');
    highlight.className = 'search-highlight';
    highlight.innerText = match;
    element.appendChild(highlight);

    if (after) {
      element.appendChild(document.createTextNode(after));
    }
  }

  function applyBackgroundImage(element, imagePath) {
    const img = new Image();

    img.onload = () => {
      element.style.backgroundImage = `url('${imagePath}')`;
    };

    img.onerror = () => {
      element.style.backgroundColor = '#f0f0f0';
      element.style.backgroundImage = `url('./assets/placeholder.svg')`;
    };

    img.src = imagePath;
  }

  function openModal(item, assetIndex) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    lastFocusedElement = document.activeElement;
    modal.style.visibility = 'visible';
    modal.setAttribute('aria-hidden', 'false');
    modalContent.innerHTML = '';
    modalContent.setAttribute('aria-label', `Detalhes de ${config.getName(item)}`);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'modal-close';
    closeButton.setAttribute('aria-label', 'Fechar modal');
    closeButton.innerText = 'Fechar';
    closeButton.onclick = () => hideModal();

    const imageElement = document.createElement('div');
    imageElement.className = config.modalImageClass;
    applyBackgroundImage(imageElement, config.getModalImagePath(item, assetIndex, getItemId));

    modalContent.appendChild(closeButton);
    modalContent.appendChild(imageElement);

    config.getDetails(item).forEach(({ label, value }) => {
      const detail = document.createElement('span');
      detail.className = config.detailsClass;
      detail.innerText = `${label}: ${value}`;
      modalContent.appendChild(detail);
    });

    requestAnimationFrame(() => {
      closeButton.focus();
    });
  }

  async function handleSearchInput(event) {
    const query = event.target.value.trim();
    clearTimeout(searchDebounceTimeout);

    searchDebounceTimeout = setTimeout(async () => {
      searchRequestId += 1;
      const currentRequestId = searchRequestId;

      if (!query) {
        activeSearchQuery = '';
        displayItems(allItems);
        updatePaginationButtons(currentResponse);
        return;
      }

      renderLoadingState();

      try {
        const responseJson = await fetchSearchResults(query);

        if (currentRequestId !== searchRequestId) {
          return;
        }

        activeSearchQuery = query;
        const results = responseJson.results || [];
        if (results.length === 0) {
          renderEmptyState(query);
        } else {
          displayItems(results);
        }

        updatePaginationButtons({
          next: null,
          previous: null,
        });
      } catch (error) {
        if (currentRequestId !== searchRequestId) {
          return;
        }

        console.error(`${config.loadErrorLogPrefix} busca:`, error);
        renderErrorState({
          title: 'Nao foi possivel pesquisar agora',
          message: 'Tente novamente em instantes ou limpe a busca para voltar a navegacao normal.',
        });
      }
    }, 300);
  }

  async function fetchSearchResults(query) {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://swapi.dev/api/${config.resource}/?search=${encodedQuery}`;
    const alternativeUrl = `https://swapi.alternative.dev/api/${config.resource}/?search=${encodedQuery}`;

    try {
      return await fetchJson(searchUrl);
    } catch {
      try {
        return await fetchJson(alternativeUrl);
      } catch {
        const response = await fetch(`https://swapi.info/api/${config.resource}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const items = await response.json();
        const normalizedItems = items.map(normalizeSwapiInfoItem);
        const loweredQuery = query.toLowerCase();

        return {
          count: normalizedItems.length,
          results: normalizedItems.filter((item) =>
            config.getName(item).toLowerCase().includes(loweredQuery)
          ),
        };
      }
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  }

  function handleGlobalKeydown(event) {
    const modal = document.getElementById('modal');
    const modalIsOpen = modal.style.visibility === 'visible';

    if (event.key === 'Escape' && modalIsOpen) {
      hideModal();
      return;
    }

    if (event.key === 'Tab' && modalIsOpen) {
      trapFocus(event);
    }
  }

  function hideModal(event) {
    if (event && event.target !== event.currentTarget) {
      return;
    }

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    modal.style.visibility = 'hidden';
    modal.setAttribute('aria-hidden', 'true');
    modalContent.removeAttribute('aria-label');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function trapFocus(event) {
    const modalContent = document.getElementById('modal-content');
    const focusableElements = modalContent.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      modalContent.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function updatePaginationButtons(responseJson) {
    const nextButton = document.getElementById('next-button');
    const backButton = document.getElementById('back-button');
    nextButton.disabled = !responseJson.next;
    backButton.disabled = !responseJson.previous;
    backButton.style.visibility = responseJson.previous ? 'visible' : 'hidden';
  }

  async function loadNextPage() {
    if (!currentResponse.next) return;
    await loadItems(currentResponse.next);
  }

  async function loadPreviousPage() {
    if (!currentResponse.previous) return;
    await loadItems(currentResponse.previous);
  }

  return { init, hideModal };
}
