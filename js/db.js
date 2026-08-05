/* ============================================================
   db.js — Capa de acceso a datos (IndexedDB)
   Toda la información de la app (jugadores, evaluaciones,
   fichas médicas, nutricionales y configuración) vive en el
   navegador del usuario mediante IndexedDB. No hay backend.
   ============================================================ */

const DB_NAME = 'futbolAnalyticsDB';
const DB_VERSION = 1;

const STORES = {
  players: 'id',
  evaluations: 'id',
  medical: 'id',
  nutrition: 'id',
  config: 'key',
};

let dbPromise = null;

function uid() {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;

      if (!db.objectStoreNames.contains('players')) {
        db.createObjectStore('players', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('evaluations')) {
        const s = db.createObjectStore('evaluations', { keyPath: 'id' });
        s.createIndex('playerId', 'playerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('medical')) {
        const s = db.createObjectStore('medical', { keyPath: 'id' });
        s.createIndex('playerId', 'playerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('nutrition')) {
        const s = db.createObjectStore('nutrition', { keyPath: 'id' });
        s.createIndex('playerId', 'playerId', { unique: false });
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };

    req.onsuccess = (evt) => resolve(evt.target.result);
    req.onerror = (evt) => reject(evt.target.error);
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDatabase().then(
    (db) => db.transaction(storeName, mode).objectStore(storeName)
  );
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- CRUD genérico ---------- */

async function addRecord(storeName, record) {
  const store = await tx(storeName, 'readwrite');
  if (!record.id && STORES[storeName] === 'id') record.id = uid();
  record.createdAt = record.createdAt || new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  await reqToPromise(store.put(record));
  return record;
}

async function putRecord(storeName, record) {
  const store = await tx(storeName, 'readwrite');
  record.updatedAt = new Date().toISOString();
  await reqToPromise(store.put(record));
  return record;
}

async function getRecord(storeName, key) {
  const store = await tx(storeName);
  return reqToPromise(store.get(key));
}

async function getAllRecords(storeName) {
  const store = await tx(storeName);
  return reqToPromise(store.getAll());
}

async function getByIndex(storeName, indexName, value) {
  const store = await tx(storeName);
  const idx = store.index(indexName);
  return reqToPromise(idx.getAll(value));
}

async function deleteRecord(storeName, key) {
  const store = await tx(storeName, 'readwrite');
  await reqToPromise(store.delete(key));
}

async function clearStore(storeName) {
  const store = await tx(storeName, 'readwrite');
  await reqToPromise(store.clear());
}

/* ---------- API específica ---------- */

export const DB = {
  uid,

  // Jugadores
  addPlayer: (p) => addRecord('players', p),
  updatePlayer: (p) => putRecord('players', p),
  getPlayer: (id) => getRecord('players', id),
  getAllPlayers: () => getAllRecords('players'),
  deletePlayer: async (id) => {
    await deleteRecord('players', id);
    const evals = await getByIndex('evaluations', 'playerId', id);
    for (const e of evals) await deleteRecord('evaluations', e.id);
    const meds = await getByIndex('medical', 'playerId', id);
    for (const m of meds) await deleteRecord('medical', m.id);
    const nuts = await getByIndex('nutrition', 'playerId', id);
    for (const n of nuts) await deleteRecord('nutrition', n.id);
  },

  // Evaluaciones físicas/técnicas
  addEvaluation: (e) => addRecord('evaluations', e),
  updateEvaluation: (e) => putRecord('evaluations', e),
  getEvaluation: (id) => getRecord('evaluations', id),
  getEvaluationsByPlayer: (playerId) => getByIndex('evaluations', 'playerId', playerId),
  getAllEvaluations: () => getAllRecords('evaluations'),
  deleteEvaluation: (id) => deleteRecord('evaluations', id),

  // Ficha médica
  addMedical: (m) => addRecord('medical', m),
  updateMedical: (m) => putRecord('medical', m),
  getMedicalByPlayer: (playerId) => getByIndex('medical', 'playerId', playerId),
  getAllMedical: () => getAllRecords('medical'),
  deleteMedical: (id) => deleteRecord('medical', id),

  // Ficha nutricional
  addNutrition: (n) => addRecord('nutrition', n),
  updateNutrition: (n) => putRecord('nutrition', n),
  getNutritionByPlayer: (playerId) => getByIndex('nutrition', 'playerId', playerId),
  getAllNutrition: () => getAllRecords('nutrition'),
  deleteNutrition: (id) => deleteRecord('nutrition', id),

  // Configuración (baremos, posiciones, categorías de edad, datos del club)
  getConfig: (key) => getRecord('config', key),
  setConfig: (key, value) => putRecord('config', { key, value }),

  // Backup / restauración completa
  exportAll: async () => {
    const [players, evaluations, medical, nutrition, config] = await Promise.all([
      getAllRecords('players'),
      getAllRecords('evaluations'),
      getAllRecords('medical'),
      getAllRecords('nutrition'),
      getAllRecords('config'),
    ]);
    return {
      _app: 'futbol-analytics',
      _version: DB_VERSION,
      _exportedAt: new Date().toISOString(),
      players,
      evaluations,
      medical,
      nutrition,
      config,
    };
  },

  importAll: async (data, { replace = false } = {}) => {
    if (replace) {
      await Promise.all(
        ['players', 'evaluations', 'medical', 'nutrition', 'config'].map(clearStore)
      );
    }
    for (const p of data.players || []) await putRecord('players', p);
    for (const e of data.evaluations || []) await putRecord('evaluations', e);
    for (const m of data.medical || []) await putRecord('medical', m);
    for (const n of data.nutrition || []) await putRecord('nutrition', n);
    for (const c of data.config || []) await putRecord('config', c);
  },

  wipeAll: async () => {
    await Promise.all(
      ['players', 'evaluations', 'medical', 'nutrition', 'config'].map(clearStore)
    );
  },
};
