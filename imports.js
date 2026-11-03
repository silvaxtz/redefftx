/* =========================================================
   FTTH MANAGER — IMPORTAÇÃO KML / KMZ
   Arquivo: imports.js
   ========================================================= */

let importedFeatures = [];
let importedFileName = null;

/* ---------------------------------------------------------
   INICIALIZAÇÃO
--------------------------------------------------------- */

function initImports() {
    const importButton = document.getElementById("importBtn");
    const fileInput = document.getElementById("importFile");

    if (!importButton || !fileInput) return;

    importButton.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async event => {
        const file = event.target.files?.[0];

        if (!file) return;

        await importKMLFile(file);

        fileInput.value = "";
    });
}

/* ---------------------------------------------------------
   IMPORTAR ARQUIVO
--------------------------------------------------------- */

async function importKMLFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    try {
        let kmlText = "";

        if (extension === "kml") {
            kmlText = await file.text();
        } else if (extension === "kmz") {
            kmlText = await extractKMZ(file);
        } else {
            throw new Error("Formato não suportado. Escolha um arquivo KML ou KMZ.");
        }

        const parsed = parseKML(kmlText);

        if (!parsed.features.length) {
            throw new Error("Nenhum elemento geográfico foi encontrado no arquivo.");
        }

        importedFileName = file.name;
        importedFeatures = parsed.features;

        const importedRecord = {
            id: typeof id === "function" ? id() : createId(),
            name: file.name,
            importedAt: new Date().toISOString(),
            featureCount: parsed.features.length,
            features: parsed.features
        };

        if (!Array.isArray(data.imports)) {
            data.imports = [];
        }

        if (typeof pushHistory === "function") {
            pushHistory();
        }

        data.imports.push(importedRecord);

        if (typeof saveData === "function") {
            saveData();
        } else if (typeof save === "function") {
            save();
        }

        if (typeof renderImportedMap === "function") {
            renderImportedMap();
        }

        if (typeof renderLists === "function") {
            renderLists();
        }

        if (typeof renderAll === "function") {
            renderAll();
        }

        if (typeof fitNetwork === "function") {
            fitNetwork();
        }

        importToast(
            `${parsed.features.length} elemento(s) importado(s) de ${file.name}.`,
            "success"
        );

    } catch (error) {
        console.error("Erro ao importar arquivo:", error);

        importToast(
            error.message || "Não foi possível importar o arquivo.",
            "error"
        );
    }
}

/* ---------------------------------------------------------
   EXTRAIR KMZ
--------------------------------------------------------- */

async function extractKMZ(file) {
    if (typeof JSZip === "undefined") {
        throw new Error("Biblioteca de leitura KMZ não foi carregada.");
    }

    const zip = await JSZip.loadAsync(file);

    const kmlFiles = Object.keys(zip.files).filter(name => {
        return name.toLowerCase().endsWith(".kml") && !zip.files[name].dir;
    });

    if (!kmlFiles.length) {
        throw new Error("O arquivo KMZ não contém nenhum arquivo KML.");
    }

    const preferredFile =
        kmlFiles.find(name => name.toLowerCase() === "doc.kml") ||
        kmlFiles[0];

    return await zip.files[preferredFile].async("text");
}

/* ---------------------------------------------------------
   PARSER KML
--------------------------------------------------------- */

function parseKML(kmlText) {
    const parser = new DOMParser();

    const xml = parser.parseFromString(kmlText, "application/xml");

    const parserError = xml.querySelector("parsererror");

    if (parserError) {
        throw new Error("O arquivo KML está inválido ou corrompido.");
    }

    const features = [];

    const placemarks = Array.from(
        xml.getElementsByTagNameNS("*", "Placemark")
    );

    placemarks.forEach((placemark, index) => {
        const feature = parsePlacemark(placemark, index);

        if (feature) {
            features.push(feature);
        }
    });

    return {
        name: getKMLDocumentName(xml),
        features
    };
}

/* ---------------------------------------------------------
   NOME DO DOCUMENTO
--------------------------------------------------------- */

function getKMLDocumentName(xml) {
    const name = xml.getElementsByTagNameNS("*", "Document")[0]
        ?.getElementsByTagNameNS("*", "name")[0]
        ?.textContent;

    return name || "Importação KML";
}

/* ---------------------------------------------------------
   PARSE PLACEMARK
--------------------------------------------------------- */

function parsePlacemark(placemark, index) {
    const name = getDirectChildText(placemark, "name") ||
        `Elemento ${index + 1}`;

    const description = getDirectChildText(placemark, "description") || "";

    const styleUrl = getDirectChildText(placemark, "styleUrl") || "";

    const style = extractKMLStyle(placemark, styleUrl);

    const geometry = parseKMLGeometry(placemark);

    if (!geometry) {
        return null;
    }

    return {
        id: typeof id === "function" ? id() : createId(),
        name,
        description,
        styleUrl,
        style,
        geometry,
        type: geometry.type,
        folder: findPlacemarkFolder(placemark)
    };
}

/* ---------------------------------------------------------
   TEXTO DE FILHO DIRETO
--------------------------------------------------------- */

function getDirectChildText(element, tagName) {
    const children = Array.from(element.children);

    const child = children.find(item => {
        return item.localName === tagName;
    });

    return child?.textContent?.trim() || "";
}

/* ---------------------------------------------------------
   PASTA DO GOOGLE EARTH
--------------------------------------------------------- */

function findPlacemarkFolder(placemark) {
    let parent = placemark.parentElement;

    while (parent) {
        if (parent.localName === "Folder") {
            const folderName = getDirectChildText(parent, "name");

            if (folderName) return folderName;
        }

        parent = parent.parentElement;
    }

    return "Sem pasta";
}

/* ---------------------------------------------------------
   ESTILOS KML
--------------------------------------------------------- */

function extractKMLStyle(placemark, styleUrl) {
    const style = {
        lineColor: "#3388ff",
        lineWidth: 3,
        fillColor: "#3388ff",
        fillOpacity: 0.25,
        iconColor: "#3388ff"
    };

    const inlineStyle = Array.from(placemark.children).find(child => {
        return child.localName === "Style";
    });

    const styleElement = inlineStyle || findKMLStyleById(placemark, styleUrl);

    if (!styleElement) {
        return style;
    }

    const lineStyle = Array.from(styleElement.children).find(child => {
        return child.localName === "LineStyle";
    });

    const polyStyle = Array.from(styleElement.children).find(child => {
        return child.localName === "PolyStyle";
    });

    const iconStyle = Array.from(styleElement.children).find(child => {
        return child.localName === "IconStyle";
    });

    if (lineStyle) {
        const color = getDirectChildText(lineStyle, "color");
        const width = Number(getDirectChildText(lineStyle, "width"));

        if (color) style.lineColor = kmlColorToHex(color);
        if (width > 0) style.lineWidth = width;
    }

    if (polyStyle) {
        const color = getDirectChildText(polyStyle, "color");

        if (color) {
            style.fillColor = kmlColorToHex(color);
            style.fillOpacity = kmlColorOpacity(color);
        }
    }

    if (iconStyle) {
        const color = getDirectChildText(iconStyle, "color");

        if (color) style.iconColor = kmlColorToHex(color);
    }

    return style;
}

function findKMLStyleById(placemark, styleUrl) {
    if (!styleUrl) return null;

    const styleId = styleUrl.replace("#", "");

    const document = placemark.ownerDocument;

    const styles = Array.from(
        document.getElementsByTagNameNS("*", "Style")
    );

    return styles.find(style => style.getAttribute("id") === styleId) || null;
}

/* ---------------------------------------------------------
   CONVERTER COR KML ABGR PARA HEX
--------------------------------------------------------- */

function kmlColorToHex(color) {
    const value = String(color).trim();

    if (!/^[0-9a-fA-F]{8}$/.test(value)) {
        return "#3388ff";
    }

    const alpha = value.substring(0, 2);
    const blue = value.substring(2, 4);
    const green = value.substring(4, 6);
    const red = value.substring(6, 8);

    return `#${red}${green}${blue}`;
}

function kmlColorOpacity(color) {
    const value = String(color).trim();

    if (!/^[0-9a-fA-F]{8}$/.test(value)) {
        return 0.25;
    }

    return parseInt(value.substring(0, 2), 16) / 255;
}

/* ---------------------------------------------------------
   GEOMETRIAS
--------------------------------------------------------- */

function parseKMLGeometry(element) {
    const geometryElements = Array.from(element.children).filter(child => {
        return [
            "Point",
            "LineString",
            "MultiGeometry",
            "Polygon",
            "gx:Track"
        ].includes(child.localName) ||
        child.localName === "Track";
    });

    if (!geometryElements.length) {
        return null;
    }

    const geometry = geometryElements[0];

    switch (geometry.localName) {
        case "Point":
            return parseKMLPoint(geometry);

        case "LineString":
            return parseKMLLineString(geometry);

        case "Polygon":
            return parseKMLPolygon(geometry);

        case "MultiGeometry":
            return parseKMLMultiGeometry(geometry);

        case "Track":
            return parseKMLTrack(geometry);

        default:
            return null;
    }
}

/* ---------------------------------------------------------
   COORDENADAS KML
--------------------------------------------------------- */

function parseKMLCoordinates(text) {
    if (!text) return [];

    return text
        .trim()
        .split(/\s+/)
        .map(value => {
            const parts = value.split(",").map(Number);

            if (parts.length < 2) return null;

            const longitude = parts[0];
            const latitude = parts[1];

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return null;
            }

            return {
                lat: latitude,
                lng: longitude,
                altitude: Number.isFinite(parts[2]) ? parts[2] : null
            };
        })
        .filter(Boolean);
}

/* ---------------------------------------------------------
   PONTO
--------------------------------------------------------- */

function parseKMLPoint(element) {
    const coordinates = element.getElementsByTagNameNS("*", "coordinates")[0];

    const points = parseKMLCoordinates(coordinates?.textContent);

    if (!points.length) return null;

    return {
        type: "Point",
        coordinates: points[0]
    };
}

/* ---------------------------------------------------------
   LINHA
--------------------------------------------------------- */

function parseKMLLineString(element) {
    const coordinates = element.getElementsByTagNameNS("*", "coordinates")[0];

    const points = parseKMLCoordinates(coordinates?.textContent);

    if (points.length < 2) return null;

    return {
        type: "LineString",
        coordinates: points
    };
}

/* ---------------------------------------------------------
   POLÍGONO
--------------------------------------------------------- */

function parseKMLPolygon(element) {
    const boundaries = Array.from(element.children).filter(child => {
        return child.localName === "outerBoundaryIs" ||
            child.localName === "innerBoundaryIs";
    });

    const rings = [];

    boundaries.forEach(boundary => {
        const coordinates = boundary.getElementsByTagNameNS(
            "*",
            "coordinates"
        )[0];

        const points = parseKMLCoordinates(coordinates?.textContent);

        if (points.length >= 3) {
            rings.push(points);
        }
    });

    if (!rings.length) return null;

    return {
        type: "Polygon",
        coordinates: rings
    };
}

/* ---------------------------------------------------------
   MULTIGEOMETRIA
--------------------------------------------------------- */

function parseKMLMultiGeometry(element) {
    const geometries = [];

    Array.from(element.children).forEach(child => {
        const geometry = parseKMLGeometry({
            children: [child]
        });

        if (geometry) {
            geometries.push(geometry);
        }
    });

    if (!geometries.length) return null;

    return {
        type: "GeometryCollection",
        geometries
    };
}

/* ---------------------------------------------------------
   GX TRACK
--------------------------------------------------------- */

function parseKMLTrack(element) {
    const coordinates = Array.from(
        element.getElementsByTagNameNS("*", "coord")
    );

    const points = coordinates.map(coord => {
        const values = coord.textContent.trim().split(/\s+/).map(Number);

        if (values.length < 2) return null;

        return {
            lat: values[1],
            lng: values[0],
            altitude: values[2] ?? null
        };
    }).filter(point => {
        return point &&
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng);
    });

    if (points.length < 2) return null;

    return {
        type: "LineString",
        coordinates: points
    };
}

/* ---------------------------------------------------------
   PROMOVER PONTO IMPORTADO PARA CTO
--------------------------------------------------------- */

function promoteImported(importId, featureId) {
    const feature = findImportedFeature(importId, featureId);

    if (!feature || feature.geometry.type !== "Point") {
        importToast("Não foi possível converter esse elemento em CTO.", "error");
        return;
    }

    const point = feature.geometry.coordinates;

    const cto = {
        id: typeof id === "function" ? id() : createId(),
        name: feature.name,
        code: "",
        lat: point.lat,
        lng: point.lng,
        ports: 16,
        occupiedPorts: 0,
        address: feature.description || "",
        createdAt: new Date().toISOString(),
        source: "import"
    };

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.ctos.push(cto);

    if (typeof saveData === "function") {
        saveData();
    }

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    importToast(`"${feature.name}" convertido em CTO.`, "success");
}

/* ---------------------------------------------------------
   PROMOVER PONTO IMPORTADO PARA CAIXA
--------------------------------------------------------- */

function promoteImportedBox(importId, featureId) {
    const feature = findImportedFeature(importId, featureId);

    if (!feature || feature.geometry.type !== "Point") {
        importToast("Não foi possível converter esse elemento em caixa.", "error");
        return;
    }

    const point = feature.geometry.coordinates;

    const box = {
        id: typeof id === "function" ? id() : createId(),
        name: feature.name,
        type: "CEO",
        lat: point.lat,
        lng: point.lng,
        address: feature.description || "",
        createdAt: new Date().toISOString(),
        source: "import"
    };

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.boxes.push(box);

    if (typeof saveData === "function") {
        saveData();
    }

    if (typeof renderMap === "function") {
        renderMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    importToast(`"${feature.name}" convertido em caixa.`, "success");
}

/* ---------------------------------------------------------
   LOCALIZAR ELEMENTO IMPORTADO
--------------------------------------------------------- */

function findImportedFeature(importId, featureId) {
    const imported = data.imports.find(item => item.id === importId);

    if (!imported) return null;

    return imported.features.find(feature => {
        return feature.id === featureId;
    }) || null;
}

/* ---------------------------------------------------------
   EXCLUIR IMPORTAÇÃO
--------------------------------------------------------- */

function deleteImport(importId) {
    const imported = data.imports.find(item => item.id === importId);

    if (!imported) return;

    const confirmed = confirm(
        `Deseja excluir a importação "${imported.name}"?`
    );

    if (!confirmed) return;

    if (typeof pushHistory === "function") {
        pushHistory();
    }

    data.imports = data.imports.filter(item => {
        return item.id !== importId;
    });

    if (typeof saveData === "function") {
        saveData();
    }

    if (typeof renderImportedMap === "function") {
        renderImportedMap();
    }

    if (typeof renderAll === "function") {
        renderAll();
    }

    importToast("Importação excluída.", "success");
}

/* ---------------------------------------------------------
   NOTIFICAÇÃO
--------------------------------------------------------- */

function importToast(message, type = "info") {
    if (typeof toast === "function") {
        toast(message, type);
    } else {
        console.log(message);
    }
}
