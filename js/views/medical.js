/* ============================================================
   views/medical.js — Ficha médica: revisiones, lesiones,
   aptitud deportiva.
   ============================================================ */

import { DB } from '../db.js';
import { el, formatDate, todayISO, toast, navigate, confirmDialog } from '../utils.js';

const APTITUD_OPTS = [
  ['apto', 'Apto'],
  ['apto_restricciones', 'Apto con restricciones'],
  ['no_apto', 'No apto'],
];
const TIPO_OPTS = [
  ['revision', 'Revisión / chequeo general'],
  ['lesion', 'Lesión'],
  ['vacuna', 'Vacunación'],
  ['otro', 'Otro'],
];

export async function renderMedicalList(container) {
  const [records, players] = await Promise.all([DB.getAllMedical(), DB.getAllPlayers()]);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'card-header' }, [
      el('h2', {}, `Ficha médica (${records.length} registros)`),
      el('button', { class: 'btn btn-primary', onClick: () => navigate('/medico/nueva') }, '+ Nuevo registro'),
    ])
  );

  if (!records.length) {
    card.appendChild(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'icon' }, '🩺'),
        el('p', {}, 'Aún no hay registros médicos.'),
      ])
    );
    container.appendChild(card);
    return;
  }

  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Jugador', 'Fecha', 'Tipo', 'Aptitud', 'Próxima revisión', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  records
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .forEach((m) => {
      const p = byId[m.playerId];
      tbody.appendChild(
        el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/medico/${m.id}/editar`) }, [
          el('td', {}, p ? `${p.nombres} ${p.apellidos}` : '—'),
          el('td', {}, formatDate(m.fecha)),
          el('td', {}, TIPO_OPTS.find((t) => t[0] === m.tipo)?.[1] || m.tipo),
          el('td', {}, aptitudBadge(m.aptitud)),
          el('td', {}, m.proximaRevision ? formatDate(m.proximaRevision) : '—'),
          el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
        ])
      );
    });
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);
  container.appendChild(card);
}

function aptitudBadge(aptitud) {
  const map = { apto: 'badge-green', apto_restricciones: 'badge-amber', no_apto: 'badge-red' };
  const label = APTITUD_OPTS.find((a) => a[0] === aptitud)?.[1] || '—';
  return el('span', { class: `badge ${map[aptitud] || 'badge-gray'}` }, label);
}

export async function renderMedicalForm(container, medicalId, presetPlayerId) {
  const isEdit = !!medicalId;
  const players = await DB.getAllPlayers();
  const m0raw = isEdit ? await getMedicalById(medicalId) : null;

  if (!players.length) {
    container.appendChild(
      el('div', { class: 'card empty-state' }, [
        el('p', {}, 'Registra al menos un jugador antes de crear una ficha médica.'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Nuevo jugador'),
      ])
    );
    return;
  }
  if (isEdit && !m0raw) {
    container.appendChild(el('div', { class: 'card' }, 'Registro no encontrado.'));
    return;
  }

  const m0 = m0raw || {
    playerId: presetPlayerId || players[0].id, fecha: todayISO(), tipo: 'revision', aptitud: 'apto',
    antecedentes: '', alergias: '', medicamentos: '', lesionTipo: '', lesionZona: '',
    tiempoRecuperacionDias: '', estadoLesion: '', observaciones: '', proximaRevision: '',
  };

  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, isEdit ? 'Editar registro médico' : 'Nuevo registro médico'));

  const form = el('form', {});
  const playerSelect = el('select', { id: 'playerId', required: true },
    players.sort((a, b) => a.apellidos.localeCompare(b.apellidos)).map((p) =>
      el('option', { value: p.id, selected: p.id === m0.playerId }, `${p.nombres} ${p.apellidos}`)
    ));
  const tipoSelect = el('select', { id: 'tipo' }, TIPO_OPTS.map(([v, l]) => el('option', { value: v, selected: m0.tipo === v }, l)));

  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Jugador *'), playerSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Fecha *'), el('input', { id: 'fecha', type: 'date', required: true, value: m0.fecha })]),
      el('div', { class: 'field' }, [el('label', {}, 'Tipo de registro'), tipoSelect]),
    ])
  );

  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Aptitud deportiva'), el('select', { id: 'aptitud' }, APTITUD_OPTS.map(([v, l]) => el('option', { value: v, selected: m0.aptitud === v }, l)))]),
      el('div', { class: 'field' }, [el('label', {}, 'Próxima revisión'), el('input', { id: 'proximaRevision', type: 'date', value: m0.proximaRevision || '' })]),
    ])
  );

  const fsLesion = el('fieldset', {}, [
    el('legend', {}, 'Detalle de lesión (si aplica)'),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Tipo de lesión'), el('input', { id: 'lesionTipo', value: m0.lesionTipo || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Zona afectada'), el('input', { id: 'lesionZona', value: m0.lesionZona || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Días de recuperación estimados'), el('input', { id: 'tiempoRecuperacionDias', type: 'number', min: '0', value: m0.tiempoRecuperacionDias || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Estado'), el('select', { id: 'estadoLesion' }, [
        el('option', { value: '', selected: !m0.estadoLesion }, '—'),
        el('option', { value: 'activa', selected: m0.estadoLesion === 'activa' }, 'Activa'),
        el('option', { value: 'en_recuperacion', selected: m0.estadoLesion === 'en_recuperacion' }, 'En recuperación'),
        el('option', { value: 'recuperado', selected: m0.estadoLesion === 'recuperado' }, 'Recuperado'),
      ])]),
    ]),
  ]);
  form.appendChild(fsLesion);

  const fsGeneral = el('fieldset', {}, [
    el('legend', {}, 'Antecedentes y salud general'),
    el('div', { class: 'field' }, [el('label', {}, 'Antecedentes médicos'), el('textarea', { id: 'antecedentes', rows: 2 }, m0.antecedentes || '')]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Alergias'), el('input', { id: 'alergias', value: m0.alergias || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Medicamentos actuales'), el('input', { id: 'medicamentos', value: m0.medicamentos || '' })]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Observaciones del médico'), el('textarea', { id: 'observaciones', rows: 3 }, m0.observaciones || '')]),
  ]);
  form.appendChild(fsGeneral);

  const actions = el('div', { class: 'flex gap-12' }, [
    el('button', { type: 'submit', class: 'btn btn-primary' }, isEdit ? 'Guardar cambios' : 'Guardar registro'),
    el('button', { type: 'button', class: 'btn btn-outline', onClick: () => history.back() }, 'Cancelar'),
  ]);
  if (isEdit) {
    actions.appendChild(
      el('button', {
        type: 'button', class: 'btn btn-danger', style: 'margin-left:auto;',
        onClick: async () => {
          if (confirmDialog('¿Eliminar este registro médico?')) {
            await DB.deleteMedical(medicalId);
            toast('Registro eliminado', 'success');
            navigate('/medico');
          }
        },
      }, 'Eliminar')
    );
  }
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      ...(isEdit ? { id: medicalId } : {}),
      playerId: playerSelect.value,
      fecha: document.getElementById('fecha').value,
      tipo: tipoSelect.value,
      aptitud: document.getElementById('aptitud').value,
      proximaRevision: document.getElementById('proximaRevision').value,
      lesionTipo: document.getElementById('lesionTipo').value.trim(),
      lesionZona: document.getElementById('lesionZona').value.trim(),
      tiempoRecuperacionDias: document.getElementById('tiempoRecuperacionDias').value,
      estadoLesion: document.getElementById('estadoLesion').value,
      antecedentes: document.getElementById('antecedentes').value.trim(),
      alergias: document.getElementById('alergias').value.trim(),
      medicamentos: document.getElementById('medicamentos').value.trim(),
      observaciones: document.getElementById('observaciones').value.trim(),
    };
    if (isEdit) await DB.updateMedical(data);
    else await DB.addMedical(data);
    toast('Registro médico guardado', 'success');
    navigate(`/jugadores/${data.playerId}`);
  });

  card.appendChild(form);
  container.appendChild(card);
}

async function getMedicalById(id) {
  const all = await DB.getAllMedical();
  return all.find((m) => m.id === id) || null;
}
