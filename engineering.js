/* =========================================================
   FTTH MANAGER — ENGENHARIA DE REDE
   Arquivo: engineering.js
   ========================================================= */

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initEngineering() {
    ensureEngineeringData();
    renderEngineering();
}

function ensureEngineeringData() {
    if (!Array.isArray(data.ctos)) data.ctos = [];
    if (!Array.isArray(data.boxes)) data.boxes = [];
    if (!Array.isArray(data.splitters)) data.splitters = [];
    if (!Array.isArray(data.poles)) data.poles = [];
    if (!Array.isArray(data.cables)) data.cables = [];
    if (!Array.isArray(data.clients)) data.clients = [];
    if (!Array.isArray(data.splices)) data.splices = [];
}

/* ---------------------------------------------------------
   RENDERIZAÇÃO PRINCIPAL
--------------------------------------------------------- */

function renderEngineering() {
    ensureEngineeringData();

    const container = document.getElementById("engineeringContent");

    if (!container) return;

    updateCTOPortOccupancy();

    container.innerHTML = `
        <div class="engineering-overview">
            ${renderEngineeringStats()}
        </div>

        <div class="engineering-section">
            <div class="section-heading">
                <div>
                    <span class="section-eyebrow">DISTRIBUIÇÃO ÓPTICA</span>
                    <h3>CTOs e ocupação de portas</h3>
                </div>
            </div>

            ${renderCTOEngineering()}
        </div>

        <div class="engineering-section">
            <div class="section-heading">
                <div>
                    <span class="section-eyebrow">DIVISÃO DE SINAL</span>
                    <h3>Splitters ópticos</h3>
                </div>

                <button class="btn-primary"
                    onclick="openEngineeringSplitterForm()">
                    + Novo splitter
                </button>
            </div>

            ${renderSplitterEngineering()}
        </div>

        <div class="engineering-section">
            <div class="section-heading">
                <div>
                    <span class="section-eyebrow">EMENDAS ÓPTICAS</span>
                    <h3>Fusões e conexões</h3>
                </div>

                <button class="btn-primary"
                    onclick="openSpliceForm()">
                    + Nova fusão
                </button>
            </div>

            ${renderSplices()}
        </div>

        <div class="engineering-section">
            <div class="section-heading">
                <div>
                    <span class="section-eyebrow">IDENTIFICAÇÃO</span>
                    <h3>Cabos e fibras</h3>
                </div>
            </div>

            ${renderFiberEngineering()}
        </div>

        <div class="engineering-section">
            <div class="section-heading">
                <div>
                    <span class="section-eyebrow">DOCUMENTAÇÃO</span>
                    <h3>Relatórios técnicos</h3>
                </div>
            </div>

            ${renderEngineeringReports()}
        </div>
    `;
}

/* ---------------------------------------------------------
   INDICADORES TÉCNICOS
--------------------------------------------------------- */

function renderEngineeringStats() {
    const totalPorts = data.ctos.reduce((sum, cto) => {
        return sum + Number(cto.ports || 0);
    }, 0);

    const occupiedPorts = data.ctos.reduce((sum, cto) => {
        return sum + Number(cto.occupiedPorts || 0);
    }, 0);

    const freePorts = Math.max(0, totalPorts - occupiedPorts);

    const occupancy = totalPorts
        ? (occupiedPorts / totalPorts) * 100
        : 0;

    return `
        <div class="engineering-stat-grid">

            <div class="engineering-stat">
                <span>Portas totais</span>
                <strong>${totalPorts}</strong>
            </div>

            <div class="engineering-stat">
                <span>Portas ocupadas</span>
                <strong>${occupiedPorts}</strong>
            </div>

            <div class="engineering-stat">
                <span>Portas livres</span>
                <strong>${freePorts}</strong>
            </div>

            <div class="engineering-stat">
                <span>Ocupação da rede</span>
                <strong>${occupancy.toFixed(1)}%</strong>
            </div>

        </div>
    `;
}

/* ---------------------------------------------------------
   CTOs E PORTAS
--------------------------------------------------------- */

function renderCTOEngineering() {
    if (!data.ctos.length) {
        return engineeringEmpty("Nenhuma CTO cadastrada.");
    }

    return `
        <div class="engineering-cto-list">
            ${data.ctos.map(cto => {
                const total = Number(cto.ports || 16);
                const occupied = getOccupiedPorts(cto.id).length;
                const free = Math.max(0, total - occupied);

                const percentage = total
                    ? (occupied / total) * 100
                    : 0;

                const ports = [];

                for (let i = 1; i <= total; i++) {
                    const isOccupied = getOccupiedPorts(cto.id).includes(i);

                    const client = data.clients.find(item => {
                        return item.ctoId === cto.id &&
                            Number(item.ctoPort) === i &&
                            item.status !== "cancelado" &&
                            item.status !== "inativo";
                    });

                    ports.push(`
                        <div class="cto-port ${isOccupied ? "occupied" : "free"}"
                            title="${isOccupied
                                ? `Porta ${i}: ${escapeHTML(client?.name || "Ocupada")}`
                                : `Porta ${i}: Livre`}">

                            <span>${i}</span>

                        </div>
                    `);
                }

                return `
                    <div class="engineering-card">

                        <div class="engineering-card-header">
                            <div>
                                <strong>${escapeHTML(cto.name)}</strong>
                                <span>${escapeHTML(cto.code || "Sem identificação")}</span>
                            </div>

                            <button class="btn-secondary"
                                onclick="openEquipmentDetails('cto', '${cto.id}')">
                                Detalhes
                            </button>
                        </div>

                        <div class="occupancy-info">
                            <span>${occupied} ocupadas</span>
                            <span>${free} livres</span>
                            <span>${total} totais</span>
                        </div>

                        <div class="occupancy-bar">
                            <div style="width:${percentage}%"></div>
                        </div>

                        <div class="cto-port-grid">
                            ${ports.join("")}
                        </div>

                    </div>
                `;
            }).join("")}
        </div>

        <div class="engineering-legend">
            <span><i class="legend-free"></i> Livre</span>
            <span><i class="legend-occupied"></i> Ocupada</span>
        </div>
    `;
}

/* ---------------------------------------------------------
   SPLITTERS
--------------------------------------------------------- */

function renderSplitterEngineering() {
    if (!data.splitters.length) {
        return engineeringEmpty("Nenhum splitter cadastrado.");
    }

    return `
        <div class="engineering-splitter-list">

            ${data.splitters.map(splitter => {
                const outputs = Number(
                    splitter.outputs ||
                    String(splitter.ratio || "1:8").split(":")[1] ||
                    8
                );

                return `
                    <div class="engineering-card splitter-card">

                        <div class="engineering-card-header">
                            <div>
                                <strong>${escapeHTML(splitter.name)}</strong>
                                <span>${escapeHTML(splitter.ratio || "Divisão não informada")}</span>
                            </div>

                            <div class="card-actions">
                                <button class="icon-button"
                                    onclick="editEngineeringSplitter('${splitter.id}')">
                                    ✎
                                </button>

                                <button class="icon-button"
                                    onclick="deleteEngineeringSplitter('${splitter.id}')">
                                    ×
                                </button>
                            </div>
                        </div>

                        <div class="splitter-diagram">

                            <div class="splitter-input">
                                <span>ENTRADA</span>
                                <strong>${escapeHTML(splitter.input || "Não identificada")}</strong>
                            </div>

                            <div class="splitter-center">
                                <span>${escapeHTML(splitter.ratio || "1:8")}</span>
                            </div>

                            <div class="splitter-outputs">
                                ${Array.from({ length: outputs }, (_, index) => `
                                    <div class="splitter-output">
                                        <span>OUT ${index + 1}</span>
                                    </div>
                                `).join("")}
                            </div>

                        </div>

                        <div class="splitter-footer">
                            <span>${outputs} saídas</span>
                            <span>${escapeHTML(splitter.code || "Sem código")}</span>
                        </div>

                    </div>
                `;
            }).join("")}

        </div>
    `;
}

/* ---------------------------------------------------------
   FORMULÁRIO DE SPLITTER
--------------------------------------------------------- */

function openEngineeringSplitterForm(splitter = null) {
    const editing = Boolean(splitter);

    const html = `
        <div class="modal-overlay" id="engineeringSplitterModal">
            <div class="modal equipment-modal">

                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">ENGENHARIA FTTH</span>
                        <h2>${editing ? "Editar splitter" : "Novo splitter"}</h2>
                    </div>

                    <button class="modal-close"
                        onclick="closeEngineeringModal()">×</button>
                </div>

                <form id="engineeringSplitterForm">

                    <div class="form-grid">

                        <div class="form-field">
                            <label>Nome *</label>
                            <input name="name" required
                                value="${escapeHTML(splitter?.name || "")}">
                        </div>

                        <div class="form-field">
                            <label>Código</label>
                            <input name="code"
                                value="${escapeHTML(splitter?.code || "")}">
                        </div>

                        <div class="form-field">
                            <label>Divisão óptica</label>
                            <select name="ratio">
                                ${["1:2", "1:4", "1:8", "1:16", "1:32", "1:64"].map(value => `
                                    <option value="${value}"
                                        ${splitter?.ratio === value ? "selected" : ""}>
                                        ${value}
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="form-field">
                            <label>Quantidade de saídas</label>
                            <input name="outputs" type="number"
                                min="2" max="128"
                                value="${Number(splitter?.outputs || 8)}">
                        </div>

                        <div class="form-field full-width">
                            <label>Fibra de entrada</label>
                            <input name="input"
                                value="${escapeHTML(splitter?.input || "")}"
                                placeholder="Ex.: Cabo principal / Fibra 01">
                        </div>

                        <div class="form-field full-width">
                            <label>Localização / observações</label>
                            <input name="address"
                                value="${escapeHTML(splitter?.address || "")}">
                        </div>

                    </div>

                    <div class="modal-actions">
                        <button type="button"
                            class="btn-secondary"
                            onclick="closeEngineeringModal()">Cancelar</button>

                        <button type="submit" class="btn-primary">
                            Salvar splitter
                        </button>
                    </div>

                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (!root) return;

    root.innerHTML = html;

    document.getElementById("engineeringSplitterForm")
        .addEventListener("submit", event => {
            saveEngineeringSplitter(event, splitter?.id || null);
        });
}

/* ---------------------------------------------------------
   SALVAR SPLITTER
--------------------------------------------------------- */

function saveEngineeringSplitter(event, splitterId = null) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const name = String(form.get("name") || "").trim();

    if (!name) {
        engineeringToast("Informe o nome do splitter.", "error");
        return;
    }

    const splitter = {
        id: splitterId ||
            (typeof id === "function" ? id() : createId()),

        name,

        code: String(form.get("code") || "").trim(),

        ratio: String(form.get("ratio") || "1:8"),

        outputs: Number(form.get("outputs") || 8),

        input: String(form.get("input") || "").trim(),

        address: String(form.get("address") || "").trim(),

        updatedAt: new Date().toISOString()
    };

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    const index = data.splitters.findIndex(item => {
        return item.id === splitterId;
    });

    if (index >= 0) {
        data.splitters[index] = {
            ...data.splitters[index],
            ...splitter
        };
    } else {
        splitter.createdAt = new Date().toISOString();
        data.splitters.push(splitter);
    }

    saveEngineeringData();

    closeEngineeringModal();
    renderEngineering();

    engineeringToast("Splitter salvo.", "success");
}

/* ---------------------------------------------------------
   EDITAR SPLITTER
--------------------------------------------------------- */

function editEngineeringSplitter(splitterId) {
    const splitter = data.splitters.find(item => {
        return item.id === splitterId;
    });

    if (splitter) {
        openEngineeringSplitterForm(splitter);
    }
}

/* ---------------------------------------------------------
   EXCLUIR SPLITTER
--------------------------------------------------------- */

function deleteEngineeringSplitter(splitterId) {
    const splitter = data.splitters.find(item => {
        return item.id === splitterId;
    });

    if (!splitter) return;

    if (!confirm(`Excluir o splitter "${splitter.name}"?`)) {
        return;
    }

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.splitters = data.splitters.filter(item => {
        return item.id !== splitterId;
    });

    saveEngineeringData();
    renderEngineering();

    engineeringToast("Splitter excluído.", "success");
}

/* ---------------------------------------------------------
   FUSÕES E EMENDAS
--------------------------------------------------------- */

function renderSplices() {
    if (!data.splices.length) {
        return engineeringEmpty("Nenhuma fusão cadastrada.");
    }

    return `
        <div class="splice-list">

            ${data.splices.map(splice => `
                <div class="splice-card">

                    <div class="splice-card-main">
                        <strong>${escapeHTML(splice.name || "Fusão sem nome")}</strong>

                        <span>
                            ${escapeHTML(splice.sourceCable || "Cabo não informado")}
                            →
                            ${escapeHTML(splice.targetCable || "Cabo não informado")}
                        </span>

                        <small>
                            Fibra ${Number(splice.sourceFiber || 0)}
                            →
                            Fibra ${Number(splice.targetFiber || 0)}
                        </small>
                    </div>

                    <div class="splice-card-actions">
                        <button class="icon-button"
                            onclick="editSplice('${splice.id}')">✎</button>

                        <button class="icon-button"
                            onclick="deleteSplice('${splice.id}')">×</button>
                    </div>

                </div>
            `).join("")}

        </div>
    `;
}

/* ---------------------------------------------------------
   FORMULÁRIO DE FUSÃO
--------------------------------------------------------- */

function openSpliceForm(splice = null) {
    const editing = Boolean(splice);

    const cableOptions = data.cables.map(cable => `
        <option value="${cable.id}">
            ${escapeHTML(cable.name)}
        </option>
    `).join("");

    const html = `
        <div class="modal-overlay" id="spliceModal">
            <div class="modal equipment-modal">

                <div class="modal-header">
                    <div>
                        <span class="modal-eyebrow">CONEXÕES ÓPTICAS</span>
                        <h2>${editing ? "Editar fusão" : "Cadastrar fusão"}</h2>
                    </div>

                    <button class="modal-close"
                        onclick="closeEngineeringModal()">×</button>
                </div>

                <form id="spliceForm">

                    <div class="form-field">
                        <label>Nome / identificação</label>
                        <input name="name"
                            value="${escapeHTML(splice?.name || "")}"
                            placeholder="Ex.: Emenda CTO Centro">
                    </div>

                    <div class="form-grid">

                        <div class="form-field">
                            <label>Cabo de origem *</label>
                            <select name="sourceCable" required>
                                <option value="">Selecione</option>
                                ${cableOptions}
                            </select>
                        </div>

                        <div class="form-field">
                            <label>Fibra de origem *</label>
                            <input name="sourceFiber"
                                type="number" min="1" required
                                value="${Number(splice?.sourceFiber || 1)}">
                        </div>

                        <div class="form-field">
                            <label>Cabo de destino *</label>
                            <select name="targetCable" required>
                                <option value="">Selecione</option>
                                ${cableOptions}
                            </select>
                        </div>

                        <div class="form-field">
                            <label>Fibra de destino *</label>
                            <input name="targetFiber"
                                type="number" min="1" required
                                value="${Number(splice?.targetFiber || 1)}">
                        </div>

                        <div class="form-field">
                            <label>Perda estimada (dB)</label>
                            <input name="loss"
                                type="number" step="0.01" min="0"
                                value="${Number(splice?.loss || 0)}">
                        </div>

                        <div class="form-field">
                            <label>Tipo de conexão</label>
                            <select name="type">
                                <option value="Fusão">Fusão</option>
                                <option value="Conector">Conector</option>
                                <option value="Mecânica">Emenda mecânica</option>
                            </select>
                        </div>

                    </div>

                    <div class="form-field">
                        <label>Observações</label>
                        <textarea name="notes">${escapeHTML(splice?.notes || "")}</textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button"
                            class="btn-secondary"
                            onclick="closeEngineeringModal()">Cancelar</button>

                        <button type="submit"
                            class="btn-primary">Salvar conexão</button>
                    </div>

                </form>
            </div>
        </div>
    `;

    const root = document.getElementById("modalRoot");

    if (!root) return;

    root.innerHTML = html;

    const form = document.getElementById("spliceForm");

    if (splice) {
        form.elements.sourceCable.value = splice.sourceCable || "";
        form.elements.targetCable.value = splice.targetCable || "";
        form.elements.type.value = splice.type || "Fusão";
    }

    form.addEventListener("submit", event => {
        saveSplice(event, splice?.id || null);
    });
}

/* ---------------------------------------------------------
   SALVAR FUSÃO
--------------------------------------------------------- */

function saveSplice(event, spliceId = null) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const sourceCable = String(form.get("sourceCable") || "");
    const targetCable = String(form.get("targetCable") || "");

    const source = findCable(sourceCable);
    const target = findCable(targetCable);

    if (!source || !target) {
        engineeringToast("Selecione dois cabos válidos.", "error");
        return;
    }

    const sourceFiber = Number(form.get("sourceFiber"));
    const targetFiber = Number(form.get("targetFiber"));

    if (
        sourceFiber < 1 ||
        sourceFiber > Number(source.fibers || 0) ||
        targetFiber < 1 ||
        targetFiber > Number(target.fibers || 0)
    ) {
        engineeringToast(
            "Uma das fibras informadas não existe no cabo selecionado.",
            "error"
        );
        return;
    }

    const splice = {
        id: spliceId ||
            (typeof id === "function" ? id() : createId()),

        name: String(form.get("name") || "").trim(),

        sourceCable,
        sourceFiber,

        targetCable,
        targetFiber,

        loss: Number(form.get("loss") || 0),

        type: String(form.get("type") || "Fusão"),

        notes: String(form.get("notes") || "").trim(),

        updatedAt: new Date().toISOString()
    };

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    const index = data.splices.findIndex(item => {
        return item.id === spliceId;
    });

    if (index >= 0) {
        data.splices[index] = {
            ...data.splices[index],
            ...splice
        };
    } else {
        splice.createdAt = new Date().toISOString();
        data.splices.push(splice);
    }

    saveEngineeringData();

    closeEngineeringModal();
    renderEngineering();

    engineeringToast("Conexão registrada.", "success");
}

/* ---------------------------------------------------------
   EDITAR FUSÃO
--------------------------------------------------------- */

function editSplice(spliceId) {
    const splice = data.splices.find(item => {
        return item.id === spliceId;
    });

    if (splice) {
        openSpliceForm(splice);
    }
}

/* ---------------------------------------------------------
   EXCLUIR FUSÃO
--------------------------------------------------------- */

function deleteSplice(spliceId) {
    if (!confirm("Deseja excluir esta conexão?")) return;

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.splices = data.splices.filter(item => {
        return item.id !== spliceId;
    });

    saveEngineeringData();
    renderEngineering();

    engineeringToast("Conexão excluída.", "success");
}

/* ---------------------------------------------------------
   CABOS E FIBRAS
--------------------------------------------------------- */

function renderFiberEngineering() {
    if (!data.cables.length) {
        return engineeringEmpty("Nenhum cabo cadastrado.");
    }

    return `
        <div class="fiber-engineering-list">

            ${data.cables.map(cable => `
                <div class="engineering-card">

                    <div class="engineering-card-header">
                        <div>
                            <strong>${escapeHTML(cable.name)}</strong>
                            <span>${Number(cable.fibers || 0)} fibras</span>
                        </div>

                        <button class="btn-secondary"
                            onclick="openCableDetails('${cable.id}')">
                            Ver fibras
                        </button>
                    </div>

                    <div class="fiber-table">

                        ${Array.from({
                            length: Number(cable.fibers || 0)
                        }, (_, index) => {
                            const fiber = getFiberColor(index + 1);

                            const connections = data.splices.filter(splice => {
                                return (
                                    (splice.sourceCable === cable.id &&
                                        Number(splice.sourceFiber) === index + 1) ||
                                    (splice.targetCable === cable.id &&
                                        Number(splice.targetFiber) === index + 1)
                                );
                            });

                            return `
                                <div class="fiber-table-row">

                                    <span class="fiber-color"
                                        style="background:${fiber.color}"></span>

                                    <strong>Fibra ${String(index + 1).padStart(2, "0")}</strong>

                                    <span>${fiber.name}</span>

                                    <span>
                                        ${connections.length
                                            ? `${connections.length} conexão(ões)`
                                            : "Sem conexão registrada"}
                                    </span>

                                </div>
                            `;
                        }).join("")}

                    </div>
                </div>
            `).join("")}

        </div>
    `;
}

/* ---------------------------------------------------------
   RELATÓRIOS
--------------------------------------------------------- */

function renderEngineeringReports() {
    const totalCableLength = data.cables.reduce((sum, cable) => {
        return sum + recalculateCableLength(cable);
    }, 0);

    const totalFibers = data.cables.reduce((sum, cable) => {
        return sum + Number(cable.fibers || 0);
    }, 0);

    return `
        <div class="engineering-report-grid">

            <div class="engineering-report">
                <span>Comprimento total de cabos</span>
                <strong>${formatCableDistance(totalCableLength)}</strong>
            </div>

            <div class="engineering-report">
                <span>Fibras cadastradas</span>
                <strong>${totalFibers}</strong>
            </div>

            <div class="engineering-report">
                <span>Fusões registradas</span>
                <strong>${data.splices.length}</strong>
            </div>

            <div class="engineering-report">
                <span>Equipamentos cadastrados</span>
                <strong>
                    ${data.ctos.length +
                      data.boxes.length +
                      data.splitters.length +
                      data.poles.length}
                </strong>
            </div>

        </div>

        <div class="report-actions">
            <button class="btn-primary"
                onclick="exportEngineeringReport()">
                Exportar relatório CSV
            </button>

            <button class="btn-secondary"
                onclick="exportEngineeringJSON()">
                Exportar dados técnicos JSON
            </button>
        </div>
    `;
}

/* ---------------------------------------------------------
   EXPORTAR CSV
--------------------------------------------------------- */

function exportEngineeringReport() {
    const rows = [
        ["Tipo", "Nome", "Código", "Latitude", "Longitude", "Informações"]
    ];

    data.ctos.forEach(item => {
        rows.push([
            "CTO",
            item.name,
            item.code || "",
            item.lat,
            item.lng,
            `${item.occupiedPorts || 0}/${item.ports || 16} portas ocupadas`
        ]);
    });

    data.boxes.forEach(item => {
        rows.push([
            "CEO",
            item.name,
            item.code || "",
            item.lat,
            item.lng,
            item.capacity || ""
        ]);
    });

    data.splitters.forEach(item => {
        rows.push([
            "Splitter",
            item.name,
            item.code || "",
            item.lat || "",
            item.lng || "",
            item.ratio || ""
        ]);
    });

    data.poles.forEach(item => {
        rows.push([
            "Poste",
            item.name,
            item.code || "",
            item.lat,
            item.lng,
            item.type || ""
        ]);
    });

    const csv = rows.map(row => {
        return row.map(value => {
            const escaped = String(value ?? "").replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(";");
    }).join("\n");

    downloadEngineeringFile(
        "\uFEFF" + csv,
        "relatorio-ftth.csv",
        "text/csv;charset=utf-8"
    );

    engineeringToast("Relatório CSV exportado.", "success");
}

/* ---------------------------------------------------------
   EXPORTAR JSON TÉCNICO
--------------------------------------------------------- */

function exportEngineeringJSON() {
    const report = {
        generatedAt: new Date().toISOString(),
        ctos: data.ctos,
        boxes: data.boxes,
        splitters: data.splitters,
        poles: data.poles,
        cables: data.cables,
        splices: data.splices,
        clients: data.clients
    };

    downloadEngineeringFile(
        JSON.stringify(report, null, 2),
        "relatorio-tecnico-ftth.json",
        "application/json"
    );

    engineeringToast("Dados técnicos exportados.", "success");
}

/* ---------------------------------------------------------
   DOWNLOAD DE ARQUIVOS
--------------------------------------------------------- */

function downloadEngineeringFile(content, filename, mimeType) {
    const blob = new Blob([content], {
        type: mimeType
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   SALVAR DADOS
--------------------------------------------------------- */

function saveEngineeringData() {
    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }
}

/* ---------------------------------------------------------
   FECHAR MODAL
--------------------------------------------------------- */

function closeEngineeringModal() {
    const root = document.getElementById("modalRoot");

    if (root) {
        root.innerHTML = "";
    }
}

/* ---------------------------------------------------------
   ESTADO VAZIO
--------------------------------------------------------- */

function engineeringEmpty(message) {
    return `
        <div class="empty-state">
            <strong>${escapeHTML(message)}</strong>
        </div>
    `;
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function engineeringToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}
