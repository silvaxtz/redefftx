
"use strict";

/* =========================================
   FTTH MANAGER — MAP.JS
========================================= */

let map = null;

let satelliteLayer = null;
let streetLayer = null;
let labelLayer = null;

let equipmentLayer = null;
let cableLayer = null;
let importLayer = null;
let drawingLayer = null;

let activeMapType = "satellite";

let mapInitialized = false;

/* =========================================
   CONFIGURAÇÃO DOS MAPAS
========================================= */

const MAP_DEFAULT_CENTER = [-8.991, -36.055];
const MAP_DEFAULT_ZOOM = 14;

const MAP_LAYERS = {
  satellite: {
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri"
  },

  streets: {
    name: "Ruas",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors"
  },

  labels: {
    name: "Nomes e limites",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Labels © Esri"
  }
};

/* =========================================
   INICIALIZAR MAPA
========================================= */

function initMap() {
  if (mapInitialized && map) {
    map.invalidateSize();
    return map;
  }

  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.error("Elemento #map não encontrado.");
    return null;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet não foi carregado.");
    return null;
  }

  map = L.map("map", {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
    doubleClickZoom: true
  }).setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

  satelliteLayer = L.tileLayer(
    MAP_LAYERS.satellite.url,
    {
      attribution: MAP_LAYERS.satellite.attribution,
      maxZoom: 19,
      maxNativeZoom: 19
    }
  );

  streetLayer = L.tileLayer(
    MAP_LAYERS.streets.url,
    {
      attribution: MAP_LAYERS.streets.attribution,
      maxZoom: 19
    }
  );

  labelLayer = L.tileLayer(
    MAP_LAYERS.labels.url,
    {
      attribution: MAP_LAYERS.labels.attribution,
      maxZoom: 19,
      opacity: 0.9
    }
  );

  satelliteLayer.addTo(map);

  equipmentLayer = L.layerGroup().addTo(map);
  cableLayer = L.layerGroup().addTo(map);
  importLayer = L.layerGroup().addTo(map);
  drawingLayer = L.layerGroup().addTo(map);

  L.control.layers(
    {
      "Satélite": satelliteLayer,
      "Ruas": streetLayer
    },
    {
      "Nomes e limites": labelLayer
    },
    {
      position: "topright",
      collapsed: true
    }
  ).addTo(map);

  map.on("baselayerchange", event => {
    activeMapType =
      event.name === "Ruas" ? "streets" : "satellite";
  });

  mapInitialized = true;

  applyMapPreferences();

  console.log("Mapa FTTH inicializado.");

  return map;
}

/* =========================================
   PREFERÊNCIAS DO MAPA
========================================= */

function applyMapPreferences() {
  if (!map) return;

  if (data?.settings?.showLabels) {
    if (!map.hasLayer(labelLayer)) {
      labelLayer.addTo(map);
    }
  } else {
    if (map.hasLayer(labelLayer)) {
      map.removeLayer(labelLayer);
    }
  }

  if (data?.settings?.mapType === "streets") {
    setMapType("streets");
  } else {
    setMapType("satellite");
  }
}

function setMapType(type) {
  if (!map) return;

  if (type === "streets") {
    if (map.hasLayer(satelliteLayer)) {
      map.removeLayer(satelliteLayer);
    }

    streetLayer.addTo(map);
    activeMapType = "streets";

  } else {
    if (map.hasLayer(streetLayer)) {
      map.removeLayer(streetLayer);
    }

    satelliteLayer.addTo(map);
    activeMapType = "satellite";
  }

  if (data?.settings) {
    data.settings.mapType = activeMapType;
    saveData();
  }
}

/* =========================================
   CAMADAS
========================================= */

function clearMapLayers() {
  if (!map) return;

  equipmentLayer?.clearLayers();
  cableLayer?.clearLayers();
  importLayer?.clearLayers();
}

function clearDrawingLayer() {
  if (drawingLayer) {
    drawingLayer.clearLayers();
  }
}

/* =========================================
   ÍCONES FTTH
========================================= */

function createEquipmentIcon(type, label = "") {
  const config = {
    cto: {
      color: "#16a34a",
      symbol: "C",
      shape: "cto"
    },

    ceo: {
      color: "#eab308",
      symbol: "E",
      shape: "ceo"
    },

    box: {
      color: "#eab308",
      symbol: "E",
      shape: "ceo"
    },

    splitter: {
      color: "#9333ea",
      symbol: "S",
      shape: "splitter"
    },

    pole: {
      color: "#64748b",
      symbol: "P",
      shape: "pole"
    },

    client: {
      color: "#2563eb",
      symbol: "●",
      shape: "client"
    }
  };

  const item = config[type] || config.box;

  return L.divIcon({
    className: "",
    html: `
      <div class="ftth-marker ${item.shape}">
        <div class="ftth-marker-inner">
          <span>${item.symbol}</span>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });
}

/* =========================================
   ADICIONAR MARCADOR
========================================= */

function addEquipmentMarker(item, type) {
  if (!map || !equipmentLayer) return;

  if (
    !Number.isFinite(Number(item.lat)) ||
    !Number.isFinite(Number(item.lng))
  ) {
    return;
  }

  const marker = L.marker(
    [Number(item.lat), Number(item.lng)],
    {
      icon: createEquipmentIcon(type),
      draggable: false,
      riseOnHover: true,
      title: item.name || type
    }
  );

  marker.bindPopup(() => createEquipmentPopup(item, type));

  equipmentLayer.addLayer(marker);

  return marker;
}

/* =========================================
   POPUP DOS EQUIPAMENTOS
========================================= */

function createEquipmentPopup(item, type) {
  const name = escapeHTML(item.name || "Sem identificação");

  const typeNames = {
    cto: "CTO",
    ceo: "CEO / Caixa",
    box: "Caixa",
    splitter: "Splitter",
    pole: "Poste",
    client: "Cliente"
  };

  return `
    <div class="equipment-popup">
      <strong>${name}</strong>
      <p>${typeNames[type] || "Equipamento"}</p>

      ${item.region
        ? `<p>Região: ${escapeHTML(item.region)}</p>`
        : ""}

      ${item.capacity
        ? `<p>Capacidade: ${Number(item.capacity)} portas</p>`
        : ""}

      <button
        type="button"
        onclick="openEquipmentDetails('${escapeHTML(item.id)}','${type}')"
      >
        Abrir detalhes
      </button>
    </div>
  `;
}

/* =========================================
   EXIBIR EQUIPAMENTOS
========================================= */

function renderEquipmentMap() {
  if (!map || !equipmentLayer) return;

  equipmentLayer.clearLayers();

  (data.ctos || []).forEach(item => {
    addEquipmentMarker(item, "cto");
  });

  (data.boxes || []).forEach(item => {
    addEquipmentMarker(item, item.type === "ceo" ? "ceo" : "box");
  });

  (data.splitters || []).forEach(item => {
    addEquipmentMarker(item, "splitter");
  });

  (data.poles || []).forEach(item => {
    addEquipmentMarker(item, "pole");
  });

  (data.clients || []).forEach(item => {
    addEquipmentMarker(item, "client");
  });
}

/* =========================================
   DESENHAR CABOS SALVOS
========================================= */

function renderCableMap() {
  if (!map || !cableLayer) return;

  cableLayer.clearLayers();

  (data.cables || []).forEach(cable => {
    if (!Array.isArray(cable.points) || cable.points.length < 2) {
      return;
    }

    const points = cable.points
      .filter(p =>
        Number.isFinite(Number(p.lat)) &&
        Number.isFinite(Number(p.lng))
      )
      .map(p => [
        Number(p.lat),
        Number(p.lng)
      ]);

    if (points.length < 2) return;

    const line = L.polyline(points, {
      color: cable.color || "#ffca55",
      weight: Number(cable.width) || 4,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      className: "fiber-line"
    });

    line.bindPopup(`
      <div class="equipment-popup">
        <strong>${escapeHTML(cable.name || "Cabo óptico")}</strong>
        <p>${Number(cable.fibers || 0)} fibras ópticas</p>
        <p>Comprimento: ${formatCableLength(points)} m</p>
        <button
          type="button"
          onclick="openCableDetails('${escapeHTML(cable.id)}')"
        >
          Ver cabo
        </button>
      </div>
    `);

    cableLayer.addLayer(line);
  });
}

/* =========================================
   DESENHAR ELEMENTOS IMPORTADOS
========================================= */

function renderImportedMap() {
  if (!map || !importLayer) return;

  importLayer.clearLayers();

  (data.imports || []).forEach(item => {
    if (!item.geometry) return;

    drawImportedGeometry(item, importLayer);
  });
}

/* =========================================
   DESENHAR GEOMETRIA IMPORTADA
========================================= */

function drawImportedGeometry(item, targetLayer) {
  const geometry = item.geometry;

  const color = item.color || "#3388ff";

  function convertCoordinates(coords) {
    return (coords || [])
      .map(point => [
        Number(point.lat ?? point[1]),
        Number(point.lng ?? point[0])
      ])
      .filter(point =>
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
      );
  }

  function addPoint(point) {
    const lat = Number(point.lat ?? point[1]);
    const lng = Number(point.lng ?? point[0]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      color: "#ffffff",
      weight: 2,
      fillColor: color,
      fillOpacity: 1
    });

    marker.bindPopup(`
      <strong>${escapeHTML(item.name || "Elemento importado")}</strong>
      <p>Origem: Google Earth / KML</p>
      <button
        type="button"
        onclick="promoteImported('${escapeHTML(item.id)}')"
      >
        Cadastrar como CTO
      </button>
      <button
        type="button"
        onclick="promoteImportedBox('${escapeHTML(item.id)}')"
      >
        Cadastrar como caixa
      </button>
    `);

    targetLayer.addLayer(marker);
  }

  if (geometry.type === "Point") {
    const point = geometry.coordinates?.[0];

    if (point) addPoint(point);
    return;
  }

  if (geometry.type === "LineString") {
    const points = convertCoordinates(geometry.coordinates);

    if (points.length >= 2) {
      targetLayer.addLayer(L.polyline(points, {
        color,
        weight: 3,
        opacity: .9
      }));
    }

    return;
  }

  if (geometry.type === "MultiLineString") {
    (geometry.coordinates || []).forEach(line => {
      const points = convertCoordinates(line);

      if (points.length >= 2) {
        targetLayer.addLayer(L.polyline(points, {
          color,
          weight: 3,
          opacity: .9
        }));
      }
    });

    return;
  }

  if (geometry.type === "Polygon") {
    const rings = (geometry.coordinates || [])
      .map(convertCoordinates)
      .filter(ring => ring.length >= 3);

    if (rings.length) {
      targetLayer.addLayer(L.polygon(rings, {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: .15
      }));
    }

    return;
  }

  if (geometry.type === "MultiPolygon") {
    (geometry.coordinates || []).forEach(polygon => {
      const rings = polygon
        .map(convertCoordinates)
        .filter(ring => ring.length >= 3);

      if (rings.length) {
        targetLayer.addLayer(L.polygon(rings, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: .15
        }));
      }
    });

    return;
  }

  if (geometry.type === "GeometryCollection") {
    (geometry.geometries || []).forEach(child => {
      drawImportedGeometry({
        ...item,
        geometry: child
      }, targetLayer);
    });
  }
}

/* =========================================
   ATUALIZAR MAPA COMPLETO
========================================= */

function renderMap() {
  if (!map) return;

  renderEquipmentMap();
  renderCableMap();
  renderImportedMap();

  map.invalidateSize();
}

/* =========================================
   CENTRALIZAR NO EQUIPAMENTO
========================================= */

function centerOnEquipment(item, zoom = 18) {
  if (!map || !item) return;

  const lat = Number(item.lat);
  const lng = Number(item.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  map.flyTo([lat, lng], zoom, {
    animate: true,
    duration: 0.8
  });
}

/* =========================================
   CENTRALIZAR NA REDE
========================================= */

function fitNetwork() {
  if (!map) return;

  const points = [];

  const groups = [
    data.ctos,
    data.boxes,
    data.splitters,
    data.poles,
    data.clients
  ];

  groups.forEach(group => {
    (group || []).forEach(item => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        points.push([lat, lng]);
      }
    });
  });

  if (!points.length) {
    map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    return;
  }

  if (points.length === 1) {
    map.setView(points[0], 18);
    return;
  }

  map.fitBounds(L.latLngBounds(points), {
    padding: [50, 50],
    maxZoom: 18
  });
}

/* =========================================
   DISTÂNCIA DOS CABOS
========================================= */

function formatCableLength(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return "0";
  }

  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const a = L.latLng(points[i - 1][0], points[i - 1][1]);
    const b = L.latLng(points[i][0], points[i][1]);

    total += a.distanceTo(b);
  }

  return total.toFixed(1);
}

/* =========================================
   UTILITÁRIO HTML
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

/* =========================================
   UTILITÁRIO DE POSIÇÃO
========================================= */

function getMapCenter() {
  if (!map) return null;

  const center = map.getCenter();

  return {
    lat: center.lat,
    lng: center.lng
  };
}

function getMapZoom() {
  return map ? map.getZoom() : MAP_DEFAULT_ZOOM;
}

/* =========================================
   EVENTOS DO MAPA
========================================= */

function setupMapEvents() {
  if (!map) return;

  map.on("click", event => {
    if (typeof handleMapClick === "function") {
      handleMapClick(event);
    }
  });

  map.on("mousemove", event => {
    if (typeof handleDrawingMouseMove === "function") {
      handleDrawingMouseMove(event);
    }
  });

  map.on("zoomend", () => {
    if (typeof updateMapZoom === "function") {
      updateMapZoom(map.getZoom());
    }
  });
}
