
/* =========================================
   FTTH MANAGER — STORAGE.JS
   Armazenamento local e histórico
========================================= */

"use strict";

const FTTH_STORAGE_KEY = "ftth_manager_v1";
const FTTH_BACKUP_KEY = "ftth_manager_backup_v2";
const FTTH_HISTORY_LIMIT = 50;

const FTTH_DEFAULT_DATA = {
  version: 2,
  ctos: [],
  clients: [],
  boxes: [],
  cables: [],
  imports: [],
  splices: [],
  splitters: [],
  poles: [],
  settings: {
    mapType: "satellite",
    showLabels: true,
    defaultCableColor: "#ffca55",
    defaultCableWidth: 4
  }
};

let data = null;

let historyStack = [];
let redoStack = [];

let storageReady = false;

/* =========================================
   UTILITÁRIOS
========================================= */

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "ftth_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10);
}

function id() {
  return createId();
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function isArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

/* =========================================
   NORMALIZAÇÃO DOS DADOS
========================================= */

function normalizeData(raw) {
  const source = isObject(raw) ? raw : {};

  const normalized = {
    ...cloneData(FTTH_DEFAULT_DATA),
    ...source
  };

  normalized.ctos = isArray(source.ctos);
  normalized.clients = isArray(source.clients);
  normalized.boxes = isArray(source.boxes);
  normalized.cables = isArray(source.cables);
  normalized.imports = isArray(source.imports);
  normalized.splices = isArray(source.splices);
  normalized.splitters = isArray(source.splitters);
  normalized.poles = isArray(source.poles);

  normalized.settings = {
    ...FTTH_DEFAULT_DATA.settings,
    ...(isObject(source.settings) ? source.settings : {})
  };

  normalized.version = 2;

  return normalized;
}

/* =========================================
   MIGRAÇÃO DA VERSÃO ANTIGA
========================================= */

function migrateLegacyData(raw) {
  const old = isObject(raw) ? raw : {};

  const migrated = normalizeData(old);

  /*
    Mantém os dados que já existiam na versão anterior.

    Campos antigos:
    ctos, clients, boxes, cables e imports.

    Os campos novos são acrescentados sem
    substituir os cadastros antigos.
  */

  migrated.ctos = isArray(old.ctos);
  migrated.clients = isArray(old.clients);
  migrated.boxes = isArray(old.boxes);
  migrated.cables = isArray(old.cables);
  migrated.imports = isArray(old.imports);

  migrated.splices = isArray(old.splices);
  migrated.splitters = isArray(old.splitters);
  migrated.poles = isArray(old.poles);

  migrated.settings = {
    ...FTTH_DEFAULT_DATA.settings,
    ...(isObject(old.settings) ? old.settings : {})
  };

  return migrated;
}

/* =========================================
   CARREGAMENTO
========================================= */

function loadData() {
  try {
    const saved = localStorage.getItem(FTTH_STORAGE_KEY);

    if (!saved) {
      data = cloneData(FTTH_DEFAULT_DATA);
      storageReady = true;
      return data;
    }

    const parsed = JSON.parse(saved);

    data = migrateLegacyData(parsed);

    storageReady = true;

    return data;

  } catch (error) {
    console.error("Erro ao carregar dados FTTH:", error);

    data = cloneData(FTTH_DEFAULT_DATA);

    storageReady = true;

    return data;
  }
}

/* =========================================
   SALVAMENTO AUTOMÁTICO
========================================= */

function saveData() {
  if (!data || !storageReady) return false;

  try {
    data.version = 2;

    localStorage.setItem(
      FTTH_STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error("Erro ao salvar dados:", error);

    if (typeof toast === "function") {
      toast("Não foi possível salvar. Verifique o espaço do navegador.");
    }

    return false;
  }
}

function save() {
  return saveData();
}

/* =========================================
   HISTÓRICO DE ALTERAÇÕES
========================================= */

function pushHistory() {
  if (!data) return;

  historyStack.push(cloneData(data));

  if (historyStack.length > FTTH_HISTORY_LIMIT) {
    historyStack.shift();
  }

  redoStack = [];
}

function undoData() {
  if (!historyStack.length) {
    if (typeof toast === "function") {
      toast("Não há alterações para desfazer.");
    }

    return false;
  }

  redoStack.push(cloneData(data));

  data = normalizeData(historyStack.pop());

  saveData();

  if (typeof renderAll === "function") {
    renderAll();
  }

  if (typeof toast === "function") {
    toast("Última alteração desfeita.");
  }

  return true;
}

function redoData() {
  if (!redoStack.length) {
    if (typeof toast === "function") {
      toast("Não há alterações para refazer.");
    }

    return false;
  }

  historyStack.push(cloneData(data));

  data = normalizeData(redoStack.pop());

  saveData();

  if (typeof renderAll === "function") {
    renderAll();
  }

  if (typeof toast === "function") {
    toast("Alteração refeita.");
  }

  return true;
}

/* =========================================
   ALTERAÇÕES CONTROLADAS
========================================= */

function updateData(callback) {
  if (typeof callback !== "function") {
    throw new Error("A atualização precisa de uma função.");
  }

  pushHistory();

  try {
    callback(data);

    saveData();

    if (typeof renderAll === "function") {
      renderAll();
    }

    return true;

  } catch (error) {
    console.error("Erro ao atualizar dados:", error);

    undoData();

    if (typeof toast === "function") {
      toast("Erro ao atualizar os dados.");
    }

    return false;
  }
}

/* =========================================
   BACKUP JSON
========================================= */

function createBackup() {
  if (!data) return;

  const backup = {
    application: "FTTH Manager",
    version: 2,
    createdAt: new Date().toISOString(),
    data: cloneData(data)
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    "FTTH-Manager-Backup-" +
    new Date().toISOString().slice(0, 10) +
    ".json";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  if (typeof toast === "function") {
    toast("Backup criado com sucesso!");
  }
}

/* =========================================
   RESTAURAÇÃO JSON
========================================= */

async function restoreBackup(file) {
  if (!file) return false;

  try {
    const text = await file.text();

    const parsed = JSON.parse(text);

    let backupData = parsed.data || parsed;

    if (!isObject(backupData)) {
      throw new Error("Formato de backup inválido.");
    }

    const restored = normalizeData(backupData);

    const confirmed = confirm(
      "Deseja restaurar este backup? Os dados atuais serão substituídos."
    );

    if (!confirmed) return false;

    pushHistory();

    data = restored;

    saveData();

    historyStack = [];
    redoStack = [];

    if (typeof renderAll === "function") {
      renderAll();
    }

    if (typeof toast === "function") {
      toast("Backup restaurado com sucesso!");
    }

    return true;

  } catch (error) {
    console.error("Erro na restauração:", error);

    if (typeof toast === "function") {
      toast("Não foi possível restaurar esse arquivo.");
    }

    return false;
  }
}

/* =========================================
   BACKUP AUTOMÁTICO DE SEGURANÇA
========================================= */

function createSafetyBackup() {
  try {
    if (!data) return;

    localStorage.setItem(
      FTTH_BACKUP_KEY,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        data: data
      })
    );

  } catch (error) {
    console.warn("Backup interno não disponível:", error);
  }
}

function restoreSafetyBackup() {
  try {
    const backup = localStorage.getItem(FTTH_BACKUP_KEY);

    if (!backup) return false;

    const parsed = JSON.parse(backup);

    if (!parsed.data) return false;

    data = normalizeData(parsed.data);

    saveData();

    return true;

  } catch (error) {
    console.error("Erro ao recuperar backup interno:", error);
    return false;
  }
}

/* =========================================
   EXPORTAÇÃO DOS DADOS
========================================= */

function exportDataJSON() {
  createBackup();
}

/* =========================================
   LIMPEZA CONTROLADA
========================================= */

function clearAllData() {
  const confirmed = confirm(
    "ATENÇÃO!\n\nTodos os equipamentos, clientes, cabos e registros serão apagados deste dispositivo.\n\nDeseja continuar?"
  );

  if (!confirmed) return false;

  createSafetyBackup();

  data = cloneData(FTTH_DEFAULT_DATA);

  historyStack = [];
  redoStack = [];

  saveData();

  if (typeof renderAll === "function") {
    renderAll();
  }

  if (typeof toast === "function") {
    toast("Dados apagados. Um backup interno foi preservado.");
  }

  return true;
}

/* =========================================
   INICIALIZAÇÃO DO STORAGE
========================================= */

function initStorage() {
  loadData();

  storageReady = true;

  /*
    Garante a presença dos novos campos.
    Os cadastros antigos são preservados.
  */

  saveData();

  console.log("FTTH Manager: armazenamento inicializado.");
}

/* =========================================
   PROTEÇÃO AO FECHAR A PÁGINA
========================================= */

window.addEventListener("beforeunload", () => {
  if (data && storageReady) {
    try {
      localStorage.setItem(
        FTTH_STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn("Não foi possível salvar ao fechar:", error);
    }
  }
});

/* =========================================
   CARREGAMENTO INICIAL
========================================= */

initStorage();
