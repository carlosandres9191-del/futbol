/* ============================================================
   views/nutrition.js — Ficha nutricional: composición corporal,
   plan alimenticio y seguimiento.
   ============================================================ */

import { DB } from '../db.js';
import { el, formatDate, todayISO, calcIMC, clasificarIMC, toast, navigate, confirmDialog } from '../utils.js';

export async function renderNutritionList(container) {
  const [records, players] = await Promise.all([DB.getAllNutrition(), DB.getAllPlayers()]);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  const card = el('div', { class: 'card' });
  card.appendChild(
    el('div', { class: 'card-header' }, [
      el('h2', {}, `Ficha nutricional (${records.length} registros)`),
      el('button', { class: 'btn btn-primary', onClick: () => navigate('/nutricion/nueva') }, '+ Nuevo registro'),
    ])
  );

  if (!records.length) {
    card.appendChild(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'icon' }, '🥗'),
        el('p', {}, 'Aún no hay registros nutricionales.'),
      ])
    );
    container.appendChild(card);
    return;
  }

  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, ['Jugador', 'Fecha', 'Peso', 'Talla', 'IMC', ''].map((h) => el('th', {}, h)))),
  ]);
  const tbody = el('tbody');
  records
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .forEach((n) => {
      const p = byId[n.playerId];
      tbody.appendChild(
        el('tr', { style: 'cursor:pointer;', onClick: () => navigate(`/nutricion/${n.id}/editar`) }, [
          el('td', {}, p ? `${p.nombres} ${p.apellidos}` : '—'),
          el('td', {}, formatDate(n.fecha)),
          el('td', {}, n.peso ? `${n.peso} kg` : '—'),
          el('td', {}, n.talla ? `${n.talla} cm` : '—'),
          el('td', {}, n.imc != null ? `${n.imc} (${n.imcClasificacion})` : '—'),
          el('td', { class: 'text-right' }, el('span', { class: 'btn-link' }, 'Ver →')),
        ])
      );
    });
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);
  container.appendChild(card);
}

export async function renderNutritionForm(container, nutritionId, presetPlayerId) {
  const isEdit = !!nutritionId;
  const players = await DB.getAllPlayers();
  const n0raw = isEdit ? await getNutritionById(nutritionId) : null;

  if (!players.length) {
    container.appendChild(
      el('div', { class: 'card empty-state' }, [
        el('p', {}, 'Registra al menos un jugador antes de crear una ficha nutricional.'),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Nuevo jugador'),
      ])
    );
    return;
  }
  if (isEdit && !n0raw) {
    container.appendChild(el('div', { class: 'card' }, 'Registro no encontrado.'));
    return;
  }

  const n0 = n0raw || {
    playerId: presetPlayerId || players[0].id, fecha: todayISO(), peso: '', talla: '',
    porcentajeGrasa: '', planAlimenticio: '', observacionesNutricionista: '', suplementacion: '', hidratacion: '',
  };

  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, isEdit ? 'Editar registro nutricional' : 'Nuevo registro nutricional'));

  const form = el('form', {});
  const playerSelect = el('select', { id: 'playerId', required: true },
    players.sort((a, b) => a.apellidos.localeCompare(b.apellidos)).map((p) =>
      el('option', { value: p.id, selected: p.id === n0.playerId }, `${p.nombres} ${p.apellidos}`)
    ));

  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Jugador *'), playerSelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Fecha *'), el('input', { id: 'fecha', type: 'date', required: true, value: n0.fecha })]),
    ])
  );

  const pesoInput = el('input', { id: 'peso', type: 'number', step: '0.1', min: '0', value: n0.peso ?? '', placeholder: 'kg' });
  const tallaInput = el('input', { id: 'talla', type: 'number', step: '0.1', min: '0', value: n0.talla ?? '', placeholder: 'cm' });
  const imcOut = el('span', { class: 'badge badge-gray' }, n0.imc != null ? `${n0.imc} · ${n0.imcClasificacion}` : '—');
  function updateIMC() {
    const imc = calcIMC(Number(pesoInput.value), Number(tallaInput.value));
    imcOut.textContent = imc != null ? `${imc} · ${clasificarIMC(imc)}` : '—';
  }
  pesoInput.addEventListener('input', updateIMC);
  tallaInput.addEventListener('input', updateIMC);

  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Peso'), pesoInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Talla'), tallaInput]),
      el('div', { class: 'field' }, [el('label', {}, '% grasa corporal (si se midió)'), el('input', { id: 'porcentajeGrasa', type: 'number', step: '0.1', min: '0', value: n0.porcentajeGrasa ?? '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'IMC (automático)'), imcOut]),
    ])
  );

  form.appendChild(
    el('div', { class: 'field' }, [el('label', {}, 'Plan alimenticio'), el('textarea', { id: 'planAlimenticio', rows: 3 }, n0.planAlimenticio || '')])
  );
  form.appendChild(
    el('div', { class: 'form-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Suplementación'), el('input', { id: 'suplementacion', value: n0.suplementacion || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Hidratación / recomendaciones'), el('input', { id: 'hidratacion', value: n0.hidratacion || '' })]),
    ])
  );
  form.appendChild(
    el('div', { class: 'field' }, [el('label', {}, 'Observaciones del nutricionista'), el('textarea', { id: 'observacionesNutricionista', rows: 3 }, n0.observacionesNutricionista || '')])
  );

  const actions = el('div', { class: 'flex gap-12' }, [
    el('button', { type: 'submit', class: 'btn btn-primary' }, isEdit ? 'Guardar cambios' : 'Guardar registro'),
    el('button', { type: 'button', class: 'btn btn-outline', onClick: () => history.back() }, 'Cancelar'),
  ]);
  if (isEdit) {
    actions.appendChild(
      el('button', {
        type: 'button', class: 'btn btn-danger', style: 'margin-left:auto;',
        onClick: async () => {
          if (confirmDialog('¿Eliminar este registro nutricional?')) {
            await DB.deleteNutrition(nutritionId);
            toast('Registro eliminado', 'success');
            navigate('/nutricion');
          }
        },
      }, 'Eliminar')
    );
  }
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const peso = pesoInput.value ? Number(pesoInput.value) : null;
    const talla = tallaInput.value ? Number(tallaInput.value) : null;
    const imc = calcIMC(peso, talla);
    const data = {
      ...(isEdit ? { id: nutritionId } : {}),
      playerId: playerSelect.value,
      fecha: document.getElementById('fecha').value,
      peso, talla, imc, imcClasificacion: clasificarIMC(imc),
      porcentajeGrasa: document.getElementById('porcentajeGrasa').value || null,
      planAlimenticio: document.getElementById('planAlimenticio').value.trim(),
      suplementacion: document.getElementById('suplementacion').value.trim(),
      hidratacion: document.getElementById('hidratacion').value.trim(),
      observacionesNutricionista: document.getElementById('observacionesNutricionista').value.trim(),
    };
    if (isEdit) await DB.updateNutrition(data);
    else await DB.addNutrition(data);
    toast('Registro nutricional guardado', 'success');
    navigate(`/jugadores/${data.playerId}`);
  });

  card.appendChild(form);
  container.appendChild(card);
}

async function getNutritionById(id) {
  const all = await DB.getAllNutrition();
  return all.find((n) => n.id === id) || null;
}
