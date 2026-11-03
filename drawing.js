
/* =========================================================
   FTTH MANAGER — DESENHO DE CABOS
   Arquivo: drawing.js
   ========================================================= */

let drawingActive = false;
let drawingMode = "select";

let drawingPoints = [];
let drawingRedoStack = [];

let drawingPreview = null;
let drawingMarkers = [];

let drawingMousePosition = null;

/* ---------------------------------------------------------
   ELEMENTOS
--------------------------------------------------------- */

function drawingElement(id) {
    return document.getElementById(id);
}

function drawingToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initDrawing() {
    const undoButton = drawingElement("undoDrawing");
    const redoButton = drawingElement("redoDrawing");
    const cancelButton = drawingElement("cancelDrawing");
    const finishButton = drawingElement("finishDrawing");

    if (undoButton) {
        undoButton.addEventListener("click", undoDrawingPoint);
    }

    if (redoButton) {
        redoButton.addEventListener("click", redoDrawingPoint);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", cancelCableDrawing);
    }

    if (finishButton) {
        finishButton.addEventListener("click", finishCableDrawing);
    }

    const colorInput = drawingElement("cableColor");
    const widthInput = drawingElement("cableWidth");

    if (colorInput) {
        colorInput.addEventListener("input", updateDrawingStyle);
    }

    if (widthInput) {
        widthInput.addEventListener("input", updateDrawingStyle);
    }

    updateDrawingInterface();
}

/* ---------------------------------------------------------
   MODO DE DESENHO
--------------------------------------------------------- */

function setDrawingMode(mode) {
    drawingMode = mode;

    if (mode === "cable") {
        activateCableDrawing();
        return;
    }

    if (drawingActive) {
        cancelCableDrawing(false);
    }

    drawingMode = mode;

    const mapElement = drawingElement("map");

    if (mapElement) {
        mapElement.style.cursor =
            mode === "select" ? "" : "crosshair";
    }

    updateDrawingInterface();
}

function activateCableDrawing() {
    if (!map) {
        drawingToast("O mapa ainda não foi inicializado.", "error");
        return;
    }

    if (drawingActive) {
        cancelCableDrawing(false);
    }

    drawingActive = true;
    drawingMode = "cable";

    drawingPoints = [];
    drawingRedoStack = [];
    drawingMousePosition = null;

    clearDrawingPreview();

    const panel = drawingElement("drawingPanel");

    if (panel) {
        panel.hidden = false;
        panel.style.display = "block";
    }

    const mapElement = drawingElement("map");

    if (mapElement) {
        mapElement.style.cursor = "crosshair";
    }

    if (map.doubleClickZoom) {
        map.doubleClickZoom.disable();
    }

    updateDrawingInterface();

    drawingToast(
        "Desenho iniciado. Clique no mapa para marcar os pontos do cabo."
    );
}

/* ---------------------------------------------------------
   CLIQUES NO MAPA
   FUNÇÃO CHAMADA PELO app.js
--------------------------------------------------------- */

function handleDrawingMapPoint(event) {
    if (!drawingActive || drawingMode !== "cable") {
        return;
    }

    if (!event || !event.latlng) {
        return;
    }

    const point = {
        lat: Number(event.latlng.lat),
        lng: Number(event.latlng.lng)
    };

    drawingPoints.push(point);

    drawingRedoStack = [];
    drawingMousePosition = null;

    addDrawingMarker(point);
    updateDrawingPreview();
    updateDrawingInterface();
}

/* ---------------------------------------------------------
   MOVIMENTO DO MOUSE
--------------------------------------------------------- */

function handleDrawingMouseMove(event) {
    if (!drawingActive || drawingMode !== "cable") {
        return;
    }

    if (!event || !event.latlng) {
        return;
    }

    drawingMousePosition = {
        lat: Number(event.latlng.lat),
        lng: Number(event.latlng.lng)
    };

    updateDrawingPreview();
}

/* ---------------------------------------------------------
   MARCADORES DOS PONTOS
--------------------------------------------------------- */

function addDrawingMarker(point) {
    if (!drawingLayer) return;

    const marker = L.circleMarker(
        [point.lat, point.lng],
        {
            radius: 5,
            color: "#ffffff",
            weight: 2,
            fillColor: getCableColor(),
            fillOpacity: 1
        }
    );

    marker.addTo(drawingLayer);

    drawingMarkers.push(marker);
}

/* ---------------------------------------------------------
   PRÉ-VISUALIZAÇÃO DO CABO
--------------------------------------------------------- */

function updateDrawingPreview() {
    if (!drawingLayer || !drawingActive) {
        return;
    }

    if (drawingPreview) {
        drawingLayer.removeLayer(drawingPreview);
        drawingPreview = null;
    }

    const pointsToDraw = drawingPoints.map(point => [
        point.lat,
        point.lng
    ]);

    if (drawingMousePosition && drawingPoints.length > 0) {
        pointsToDraw.push([
            drawingMousePosition.lat,
            drawingMousePosition.lng
        ]);
    }

    if (pointsToDraw.length < 2) {
        return;
    }

    drawingPreview = L.polyline(
        pointsToDraw,
        {
            color: getCableColor(),
            weight: getCableWidth(),
            opacity: 0.9,
            dashArray: "8, 7",
            lineCap: "round",
            lineJoin: "round"
        }
    );

    drawingPreview.addTo(drawingLayer);
}

/* ---------------------------------------------------------
   CONFIGURAÇÕES VISUAIS
--------------------------------------------------------- */

function getCableColor() {
    const input = drawingElement("cableColor");

    return input && input.value
        ? input.value
        : "#00aaff";
}

function getCableWidth() {
    const input = drawingElement("cableWidth");

    const width = input
        ? Number(input.value)
        : 4;

    return Math.max(1, Math.min(width || 4, 20));
}

function getCableFiberCount() {
    const input = drawingElement("cableFibers");

    const count = input
        ? Number(input.value)
        : 12;

    return Math.max(1, count || 12);
}

function updateDrawingStyle() {
    updateDrawingPreview();

    drawingMarkers.forEach(marker => {
        marker.setStyle({
            fillColor: getCableColor()
        });
    });
}

/* ---------------------------------------------------------
   DESFAZER PONTO
--------------------------------------------------------- */

function undoDrawingPoint() {
    if (!drawingActive || drawingPoints.length === 0) {
        return;
    }

    const removedPoint = drawingPoints.pop();

    drawingRedoStack.push(removedPoint);

    const marker = drawingMarkers.pop();

    if (marker && drawingLayer) {
        drawingLayer.removeLayer(marker);
    }

    updateDrawingPreview();
    updateDrawingInterface();
}

/* ---------------------------------------------------------
   REFAZER PONTO
--------------------------------------------------------- */

function redoDrawingPoint() {
    if (!drawingActive || drawingRedoStack.length === 0) {
        return;
    }

    const restoredPoint = drawingRedoStack.pop();

    drawingPoints.push(restoredPoint);

    addDrawingMarker(restoredPoint);

    updateDrawingPreview();
    updateDrawingInterface();
}

/* ---------------------------------------------------------
   LIMPAR PRÉ-VISUALIZAÇÃO
--------------------------------------------------------- */

function clearDrawingPreview() {
    if (drawingLayer) {
        drawingLayer.clearLayers();
    }

    drawingPreview = null;
    drawingMarkers = [];
}

/* ---------------------------------------------------------
   CANCELAR DESENHO
--------------------------------------------------------- */

function cancelCableDrawing(showMessage = true) {
    drawingActive = false;
    drawingMode = "select";

    drawingPoints = [];
    drawingRedoStack = [];
    drawingMousePosition = null;

    clearDrawingPreview();

    const panel = drawingElement("drawingPanel");

    if (panel) {
        panel.hidden = true;
        panel.style.display = "none";
    }

    if (map && map.doubleClickZoom) {
        map.doubleClickZoom.enable();
    }

    const mapElement = drawingElement("map");

    if (mapElement) {
        mapElement.style.cursor = "";
    }

    updateDrawingInterface();

    if (showMessage) {
        drawingToast("Desenho cancelado.");
    }
}

/* ---------------------------------------------------------
   FINALIZAR E SALVAR CABO
--------------------------------------------------------- */

function finishCableDrawing() {
    if (!drawingActive) return;

    if (drawingPoints.length < 2) {
        drawingToast(
            "Marque pelo menos dois pontos para salvar o cabo.",
            "error"
        );
        return;
    }

    const nameInput = drawingElement("cableName");

    const cableName = nameInput && nameInput.value.trim()
        ? nameInput.value.trim()
        : `Cabo ${new Date().toLocaleString("pt-BR")}`;

    const cable = {
        id: typeof id === "function"
            ? id()
            : createId(),

        name: cableName,

        color: getCableColor(),

        width: getCableWidth(),

        fibers: getCableFiberCount(),

        points: drawingPoints.map(point => ({
            lat: point.lat,
            lng: point.lng
        })),

        length: calculateDrawingLength(drawingPoints),

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(data.cables)) {
        data.cables = [];
    }

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.cables.push(cable);

    if (typeof saveData === "function") {
        saveData();
    } else if (typeof save === "function") {
        save();
    }

    cancelCableDrawing(false);

    if (typeof renderCableMap === "function") {
        renderCableMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    if (typeof renderLists === "function") {
        renderLists();
    }

    drawingToast(
        `Cabo "${cableName}" salvo com ${cable.fibers} fibras.`,
        "success"
    );
}

/* ---------------------------------------------------------
   CÁLCULO DO COMPRIMENTO
--------------------------------------------------------- */

function calculateDrawingLength(points) {
    if (!Array.isArray(points) || points.length < 2) {
        return 0;
    }

    let total = 0;

    for (let i = 1; i < points.length; i++) {
        const previous = L.latLng(
            points[i - 1].lat,
            points[i - 1].lng
        );

        const current = L.latLng(
            points[i].lat,
            points[i].lng
        );

        total += previous.distanceTo(current);
    }

    return Number(total.toFixed(2));
}

/* ---------------------------------------------------------
   ATUALIZAÇÃO DA INTERFACE
--------------------------------------------------------- */

function updateDrawingInterface() {
    const counter = drawingElement("drawingCounter");

    if (counter) {
        counter.textContent =
            `${drawingPoints.length} ponto(s) marcado(s)`;
    }

    const undoButton = drawingElement("undoDrawing");
    const redoButton = drawingElement("redoDrawing");
    const finishButton = drawingElement("finishDrawing");

    if (undoButton) {
        undoButton.disabled =
            !drawingActive || drawingPoints.length === 0;
    }

    if (redoButton) {
        redoButton.disabled =
            !drawingActive || drawingRedoStack.length === 0;
    }

    if (finishButton) {
        finishButton.disabled =
            !drawingActive || drawingPoints.length < 2;
    }

    const hint = drawingElement("mapHint");

    if (hint && drawingActive) {
        hint.textContent =
            "Clique no mapa para adicionar pontos. A linha acompanha o cursor.";
    }
}

/* ---------------------------------------------------------
   CONSULTAR PONTOS DO DESENHO
--------------------------------------------------------- */

function getDrawingPoints() {
    return drawingPoints.map(point => ({
        lat: point.lat,
        lng: point.lng
    }));
}
