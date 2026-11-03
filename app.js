/* =========================================================
   FTTH MANAGER — APLICAÇÃO PRINCIPAL
   Arquivo: app.js
   ========================================================= */

let appInitialized = false;

/* ---------------------------------------------------------
   INICIALIZAÇÃO GERAL
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    initializeFTTHApp();
});

function initializeFTTHApp() {
    if (appInitialized) return;

    appInitialized = true;

    try {
        ensureAppData();

        initializeMapModule();

        if (typeof initDrawing === "function") {
            initDrawing();
        }

        if (typeof initSearch === "function") {
            initSearch();
        }

        if (typeof initImports === "function") {
            initImports();
        }

        if (typeof initEquipment === "function") {
            initEquipment();
        }

        if (typeof initCables === "function") {
            initCables();
        }

        if (typeof initClients === "function") {
            initClients();
        }

        if (typeof initEngineering === "function") {
            initEngineering();
        }

        setupNavigation();
        setupGeneralButtons();
        setupBackupSystem();
        setupNetworkSearch();
        setupMapTools();
        setupMapPreferences();

        renderAll();

        showToast("FTTH Manager iniciado com sucesso.", "success");

    } catch (error) {
        console.error("Erro ao iniciar FTTH Manager:", error);

        showToast(
            "Ocorreu um erro ao iniciar o sistema. Verifique o console.",
            "error"
        );
    }
}

/* ---------------------------------------------------------
   GARANTIR ESTRUTURA DOS DADOS
--------------------------------------------------------- */

function ensureAppData() {
    if (!window.data) {
        data = {};
    }

    const collections = [
        "ctos",
        "clients",
        "boxes",
        "cables",
        "imports",
        "splitters",
        "poles",
        "splices"
    ];

    collections.forEach(collection => {
        if (!Array.isArray(data[collection])) {
            data[collection] = [];
        }
    });

    if (!data.settings || typeof data.settings !== "object") {
        data.settings = {};
    }
}

/* ---------------------------------------------------------
   INICIALIZAR MAPA
--------------------------------------------------------- */

function initializeMapModule() {
    if (typeof initMap !== "function") {
        throw new Error("Módulo do mapa não encontrado.");
    }

    initMap();

    if (typeof setupMapEvents === "function") {
        setupMapEvents();
    }
}

/* ---------------------------------------------------------
   NOTIFICAÇÕES
--------------------------------------------------------- */

function toast(message, type = "info") {
    showToast(message, type);
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");

    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const notification = document.createElement("div");

    notification.className = `toast toast-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add("show");
    });

    setTimeout(() => {
        notification.classList.remove("show");

        setTimeout(() => {
            notification.remove();
        }, 300);

    }, 3500);
}

/* ---------------------------------------------------------
   NAVEGAÇÃO ENTRE ABAS
--------------------------------------------------------- */

function setupNavigation() {
    const buttons = document.querySelectorAll("[data-tab]");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const tab = button.dataset.tab;

            activateTab(tab);
        });
    });
}

function activateTab(tabName) {
    document.querySelectorAll("[data-tab]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tab === tabName
        );
    });

    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.toggle(
            "active",
            panel.id === `tab-${tabName}`
        );
    });

    if (tabName === "network" && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }

    if (tabName === "engineering") {
        renderEngineering();
    }
}

/* ---------------------------------------------------------
   FERRAMENTAS DO MAPA
--------------------------------------------------------- */

function setupMapTools() {
    document.querySelectorAll("[data-tool]").forEach(button => {
        button.addEventListener("click", () => {
            const tool = button.dataset.tool;

            document.querySelectorAll("[data-tool]").forEach(item => {
                item.classList.toggle(
                    "active",
                    item.dataset.tool === tool
                );
            });

            if (tool === "select") {
                currentEquipmentType = null;
                setDrawingMode("select");

                const hint = document.getElementById("mapHint");

                if (hint) {
                    hint.textContent = "Modo de seleção ativado.";
                }

                return;
            }

            if (tool === "cable") {
                currentEquipmentType = null;
                setDrawingMode("cable");
                return;
            }

            if (EQUIPMENT_CONFIG[tool]) {
                setDrawingMode(tool);
                setActiveEquipmentTool(tool);
            }
        });
    });
}

/* ---------------------------------------------------------
   CLIQUE NO MAPA
--------------------------------------------------------- */

// Encaminha os cliques para o desenho de cabos
// ou para o cadastro de equipamentos.

function handleMapClick(event) {
    if (drawingActive && drawingMode === "cable") {
        if (typeof handleDrawingMapPoint === "function") {
            handleDrawingMapPoint(event);
        } else {
            addPointToCurrentCable(event);
        }

        return;
    }

    if (currentEquipmentType) {
        handleEquipmentMapClick(event);
    }
}

/* ---------------------------------------------------------
   ADICIONAR PONTO AO CABO
--------------------------------------------------------- */

function addPointToCurrentCable(event) {
    if (!drawingActive || !event?.latlng) return;

    const point = {
        lat: Number(event.latlng.lat),
        lng: Number(event.latlng.lng)
    };

    drawingPoints.push(point);
    drawingRedoStack = [];

    if (typeof addDrawingMarker === "function") {
        addDrawingMarker(point);
    }

    updateDrawingPreview();
    updateDrawingInterface();
}

/* ---------------------------------------------------------
   BOTÕES GERAIS
--------------------------------------------------------- */

function setupGeneralButtons() {
    const clearButton = document.getElementById("clearDataBtn");

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            const confirmed = confirm(
                "ATENÇÃO: deseja apagar todos os dados locais do FTTH Manager?"
            );

            if (!confirmed) return;

            if (typeof createSafetyBackup === "function") {
                createSafetyBackup();
            }

            if (typeof clearAllData === "function") {
                clearAllData();
            }

            showToast("Dados locais apagados.", "success");

            setTimeout(() => {
                location.reload();
            }, 800);
        });
    }

    const showLabels = document.getElementById("showLabels");

    if (showLabels) {
        showLabels.checked = data.settings.showLabels !== false;

        showLabels.addEventListener("change", () => {
            data.settings.showLabels = showLabels.checked;

            saveData();

            renderMap();
        });
    }

    const exportKml = document.getElementById("exportKmlBtn");

    if (exportKml) {
        exportKml.addEventListener("click", exportNetworkKML);
    }
}

/* ---------------------------------------------------------
   SISTEMA DE BACKUP
--------------------------------------------------------- */

function setupBackupSystem() {
    const backupButton = document.getElementById("backupBtn");

    if (backupButton) {
        backupButton.addEventListener("click", () => {
            if (typeof createBackup === "function") {
                createBackup();
            } else {
                exportDataJSON();
            }
        });
    }

    const restoreButton = document.getElementById("restoreBackupBtn");

    if (restoreButton) {
        restoreButton.addEventListener("click", openBackupFile);
    }
}

function openBackupFile() {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", async () => {
        const file = input.files?.[0];

        if (!file) return;

        try {
            const content = await file.text();
            const backup = JSON.parse(content);

            const confirmed = confirm(
                "Deseja restaurar este backup? Os dados atuais serão substituídos."
            );

            if (!confirmed) return;

            if (typeof restoreBackup === "function") {
                restoreBackup(backup);

                showToast("Backup restaurado.", "success");

                setTimeout(() => {
                    location.reload();
                }, 800);
            }

        } catch (error) {
            console.error(error);

            showToast(
                "Não foi possível restaurar o backup.",
                "error"
            );
        }
    });

    input.click();
}

/* ---------------------------------------------------------
   BUSCA DE EQUIPAMENTOS NA REDE
--------------------------------------------------------- */

function setupNetworkSearch() {
    const input = document.getElementById("networkSearch");

    if (!input) return;

    input.addEventListener("input", () => {
        const query = input.value
            .trim()
            .toLowerCase();

        filterNetworkLists(query);
    });
}

function filterNetworkLists(query) {
    document.querySelectorAll(
        "#ctoList .equipment-card, " +
        "#boxList .equipment-card, " +
        "#splitterList .equipment-card, " +
        "#poleList .equipment-card, " +
        "#clientList .client-card, " +
        "#cableList .cable-card"
    ).forEach(card => {
        const text = card.textContent.toLowerCase();

        card.style.display = text.includes(query)
            ? ""
            : "none";
    });
}

/* ---------------------------------------------------------
   PREFERÊNCIAS DO MAPA
--------------------------------------------------------- */

function setupMapPreferences() {
    if (typeof applyMapPreferences === "function") {
        applyMapPreferences();
    }
}

/* ---------------------------------------------------------
   RENDERIZAR TUDO
--------------------------------------------------------- */

function renderAll() {
    ensureAppData();

    updateCTOPortOccupancy();

    renderDashboard();
    renderLists();

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderEngineering === "function") {
        renderEngineering();
    }

    if (typeof renderCableList === "function") {
        renderCableList();
    }

    if (typeof renderClientList === "function") {
        renderClientList();
    }
}

/* ---------------------------------------------------------
   ATUALIZAR PAINEL PRINCIPAL
--------------------------------------------------------- */

function renderDashboard() {
    const totalCTOs = data.ctos.length;
    const totalClients = data.clients.length;
    const totalBoxes = data.boxes.length;
    const totalCables = data.cables.length;

    const totalPorts = data.ctos.reduce((sum, cto) => {
        return sum + Number(cto.ports || 0);
    }, 0);

    const occupiedPorts = data.ctos.reduce((sum, cto) => {
        return sum + Number(cto.occupiedPorts || 0);
    }, 0);

    const freePorts = Math.max(0, totalPorts - occupiedPorts);

    setText("statCtos", totalCTOs);
    setText("statClients", totalClients);
    setText("statBoxes", totalBoxes);
    setText("statCables", totalCables);
    setText("statFree", freePorts);

    const importedCount = data.imports.reduce((sum, item) => {
        return sum + Number(item.featureCount || 0);
    }, 0);

    setText("statImported", importedCount);

    renderRecentActivity();
}

/* ---------------------------------------------------------
   DEFINIR TEXTO DE ELEMENTO
--------------------------------------------------------- */

function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value;
    }
}

/* ---------------------------------------------------------
   RENDERIZAR LISTAS
--------------------------------------------------------- */

function renderLists() {
    renderEquipmentLists();
    renderImportedList();
    renderRecentActivity();

    if (typeof renderCableList === "function") {
        renderCableList();
    }

    if (typeof renderClientList === "function") {
        renderClientList();
    }
}

/* ---------------------------------------------------------
   LISTAS DE EQUIPAMENTOS
--------------------------------------------------------- */

function renderEquipmentLists() {
    renderEquipmentCollection(
        "ctoList",
        data.ctos,
        "cto",
        "Nenhuma CTO cadastrada"
    );

    renderEquipmentCollection(
        "boxList",
        data.boxes,
        "ceo",
        "Nenhuma CEO cadastrada"
    );

    renderEquipmentCollection(
        "splitterList",
        data.splitters,
        "splitter",
        "Nenhum splitter cadastrado"
    );

    renderEquipmentCollection(
        "poleList",
        data.poles,
        "pole",
        "Nenhum poste cadastrado"
    );
}

function renderEquipmentCollection(containerId, collection, type, emptyMessage) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    if (!collection.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>${escapeHTML(emptyMessage)}</strong>
            </div>
        `;

        return;
    }

    collection.forEach(item => {
        const card = document.createElement("div");

        card.className = "equipment-card";

        let extra = "";

        if (type === "cto") {
            extra = `
                <span>
                    ${Number(item.occupiedPorts || 0)} /
                    ${Number(item.ports || 16)} portas ocupadas
                </span>
            `;
        }

        if (type === "ceo") {
            extra = `<span>Capacidade: ${Number(item.capacity || 0)}</span>`;
        }

        if (type === "splitter") {
            extra = `<span>${escapeHTML(item.ratio || "")}</span>`;
        }

        if (type === "pole") {
            extra = `<span>${escapeHTML(item.type || "Poste")}</span>`;
        }

        card.innerHTML = `
            <div class="equipment-card-main">
                <strong>${escapeHTML(item.name || "Sem nome")}</strong>
                <span>${escapeHTML(item.code || "Sem código")}</span>
                ${extra}
            </div>

            <div class="equipment-card-actions">
                <button class="btn-secondary"
                    onclick="openEquipmentDetails('${type}', '${item.id}')">
                    Ver
                </button>

                <button class="btn-secondary"
                    onclick="editEquipment('${type}', '${item.id}')">
                    Editar
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

/* ---------------------------------------------------------
   LISTA DE IMPORTAÇÕES
--------------------------------------------------------- */

function renderImportedList() {
    const container = document.getElementById("importedList");

    if (!container) return;

    container.innerHTML = "";

    if (!data.imports.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma importação realizada</strong>
                <span>Importe arquivos KML ou KMZ.</span>
            </div>
        `;

        return;
    }

    data.imports.forEach(imported => {
        const card = document.createElement("div");

        card.className = "imported-card";

        card.innerHTML = `
            <div>
                <strong>${escapeHTML(imported.name)}</strong>
                <span>${Number(imported.featureCount || 0)} elementos</span>
            </div>

            <button class="btn-danger"
                onclick="deleteImport('${imported.id}')">
                Excluir
            </button>
        `;

        container.appendChild(card);
    });
}

/* ---------------------------------------------------------
   ATIVIDADES RECENTES
--------------------------------------------------------- */

function renderRecentActivity() {
    const container = document.getElementById("recentList");

    if (!container) return;

    const activities = [];

    data.ctos.forEach(item => {
        activities.push({
            type: "CTO",
            name: item.name,
            date: item.createdAt
        });
    });

    data.clients.forEach(item => {
        activities.push({
            type: "Cliente",
            name: item.name,
            date: item.createdAt
        });
    });

    data.cables.forEach(item => {
        activities.push({
            type: "Cabo",
            name: item.name,
            date: item.createdAt
        });
    });

    data.boxes.forEach(item => {
        activities.push({
            type: "CEO",
            name: item.name,
            date: item.createdAt
        });
    });

    activities.sort((a, b) => {
        return new Date(b.date || 0) - new Date(a.date || 0);
    });

    container.innerHTML = "";

    if (!activities.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma atividade registrada.</strong>
            </div>
        `;

        return;
    }

    activities.slice(0, 8).forEach(activity => {
        const item = document.createElement("div");

        item.className = "recent-item";

        item.innerHTML = `
            <div>
                <strong>${escapeHTML(activity.name || "Sem nome")}</strong>
                <span>${escapeHTML(activity.type)}</span>
            </div>

            <small>${formatActivityDate(activity.date)}</small>
        `;

        container.appendChild(item);
    });
}

function formatActivityDate(date) {
    if (!date) return "Data não informada";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Data inválida";
    }

    return parsed.toLocaleDateString("pt-BR");
}

/* ---------------------------------------------------------
   EXPORTAR REDE EM KML
--------------------------------------------------------- */

function exportNetworkKML() {
    const placemarks = [];

    function addPoint(item, type) {
        if (!Number.isFinite(Number(item.lat)) ||
            !Number.isFinite(Number(item.lng))) {
            return;
        }

        placemarks.push(`
            <Placemark>
                <name>${xmlEscape(item.name || type)}</name>
                <description>${xmlEscape(type)}</description>
                <Point>
                    <coordinates>
                        ${Number(item.lng)},${Number(item.lat)},0
                    </coordinates>
                </Point>
            </Placemark>
        `);
    }

    data.ctos.forEach(item => addPoint(item, "CTO"));
    data.boxes.forEach(item => addPoint(item, "CEO"));
    data.splitters.forEach(item => addPoint(item, "Splitter"));
    data.poles.forEach(item => addPoint(item, "Poste"));
    data.clients.forEach(item => addPoint(item, "Cliente"));

    data.cables.forEach(cable => {
        const coordinates = (cable.points || [])
            .map(point => `${Number(point.lng)},${Number(point.lat)},0`)
            .join(" ");

        if (!coordinates) return;

        placemarks.push(`
            <Placemark>
                <name>${xmlEscape(cable.name || "Cabo")}</name>
                <description>
                    ${Number(cable.fibers || 0)} fibras
                </description>
                <Style>
                    <LineStyle>
                        <color>${hexToKMLColor(cable.color || "#3388ff")}</color>
                        <width>${Number(cable.width || 4)}</width>
                    </LineStyle>
                </Style>
                <LineString>
                    <tessellate>1</tessellate>
                    <coordinates>${coordinates}</coordinates>
                </LineString>
            </Placemark>
        `);
    });

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
            <Document>
                <name>FTTH Manager - Rede</name>
                ${placemarks.join("\n")}
            </Document>
        </kml>`;

    downloadAppFile(
        kml,
        "rede-ftth.kml",
        "application/vnd.google-earth.kml+xml"
    );

    showToast("Arquivo KML exportado.", "success");
}

/* ---------------------------------------------------------
   CONVERTER COR HEX PARA KML
--------------------------------------------------------- */

function hexToKMLColor(hex) {
    const value = String(hex).replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
        return "ffff8833";
    }

    const red = value.substring(0, 2);
    const green = value.substring(2, 4);
    const blue = value.substring(4, 6);

    return `ff${blue}${green}${red}`;
}

/* ---------------------------------------------------------
   ESCAPAR XML
--------------------------------------------------------- */

function xmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/* ---------------------------------------------------------
   DOWNLOAD GENÉRICO
--------------------------------------------------------- */

function downloadAppFile(content, filename, mimeType) {
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

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------------------------------------
   ATALHOS DE TECLADO
--------------------------------------------------------- */

document.addEventListener("keydown", event => {
    const target = event.target;

    const typing = target &&
        (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        );

    if (typing) return;

    if (event.key === "Escape") {
        if (drawingActive) {
            cancelCableDrawing();
        } else {
            closeEquipmentModal();
            closeClientModal();
            closeCableModal();
            closeEngineeringModal();
        }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (drawingActive) {
            undoDrawingPoint();
        } else if (typeof undoData === "function") {
            undoData();
            renderAll();
        }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();

        if (drawingActive) {
            redoDrawingPoint();
        } else if (typeof redoData === "function") {
            redoData();
            renderAll();
        }
    }
});

/* ---------------------------------------------------------
   EXPOR FUNÇÕES DE ATUALIZAÇÃO
--------------------------------------------------------- */

window.renderAll = renderAll;
window.renderLists = renderLists;
window.renderDashboard = renderDashboard;
