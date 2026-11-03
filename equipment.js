/* =========================================================
   FTTH MANAGER — EQUIPAMENTOS
   Arquivo: equipment.js
   ========================================================= */

let currentEquipmentType = null;
let currentEquipmentId = null;

/* ---------------------------------------------------------
   CONFIGURAÇÃO DOS EQUIPAMENTOS
--------------------------------------------------------- */

const EQUIPMENT_CONFIG = {
    cto: {
        title: "CTO",
        collection: "ctos",
        fields: [
            "name",
            "code",
            "ports",
            "address",
            "lat",
            "lng",
            "notes"
        ]
    },

    ceo: {
        title: "CEO",
        collection: "boxes",
        fields: [
            "name",
            "code",
            "capacity",
            "address",
            "lat",
            "lng",
            "notes"
        ]
    },

    splitter: {
        title: "Splitter",
        collection: "splitters",
        fields: [
            "name",
            "code",
            "ratio",
            "input",
            "outputs",
            "address",
            "lat",
            "lng",
            "notes"
        ]
    },

    pole: {
        title: "Poste",
        collection: "poles",
        fields: [
            "name",
            "code",
            "type",
            "height",
            "address",
            "lat",
            "lng",
            "notes"
        ]
    }
};

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initEquipment() {
    ensureEquipmentCollections();
    setupEquipmentButtons();
}

function ensureEquipmentCollections() {
    if (!Array.isArray(data.ctos)) data.ctos = [];
    if (!Array.isArray(data.boxes)) data.boxes = [];
    if (!Array.isArray(data.splitters)) data.splitters = [];
    if (!Array.isArray(data.poles)) data.poles = [];
}

function setupEquipmentButtons() {
    document.querySelectorAll("[data-tool]").forEach(button => {
        button.addEventListener("click", () => {
            const tool = button.dataset.tool;

            if (tool === "select" || tool === "cable") {
                if (typeof setDrawingMode === "function") {
                    setDrawingMode(tool);
                }
                return;
            }

            if (EQUIPMENT_CONFIG[tool]) {
                if (typeof setDrawingMode === "function") {
                    setDrawingMode(tool);
                }

                setActiveEquipmentTool(tool);
            }
        });
    });
}

/* ---------------------------------------------------------
   ATIVAR FERRAMENTA
--------------------------------------------------------- */

function setActiveEquipmentTool(type) {
    if (!EQUIPMENT_CONFIG[type]) return;

    currentEquipmentType = type;

    document.querySelectorAll("[data-tool]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tool === type
        );
    });

    const hint = document.getElementById("mapHint");

    if (hint) {
        hint.textContent =
            `Clique no mapa para cadastrar ${EQUIPMENT_CONFIG[type].title}.`;
    }

    if (map) {
        map.getContainer().style.cursor = "crosshair";
    }

    equipmentToast(
        `Ferramenta ${EQUIPMENT_CONFIG[type].title} ativada. Clique no mapa.`,
        "info"
    );
}

/* ---------------------------------------------------------
   CLIQUE NO MAPA PARA CADASTRAR
--------------------------------------------------------- */

function handleEquipmentMapClick(event) {
    if (!currentEquipmentType || !event || !event.latlng) {
        return;
    }

    const type = currentEquipmentType;

    openEquipmentForm(type, null, {
        lat: event.latlng.lat,
        lng: event.latlng.lng
    });
}

/* ---------------------------------------------------------
   ABRIR FORMULÁRIO
--------------------------------------------------------- */

function openEquipmentForm(type, item = null, position = null) {
    const config = EQUIPMENT_CONFIG[type];

    if (!config) return;

    currentEquipmentType = type;
    currentEquipmentId = item ? item.id : null;

    const isEditing = Boolean(item);

    const coordinates = position || item || getMapCenter();

    const fields = getEquipmentFields(type, item, coordinates);

    const modal = `
        <div class="modal-overlay" id="equipmentModal">
            <div class="modal equipment-modal">
                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">GERENCIAMENTO FTTH</span>
                        <h2>${isEditing ? "Editar" : "Cadastrar"} ${config.title}</h2>
                    </div>
                    <button type="button" class="modal-close"
                        onclick="closeEquipmentModal()">×</button>
                </div>

                <form id="equipmentForm">
                    <div class="form-grid">
                        ${fields}
                    </div>

                    <div class="form-field full-width">
                        <label for="equipmentNotes">Observações</label>
                        <textarea id="equipmentNotes" name="notes"
                            placeholder="Informações adicionais...">${escapeHTML(item?.notes || "")}</textarea>
                    </div>

                    <div class="equipment-coordinates">
                        <span>Latitude: ${Number(coordinates.lat).toFixed(7)}</span>
                        <span>Longitude: ${Number(coordinates.lng).toFixed(7)}</span>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secondary"
                            onclick="closeEquipmentModal()">Cancelar</button>

                        <button type="submit" class="btn-primary">
                            ${isEditing ? "Salvar alterações" : "Cadastrar equipamento"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (!root) {
        equipmentToast("Área de modal não encontrada.", "error");
        return;
    }

    root.innerHTML = modal;

    document.getElementById("equipmentForm")
        .addEventListener("submit", saveEquipmentForm);

    const overlay = document.getElementById("equipmentModal");

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeEquipmentModal();
        }
    });
}

/* ---------------------------------------------------------
   CAMPOS DO FORMULÁRIO
--------------------------------------------------------- */

function getEquipmentFields(type, item, coordinates) {
    const common = `
        <div class="form-field">
            <label for="equipmentName">Nome *</label>
            <input id="equipmentName" name="name" required
                value="${escapeHTML(item?.name || "")}"
                placeholder="Ex.: CTO Centro 01">
        </div>

        <div class="form-field">
            <label for="equipmentCode">Código / Identificação</label>
            <input id="equipmentCode" name="code"
                value="${escapeHTML(item?.code || "")}"
                placeholder="Ex.: CTO-001">
        </div>

        <input type="hidden" name="lat" value="${Number(coordinates.lat)}">
        <input type="hidden" name="lng" value="${Number(coordinates.lng)}">
    `;

    let specific = "";

    if (type === "cto") {
        specific = `
            <div class="form-field">
                <label for="equipmentPorts">Quantidade de portas</label>
                <select id="equipmentPorts" name="ports">
                    ${[8, 16, 24, 32].map(value => `
                        <option value="${value}"
                            ${Number(item?.ports || 16) === value ? "selected" : ""}>
                            ${value} portas
                        </option>
                    `).join("")}
                </select>
            </div>
        `;
    }

    if (type === "ceo") {
        specific = `
            <div class="form-field">
                <label for="equipmentCapacity">Capacidade</label>
                <input id="equipmentCapacity" name="capacity" type="number"
                    min="1" value="${Number(item?.capacity || 24)}">
            </div>
        `;
    }

    if (type === "splitter") {
        specific = `
            <div class="form-field">
                <label for="equipmentRatio">Divisão</label>
                <select id="equipmentRatio" name="ratio">
                    ${["1:2", "1:4", "1:8", "1:16", "1:32", "1:64"].map(value => `
                        <option value="${value}"
                            ${String(item?.ratio || "1:8") === value ? "selected" : ""}>
                            ${value}
                        </option>
                    `).join("")}
                </select>
            </div>

            <div class="form-field">
                <label for="equipmentInput">Entrada</label>
                <input id="equipmentInput" name="input"
                    value="${escapeHTML(item?.input || "")}"
                    placeholder="Ex.: Fibra 01">
            </div>

            <div class="form-field">
                <label for="equipmentOutputs">Saídas</label>
                <input id="equipmentOutputs" name="outputs" type="number"
                    min="2" value="${Number(item?.outputs || 8)}">
            </div>
        `;
    }

    if (type === "pole") {
        specific = `
            <div class="form-field">
                <label for="equipmentPoleType">Tipo de poste</label>
                <select id="equipmentPoleType" name="type">
                    <option value="Concreto">Concreto</option>
                    <option value="Madeira">Madeira</option>
                    <option value="Metálico">Metálico</option>
                    <option value="Outro">Outro</option>
                </select>
            </div>

            <div class="form-field">
                <label for="equipmentHeight">Altura (metros)</label>
                <input id="equipmentHeight" name="height" type="number"
                    min="1" step="0.5"
                    value="${Number(item?.height || 9)}">
            </div>
        `;
    }

    return common + specific + `
        <div class="form-field full-width">
            <label for="equipmentAddress">Endereço / Localização</label>
            <input id="equipmentAddress" name="address"
                value="${escapeHTML(item?.address || "")}"
                placeholder="Rua, bairro ou referência">
        </div>
    `;
}

/* ---------------------------------------------------------
   SALVAR FORMULÁRIO
--------------------------------------------------------- */

function saveEquipmentForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const type = currentEquipmentType;
    const config = EQUIPMENT_CONFIG[type];

    if (!config) return;

    const collection = data[config.collection];

    const equipment = {
        id: currentEquipmentId ||
            (typeof id === "function" ? id() : createId()),

        name: String(formData.get("name") || "").trim(),
        code: String(formData.get("code") || "").trim(),

        lat: Number(formData.get("lat")),
        lng: Number(formData.get("lng")),

        address: String(formData.get("address") || "").trim(),
        notes: String(formData.get("notes") || "").trim(),

        updatedAt: new Date().toISOString()
    };

    if (!equipment.name) {
        equipmentToast("Informe o nome do equipamento.", "error");
        return;
    }

    if (
        !Number.isFinite(equipment.lat) ||
        !Number.isFinite(equipment.lng)
    ) {
        equipmentToast("Coordenadas inválidas.", "error");
        return;
    }

    if (type === "cto") {
        equipment.ports = Number(formData.get("ports") || 16);

        const existing = collection.find(item => item.id === currentEquipmentId);

        equipment.occupiedPorts = existing
            ? Number(existing.occupiedPorts || 0)
            : 0;
    }

    if (type === "ceo") {
        equipment.capacity = Number(formData.get("capacity") || 24);
    }

    if (type === "splitter") {
        equipment.ratio = String(formData.get("ratio") || "1:8");
        equipment.input = String(formData.get("input") || "");
        equipment.outputs = Number(formData.get("outputs") || 8);
    }

    if (type === "pole") {
        equipment.type = String(formData.get("type") || "Concreto");
        equipment.height = Number(formData.get("height") || 9);
    }

    const existingIndex = collection.findIndex(item => {
        return item.id === currentEquipmentId;
    });

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    if (existingIndex >= 0) {
        equipment.createdAt = collection[existingIndex].createdAt ||
            new Date().toISOString();

        collection[existingIndex] = {
            ...collection[existingIndex],
            ...equipment
        };
    } else {
        equipment.createdAt = new Date().toISOString();
        collection.push(equipment);
    }

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeEquipmentModal();

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    if (typeof renderLists === "function") {
        renderLists();
    }

    equipmentToast(
        existingIndex >= 0
            ? "Equipamento atualizado."
            : "Equipamento cadastrado.",
        "success"
    );
}

/* ---------------------------------------------------------
   DETALHES DO EQUIPAMENTO
--------------------------------------------------------- */

function openEquipmentDetails(type, equipmentId) {
    const config = EQUIPMENT_CONFIG[type];

    if (!config) {
        equipmentToast("Tipo de equipamento inválido.", "error");
        return;
    }

    const item = data[config.collection].find(equipment => {
        return equipment.id === equipmentId;
    });

    if (!item) {
        equipmentToast("Equipamento não encontrado.", "error");
        return;
    }

    currentEquipmentType = type;
    currentEquipmentId = equipmentId;

    const details = `
        <div class="modal-overlay" id="equipmentDetailsModal">
            <div class="modal equipment-modal">
                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">${config.title}</span>
                        <h2>${escapeHTML(item.name)}</h2>
                    </div>
                    <button class="modal-close" type="button"
                        onclick="closeEquipmentModal()">×</button>
                </div>

                <div class="equipment-details">
                    <div class="detail-row">
                        <span>Identificação</span>
                        <strong>${escapeHTML(item.code || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Endereço</span>
                        <strong>${escapeHTML(item.address || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Latitude</span>
                        <strong>${Number(item.lat).toFixed(7)}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Longitude</span>
                        <strong>${Number(item.lng).toFixed(7)}</strong>
                    </div>

                    ${getEquipmentSpecificDetails(type, item)}

                    <div class="detail-row">
                        <span>Observações</span>
                        <strong>${escapeHTML(item.notes || "Nenhuma")}</strong>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-danger"
                        onclick="deleteEquipment('${type}', '${item.id}')">
                        Excluir
                    </button>

                    <button type="button" class="btn-secondary"
                        onclick="editEquipment('${type}', '${item.id}')">
                        Editar
                    </button>

                    <button type="button" class="btn-primary"
                        onclick="centerOnEquipment('${type}', '${item.id}')">
                        Localizar no mapa
                    </button>
                </div>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = details;
    }
}

/* ---------------------------------------------------------
   DETALHES ESPECÍFICOS
--------------------------------------------------------- */

function getEquipmentSpecificDetails(type, item) {
    if (type === "cto") {
        const ports = Number(item.ports || 0);
        const occupied = Number(item.occupiedPorts || 0);
        const free = Math.max(0, ports - occupied);

        return `
            <div class="detail-row">
                <span>Portas totais</span>
                <strong>${ports}</strong>
            </div>
            <div class="detail-row">
                <span>Portas ocupadas</span>
                <strong>${occupied}</strong>
            </div>
            <div class="detail-row">
                <span>Portas disponíveis</span>
                <strong>${free}</strong>
            </div>
        `;
    }

    if (type === "ceo") {
        return `
            <div class="detail-row">
                <span>Capacidade</span>
                <strong>${Number(item.capacity || 0)}</strong>
            </div>
        `;
    }

    if (type === "splitter") {
        return `
            <div class="detail-row">
                <span>Divisão</span>
                <strong>${escapeHTML(item.ratio || "Não informado")}</strong>
            </div>
            <div class="detail-row">
                <span>Entrada</span>
                <strong>${escapeHTML(item.input || "Não informada")}</strong>
            </div>
            <div class="detail-row">
                <span>Saídas</span>
                <strong>${Number(item.outputs || 0)}</strong>
            </div>
        `;
    }

    if (type === "pole") {
        return `
            <div class="detail-row">
                <span>Material</span>
                <strong>${escapeHTML(item.type || "Não informado")}</strong>
            </div>
            <div class="detail-row">
                <span>Altura</span>
                <strong>${Number(item.height || 0)} metros</strong>
            </div>
        `;
    }

    return "";
}

/* ---------------------------------------------------------
   EDITAR EQUIPAMENTO
--------------------------------------------------------- */

function editEquipment(type, equipmentId) {
    const config = EQUIPMENT_CONFIG[type];

    if (!config) return;

    const item = data[config.collection].find(equipment => {
        return equipment.id === equipmentId;
    });

    if (!item) return;

    openEquipmentForm(type, item);
}

/* ---------------------------------------------------------
   EXCLUIR EQUIPAMENTO
--------------------------------------------------------- */

function deleteEquipment(type, equipmentId) {
    const config = EQUIPMENT_CONFIG[type];

    if (!config) return;

    const item = data[config.collection].find(equipment => {
        return equipment.id === equipmentId;
    });

    if (!item) return;

    const confirmed = confirm(
        `Tem certeza que deseja excluir "${item.name}"?`
    );

    if (!confirmed) return;

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data[config.collection] = data[config.collection].filter(equipment => {
        return equipment.id !== equipmentId;
    });

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeEquipmentModal();

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    if (typeof renderLists === "function") {
        renderLists();
    }

    equipmentToast("Equipamento excluído.", "success");
}

/* ---------------------------------------------------------
   CENTRALIZAR EQUIPAMENTO NO MAPA
--------------------------------------------------------- */

function centerOnEquipment(type, equipmentId) {
    const config = EQUIPMENT_CONFIG[type];

    if (!config) return;

    const item = data[config.collection].find(equipment => {
        return equipment.id === equipmentId;
    });

    if (!item || !map) return;

    closeEquipmentModal();

    map.flyTo(
        [Number(item.lat), Number(item.lng)],
        19,
        {
            animate: true,
            duration: 1
        }
    );

    setTimeout(() => {
        if (typeof addEquipmentMarker === "function") {
            const marker = addEquipmentMarker(item, type);

            if (marker && marker.openPopup) {
                marker.openPopup();
            }
        }
    }, 1000);
}

/* ---------------------------------------------------------
   FECHAR MODAL
--------------------------------------------------------- */

function closeEquipmentModal() {
    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = "";
    }

    currentEquipmentId = null;
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function equipmentToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}
