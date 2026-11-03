/* =========================================================
   FTTH MANAGER — GERENCIAMENTO DE CABOS
   Arquivo: cables.js
   ========================================================= */

/* ---------------------------------------------------------
   PADRÃO DE CORES DAS FIBRAS ÓPTICAS
--------------------------------------------------------- */

const FIBER_COLORS = [
    { number: 1, name: "Azul", color: "#0070c0" },
    { number: 2, name: "Laranja", color: "#ff8c00" },
    { number: 3, name: "Verde", color: "#008000" },
    { number: 4, name: "Marrom", color: "#8b4513" },
    { number: 5, name: "Cinza", color: "#808080" },
    { number: 6, name: "Branco", color: "#f5f5f5" },
    { number: 7, name: "Vermelho", color: "#e00000" },
    { number: 8, name: "Preto", color: "#171717" },
    { number: 9, name: "Amarelo", color: "#ffd700" },
    { number: 10, name: "Violeta", color: "#800080" },
    { number: 11, name: "Rosa", color: "#ff69b4" },
    { number: 12, name: "Aqua", color: "#00bcd4" }
];

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initCables() {
    if (!Array.isArray(data.cables)) {
        data.cables = [];
    }

    renderCableList();
}

/* ---------------------------------------------------------
   LOCALIZAR CABO
--------------------------------------------------------- */

function findCable(cableId) {
    return data.cables.find(cable => cable.id === cableId) || null;
}

/* ---------------------------------------------------------
   FORMATAR COMPRIMENTO
--------------------------------------------------------- */

function formatCableDistance(meters) {
    const value = Number(meters || 0);

    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} km`;
    }

    return `${value.toFixed(2)} m`;
}

/* ---------------------------------------------------------
   RECALCULAR COMPRIMENTO
--------------------------------------------------------- */

function recalculateCableLength(cable) {
    if (!cable || !Array.isArray(cable.points)) {
        return 0;
    }

    if (typeof calculateDrawingLength === "function") {
        return calculateDrawingLength(cable.points);
    }

    let total = 0;

    for (let i = 1; i < cable.points.length; i++) {
        const previous = cable.points[i - 1];
        const current = cable.points[i];

        total += L.latLng(
            previous.lat,
            previous.lng
        ).distanceTo(
            L.latLng(
                current.lat,
                current.lng
            )
        );
    }

    return Number(total.toFixed(2));
}

/* ---------------------------------------------------------
   RENDERIZAR LISTA DE CABOS
--------------------------------------------------------- */

function renderCableList() {
    const container = document.getElementById("cableList");

    if (!container) return;

    container.innerHTML = "";

    if (!data.cables.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Nenhum cabo cadastrado</strong>
                <span>Desenhe um cabo no mapa para começar.</span>
            </div>
        `;
        return;
    }

    data.cables.forEach(cable => {
        const length = recalculateCableLength(cable);

        const card = document.createElement("div");

        card.className = "cable-card";

        card.innerHTML = `
            <div class="cable-card-header">
                <span class="cable-color-dot"
                    style="background:${escapeHTML(cable.color || "#3388ff")}"></span>

                <div class="cable-card-title">
                    <strong>${escapeHTML(cable.name || "Cabo sem nome")}</strong>
                    <span>${Number(cable.fibers || 0)} fibras</span>
                </div>

                <button class="icon-button"
                    type="button"
                    title="Mais informações"
                    onclick="openCableDetails('${cable.id}')">
                    ⋯
                </button>
            </div>

            <div class="cable-card-info">
                <span>${formatCableDistance(length)}</span>
                <span>Espessura: ${Number(cable.width || 4)} px</span>
            </div>

            <div class="cable-card-actions">
                <button type="button"
                    class="btn-secondary"
                    onclick="locateCable('${cable.id}')">
                    Localizar
                </button>

                <button type="button"
                    class="btn-secondary"
                    onclick="editCable('${cable.id}')">
                    Editar
                </button>

                <button type="button"
                    class="btn-danger"
                    onclick="deleteCable('${cable.id}')">
                    Excluir
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

/* ---------------------------------------------------------
   DETALHES DO CABO
--------------------------------------------------------- */

function openCableDetails(cableId) {
    const cable = findCable(cableId);

    if (!cable) {
        cableToast("Cabo não encontrado.", "error");
        return;
    }

    const length = recalculateCableLength(cable);

    const fiberRows = [];

    for (let i = 1; i <= Number(cable.fibers || 0); i++) {
        const color = getFiberColor(i);

        fiberRows.push(`
            <div class="fiber-row">
                <span class="fiber-color"
                    style="background:${color.color}"></span>

                <strong>Fibra ${String(i).padStart(2, "0")}</strong>

                <span>${color.name}</span>
            </div>
        `);
    }

    const html = `
        <div class="modal-overlay" id="cableDetailsModal">
            <div class="modal equipment-modal">
                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">INFRAESTRUTURA FTTH</span>
                        <h2>${escapeHTML(cable.name)}</h2>
                    </div>

                    <button type="button"
                        class="modal-close"
                        onclick="closeCableModal()">×</button>
                </div>

                <div class="equipment-details">
                    <div class="detail-row">
                        <span>Comprimento</span>
                        <strong>${formatCableDistance(length)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Quantidade de fibras</span>
                        <strong>${Number(cable.fibers || 0)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Cor do cabo</span>
                        <strong>
                            <span class="cable-color-dot"
                                style="background:${escapeHTML(cable.color || "#3388ff")}"></span>
                            ${escapeHTML(cable.color || "#3388ff")}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Espessura no mapa</span>
                        <strong>${Number(cable.width || 4)} px</strong>
                    </div>

                    <div class="detail-row">
                        <span>Quantidade de pontos</span>
                        <strong>${cable.points?.length || 0}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Cadastrado em</span>
                        <strong>${formatCableDate(cable.createdAt)}</strong>
                    </div>
                </div>

                <h3 class="section-subtitle">Identificação das fibras</h3>

                <div class="fiber-list">
                    ${fiberRows.join("")}
                </div>

                <div class="modal-actions">
                    <button type="button"
                        class="btn-secondary"
                        onclick="closeCableModal()">Fechar</button>

                    <button type="button"
                        class="btn-primary"
                        onclick="editCable('${cable.id}')">
                        Editar cabo
                    </button>
                </div>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = html;
    }
}

/* ---------------------------------------------------------
   IDENTIFICAÇÃO DE CORES DAS FIBRAS
--------------------------------------------------------- */

function getFiberColor(number) {
    const index = (Number(number) - 1) % FIBER_COLORS.length;

    const group = Math.floor((Number(number) - 1) / 12) + 1;

    const base = FIBER_COLORS[index];

    return {
        number: Number(number),
        name: group > 1
            ? `${base.name} — Grupo ${group}`
            : base.name,
        color: base.color
    };
}

/* ---------------------------------------------------------
   EDITAR CABO
--------------------------------------------------------- */

function editCable(cableId) {
    const cable = findCable(cableId);

    if (!cable) return;

    const html = `
        <div class="modal-overlay" id="editCableModal">
            <div class="modal equipment-modal">
                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">CONFIGURAÇÃO DA REDE</span>
                        <h2>Editar cabo</h2>
                    </div>

                    <button type="button"
                        class="modal-close"
                        onclick="closeCableModal()">×</button>
                </div>

                <form id="editCableForm">
                    <div class="form-grid">

                        <div class="form-field full-width">
                            <label for="editCableName">Nome do cabo</label>
                            <input id="editCableName"
                                name="name"
                                required
                                value="${escapeHTML(cable.name || "")}">
                        </div>

                        <div class="form-field">
                            <label for="editCableColor">Cor</label>
                            <input id="editCableColor"
                                name="color"
                                type="color"
                                value="${escapeHTML(cable.color || "#3388ff")}">
                        </div>

                        <div class="form-field">
                            <label for="editCableWidth">Espessura</label>
                            <input id="editCableWidth"
                                name="width"
                                type="number"
                                min="1"
                                max="20"
                                value="${Number(cable.width || 4)}">
                        </div>

                        <div class="form-field">
                            <label for="editCableFibers">Quantidade de fibras</label>
                            <select id="editCableFibers" name="fibers">
                                ${[2, 4, 6, 8, 12, 24, 36, 48, 72, 96, 144, 288].map(value => `
                                    <option value="${value}"
                                        ${Number(cable.fibers) === value ? "selected" : ""}>
                                        ${value} fibras
                                    </option>
                                `).join("")}

                                ${![2, 4, 6, 8, 12, 24, 36, 48, 72, 96, 144, 288].includes(Number(cable.fibers))
                                    ? `<option value="${Number(cable.fibers)}" selected>${Number(cable.fibers)} fibras</option>`
                                    : ""}
                            </select>
                        </div>

                    </div>

                    <div class="modal-actions">
                        <button type="button"
                            class="btn-secondary"
                            onclick="closeCableModal()">Cancelar</button>

                        <button type="submit"
                            class="btn-primary">Salvar alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (!root) return;

    root.innerHTML = html;

    document.getElementById("editCableForm")
        .addEventListener("submit", event => {
            saveCableEdit(event, cableId);
        });
}

/* ---------------------------------------------------------
   SALVAR EDIÇÃO
--------------------------------------------------------- */

function saveCableEdit(event, cableId) {
    event.preventDefault();

    const cable = findCable(cableId);

    if (!cable) return;

    const form = new FormData(event.currentTarget);

    const name = String(form.get("name") || "").trim();
    const color = String(form.get("color") || "#3388ff");
    const width = Number(form.get("width"));
    const fibers = Number(form.get("fibers"));

    if (!name) {
        cableToast("Informe o nome do cabo.", "error");
        return;
    }

    if (
        !Number.isFinite(width) ||
        width < 1 ||
        width > 20
    ) {
        cableToast("A espessura deve estar entre 1 e 20.", "error");
        return;
    }

    if (!Number.isFinite(fibers) || fibers < 1) {
        cableToast("Quantidade de fibras inválida.", "error");
        return;
    }

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    cable.name = name;
    cable.color = color;
    cable.width = width;
    cable.fibers = fibers;
    cable.updatedAt = new Date().toISOString();

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeCableModal();

    if (typeof renderCableMap === "function") {
        renderCableMap();
    }

    renderCableList();

    if (typeof renderAll === "function") {
        renderAll();
    }

    cableToast("Cabo atualizado com sucesso.", "success");
}

/* ---------------------------------------------------------
   EXCLUIR CABO
--------------------------------------------------------- */

function deleteCable(cableId) {
    const cable = findCable(cableId);

    if (!cable) return;

    const confirmed = confirm(
        `Deseja realmente excluir o cabo "${cable.name}"?`
    );

    if (!confirmed) return;

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.cables = data.cables.filter(item => item.id !== cableId);

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeCableModal();

    if (typeof renderCableMap === "function") {
        renderCableMap();
    }

    renderCableList();

    if (typeof renderAll === "function") {
        renderAll();
    }

    cableToast("Cabo excluído.", "success");
}

/* ---------------------------------------------------------
   LOCALIZAR CABO NO MAPA
--------------------------------------------------------- */

function locateCable(cableId) {
    const cable = findCable(cableId);

    if (!cable || !map || !Array.isArray(cable.points)) {
        return;
    }

    const coordinates = cable.points.map(point => [
        Number(point.lat),
        Number(point.lng)
    ]);

    if (!coordinates.length) return;

    const bounds = L.latLngBounds(coordinates);

    map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 19,
        animate: true
    });

    closeCableModal();
}

/* ---------------------------------------------------------
   FECHAR MODAL
--------------------------------------------------------- */

function closeCableModal() {
    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = "";
    }
}

/* ---------------------------------------------------------
   FORMATAR DATA
--------------------------------------------------------- */

function formatCableDate(date) {
    if (!date) return "Não informada";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Data inválida";
    }

    return parsed.toLocaleString("pt-BR");
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function cableToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}
