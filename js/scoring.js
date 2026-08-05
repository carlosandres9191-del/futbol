/* ============================================================
   scoring.js — Motor de análisis: baremos, categorías,
   ajuste por posición y observaciones automáticas.
   ============================================================ */

import { CATEGORIAS } from './seed.js';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nearestAge(ages, age) {
  if (ages.includes(age)) return age;
  if (age < ages[0]) return ages[0];
  if (age > ages[ages.length - 1]) return ages[ages.length - 1];
  // por si falta algún año intermedio, tomar el más cercano
  return ages.reduce((a, b) => (Math.abs(b - age) < Math.abs(a - age) ? b : a));
}

/**
 * Convierte un valor crudo (ej. 42 abdominales) en un puntaje 0-10
 * interpolando dentro del baremo correspondiente a la edad del jugador.
 */
export function scoreFromBaremo(baremoTable, age, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  const val = Number(rawValue);
  if (Number.isNaN(val)) return null;

  const a = nearestAge(baremoTable.ages, Math.round(age));
  const values = baremoTable.values[a];
  const points = baremoTable.points;

  // pares (valor, punto) ordenados ascendente por valor
  const pairs = values.map((v, i) => [v, points[i]]).sort((x, y) => x[0] - y[0]);

  if (val <= pairs[0][0]) return 0;
  if (val >= pairs[pairs.length - 1][0]) return 10;

  for (let i = 0; i < pairs.length - 1; i++) {
    const [v0, p0] = pairs[i];
    const [v1, p1] = pairs[i + 1];
    if (val >= v0 && val <= v1) {
      if (v1 === v0) return p0;
      const t = (val - v0) / (v1 - v0);
      return Math.round((p0 + t * (p1 - p0)) * 10) / 10;
    }
  }
  return null;
}

/**
 * Calcula el puntaje 0-10 de cada prueba de una evaluación.
 * evaluation.tests[key] = { valor, score } (score sólo aplica a pruebas
 * cualitativas, se respeta si ya viene asignado por el evaluador).
 */
export function computeTestScores(evaluationTests, testDefs, baremos, age) {
  const result = {};
  for (const def of testDefs) {
    const entry = evaluationTests?.[def.key];
    if (!entry) {
      result[def.key] = { valor: null, score: null };
      continue;
    }
    if (def.type === 'quant') {
      const baremo = baremos[def.baremoKey];
      const score = baremo ? scoreFromBaremo(baremo.table, age, entry.valor) : null;
      result[def.key] = { valor: entry.valor ?? null, score };
    } else {
      const score = entry.score === '' || entry.score === undefined ? null : Number(entry.score);
      result[def.key] = { valor: entry.valor ?? null, score: score === null || Number.isNaN(score) ? null : clamp(score, 0, 10) };
    }
  }
  return result;
}

/** Promedia los puntajes de las pruebas dentro de cada categoría física/técnica. */
export function computeCategoryScores(testScores, testDefs) {
  const buckets = {};
  for (const def of testDefs) {
    const s = testScores[def.key]?.score;
    if (s === null || s === undefined) continue;
    (buckets[def.categoria] ||= []).push(s);
  }
  const categoryScores = {};
  for (const cat of Object.keys(CATEGORIAS)) {
    const arr = buckets[cat];
    categoryScores[cat] = arr && arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  }
  return categoryScores;
}

export function computeGlobalScore(categoryScores) {
  const vals = Object.values(categoryScores).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/**
 * Calcula el índice de idoneidad (0-10) del jugador para cada posición,
 * a partir de los puntajes por categoría y los pesos configurados.
 * Devuelve un ranking ordenado de mayor a menor afinidad.
 */
export function computePositionFit(categoryScores, posiciones) {
  const ranking = [];
  for (const [key, pos] of Object.entries(posiciones)) {
    let sum = 0;
    let weightUsed = 0;
    for (const [cat, weight] of Object.entries(pos.weights)) {
      const score = categoryScores[cat];
      if (score === null || score === undefined) continue;
      sum += score * weight;
      weightUsed += weight;
    }
    const fit = weightUsed > 0 ? Math.round((sum / weightUsed) * 10) / 10 : null;
    ranking.push({ key, label: pos.label, fit });
  }
  return ranking.sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}

function nivelTexto(score) {
  if (score === null || score === undefined) return 'sin datos';
  if (score >= 9) return 'excelente';
  if (score >= 7.5) return 'muy bueno';
  if (score >= 6) return 'bueno';
  if (score >= 4.5) return 'a mejorar';
  return 'bajo';
}

/**
 * Genera observaciones automáticas en lenguaje natural: fortalezas,
 * aspectos a trabajar por disciplina y sugerencia de posición.
 */
export function generateObservations({ categoryScores, testScores, testDefs, positionFit, imc, imcClasificacion, nombre }) {
  const lines = [];
  const catEntries = Object.entries(categoryScores).filter(([, v]) => v !== null);

  if (catEntries.length) {
    const sorted = [...catEntries].sort((a, b) => b[1] - a[1]);
    const fuertes = sorted.filter((e) => e[1] >= 7);
    const debiles = sorted.filter((e) => e[1] < 6);

    if (fuertes.length) {
      lines.push(
        `Fortalezas: ${fuertes.map(([c, v]) => `${CATEGORIAS[c]} (${v}/10, ${nivelTexto(v)})`).join(', ')}.`
      );
    }
    if (debiles.length) {
      lines.push(
        `Aspectos a trabajar: ${debiles.map(([c, v]) => `${CATEGORIAS[c]} (${v}/10, ${nivelTexto(v)})`).join(', ')}.`
      );
    } else if (fuertes.length) {
      lines.push('No se detectan categorías por debajo de 6/10: perfil físico-técnico equilibrado.');
    }
  } else {
    lines.push('Aún no hay suficientes pruebas registradas para generar un diagnóstico por categoría.');
  }

  // pruebas individuales más bajas (para plan de entrenamiento)
  const testEntries = testDefs
    .map((d) => ({ label: d.label, score: testScores[d.key]?.score }))
    .filter((t) => t.score !== null && t.score !== undefined)
    .sort((a, b) => a.score - b.score);
  if (testEntries.length) {
    const peores = testEntries.slice(0, 3).filter((t) => t.score < 7);
    if (peores.length) {
      lines.push(
        `Pruebas prioritarias para el plan de mejora: ${peores.map((t) => `${t.label} (${t.score}/10)`).join(', ')}.`
      );
    }
  }

  if (imc !== null && imc !== undefined) {
    lines.push(`Composición corporal: IMC ${imc} (${imcClasificacion}).`);
  }

  if (positionFit && positionFit.length && positionFit[0].fit !== null) {
    const top = positionFit.filter((p) => p.fit !== null).slice(0, 2);
    lines.push(
      `Según el perfil físico-técnico actual, las posiciones con mayor afinidad son: ${top
        .map((p) => `${p.label} (${p.fit}/10)`)
        .join(' y ')}.`
    );
  }

  return lines.join(' ');
}
