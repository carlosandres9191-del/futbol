/* ============================================================
   views/dashboard.js — Panel general del club
   ============================================================ */

import { DB } from '../db.js';
import { el, calcAge, formatDate, initials, navigate } from '../utils.js';

export async function renderDashboard(container) {
  const [players, evaluations, medical, posicionesCfg, edadesCfg] = await Promise.all([
    DB.getAllPlayers(),
    DB.getAllEvaluations(),
    DB.getAllMedical(),
    DB.getConfig('posiciones'),
    DB.getConfig('categoriasEdad'),
  ]);
  const posiciones = posicionesCfg?.value || {};
  const edades = edadesCfg?.value || [];

  const activos = players.filter((p) => p.estado !== 'inactivo');
  const sinEvaluar = players.filter((p) => !evaluations.some((e) => e.playerId === p.id));
  const noAptos = medical.filter((m) => m.aptitud === 'no_apto');
  const lesionesActivas = medical.filter((m) => m.tipo === 'lesion' && m.estadoLesion && m.estadoLesion !== 'recuperado');

  container.appendChild(
    el('div', { class: 'grid grid-4' }, [
      statCard(players.length, 'Jugadores registrados'),
      statCard(activos.length, 'Activos'),
      statCard(evaluations.length, 'Evaluaciones físicas'),
      statCard(lesionesActivas.length, 'Lesiones activas / en recuperación'),
    ])
  );

  const row = el('div', { class: 'grid grid-2' });

  // Distribución por categoría de edad
  const catCard = el('div', { class: 'card' }, [el('h3', {}, 'Jugadores por categoría')]);
  if (!players.length) {
    catCard.appendChild(el('p', { class: 'muted' }, 'Sin jugadores registrados aún.'));
  } else {
    const counts = {};
    players.forEach((p) => {
      const key = p.categoriaEdad || autoCategoria(p, edades);
      counts[key] = (counts[key] || 0) + 1;
    });
    Object.entries(counts).forEach(([k, count]) => {
      const label = edades.find((e) => e.key === k)?.label || 'Sin categoría';
      const pct = Math.round((count / players.length) * 100);
      catCard.appendChild(
        el('div', { class: 'score-row' }, [
          el('div', { class: 'score-label' }, label),
          el('div', { class: 'score-track' }, el('div', { class: 'score-fill', style: `width:${pct}%;` })),
          el('div', { class: 'score-value' }, String(count)),
        ])
      );
    });
  }
  row.appendChild(catCard);

  // Alertas
  const alertCard = el('div', { class: 'card' }, [el('h3', {}, 'Alertas y pendientes')]);
  const alerts = [];
  if (sinEvaluar.length) alerts.push({ text: `${sinEvaluar.length} jugador(es) sin ninguna evaluación física registrada`, type: 'badge-amber', action: () => navigate('/jugadores') });
  if (noAptos.length) alerts.push({ text: `${noAptos.length} jugador(es) marcados como "no apto" médicamente`, type: 'badge-red', action: () => navigate('/medico') });
  if (lesionesActivas.length) alerts.push({ text: `${lesionesActivas.length} lesión(es) activas o en recuperación`, type: 'badge-amber', action: () => navigate('/medico') });
  if (!alerts.length) {
    alertCard.appendChild(el('p', { class: 'muted' }, 'Sin alertas pendientes. Todo al día ✅'));
  } else {
    alerts.forEach((a) => {
      alertCard.appendChild(
        el('div', { class: 'flex-between mt-8', style: 'cursor:pointer;', onClick: a.action }, [
          el('span', {}, a.text),
          el('span', { class: `badge ${a.type}` }, '→'),
        ])
      );
    });
  }
  row.appendChild(alertCard);

  container.appendChild(row);

  // Últimas evaluaciones
  const recentCard = el('div', { class: 'card' });
  recentCard.appendChild(
    el('div', { class: 'card-header' }, [
      el('h3', { class: 'mb-0' }, 'Últimas evaluaciones'),
      el('button', { class: 'btn btn-outline btn-sm', onClick: () => navigate('/evaluaciones') }, 'Ver todas'),
    ])
  );
  const recent = [...evaluations].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 6);
  if (!recent.length) {
    recentCard.appendChild(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'icon' }, '⚽'),
        el('p', {}, 'Empieza registrando tu primer jugador y su primera evaluación física.'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Nuevo jugador'),
      ])
    );
  } else {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]));
    const wrap = el('div', { class: 'table-wrap' });
    const table = el('table', {}, [
      el('thead', {}, el('tr', {}, ['Jugador', 'Fecha', 'Score global', 'Posición sugerida', ''].map((h) => el('th', {}, h)))),
    ]);
    const tbody = el('tbody');
    recent.forEach((ev) => {
      const p = byId[ev.playerId];
      tbody.appendChild(
        el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/evaluaciones/${ev.id}`) }, [
          el('td', {}, p ? `${p.nombres} ${p.apellidos}` : '—'),
          el('td', {}, formatDate(ev.fecha)),
          el('td', {}, ev.scoreFisicoGlobal != null ? `${ev.scoreFisicoGlobal}/10` : '—'),
          el('td', {}, ev.positionFit?.[0]?.label || '—'),
          el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
        ])
      );
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    recentCard.appendChild(wrap);
  }
  container.appendChild(recentCard);
}

function statCard(value, label) {
  return el('div', { class: 'card stat-card' }, [
    el('div', { class: 'stat-value' }, String(value)),
    el('div', { class: 'stat-label' }, label),
  ]);
}

function autoCategoria(player, edades) {
  const age = calcAge(player.fechaNacimiento);
  if (age == null) return 'sin-definir';
  const match = edades.find((c) => age >= c.min && age <= c.max);
  return match ? match.key : 'sin-definir';
}
