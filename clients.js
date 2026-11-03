
/* =========================================================
   FTTH MANAGER — GERENCIAMENTO DE CLIENTES
   Arquivo: clients.js
   ========================================================= */

let currentClientId = null;

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initClients() {
    if (!Array.isArray(data.clients)) {
        data.clients = [];
    }

    if (!Array.isArray(data.ctos)) {
        data.ctos = [];
    }

    renderClientList();
    updateCTOPortOccupancy();
}

/* ---------------------------------------------------------
   LOCALIZAR CLIENTE
--------------------------------------------------------- */

function findClient(clientId) {
    return data.clients.find(client => client.id === clientId) || null;
}

/* ---------------------------------------------------------
   LOCALIZAR CTO
--------------------------------------------------------- */

function findClientCTO(ctoId) {
    return data.ctos.find(cto => cto.id === ctoId) || null;
}

/* ---------------------------------------------------------
   PORTAS OCUPADAS DE UMA CTO
--------------------------------------------------------- */

function getOccupiedPorts(ctoId, excludedClientId = null) {
    return data.clients.filter(client => {
        return (
            client.ctoId === ctoId &&
            client.id !== excludedClientId &&
            client.status !== "cancelado" &&
            client.status !== "inativo" &&
            Number(client.ctoPort) > 0
        );
    }).map(client => Number(client.ctoPort));
}

/* ---------------------------------------------------------
   PORTAS DISPONÍVEIS
--------------------------------------------------------- */

function getAvailableCTOPorts(ctoId, excludedClientId = null) {
    const cto = findClientCTO(ctoId);

    if (!cto) return [];

    const totalPorts = Number(cto.ports || 16);

    const occupied = getOccupiedPorts(
        ctoId,
        excludedClientId
    );

    const available = [];

    for (let port = 1; port <= totalPorts; port++) {
        if (!occupied.includes(port)) {
            available.push(port);
        }
    }

    return available;
}

/* ---------------------------------------------------------
   ATUALIZAR OCUPAÇÃO DAS CTOs
--------------------------------------------------------- */

function updateCTOPortOccupancy() {
    if (!Array.isArray(data.ctos)) return;

    data.ctos.forEach(cto => {
        const occupied = getOccupiedPorts(cto.id);

        cto.occupiedPorts = occupied.length;
        cto.freePorts = Math.max(
            0,
            Number(cto.ports || 16) - occupied.length
        );
    });
}

/* ---------------------------------------------------------
   LISTAGEM DE CLIENTES
--------------------------------------------------------- */

function renderClientList() {
    const container = document.getElementById("clientList");

    if (!container) return;

    container.innerHTML = "";

    if (!data.clients.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Nenhum cliente cadastrado</strong>
                <span>Cadastre clientes para controlar sua rede.</span>
            </div>
        `;

        return;
    }

    data.clients.forEach(client => {
        const cto = findClientCTO(client.ctoId);

        const card = document.createElement("div");

        card.className = "client-card";

        const status = client.status || "ativo";

        card.innerHTML = `
            <div class="client-card-header">
                <div class="client-avatar">
                    ${escapeHTML(
                        (client.name || "C").charAt(0).toUpperCase()
                    )}
                </div>

                <div class="client-card-title">
                    <strong>${escapeHTML(client.name || "Sem nome")}</strong>
                    <span>${escapeHTML(client.code || "Sem código")}</span>
                </div>

                <span class="status-badge status-${escapeHTML(status)}">
                    ${escapeHTML(status.toUpperCase())}
                </span>
            </div>

            <div class="client-card-info">
                <span>CTO: ${escapeHTML(cto?.name || "Não vinculada")}</span>
                <span>Porta: ${client.ctoPort || "—"}</span>
            </div>

            <div class="client-card-info">
                <span>Plano: ${escapeHTML(client.plan || "Não informado")}</span>
                <span>Telefone: ${escapeHTML(client.phone || "—")}</span>
            </div>

            <div class="client-card-actions">
                <button type="button"
                    class="btn-secondary"
                    onclick="openClientDetails('${client.id}')">
                    Detalhes
                </button>

                <button type="button"
                    class="btn-secondary"
                    onclick="editClient('${client.id}')">
                    Editar
                </button>

                <button type="button"
                    class="btn-danger"
                    onclick="deleteClient('${client.id}')">
                    Excluir
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

/* ---------------------------------------------------------
   ABRIR FORMULÁRIO DE CLIENTE
--------------------------------------------------------- */

function openClientForm(client = null) {
    currentClientId = client?.id || null;

    const isEditing = Boolean(client);

    const position = client || getMapCenter();

    const ctoOptions = data.ctos.map(cto => {
        return `
            <option value="${cto.id}"
                ${client?.ctoId === cto.id ? "selected" : ""}>
                ${escapeHTML(cto.name)}
            </option>
        `;
    }).join("");

    const html = `
        <div class="modal-overlay" id="clientModal">
            <div class="modal equipment-modal">
                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">CADASTRO FTTH</span>
                        <h2>${isEditing ? "Editar cliente" : "Novo cliente"}</h2>
                    </div>

                    <button type="button"
                        class="modal-close"
                        onclick="closeClientModal()">×</button>
                </div>

                <form id="clientForm">
                    <div class="form-grid">

                        <div class="form-field">
                            <label for="clientName">Nome do cliente *</label>
                            <input id="clientName"
                                name="name"
                                required
                                value="${escapeHTML(client?.name || "")}"
                                placeholder="Nome completo">
                        </div>

                        <div class="form-field">
                            <label for="clientCode">Código do cliente</label>
                            <input id="clientCode"
                                name="code"
                                value="${escapeHTML(client?.code || "")}"
                                placeholder="Ex.: CLI-001">
                        </div>

                        <div class="form-field">
                            <label for="clientPhone">Telefone</label>
                            <input id="clientPhone"
                                name="phone"
                                value="${escapeHTML(client?.phone || "")}"
                                placeholder="(00) 00000-0000">
                        </div>

                        <div class="form-field">
                            <label for="clientDocument">CPF / CNPJ</label>
                            <input id="clientDocument"
                                name="document"
                                value="${escapeHTML(client?.document || "")}"
                                placeholder="Documento">
                        </div>

                        <div class="form-field full-width">
                            <label for="clientAddress">Endereço</label>
                            <input id="clientAddress"
                                name="address"
                                value="${escapeHTML(client?.address || "")}"
                                placeholder="Rua, número, bairro">
                        </div>

                        <div class="form-field">
                            <label for="clientPlan">Plano contratado</label>
                            <input id="clientPlan"
                                name="plan"
                                value="${escapeHTML(client?.plan || "")}"
                                placeholder="Ex.: 500 Mega">
                        </div>

                        <div class="form-field">
                            <label for="clientStatus">Situação</label>
                            <select id="clientStatus" name="status">
                                <option value="ativo"
                                    ${!client || client.status === "ativo" ? "selected" : ""}>
                                    Ativo
                                </option>

                                <option value="inativo"
                                    ${client?.status === "inativo" ? "selected" : ""}>
                                    Inativo
                                </option>

                                <option value="cancelado"
                                    ${client?.status === "cancelado" ? "selected" : ""}>
                                    Cancelado
                                </option>
                            </select>
                        </div>

                        <div class="form-field">
                            <label for="clientCTO">CTO vinculada</label>
                            <select id="clientCTO" name="ctoId">
                                <option value="">Sem CTO vinculada</option>
                                ${ctoOptions}
                            </select>
                        </div>

                        <div class="form-field">
                            <label for="clientPort">Porta da CTO</label>
                            <select id="clientPort" name="ctoPort">
                                <option value="">Selecione a CTO primeiro</option>
                            </select>
                        </div>

                        <div class="form-field">
                            <label for="clientOpticalSignal">Sinal óptico (dBm)</label>
                            <input id="clientOpticalSignal"
                                name="opticalSignal"
                                type="number"
                                step="0.01"
                                value="${client?.opticalSignal ?? ""}"
                                placeholder="Ex.: -20.50">
                        </div>

                        <input type="hidden"
                            name="lat"
                            value="${Number(position?.lat || 0)}">

                        <input type="hidden"
                            name="lng"
                            value="${Number(position?.lng || 0)}">

                    </div>

                    <div class="form-field full-width">
                        <label for="clientNotes">Observações</label>
                        <textarea id="clientNotes"
                            name="notes"
                            placeholder="Informações adicionais...">${escapeHTML(client?.notes || "")}</textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button"
                            class="btn-secondary"
                            onclick="closeClientModal()">Cancelar</button>

                        <button type="submit"
                            class="btn-primary">
                            ${isEditing ? "Salvar alterações" : "Cadastrar cliente"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (!root) return;

    root.innerHTML = html;

    const ctoSelect = document.getElementById("clientCTO");

    ctoSelect.addEventListener("change", updateClientPortOptions);

    updateClientPortOptions();

    document.getElementById("clientForm")
        .addEventListener("submit", saveClientForm);

    const overlay = document.getElementById("clientModal");

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeClientModal();
        }
    });
}

/* ---------------------------------------------------------
   ATUALIZAR OPÇÕES DE PORTAS
--------------------------------------------------------- */

function updateClientPortOptions() {
    const ctoSelect = document.getElementById("clientCTO");
    const portSelect = document.getElementById("clientPort");

    if (!ctoSelect || !portSelect) return;

    const ctoId = ctoSelect.value;

    const currentPort = Number(
        findClient(currentClientId)?.ctoPort || 0
    );

    portSelect.innerHTML = "";

    if (!ctoId) {
        portSelect.innerHTML = `
            <option value="">Selecione uma CTO primeiro</option>
        `;
        return;
    }

    const cto = findClientCTO(ctoId);

    if (!cto) return;

    const available = getAvailableCTOPorts(
        ctoId,
        currentClientId
    );

    if (
        currentPort > 0 &&
        !available.includes(currentPort)
    ) {
        available.push(currentPort);
    }

    available.sort((a, b) => a - b);

    if (!available.length) {
        portSelect.innerHTML = `
            <option value="">Nenhuma porta disponível</option>
        `;
        return;
    }

    portSelect.innerHTML = `
        <option value="">Selecione uma porta</option>
        ${available.map(port => `
            <option value="${port}"
                ${currentPort === port ? "selected" : ""}>
                Porta ${port}
            </option>
        `).join("")}
    `;
}

/* ---------------------------------------------------------
   SALVAR CLIENTE
--------------------------------------------------------- */

function saveClientForm(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const name = String(form.get("name") || "").trim();
    const ctoId = String(form.get("ctoId") || "");
    const ctoPort = Number(form.get("ctoPort") || 0);
    const status = String(form.get("status") || "ativo");

    if (!name) {
        clientToast("Informe o nome do cliente.", "error");
        return;
    }

    if (ctoId && !ctoPort && status === "ativo") {
        clientToast(
            "Selecione uma porta para a CTO vinculada.",
            "error"
        );
        return;
    }

    if (ctoId && ctoPort) {
        const occupied = getOccupiedPorts(
            ctoId,
            currentClientId
        );

        if (occupied.includes(ctoPort) && status === "ativo") {
            clientToast(
                "Essa porta já está ocupada por outro cliente.",
                "error"
            );
            return;
        }
    }

    const client = {
        id: currentClientId ||
            (typeof id === "function" ? id() : createId()),

        name,

        code: String(form.get("code") || "").trim(),

        phone: String(form.get("phone") || "").trim(),

        document: String(form.get("document") || "").trim(),

        address: String(form.get("address") || "").trim(),

        plan: String(form.get("plan") || "").trim(),

        status,

        ctoId: ctoId || null,

        ctoPort: ctoId && ctoPort ? ctoPort : null,

        opticalSignal: form.get("opticalSignal") === ""
            ? null
            : Number(form.get("opticalSignal")),

        lat: Number(form.get("lat") || 0),

        lng: Number(form.get("lng") || 0),

        notes: String(form.get("notes") || "").trim(),

        updatedAt: new Date().toISOString()
    };

    if (
        !Number.isFinite(client.lat) ||
        !Number.isFinite(client.lng)
    ) {
        clientToast("Coordenadas inválidas.", "error");
        return;
    }

    const existingIndex = data.clients.findIndex(item => {
        return item.id === currentClientId;
    });

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    if (existingIndex >= 0) {
        client.createdAt =
            data.clients[existingIndex].createdAt ||
            new Date().toISOString();

        data.clients[existingIndex] = {
            ...data.clients[existingIndex],
            ...client
        };
    } else {
        client.createdAt = new Date().toISOString();
        data.clients.push(client);
    }

    updateCTOPortOccupancy();

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeClientModal();

    renderClientList();

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    clientToast(
        existingIndex >= 0
            ? "Cliente atualizado."
            : "Cliente cadastrado.",
        "success"
    );
}

/* ---------------------------------------------------------
   EDITAR CLIENTE
--------------------------------------------------------- */

function editClient(clientId) {
    const client = findClient(clientId);

    if (!client) return;

    openClientForm(client);
}

/* ---------------------------------------------------------
   EXCLUIR CLIENTE
--------------------------------------------------------- */

function deleteClient(clientId) {
    const client = findClient(clientId);

    if (!client) return;

    const confirmed = confirm(
        `Deseja realmente excluir o cliente "${client.name}"?`
    );

    if (!confirmed) return;

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.clients = data.clients.filter(item => {
        return item.id !== clientId;
    });

    updateCTOPortOccupancy();

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    closeClientModal();

    renderClientList();

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    clientToast("Cliente excluído.", "success");
}

/* ---------------------------------------------------------
   DETALHES DO CLIENTE
--------------------------------------------------------- */

function openClientDetails(clientId) {
    const client = findClient(clientId);

    if (!client) return;

    const cto = findClientCTO(client.ctoId);

    const html = `
        <div class="modal-overlay" id="clientDetailsModal">
            <div class="modal equipment-modal">

                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">CADASTRO DE CLIENTE</span>
                        <h2>${escapeHTML(client.name)}</h2>
                    </div>

                    <button type="button"
                        class="modal-close"
                        onclick="closeClientModal()">×</button>
                </div>

                <div class="equipment-details">

                    <div class="detail-row">
                        <span>Código</span>
                        <strong>${escapeHTML(client.code || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Telefone</span>
                        <strong>${escapeHTML(client.phone || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>CPF / CNPJ</span>
                        <strong>${escapeHTML(client.document || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Endereço</span>
                        <strong>${escapeHTML(client.address || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Plano</span>
                        <strong>${escapeHTML(client.plan || "Não informado")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Situação</span>
                        <strong>${escapeHTML(client.status || "Ativo")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>CTO</span>
                        <strong>${escapeHTML(cto?.name || "Não vinculada")}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Porta</span>
                        <strong>${client.ctoPort || "Não informada"}</strong>
                    </div>

                    <div class="detail-row">
                        <span>Sinal óptico</span>
                        <strong>
                            ${client.opticalSignal === null ||
                              client.opticalSignal === undefined
                                ? "Não informado"
                                : `${Number(client.opticalSignal).toFixed(2)} dBm`}
                        </strong>
                    </div>

                    <div class="detail-row">
                        <span>Observações</span>
                        <strong>${escapeHTML(client.notes || "Nenhuma")}</strong>
                    </div>

                </div>

                <div class="modal-actions">

                    <button type="button"
                        class="btn-secondary"
                        onclick="closeClientModal()">Fechar</button>

                    <button type="button"
                        class="btn-primary"
                        onclick="editClient('${client.id}')">
                        Editar cliente
                    </button>

                    <button type="button"
                        class="btn-secondary"
                        onclick="locateClient('${client.id}')">
                        Localizar no mapa
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
   LOCALIZAR CLIENTE NO MAPA
--------------------------------------------------------- */

function locateClient(clientId) {
    const client = findClient(clientId);

    if (!client || !map) return;

    if (!client.lat && !client.lng) {
        clientToast("Este cliente não possui localização cadastrada.", "warning");
        return;
    }

    closeClientModal();

    map.flyTo(
        [Number(client.lat), Number(client.lng)],
        19,
        {
            animate: true,
            duration: 1
        }
    );
}

/* ---------------------------------------------------------
   FECHAR MODAL
--------------------------------------------------------- */

function closeClientModal() {
    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = "";
    }

    currentClientId = null;
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function clientToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}
