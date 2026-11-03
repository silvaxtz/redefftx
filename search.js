/* =========================================================
   FTTH MANAGER — BUSCA DE LOCALIZAÇÃO
   Arquivo: search.js
   Serviço de geocodificação: Nominatim / OpenStreetMap
   ========================================================= */

let searchResults = [];
let searchRequestController = null;

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initSearch() {
    const input = document.getElementById("locationSearch");
    const button = document.getElementById("locationSearchBtn");

    if (!input || !button) return;

    button.addEventListener("click", () => {
        searchLocation(input.value);
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchLocation(input.value);
        }
    });

    input.addEventListener("input", () => {
        if (!input.value.trim()) {
            clearSearchResults();
        }
    });
}

/* ---------------------------------------------------------
   PESQUISAR ENDEREÇO, CIDADE OU BAIRRO
--------------------------------------------------------- */

async function searchLocation(query) {
    const search = String(query || "").trim();

    if (search.length < 2) {
        searchToast("Digite pelo menos duas letras.", "warning");
        return;
    }

    if (searchRequestController) {
        searchRequestController.abort();
    }

    searchRequestController = new AbortController();

    const button = document.getElementById("locationSearchBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Buscando...";
    }

    try {
        const params = new URLSearchParams({
            q: search,
            format: "jsonv2",
            addressdetails: "1",
            limit: "8",
            countrycodes: "br"
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: searchRequestController.signal
            }
        );

        if (!response.ok) {
            throw new Error("Não foi possível consultar o serviço de localização.");
        }

        const results = await response.json();

        searchResults = Array.isArray(results) ? results : [];

        renderSearchResults(searchResults);

        if (searchResults.length === 0) {
            searchToast("Nenhum endereço encontrado.", "warning");
        }

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error("Erro na busca:", error);

        searchToast(
            "Erro ao pesquisar. Verifique sua conexão e tente novamente.",
            "error"
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Buscar";
        }
    }
}

/* ---------------------------------------------------------
   MOSTRAR RESULTADOS
--------------------------------------------------------- */

function renderSearchResults(results) {
    const input = document.getElementById("locationSearch");

    if (!input) return;

    let container = document.getElementById("locationSearchResults");

    if (!container) {
        container = document.createElement("div");

        container.id = "locationSearchResults";
        container.className = "location-search-results";

        const searchContainer = input.parentElement;

        if (searchContainer) {
            searchContainer.appendChild(container);
        }
    }

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

/* ---------------------------------------------------------
   NOME PRINCIPAL DO RESULTADO
--------------------------------------------------------- */

function getSearchTitle(result) {
    const address = result.address || {};

    return (
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.neighbourhood ||
        address.municipality ||
        result.name ||
        result.display_name.split(",")[0] ||
        "Local encontrado"
    );
}

/* ---------------------------------------------------------
   DESCRIÇÃO DO RESULTADO
--------------------------------------------------------- */

function getSearchSubtitle(result) {
    return result.display_name || "";
}

/* ---------------------------------------------------------
   SELECIONAR RESULTADO
--------------------------------------------------------- */

function selectSearchResult(index) {
    const result = searchResults[index];

    if (!result || !map) return;

    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        searchToast("Coordenadas inválidas.", "error");
        return;
    }

    const position = [latitude, longitude];

    map.flyTo(position, getZoomForSearchResult(result), {
        animate: true,
        duration: 1.2
    });

    if (window.searchLocationMarker) {
        map.removeLayer(window.searchLocationMarker);
    }

    window.searchLocationMarker = L.marker(position, {
        title: getSearchTitle(result)
    }).addTo(map);

    window.searchLocationMarker.bindPopup(
        `<strong>${escapeHTML(getSearchTitle(result))}</strong>
         <br>${escapeHTML(result.display_name || "")}`
    ).openPopup();

    const input = document.getElementById("locationSearch");

    if (input) {
        input.value = getSearchTitle(result);
    }

    clearSearchResults();
}

/* ---------------------------------------------------------
   ZOOM AUTOMÁTICO
--------------------------------------------------------- */

function getZoomForSearchResult(result) {
    const type = String(result.type || "").toLowerCase();
    const category = String(result.category || "").toLowerCase();

    if (
        type.includes("city") ||
        type.includes("town") ||
        type.includes("village") ||
        category.includes("boundary")
    ) {
        return 13;
    }

    if (
        type.includes("suburb") ||
        type.includes("neighbourhood") ||
        type.includes("residential")
    ) {
        return 16;
    }

    if (
        type.includes("road") ||
        type.includes("street") ||
        type.includes("house")
    ) {
        return 18;
    }

    return 16;
}

/* ---------------------------------------------------------
   LIMPAR RESULTADOS
--------------------------------------------------------- */

function clearSearchResults() {
    const container = document.getElementById("locationSearchResults");

    if (container) {
        container.innerHTML = "";
        container.style.display = "none";
    }
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function searchToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}

/* ---------------------------------------------------------
   LIMPAR MARCADOR DE PESQUISA
--------------------------------------------------------- */

function clearSearchMarker() {
    if (window.searchLocationMarker && map) {
        map.removeLayer(window.searchLocationMarker);
        window.searchLocationMarker = null;
    }
}
