/* ============================================================
   views/evaluation.js — Captura, listado, detalle e importación
   masiva (Excel) de evaluaciones físicas/técnicas.
   ============================================================ */

import { DB } from '../db.js';
import {
  el, calcAge, calcIMC, clasificarIMC, formatDate, todayISO,
  toast, navigate, scoreBarRow, confirmDialog,
} from '../utils.js';
import { CATEGORIAS } from '../seed.js';
import {
  computeTestScores, computeCategoryScores, computeGlobalScore,
  computePositionFit, generateObservations,
} from '../scoring.js';

async function loadCfg() {
  const [baremosCfg, testsCfg, posicionesCfg] = await Promise.all([
    DB.getConfig('baremos'),
    DB.getConfig('testDefinitions'),
    DB.getConfig('posiciones'),
  ]);
  return {
    baremos: baremosCfg?.value || {},
    testDefs: testsCfg?.value || [],
    posiciones: posicionesCfg?.value || {},
  };
}

export async function renderEvaluationsList(container) {
  const [evaluations, players] = await Promise.all([DB.getAllEvaluations(), DB.getAllPlayers()]);
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));

  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'card-header' }, [
      el('h2', {}, `Evaluaciones físicas (${evaluations.length})`),
      el('div', { class: 'flex gap-8' }, [
        el('button', { class: 'btn btn-outline', onClick: () => document.getElementById('excel-import-input').click() }, '📥 Importar desde Excel'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('/evaluaciones/nueva') }, '+ Nueva evaluación'),
      ]),
    ])
  );

  const importInput = el('input', { type: 'file', id: 'excel-import-input', accept: '.xlsx,.xls,.csv', style: 'display:none;' });
  importInput.addEventListener('change', (e) => handleExcelImport(e.target.files[0]));
  card.appendChild(importInput);

  card.appendChild(
    el('p', { class: 'help-text' }, 'La importación reconoce automáticamente las columnas de la matriz del club (nombres, apellidos, talla, peso y las pruebas físicas) y crea jugadores nuevos si no existen.')
  );

  if (!evaluations.length) {
    card.appendChild(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'icon' }, '🏃'),
        el('p', {}, 'Todavía no hay evaluaciones registradas.'),
      ])
    );
    container.appendChild(card);
    return;
  }

  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Jugador', 'Fecha', 'Edad', 'IMC', 'Score físico global', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  evaluations
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .forEach((ev) => {
      const player = playersById[ev.playerId];
      tbody.appendChild(
        el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/evaluaciones/${ev.id}`) }, [
          el('td', {}, player ? `${player.nombres} ${player.apellidos}` : '(jugador eliminado)'),
          el('td', {}, formatDate(ev.fecha)),
          el('td', {}, ev.edadAlMomento != null ? `${ev.edadAlMomento} años` : '—'),
          el('td', {}, ev.imc != null ? `${ev.imc} (${ev.imcClasificacion})` : '—'),
          el('td', {}, ev.scoreFisicoGlobal != null ? el('span', { class: 'badge badge-green' }, `${ev.scoreFisicoGlobal}/10`) : '—'),
          el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
        ])
      );
    });
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);
  container.appendChild(card);
}

export async function renderEvaluationForm(container, evaluationId, presetPlayerId) {
  const isEdit = !!evaluationId;
  const [players, cfg, existing] = await Promise.all([
    DB.getAllPlayers(),
    loadCfg(),
    isEdit ? DB.getEvaluation(evaluationId) : Promise.resolve(null),
  ]);
  const { baremos, testDefs } = cfg;

  if (isEdit && !existing) {
    container.appendChild(el('div', { class: 'card' }, 'Evaluación no encontrada.'));
    return;
  }
  if (!players.length) {
    container.appendChild(
      el('div', { class: 'card empty-state' }, [
        el('p', {}, 'Registra al menos un jugador antes de crear una evaluación.'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Nuevo jugador'),
      ])
    );
    return;
  }

  const e0 = existing || {
    playerId: presetPlayerId || players[0].id,
    fecha: todayISO(),
    talla: '', peso: '', tests: {}, notasEvaluador: '', evaluador: '',
  };

  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, isEdit ? 'Editar evaluación' : 'Nueva evaluación física'));

  const form = el('form', {});

  const playerSelect = el(
    'select', { id: 'playerId', required: true },
    players
      .sort((a, b) => `${a.apellidos}`.localeCompare(b.apellidos))
      .map((p) => el('option', { value: p.id, selected: p.id === e0.playerId }, `${p.nombres} ${p.apellidos}`))
  );

  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Jugador *'), playerSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Fecha de la valoración *'), el('input', { id: 'fecha', type: 'date', required: true, value: e0.fecha })]),
      el('div', { class: 'field' }, [el('label', {}, 'Evaluador / preparador físico'), el('input', { id: 'evaluador', value: e0.evaluador || '' })]),
    ])
  );

  const fsAntro = el('fieldset', {}, [el('legend', {}, 'Antropometría')]);
  const tallaInput = el('input', { id: 'talla', type: 'number', step: '0.1', min: '0', value: e0.talla ?? '', placeholder: 'cm' });
  const pesoInput = el('input', { id: 'peso', type: 'number', step: '0.1', min: '0', value: e0.peso ?? '', placeholder: 'kg' });
  const imcOut = el('div', { class: 'field' }, [el('label', {}, 'IMC (automático)'), el('div', { id: 'imc-out', class: 'badge badge-gray' }, '—')]);
  function updateIMC() {
    const imc = calcIMC(Number(tallaInput.value), Number(pesoInput.value));
    imcOut.querySelector('#imc-out').textContent = imc != null ? `${imc} · ${clasificarIMC(imc)}` : '—';
  }
  tallaInput.addEventListener('input', updateIMC);
  pesoInput.addEventListener('input', updateIMC);
  fsAntro.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Talla (cm)'), tallaInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Peso (kg)'), pesoInput]),
      imcOut,
    ])
  );
  form.appendChild(fsAntro);

  const testInputs = {};
  const byCategory = {};
  testDefs.forEach((d) => (byCategory[d.categoria] ||= []).push(d));

  for (const [catKey, defs] of Object.entries(byCategory)) {
    const fs = el('fieldset', {}, [el('legend', {}, CATEGORIAS[catKey] || catKey)]);
    const row = el('div', { class: 'form-row' });
    defs.forEach((d) => {
      const savedEntry = e0.tests?.[d.key] || {};
      const valorInput = el('input', {
        type: 'number', step: 'any', value: savedEntry.valor ?? '',
        placeholder: d.unit,
      });
      const group = [
        el('div', { class: 'field' }, [
          el('label', {}, `${d.label} (${d.unit})`),
          valorInput,
        ]),
      ];
      let scoreInput = null;
      if (d.type === 'qual') {
        scoreInput = el('input', {
          type: 'number', min: '0', max: '10', step: '0.5', value: savedEntry.score ?? '',
          placeholder: 'Puntaje 0-10',
        });
        group.push(
          el('div', { class: 'field' }, [el('label', {}, 'Calificación (0-10)'), scoreInput])
        );
      } else {
        group.push(el('div', { class: 'field' }, [el('label', {}, 'Puntaje (auto)'), el('div', { class: 'help-text', style: 'margin-top:9px;' }, 'Se calcula al guardar según baremo por edad.')]));
      }
      testInputs[d.key] = { valorInput, scoreInput, def: d };
      row.append(...group);
    });
    fs.appendChild(row);
    form.appendChild(fs);
  }

  form.appendChild(
    el('div', { class: 'field' }, [
      el('label', {}, 'Notas del evaluador'),
      el('textarea', { id: 'notasEvaluador', rows: 3 }, e0.notasEvaluador || ''),
    ])
  );

  const actions = el('div', { class: 'flex gap-12' }, [
    el('button', { type: 'submit', class: 'btn btn-primary' }, isEdit ? 'Guardar cambios' : 'Guardar evaluación'),
    el('button', { type: 'button', class: 'btn btn-outline', onClick: () => history.back() }, 'Cancelar'),
  ]);
  if (isEdit) {
    actions.appendChild(
      el('button', {
        type: 'button', class: 'btn btn-danger', style: 'margin-left:auto;',
        onClick: async () => {
          if (confirmDialog('¿Eliminar esta evaluación?')) {
            await DB.deleteEvaluation(evaluationId);
            toast('Evaluación eliminada', 'success');
            navigate(`/jugadores/${e0.playerId}`);
          }
        },
      }, 'Eliminar')
    );
  }
  form.appendChild(actions);

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const playerId = playerSelect.value;
    const fecha = document.getElementById('fecha').value;
    const player = players.find((p) => p.id === playerId);
    const age = calcAge(player.fechaNacimiento, fecha);
    const talla = tallaInput.value ? Number(tallaInput.value) : null;
    const peso = pesoInput.value ? Number(pesoInput.value) : null;
    const imc = calcIMC(peso, talla);

    const tests = {};
    for (const [key, { valorInput, scoreInput }] of Object.entries(testInputs)) {
      tests[key] = {
        valor: valorInput.value === '' ? null : Number(valorInput.value),
        score: scoreInput ? (scoreInput.value === '' ? null : Number(scoreInput.value)) : undefined,
      };
    }

    const testScores = computeTestScores(tests, testDefs, baremos, age ?? 14);
    const categoryScores = computeCategoryScores(testScores, testDefs);
    const scoreFisicoGlobal = computeGlobalScore(categoryScores);
    const posicionesCfg = (await DB.getConfig('posiciones'))?.value || {};
    const positionFit = computePositionFit(categoryScores, posicionesCfg);
    const observaciones = generateObservations({
      categoryScores, testScores, testDefs, positionFit, imc, imcClasificacion: clasificarIMC(imc), nombre: player.nombres,
    });

    const record = {
      ...(isEdit ? { id: evaluationId } : {}),
      playerId, fecha, edadAlMomento: age,
      talla, peso, imc, imcClasificacion: clasificarIMC(imc),
      tests, testScores, categoryScores, scoreFisicoGlobal, positionFit,
      observaciones, notasEvaluador: document.getElementById('notasEvaluador').value.trim(), evaluador: document.getElementById('evaluador').value.trim(),
    };

    if (isEdit) await DB.updateEvaluation(record);
    else await DB.addEvaluation(record);

    toast('Evaluación guardada', 'success');
    navigate(`/jugadores/${playerId}`);
  });

  updateIMC();
  card.appendChild(form);
  container.appendChild(card);
}

export async function renderEvaluationDetail(container, evaluationId) {
  const ev = await DB.getEvaluation(evaluationId);
  if (!ev) {
    container.appendChild(el('div', { class: 'card' }, 'Evaluación no encontrada.'));
    return;
  }
  const player = await DB.getPlayer(ev.playerId);
  const testDefs = (await DB.getConfig('testDefinitions'))?.value || [];

  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'card-header' }, [
      el('div', {}, [
        el('h2', {}, `Evaluación de ${player ? `${player.nombres} ${player.apellidos}` : '—'}`),
        el('p', { class: 'muted' }, `${formatDate(ev.fecha)} · ${ev.edadAlMomento ?? '—'} años · Evaluador: ${ev.evaluador || '—'}`),
      ]),
      el('div', { class: 'flex gap-8' }, [
        el('button', { class: 'btn btn-outline', onClick: () => navigate(`/evaluaciones/${ev.id}/editar`) }, 'Editar'),
        player ? el('button', { class: 'btn btn-outline', onClick: () => navigate(`/jugadores/${player.id}`) }, 'Ver jugador') : null,
      ]),
    ])
  );

  card.appendChild(
    el('div', { class: 'grid grid-3' }, [
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, ev.imc ?? '—'), el('div', { class: 'stat-label' }, `IMC (${ev.imcClasificacion || '—'})`)]),
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, ev.scoreFisicoGlobal ?? '—'), el('div', { class: 'stat-label' }, 'Score físico-técnico global (0-10)')]),
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, ev.positionFit?.[0]?.label || '—'), el('div', { class: 'stat-label' }, 'Posición de mayor afinidad') ]),
    ])
  );

  card.appendChild(el('hr', { class: 'divider' }));
  card.appendChild(el('h3', {}, 'Resultados por prueba'));
  const testsWrap = el('div');
  testDefs.forEach((d) => {
    const t = ev.testScores?.[d.key];
    if (!t) return;
    testsWrap.appendChild(scoreBarRow(`${d.label} (${t.valor ?? '—'} ${d.unit})`, t.score));
  });
  card.appendChild(testsWrap);

  if (ev.observaciones) {
    card.appendChild(el('h3', { style: 'margin-top:18px;' }, 'Observaciones automáticas'));
    card.appendChild(el('div', { class: 'obs-box' }, ev.observaciones));
  }
  if (ev.notasEvaluador) {
    card.appendChild(el('h3', { style: 'margin-top:18px;' }, 'Notas del evaluador'));
    card.appendChild(el('p', {}, ev.notasEvaluador));
  }

  container.appendChild(card);
}

/* ---------------- Importación desde Excel ---------------- */

function normalizeHeader(h) {
  return String(h || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADER_MATCHERS = [
  { key: 'nombres', test: (h) => h === 'nombres' },
  { key: 'apellidos', test: (h) => h === 'apellidos' },
  { key: 'fechaNacimiento', test: (h) => h.includes('nacim') },
  { key: 'lateralidad', test: (h) => h === 'd i' || h.includes('d i') },
  { key: 'gradoEscolar', test: (h) => h.includes('grado') },
  { key: 'talla', test: (h) => h.includes('talla') },
  { key: 'peso', test: (h) => h.includes('peso') },
  { key: 'fuerzaAbd', test: (h) => h.includes('abd') },
  { key: 'flexoExtension', test: (h) => h.includes('fle') || h.includes('codo') },
  { key: 'saltoVertical', test: (h) => h.includes('vertical') },
  { key: 'saltoHorizontal', test: (h) => h.includes('horizontal') },
  { key: 'coordinacion', test: (h) => h.includes('coordina') },
  { key: 'cooper', test: (h) => h.includes('cooper') },
  { key: 'test30m', test: (h) => h.includes('30') },
  { key: 'conduccion', test: (h) => h.includes('conducc') },
  { key: 'potenciaTiro', test: (h) => h.includes('potencia') },
  { key: 'carreraConPase', test: (h) => h.includes('pase') },
  { key: 'precision', test: (h) => h.includes('precision') },
  { key: 'controlBalon', test: (h) => h.includes('control') },
];

function matchColumn(header) {
  const h = normalizeHeader(header);
  for (const m of HEADER_MATCHERS) if (m.test(h)) return m.key;
  return null;
}

async function handleExcelImport(file) {
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    toast('No se pudo cargar la librería de Excel (sin conexión a internet).', 'error');
    return;
  }
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // encontrar la fila de encabezados (contiene "Nombres")
    let headerRowIdx = rows.findIndex((r) => r.some((c) => normalizeHeader(c) === 'nombres'));
    if (headerRowIdx === -1) {
      toast('No se encontró una columna "Nombres" en el archivo.', 'error');
      return;
    }
    const headerRow = rows[headerRowIdx];
    const colMap = {}; // colIndex -> key
    headerRow.forEach((h, i) => {
      const key = matchColumn(h);
      if (key) colMap[i] = key;
    });

    const [players, cfg] = await Promise.all([DB.getAllPlayers(), loadCfg()]);
    const { baremos, testDefs, posiciones } = cfg;
    const findPlayer = (nombres, apellidos) =>
      players.find(
        (p) => normalizeHeader(p.nombres) === normalizeHeader(nombres) && normalizeHeader(p.apellidos) === normalizeHeader(apellidos)
      );

    let created = 0;
    let evaluated = 0;
    const fecha = todayISO();

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const rec = {};
      Object.entries(colMap).forEach(([i, key]) => (rec[key] = row[Number(i)]));
      if (!rec.nombres && !rec.apellidos) continue;

      let player = findPlayer(rec.nombres, rec.apellidos);
      if (!player) {
        player = await DB.addPlayer({
          nombres: String(rec.nombres || '').trim(),
          apellidos: String(rec.apellidos || '').trim(),
          fechaNacimiento: excelDateToISO(rec.fechaNacimiento) || '',
          lateralidad: rec.lateralidad || '',
          gradoEscolar: rec.gradoEscolar || '',
          sexo: 'M', estado: 'activo',
          club: '', equipo: '', posicionPrincipal: '', categoriaEdad: '',
        });
        players.push(player);
        created++;
      }

      const age = player.fechaNacimiento ? calcAge(player.fechaNacimiento, fecha) : 13;
      const talla = num(rec.talla);
      const peso = num(rec.peso);
      const imc = calcIMC(peso, talla);

      const tests = {};
      testDefs.forEach((d) => {
        const raw = rec[d.key];
        if (raw === undefined || raw === '') { tests[d.key] = { valor: null, score: undefined }; return; }
        tests[d.key] = d.type === 'quant' ? { valor: num(raw) } : { valor: num(raw), score: undefined };
      });

      const testScores = computeTestScores(tests, testDefs, baremos, age ?? 13);
      const categoryScores = computeCategoryScores(testScores, testDefs);
      const scoreFisicoGlobal = computeGlobalScore(categoryScores);
      const positionFit = computePositionFit(categoryScores, posiciones);
      const observaciones = generateObservations({
        categoryScores, testScores, testDefs, positionFit, imc, imcClasificacion: clasificarIMC(imc), nombre: player.nombres,
      });

      await DB.addEvaluation({
        playerId: player.id, fecha, edadAlMomento: age, talla, peso, imc, imcClasificacion: clasificarIMC(imc),
        tests, testScores, categoryScores, scoreFisicoGlobal, positionFit, observaciones,
        notasEvaluador: 'Importado desde matriz Excel del club.', evaluador: '',
      });
      evaluated++;
    }

    toast(`Importación completa: ${evaluated} evaluaciones, ${created} jugadores nuevos.`, 'success');
    navigate('/evaluaciones');
    setTimeout(() => window.location.reload(), 400);
  } catch (err) {
    console.error(err);
    toast('Error al importar el archivo: ' + err.message, 'error');
  }
}

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function excelDateToISO(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}
