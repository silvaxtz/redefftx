
/* =========================================================
   FTTH MANAGER — BUSCA DE LOCALIZAÇÃO
   Arquivo: search.js
   Serviço: Nominatim / OpenStreetMap
   ========================================================= */

let searchResults = [];
let searchRequestController = null;
let searchMarker = null;
let searchResultsContainer = null;

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initSearch() {
    const input = document.getElementById("locationSearch");
    const button = document.getElementById("locationSearchBtn");

    if (!input || !button) {
        console.warn("Campo de pesquisa não encontrado.");
        return;
    }

    if (input.dataset.searchInitialized === "true") return;
    input.dataset.searchInitialized = "true";

    button.textContent = "Pesquisar";

    button.addEventListener("click", () => {
        searchLocation(input.value);
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchLocation(input.value);
        }

        if (event.key === "Escape") {
            clearSearchResults();
        }
    });

    input.addEventListener("input", () => {
        if (!input.value.trim()) {
            clearSearchResults();
        }
    });

    createSearchResultsContainer();

    // Remove a marcação quando clicar em outro ponto do mapa.
    if (map && !map._ftthSearchClearHandler) {
        map._ftthSearchClearHandler = true;

        map.on("click", event => {
            const target = event.originalEvent?.target;

            if (
                target?.closest?.(".leaflet-marker-icon") ||
                target?.closest?.(".leaflet-popup")
            ) {
                return;
            }

            clearSearchMarker();
        });
    }
}

/* =========================================================
   CONTAINER DOS RESULTADOS
   ========================================================= */

function createSearchResultsContainer() {
    const input = document.getElementById("locationSearch");

    if (!input) return null;

    let container = document.getElementById("locationSearchResults");

    if (!container) {
        container = document.createElement("div");
        container.id = "locationSearchResults";
        container.className = "location-search-results";

        if (input.parentElement) {
            input.parentElement.appendChild(container);
        }
    }

    searchResultsContainer = container;

    return container;
}

/* =========================================================
   PESQUISAR LOCALIZAÇÃO
   ========================================================= */

async function searchLocation(query) {
    const search = String(query || "").trim();

    if (search.length < 2) {
        searchToast("Digite pelo menos duas letras.", "warning");
        return;
    }

    if (searchRequestController) {
        searchRequestController.abort();
    }

    const controller = new AbortController();
    searchRequestController = controller;

    const button = document.getElementById("locationSearchBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Buscando...";
    }

    clearSearchResults();

    try {
        const params = new URLSearchParams({
            q: search,
            format: "jsonv2",
            addressdetails: "1",
            namedetails: "1",
            limit: "10",
            countrycodes: "br",
            "accept-language": "pt-BR",
            dedupe: "1"
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(
                `Erro no serviço de localização: ${response.status}`
            );
        }

        const results = await response.json();

        if (controller !== searchRequestController) return;

        searchResults = sortSearchResults(
            Array.isArray(results) ? results : [],
            search
        );

        renderSearchResults(searchResults);

        if (!searchResults.length) {
            searchToast(
                "Nenhum resultado encontrado no Brasil.",
                "warning"
            );
        }

    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Erro na busca:", error);

        searchToast(
            "Não foi possível pesquisar. Verifique sua conexão.",
            "error"
        );

    } finally {
        if (controller === searchRequestController && button) {
            button.disabled = false;
            button.textContent = "Pesquisar";
        }
    }
}

/* =========================================================
   ORDENAR RESULTADOS
   ========================================================= */

function sortSearchResults(results, query) {
    const normalizedQuery = normalizeSearchText(query);

    return [...results].sort((a, b) => {
        return (
            getSearchScore(b, normalizedQuery) -
            getSearchScore(a, normalizedQuery)
        );
    });
}

function getSearchScore(result, query) {
    const name = normalizeSearchText(getSearchTitle(result));
    const display = normalizeSearchText(result.display_name || "");
    const address = result.address || {};

    let score = Number(result.importance || 0) * 10;

    if (name === query) {
        score += 100;
    } else if (name.startsWith(query)) {
        score += 55;
    } else if (name.includes(query)) {
        score += 30;
    }

    if (display.startsWith(query)) {
        score += 15;
    }

    if (address.country_code === "br") {
        score += 10;
    }

    const type = String(result.type || "").toLowerCase();
    const category = String(result.category || "").toLowerCase();

    if (
        ["city", "town", "village", "municipality", "administrative"]
            .includes(type)
    ) {
        score += 12;
    }

    if (category === "place" || category === "boundary") {
        score += 8;
    }

    return score;
}

function normalizeSearchText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/* =========================================================
   EXIBIR RESULTADOS
   ========================================================= */

function renderSearchResults(results) {
    const container = createSearchResultsContainer();

    if (!container) return;

    container.innerHTML = "";

    if (!results.length) {
        container.style.display = "none";
        return;
    }

    results.forEach((result, index) => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "location-search-result";

        const title = document.createElement("strong");
        title.textContent = getSearchTitle(result);

        const subtitle = document.createElement("span");
        subtitle.textContent = getSearchSubtitle(result);

        item.appendChild(title);
        item.appendChild(subtitle);

        item.addEventListener("click", () => {
            selectSearchResult(index);
        });

        container.appendChild(item);
    });

    container.style.display = "block";
}

/* =========================================================
   NOME PRINCIPAL
   ========================================================= */

function getSearchTitle(result) {
    const address = result.address || {};

    return (
        result.namedetails?.name ||
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.suburb ||
        address.neighbourhood ||
        result.name ||
        result.display_name?.split(",")[0] ||
        "Local encontrado"
    );
}

/* =========================================================
   DESCRIÇÃO
   ========================================================= */

function getSearchSubtitle(result) {
    return result.display_name || "";
}

/* =========================================================
   SELECIONAR RESULTADO
   ========================================================= */

function selectSearchResult(index) {
    const result = searchResults[index];

    if (!result || !map) {
        searchToast(
            "Resultado inválido ou mapa não carregado.",
            "error"
        );
        return;
    }

    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        searchToast("Coordenadas inválidas.", "error");
        return;
    }

    clearSearchMarker();

    const position = [latitude, longitude];
    const title = getSearchTitle(result);
    const bounds = getSearchBounds(result);

    if (bounds) {
        map.flyToBounds(bounds, {
            padding: [45, 45],
            maxZoom: getZoomForSearchResult(result),
            duration: 1.2
        });
    } else {
        map.flyTo(position, getZoomForSearchResult(result), {
            animate: true,
            duration: 1.2
        });
    }

    searchMarker = L.marker(position, {
        title: title,
        riseOnHover: true,
        keyboard: true
    }).addTo(map);

    searchMarker.bindPopup(`
        <div class="search-popup">
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(result.display_name || "")}</p>

            <button
                type="button"
                onclick="clearSearchMarker()"
            >
                Remover marcação
            </button>
        </div>
    `);

    searchMarker.openPopup();

    // Compatibilidade com o código anterior.
    window.searchLocationMarker = searchMarker;

    const input = document.getElementById("locationSearch");

    if (input) {
        input.value = title;
    }

    clearSearchResults();
}

/* =========================================================
   LIMITES GEOGRÁFICOS
   ========================================================= */

function getSearchBounds(result) {
    if (
        !Array.isArray(result.boundingbox) ||
        result.boundingbox.length !== 4
    ) {
        return null;
    }

    const south = Number(result.boundingbox[0]);
    const north = Number(result.boundingbox[1]);
    const west = Number(result.boundingbox[2]);
    const east = Number(result.boundingbox[3]);

    if (![south, north, west, east].every(Number.isFinite)) {
        return null;
    }

    if (south === north || west === east) {
        return null;
    }

    return L.latLngBounds(
        [south, west],
        [north, east]
    );
}

/* =========================================================
   ZOOM AUTOMÁTICO
   ========================================================= */

function getZoomForSearchResult(result) {
    const type = String(result.type || "").toLowerCase();
    const category = String(result.category || "").toLowerCase();

    if (
        ["city", "town", "village", "municipality"].includes(type) ||
        category === "boundary"
    ) {
        return 13;
    }

    if (
        ["suburb", "neighbourhood", "quarter", "residential"].includes(type)
    ) {
        return 16;
    }

    if (
        ["road", "street", "house", "building"].includes(type)
    ) {
        return 18;
    }

    return 16;
}

/* =========================================================
   LIMPAR RESULTADOS
   ========================================================= */

function clearSearchResults() {
    const container =
        searchResultsContainer ||
        document.getElementById("locationSearchResults");

    if (container) {
        container.innerHTML = "";
        container.style.display = "none";
    }
}

/* =========================================================
   REMOVER MARCADOR
   ========================================================= */

function clearSearchMarker() {
    if (searchMarker && map && map.hasLayer(searchMarker)) {
        map.removeLayer(searchMarker);
    }

    searchMarker = null;
    window.searchLocationMarker = null;
}

/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

function searchToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}
