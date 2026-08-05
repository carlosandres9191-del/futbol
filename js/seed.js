/* ============================================================
   seed.js — Configuración por defecto de la aplicación
   ------------------------------------------------------------
   Los baremos numéricos (fuerza abdominal, salto vertical,
   salto horizontal y test de Cooper) fueron transcritos de:
     "PROTOCOLOS DE LAS PRUEBAS DE VALORACION.docx"
   (tablas de resultados por edad, 12 a 18 años, escala de
   puntos 0 a 10 en pasos de 0.5).

   Algunas celdas del documento original tenían inconsistencias
   de formato (comas en vez de puntos, valores sin separador de
   miles). Se normalizaron a la unidad indicada en cada prueba.
   La columna de 18 años en salto horizontal y Cooper venía
   vacía en el documento original: se estimó igual al valor de
   17 años (marcado como "estimado").

   La prueba de Flexo-extensión de codo también traía su tabla
   vacía en el documento original: se generó una escala estimada
   a partir de la de fuerza abdominal. TODOS estos valores son
   editables desde Configuración > Baremos dentro de la app.

   Las pruebas técnico-futbolísticas de la matriz del club
   (coordinación, conducción, potencia de golpeo, carrera con
   pase, precisión, control de balón) y la prueba de agilidad y
   los 30 metros no traían tabla de baremos en el documento, así
   que se evalúan con calificación cualitativa 0-10 asignada por
   el entrenador/preparador físico, guardando también el valor
   crudo para seguimiento histórico.
   ============================================================ */

const POINTS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0];
const AGES = [12, 13, 14, 15, 16, 17, 18];

function buildTable(valuesByAge) {
  return { points: POINTS, ages: AGES, values: valuesByAge };
}

export const BAREMOS_SEED = {
  fuerzaAbdominal: {
    label: 'Fuerza abdominal (repeticiones/min)',
    unit: 'reps',
    estimated: false,
    table: buildTable({
      12: [48, 47, 46, 45, 44, 43, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14],
      13: [51, 50, 49, 48, 47, 46, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25, 23, 21, 19, 17],
      14: [54, 53, 52, 51, 50, 49, 48, 46, 44, 42, 40, 38, 36, 35, 34, 32, 30, 28, 26, 24, 22],
      15: [56, 55, 54, 53, 52, 51, 50, 48, 46, 44, 42, 40, 38, 37, 36, 34, 32, 30, 28, 26, 24],
      16: [59, 58, 57, 56, 55, 54, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25],
      17: [62, 61, 60, 59, 58, 57, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28],
      18: [62, 61, 60, 59, 58, 57, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28],
    }),
  },

  flexoExtension: {
    label: 'Flexo-extensión de codo (repeticiones/min)',
    unit: 'reps',
    estimated: true, // tabla original vacía: estimada al 70% de fuerza abdominal
    table: buildTable({
      12: [34, 33, 32, 32, 31, 30, 29, 28, 27, 25, 24, 22, 21, 20, 18, 17, 15, 14, 13, 11, 10],
      13: [36, 35, 34, 34, 33, 32, 32, 30, 29, 27, 26, 25, 23, 22, 20, 19, 18, 16, 15, 13, 12],
      14: [38, 37, 36, 36, 35, 34, 34, 32, 31, 29, 28, 27, 25, 25, 24, 22, 21, 20, 18, 17, 15],
      15: [39, 39, 38, 37, 36, 36, 35, 34, 32, 31, 29, 28, 27, 26, 25, 24, 22, 21, 20, 18, 17],
      16: [41, 41, 40, 39, 39, 38, 37, 36, 34, 33, 32, 30, 29, 27, 26, 25, 23, 22, 20, 19, 18],
      17: [43, 43, 42, 41, 41, 40, 39, 38, 36, 35, 34, 32, 31, 29, 28, 27, 25, 24, 22, 21, 20],
      18: [43, 43, 42, 41, 41, 40, 39, 38, 36, 35, 34, 32, 31, 29, 28, 27, 25, 24, 22, 21, 20],
    }),
  },

  saltoVertical: {
    label: 'Salto vertical (cm)',
    unit: 'cm',
    estimated: false,
    table: buildTable({
      12: [45, 43, 41, 40, 38, 36, 34, 33, 31, 29, 27, 25, 24, 22, 20, 18, 16, 14, 12, 10, 10],
      13: [55, 53, 50, 48, 46, 43, 41, 39, 36, 31, 32, 29, 27, 24, 22, 20, 17, 15, 12, 20, 9],
      14: [53, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 11],
      15: [55, 53, 51, 48, 46, 44, 42, 40, 37, 35, 34, 32, 31, 30, 29, 28, 27, 25, 22, 19, 13],
      16: [58, 55, 52, 50, 47, 45, 43, 41, 39, 36, 35, 34, 33, 32, 30, 28, 27, 25, 23, 20, 17],
      17: [62, 59, 56, 54, 51, 48, 46, 44, 41, 39, 37, 36, 35, 34, 33, 31, 29, 28, 26, 24, 20],
      18: [62, 59, 56, 54, 51, 48, 46, 44, 41, 39, 37, 36, 35, 34, 33, 31, 29, 28, 26, 24, 20],
    }),
  },

  saltoHorizontal: {
    label: 'Salto horizontal / longitud sin impulso (m)',
    unit: 'm',
    estimated: false, // (edad 18 estimada = igual a 17)
    table: buildTable({
      12: [2.00, 1.92, 1.85, 1.80, 1.77, 1.73, 1.70, 1.68, 1.64, 1.62, 1.60, 1.58, 1.55, 1.52, 1.51, 1.49, 1.45, 1.41, 1.35, 1.28, 1.15],
      13: [2.35, 2.10, 2.00, 1.95, 1.88, 1.85, 1.80, 1.79, 1.75, 1.72, 1.70, 1.66, 1.66, 1.62, 1.60, 1.58, 1.54, 1.50, 1.45, 1.40, 1.32],
      14: [2.35, 2.23, 2.16, 2.10, 2.05, 2.00, 1.94, 1.90, 1.89, 1.85, 1.82, 1.80, 1.78, 1.75, 1.70, 1.66, 1.63, 1.59, 1.50, 1.40, 1.37],
      15: [2.61, 2.41, 2.30, 2.22, 2.19, 2.15, 2.13, 2.10, 2.07, 2.04, 2.01, 1.99, 1.97, 1.93, 1.88, 1.84, 1.80, 1.77, 1.73, 1.65, 1.49],
      16: [2.80, 2.45, 2.33, 2.28, 2.25, 2.21, 2.20, 2.15, 2.13, 2.11, 2.09, 2.05, 2.03, 2.01, 2.00, 1.95, 1.90, 1.88, 1.81, 1.68, 1.59],
      17: [2.96, 2.53, 2.46, 2.41, 2.35, 2.30, 2.25, 2.23, 2.20, 2.17, 2.15, 2.12, 2.10, 2.05, 2.04, 2.00, 1.99, 1.92, 1.86, 1.70, 1.63],
      18: [2.96, 2.53, 2.46, 2.41, 2.35, 2.30, 2.25, 2.23, 2.20, 2.17, 2.15, 2.12, 2.10, 2.05, 2.04, 2.00, 1.99, 1.92, 1.86, 1.70, 1.63],
    }),
  },

  cooper: {
    label: 'Test de Cooper (m recorridos en 12 min)',
    unit: 'm',
    estimated: false, // (edad 18 estimada = igual a 17)
    table: buildTable({
      12: [2680, 2400, 2175, 2042, 2000, 1975, 1900, 1860, 1810, 1790, 1760, 1740, 1680, 1620, 1590, 1500, 1450, 1356, 1300, 1000, 924],
      13: [2615, 2402, 2320, 2213, 2150, 2096, 2049, 2008, 1640, 1926, 1855, 1844, 1806, 1762, 1721, 1674, 1620, 1557, 1450, 1368, 1199],
      14: [2686, 2473, 2391, 2284, 2221, 2167, 2120, 2079, 2035, 1997, 1955, 1915, 1877, 1833, 1792, 1745, 1691, 1628, 1521, 1439, 1414],
      15: [2757, 2544, 2464, 2384, 2292, 2238, 2191, 2150, 2106, 2068, 2027, 1986, 1948, 1904, 1863, 1816, 1762, 1699, 1521, 1510, 1422],
      16: [2828, 2615, 2533, 2455, 2363, 2309, 2262, 2221, 2217, 2139, 2098, 2057, 2019, 1937, 1934, 1887, 1833, 1770, 1633, 1584, 1499],
      17: [2899, 2615, 2604, 2526, 2434, 2380, 2333, 2292, 2248, 2210, 2169, 2128, 2090, 2046, 2005, 1958, 1904, 1841, 1734, 1652, 1521],
      18: [2899, 2615, 2604, 2526, 2434, 2380, 2333, 2292, 2248, 2210, 2169, 2128, 2090, 2046, 2005, 1958, 1904, 1841, 1734, 1652, 1521],
    }),
  },
};

// Definición de todas las pruebas de la matriz del club.
// type: 'quant' -> valor crudo + baremo (cálculo automático de score 0-10)
// type: 'qual'  -> el entrenador asigna score 0-10 directamente
export const TEST_DEFINITIONS = [
  { key: 'fuerzaAbd', label: 'Fuerza abdominal', categoria: 'fuerza', type: 'quant', baremoKey: 'fuerzaAbdominal', unit: 'reps', direction: 'higher' },
  { key: 'flexoExtension', label: 'Flexo-extensión de codo', categoria: 'fuerza', type: 'quant', baremoKey: 'flexoExtension', unit: 'reps', direction: 'higher' },
  { key: 'saltoVertical', label: 'Salto vertical', categoria: 'potencia', type: 'quant', baremoKey: 'saltoVertical', unit: 'cm', direction: 'higher' },
  { key: 'saltoHorizontal', label: 'Salto horizontal', categoria: 'potencia', type: 'quant', baremoKey: 'saltoHorizontal', unit: 'm', direction: 'higher' },
  { key: 'cooper', label: 'Test de Cooper', categoria: 'resistencia', type: 'quant', baremoKey: 'cooper', unit: 'm', direction: 'higher' },
  { key: 'test30m', label: 'Test de 30 metros', categoria: 'velocidad', type: 'qual', unit: 'seg', direction: 'lower' },
  { key: 'agilidad', label: 'Prueba de agilidad', categoria: 'agilidad', type: 'qual', unit: 'seg', direction: 'lower' },
  { key: 'coordinacion', label: 'Coordinación', categoria: 'agilidad', type: 'qual', unit: 'pts', direction: 'higher' },
  { key: 'conduccion', label: 'Conducción de balón', categoria: 'tecnica', type: 'qual', unit: 'seg', direction: 'lower' },
  { key: 'potenciaTiro', label: 'Potencia de golpeo/tiro', categoria: 'tecnica', type: 'qual', unit: 'pts', direction: 'higher' },
  { key: 'carreraConPase', label: 'Carrera con pase', categoria: 'tecnica', type: 'qual', unit: 'pts', direction: 'higher' },
  { key: 'precision', label: 'Precisión (pase/remate)', categoria: 'tecnica', type: 'qual', unit: 'pts', direction: 'higher' },
  { key: 'controlBalon', label: 'Control de balón', categoria: 'tecnica', type: 'qual', unit: 'pts', direction: 'higher' },
];

export const CATEGORIAS = {
  fuerza: 'Fuerza',
  potencia: 'Potencia',
  velocidad: 'Velocidad',
  resistencia: 'Resistencia',
  agilidad: 'Agilidad / Coordinación',
  tecnica: 'Técnica con balón',
};

// Perfiles de exigencia por posición (pesos que suman 1.0 por categoría).
// Editable desde Configuración > Posiciones.
export const POSICIONES_SEED = {
  portero: {
    label: 'Portero',
    weights: { fuerza: 0.15, potencia: 0.20, velocidad: 0.10, resistencia: 0.10, agilidad: 0.30, tecnica: 0.15 },
  },
  defensaCentral: {
    label: 'Defensa central',
    weights: { fuerza: 0.25, potencia: 0.20, velocidad: 0.15, resistencia: 0.15, agilidad: 0.15, tecnica: 0.10 },
  },
  lateral: {
    label: 'Lateral / carrilero',
    weights: { fuerza: 0.10, potencia: 0.10, velocidad: 0.25, resistencia: 0.20, agilidad: 0.20, tecnica: 0.15 },
  },
  mediocentro: {
    label: 'Mediocentro / volante',
    weights: { fuerza: 0.10, potencia: 0.10, velocidad: 0.15, resistencia: 0.25, agilidad: 0.15, tecnica: 0.25 },
  },
  extremo: {
    label: 'Extremo / volante de ataque',
    weights: { fuerza: 0.05, potencia: 0.15, velocidad: 0.30, resistencia: 0.10, agilidad: 0.20, tecnica: 0.20 },
  },
  delantero: {
    label: 'Delantero',
    weights: { fuerza: 0.10, potencia: 0.25, velocidad: 0.20, resistencia: 0.05, agilidad: 0.15, tecnica: 0.25 },
  },
};

export const CATEGORIAS_EDAD_SEED = [
  { key: 'sub10', label: 'Sub-10 (8-9 años)', min: 8, max: 9 },
  { key: 'sub12', label: 'Sub-12 (10-11 años)', min: 10, max: 11 },
  { key: 'sub14_1213', label: 'Sub-14 (12-13 años)', min: 12, max: 13 },
  { key: 'sub16', label: 'Sub-16 (14-15 años)', min: 14, max: 15 },
  { key: 'sub18', label: 'Sub-18 (16-17 años)', min: 16, max: 17 },
  { key: 'sub20', label: 'Sub-20 / mayores (18+)', min: 18, max: 99 },
];

export const CLUB_INFO_SEED = {
  nombreClub: 'Club Deportivo Cristo Rey',
  logoBase64: '',
};

export async function seedIfEmpty(DB) {
  const baremos = await DB.getConfig('baremos');
  if (!baremos) await DB.setConfig('baremos', BAREMOS_SEED);

  const tests = await DB.getConfig('testDefinitions');
  if (!tests) await DB.setConfig('testDefinitions', TEST_DEFINITIONS);

  const posiciones = await DB.getConfig('posiciones');
  if (!posiciones) await DB.setConfig('posiciones', POSICIONES_SEED);

  const edades = await DB.getConfig('categoriasEdad');
  if (!edades) await DB.setConfig('categoriasEdad', CATEGORIAS_EDAD_SEED);

  const club = await DB.getConfig('clubInfo');
  if (!club) await DB.setConfig('clubInfo', CLUB_INFO_SEED);
}
