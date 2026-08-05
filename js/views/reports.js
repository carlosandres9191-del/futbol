/* ============================================================
   views/reports.js — Reportes comparativos del equipo
   ============================================================ */

import { DB } from '../db.js';
import { el, calcAge, navigate } from '../utils.js';
import { CATEGORIAS } from '../seed.js';

let barChartInstance = null;

export async function renderReports(container) {
  const [players, evaluations, edadesCfg, posicionesCfg] = await Promise.all([
    DB.getAllPlayers(),
    DB.getAllEvaluations(),
    DB.getConfig('categoriasEdad'),
    DB.getConfig('posiciones'),
  ]);
  const edades = edadesCfg?.value || [];
  const posiciones = posicionesCfg?.value || {};

  // última evaluación por jugador
  const lastByPlayer = {};
  evaluations.forEach((ev) => {
    const cur = lastByPlayer[ev.playerId];
    if (!cur || (ev.fecha || '') > (cur.fecha || '')) lastByPlayer[ev.playerId] = ev;
  });

  const exportBtn = el('button', { class: 'btn btn-outline' }, '⬇️ Exportar CSV');
  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'card-header' }, [
      el('h2', {}, 'Reportes del equipo'),
      exportBtn,
    ])
  );

  const catSelect = el('select', {}, [el('option', { value: '' }, 'Todas las categorías'), ...edades.map((c) => el('option', { value: c.key }, c.label))]);
  const posSelect = el('select', {}, [el('option', { value: '' }, 'Todas las posiciones'), ...Object.entries(posiciones).map(([k, p]) => el('option', { value: k }, p.label))]);
  const filterRow = el('div', { class: 'form-row', style: 'margin-bottom:16px;' }, [catSelect, posSelect]);
  card.appendChild(filterRow);

  const canvas = el('canvas', { height: '260' });
  const chartCard = el('div', { class: 'chart-wrap', style: 'max-width:640px;' }, canvas);
  card.appendChild(chartCard);

  const wrap = el('div', { class: 'table-wrap mt-16' });
  card.appendChild(wrap);
  container.appendChild(card);

  function getFiltered() {
    const fc = catSelect.value;
    const fp = posSelect.value;
    return players.filter((p) => {
      if (fc && p.categoriaEdad !== fc) return false;
      if (fp && p.posicionPrincipal !== fp) return false;
      return true;
    });
  }

  function draw() {
    const filtered = getFiltered();
    const rows = filtered
      .map((p) => ({ player: p, ev: lastByPlayer[p.id] }))
      .sort((a, b) => (b.ev?.scoreFisicoGlobal ?? -1) - (a.ev?.scoreFisicoGlobal ?? -1));

    wrap.innerHTML = '';
    if (!rows.length) {
      wrap.appendChild(el('div', { class: 'empty-state' }, el('p', {}, 'No hay jugadores que coincidan con el filtro.')));
    } else {
      const table = el('table', {}, [
        el('thead', {}, el('tr', {}, ['#', 'Jugador', 'Posición', 'Última evaluación', 'Score global', 'Posición sugerida', ''].map((h) => el('th', {}, h)))),
      ]);
      const tbody = el('tbody');
      rows.forEach((r, i) => {
        const posLabel = posiciones[r.player.posicionPrincipal]?.label || '—';
        tbody.appendChild(
          el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/jugadores/${r.player.id}`) }, [
            el('td', {}, String(i + 1)),
            el('td', {}, `${r.player.nombres} ${r.player.apellidos}`),
            el('td', {}, posLabel),
            el('td', {}, r.ev ? r.ev.fecha : 'Sin evaluar'),
            el('td', {}, r.ev?.scoreFisicoGlobal != null ? el('span', { class: 'badge badge-green' }, `${r.ev.scoreFisicoGlobal}/10`) : el('span', { class: 'badge badge-gray' }, 'N/D')),
            el('td', {}, r.ev?.positionFit?.[0]?.label || '—'),
            el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
          ])
        );
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
    }

    // promedio por categoría (equipo filtrado)
    const catKeys = Object.keys(CATEGORIAS);
    const averages = catKeys.map((c) => {
      const vals = rows.map((r) => r.ev?.categoryScores?.[c]).filter((v) => v !== null && v !== undefined);
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
    });

    if (canvas && typeof Chart !== 'undefined') {
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: catKeys.map((c) => CATEGORIAS[c]),
          datasets: [{ label: 'Promedio del equipo (0-10)', data: averages, backgroundColor: '#22c55e' }],
        },
        options: { scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } },
      });
    }
  }

  catSelect.addEventListener('change', draw);
  posSelect.addEventListener('change', draw);
  exportBtn.addEventListener('click', () => exportCSV(getFiltered(), lastByPlayer, posiciones));

  draw();
}

function exportCSV(players, lastByPlayer, posiciones) {
  const header = ['Nombres', 'Apellidos', 'Edad', 'Posición', 'Última evaluación', 'IMC', 'Score físico global', 'Posición sugerida'];
  const rows = players.map((p) => {
    const ev = lastByPlayer[p.id];
    return [
      p.nombres, p.apellidos, calcAge(p.fechaNacimiento) ?? '', posiciones[p.posicionPrincipal]?.label || '',
      ev?.fecha || '', ev?.imc ?? '', ev?.scoreFisicoGlobal ?? '', ev?.positionFit?.[0]?.label || '',
    ];
  });
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte_equipo.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
