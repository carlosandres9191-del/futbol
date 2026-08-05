/* ============================================================
   views/playerProfile.js — Ficha 360° del jugador: resumen,
   radar de perfil, progreso, clasificación por posición,
   evaluaciones, ficha médica y nutricional.
   ============================================================ */

import { DB } from '../db.js';
import { el, calcAge, formatDate, initials, navigate, scoreBarRow } from '../utils.js';
import { CATEGORIAS } from '../seed.js';

let radarChartInstance = null;
let progressChartInstance = null;

export async function renderPlayerProfile(container, playerId) {
  const [player, evaluations, medical, nutrition, posicionesCfg] = await Promise.all([
    DB.getPlayer(playerId),
    DB.getEvaluationsByPlayer(playerId),
    DB.getMedicalByPlayer(playerId),
    DB.getNutritionByPlayer(playerId),
    DB.getConfig('posiciones'),
  ]);

  if (!player) {
    container.appendChild(el('div', { class: 'card' }, 'Jugador no encontrado.'));
    return;
  }

  const posiciones = posicionesCfg?.value || {};
  const sortedEvals = [...evaluations].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const lastEval = sortedEvals[sortedEvals.length - 1];
  const age = calcAge(player.fechaNacimiento);

  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'profile-header' }, [
      player.fotoBase64
        ? el('img', { class: 'avatar avatar-lg', src: player.fotoBase64 })
        : el('div', { class: 'avatar avatar-lg' }, initials(player.nombres, player.apellidos)),
      el('div', { class: 'profile-info' }, [
        el('h2', {}, `${player.nombres} ${player.apellidos}`),
        el('p', { class: 'muted' }, [
          age !== null ? `${age} años` : '', ' · ',
          player.club || 'Sin club', player.equipo ? ` (${player.equipo})` : '',
        ]),
        el('div', { class: 'profile-tags' }, [
          posiciones[player.posicionPrincipal] ? el('span', { class: 'badge badge-green' }, posiciones[player.posicionPrincipal].label) : null,
          player.lateralidad ? el('span', { class: 'badge badge-gray' }, player.lateralidad) : null,
          player.estado === 'inactivo' ? el('span', { class: 'badge badge-red' }, 'Inactivo') : el('span', { class: 'badge badge-blue' }, 'Activo'),
        ]),
      ]),
      el('div', { style: 'margin-left:auto;' }, [
        el('button', { class: 'btn btn-outline', onClick: () => navigate(`/jugadores/${player.id}/editar`) }, 'Editar ficha'),
      ]),
    ])
  );

  const tabs = el('div', { class: 'tabs' });
  const tabButtons = {
    perfil: el('button', { class: 'tab-btn active' }, '📊 Perfil'),
    evaluaciones: el('button', { class: 'tab-btn' }, `🏃 Evaluaciones (${evaluations.length})`),
    medico: el('button', { class: 'tab-btn' }, `🩺 Médico (${medical.length})`),
    nutricion: el('button', { class: 'tab-btn' }, `🥗 Nutrición (${nutrition.length})`),
  };
  Object.values(tabButtons).forEach((b) => tabs.appendChild(b));
  card.appendChild(tabs);

  const panels = {
    perfil: el('div', { class: 'tab-panel' }),
    evaluaciones: el('div', { class: 'tab-panel', style: 'display:none;' }),
    medico: el('div', { class: 'tab-panel', style: 'display:none;' }),
    nutricion: el('div', { class: 'tab-panel', style: 'display:none;' }),
  };
  Object.values(panels).forEach((p) => card.appendChild(p));

  function showTab(name) {
    for (const k of Object.keys(panels)) {
      panels[k].style.display = k === name ? '' : 'none';
      tabButtons[k].classList.toggle('active', k === name);
    }
  }
  tabButtons.perfil.addEventListener('click', () => showTab('perfil'));
  tabButtons.evaluaciones.addEventListener('click', () => showTab('evaluaciones'));
  tabButtons.medico.addEventListener('click', () => showTab('medico'));
  tabButtons.nutricion.addEventListener('click', () => showTab('nutricion'));

  buildPerfilTab(panels.perfil, { player, lastEval, sortedEvals, posiciones });
  buildEvaluacionesTab(panels.evaluaciones, { player, sortedEvals });
  buildMedicoTab(panels.medico, { player, medical });
  buildNutricionTab(panels.nutricion, { player, nutrition });

  container.appendChild(card);
}

function buildPerfilTab(panel, { player, lastEval, sortedEvals, posiciones }) {
  if (!lastEval) {
    panel.appendChild(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'icon' }, '📋'),
        el('p', {}, 'Este jugador aún no tiene evaluaciones físicas registradas.'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate(`/evaluaciones/nueva?player=${player.id}`) }, '+ Registrar primera evaluación'),
      ])
    );
    return;
  }

  panel.appendChild(
    el('div', { class: 'grid grid-3' }, [
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, lastEval.scoreFisicoGlobal ?? '—'), el('div', { class: 'stat-label' }, 'Score físico-técnico global')]),
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, lastEval.imc ?? '—'), el('div', { class: 'stat-label' }, `IMC (${lastEval.imcClasificacion || '—'})`)]),
      el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, formatDate(lastEval.fecha)), el('div', { class: 'stat-label' }, 'Última evaluación')]),
    ])
  );

  panel.appendChild(el('div', { class: 'grid grid-2' }, [buildRadarBlock(lastEval), buildProgressBlock(sortedEvals)]));

  panel.appendChild(el('h3', { style: 'margin-top:10px;' }, 'Idoneidad por posición de juego'));
  const posWrap = el('div');
  (lastEval.positionFit || []).forEach((pf) => posWrap.appendChild(scoreBarRow(pf.label, pf.fit)));
  panel.appendChild(posWrap);

  if (lastEval.observaciones) {
    panel.appendChild(el('h3', { style: 'margin-top:18px;' }, 'Observaciones automáticas'));
    panel.appendChild(el('div', { class: 'obs-box' }, lastEval.observaciones));
  }

  panel.appendChild(
    el('div', { class: 'mt-16' }, [
      el('button', { class: 'btn btn-outline', onClick: () => navigate(`/evaluaciones/nueva?player=${player.id}`) }, '+ Nueva evaluación'),
    ])
  );
}

function buildRadarBlock(lastEval) {
  const wrap = el('div', { class: 'card', style: 'box-shadow:none; border-style:dashed;' }, [
    el('h3', {}, 'Perfil por categoría'),
    el('div', { class: 'chart-wrap' }, el('canvas', { id: 'radar-canvas', height: '260' })),
  ]);
  setTimeout(() => {
    const canvas = wrap.querySelector('#radar-canvas');
    if (!canvas || typeof Chart === 'undefined') return;
    if (radarChartInstance) radarChartInstance.destroy();
    const labels = Object.entries(CATEGORIAS).map(([, label]) => label);
    const data = Object.keys(CATEGORIAS).map((k) => lastEval.categoryScores?.[k] ?? 0);
    radarChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Score (0-10)',
          data,
          backgroundColor: 'rgba(22,163,74,0.2)',
          borderColor: '#16a34a',
          pointBackgroundColor: '#16a34a',
        }],
      },
      options: {
        scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
        plugins: { legend: { display: false } },
      },
    });
  }, 0);
  return wrap;
}

function buildProgressBlock(sortedEvals) {
  const wrap = el('div', { class: 'card', style: 'box-shadow:none; border-style:dashed;' }, [
    el('h3', {}, 'Progreso en el tiempo'),
    sortedEvals.length > 1
      ? el('div', { class: 'chart-wrap' }, el('canvas', { id: 'progress-canvas', height: '260' }))
      : el('p', { class: 'muted' }, 'Se necesitan al menos 2 evaluaciones para ver el progreso.'),
  ]);
  if (sortedEvals.length > 1) {
    setTimeout(() => {
      const canvas = wrap.querySelector('#progress-canvas');
      if (!canvas || typeof Chart === 'undefined') return;
      if (progressChartInstance) progressChartInstance.destroy();
      progressChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: sortedEvals.map((e) => formatDate(e.fecha)),
          datasets: [{
            label: 'Score físico-técnico global',
            data: sortedEvals.map((e) => e.scoreFisicoGlobal),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.15)',
            tension: 0.3,
            fill: true,
          }],
        },
        options: { scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } },
      });
    }, 0);
  }
  return wrap;
}

function buildEvaluacionesTab(panel, { player, sortedEvals }) {
  panel.appendChild(
    el('div', { class: 'flex-between mb-0' }, [
      el('h3', { class: 'mb-0' }, 'Historial de evaluaciones'),
      el('button', { class: 'btn btn-primary btn-sm', onClick: () => navigate(`/evaluaciones/nueva?player=${player.id}`) }, '+ Nueva'),
    ])
  );
  if (!sortedEvals.length) {
    panel.appendChild(el('p', { class: 'muted mt-8' }, 'Sin evaluaciones registradas.'));
    return;
  }
  const wrap = el('div', { class: 'table-wrap mt-16' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Fecha', 'Edad', 'IMC', 'Score global', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  [...sortedEvals].reverse().forEach((ev) => {
    tbody.appendChild(
      el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/evaluaciones/${ev.id}`) }, [
        el('td', {}, formatDate(ev.fecha)),
        el('td', {}, ev.edadAlMomento ?? '—'),
        el('td', {}, ev.imc ?? '—'),
        el('td', {}, ev.scoreFisicoGlobal ?? '—'),
        el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
      ])
    );
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  panel.appendChild(wrap);
}

function buildMedicoTab(panel, { player, medical }) {
  panel.appendChild(
    el('div', { class: 'flex-between mb-0' }, [
      el('h3', { class: 'mb-0' }, 'Ficha médica'),
      el('button', { class: 'btn btn-primary btn-sm', onClick: () => navigate(`/medico/nueva?player=${player.id}`) }, '+ Nuevo registro'),
    ])
  );
  if (!medical.length) {
    panel.appendChild(el('p', { class: 'muted mt-8' }, 'Sin registros médicos.'));
    return;
  }
  const wrap = el('div', { class: 'table-wrap mt-16' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Fecha', 'Tipo', 'Aptitud', 'Detalle', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  [...medical].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach((m) => {
    tbody.appendChild(
      el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/medico/${m.id}/editar`) }, [
        el('td', {}, formatDate(m.fecha)),
        el('td', {}, m.tipo || '—'),
        el('td', {}, aptitudBadge(m.aptitud)),
        el('td', {}, m.tipo === 'lesion' ? (m.lesionTipo || '') : (m.observaciones || '').slice(0, 60)),
        el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
      ])
    );
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  panel.appendChild(wrap);
}

function aptitudBadge(aptitud) {
  const map = {
    apto: ['badge-green', 'Apto'],
    apto_restricciones: ['badge-amber', 'Apto con restricciones'],
    no_apto: ['badge-red', 'No apto'],
  };
  const [cls, txt] = map[aptitud] || ['badge-gray', aptitud || '—'];
  return el('span', { class: `badge ${cls}` }, txt);
}

function buildNutricionTab(panel, { player, nutrition }) {
  panel.appendChild(
    el('div', { class: 'flex-between mb-0' }, [
      el('h3', { class: 'mb-0' }, 'Ficha nutricional'),
      el('button', { class: 'btn btn-primary btn-sm', onClick: () => navigate(`/nutricion/nueva?player=${player.id}`) }, '+ Nuevo registro'),
    ])
  );
  if (!nutrition.length) {
    panel.appendChild(el('p', { class: 'muted mt-8' }, 'Sin registros nutricionales.'));
    return;
  }
  const wrap = el('div', { class: 'table-wrap mt-16' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Fecha', 'Peso', 'Talla', 'IMC', 'Plan', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  [...nutrition].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach((n) => {
    tbody.appendChild(
      el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/nutricion/${n.id}/editar`) }, [
        el('td', {}, formatDate(n.fecha)),
        el('td', {}, n.peso ? `${n.peso} kg` : '—'),
        el('td', {}, n.talla ? `${n.talla} cm` : '—'),
        el('td', {}, n.imc ?? '—'),
        el('td', {}, (n.planAlimenticio || '').slice(0, 50)),
        el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
      ])
    );
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  panel.appendChild(wrap);
}
