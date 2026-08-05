/* ============================================================
   views/settings.js — Configuración: club, categorías de edad,
   posiciones (pesos) y baremos (tablas de puntuación editables).
   ============================================================ */

import { DB } from '../db.js';
import { el, toast, confirmDialog } from '../utils.js';
import { CATEGORIAS, BAREMOS_SEED, POSICIONES_SEED, CATEGORIAS_EDAD_SEED, CLUB_INFO_SEED } from '../seed.js';

export async function renderSettings(container) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, 'Configuración'));
  card.appendChild(
    el('p', { class: 'help-text' }, 'Todos los valores por defecto provienen del estudio y los protocolos de valoración del club. Ajusta lo que necesites; los cambios aplican a las próximas evaluaciones (las ya guardadas no se recalculan automáticamente).')
  );

  const tabs = el('div', { class: 'tabs' });
  const btns = {
    general: el('button', { class: 'tab-btn active' }, '🏟️ Club'),
    edades: el('button', { class: 'tab-btn' }, '🎂 Categorías de edad'),
    posiciones: el('button', { class: 'tab-btn' }, '📍 Posiciones'),
    baremos: el('button', { class: 'tab-btn' }, '📐 Baremos'),
  };
  Object.values(btns).forEach((b) => tabs.appendChild(b));
  card.appendChild(tabs);

  const panels = {
    general: el('div', {}),
    edades: el('div', { style: 'display:none;' }),
    posiciones: el('div', { style: 'display:none;' }),
    baremos: el('div', { style: 'display:none;' }),
  };
  Object.values(panels).forEach((p) => card.appendChild(p));
  function showTab(name) {
    for (const k of Object.keys(panels)) {
      panels[k].style.display = k === name ? '' : 'none';
      btns[k].classList.toggle('active', k === name);
    }
  }
  Object.entries(btns).forEach(([k, b]) => b.addEventListener('click', () => showTab(k)));

  await buildGeneral(panels.general);
  await buildEdades(panels.edades);
  await buildPosiciones(panels.posiciones);
  await buildBaremos(panels.baremos);

  container.appendChild(card);
}

/* ---------------- Club ---------------- */
async function buildGeneral(panel) {
  const cfg = (await DB.getConfig('clubInfo'))?.value || CLUB_INFO_SEED;
  const nombreInput = el('input', { id: 'nombreClub', value: cfg.nombreClub || '' });
  panel.appendChild(
    el('div', { class: 'field', style: 'max-width:400px;' }, [el('label', {}, 'Nombre del club / entidad deportiva'), nombreInput])
  );
  panel.appendChild(
    el('button', {
      class: 'btn btn-primary', onClick: async () => {
        await DB.setConfig('clubInfo', { ...cfg, nombreClub: nombreInput.value.trim() });
        toast('Datos del club actualizados', 'success');
        const nameEl = document.getElementById('club-name');
        if (nameEl) nameEl.textContent = nombreInput.value.trim();
      },
    }, 'Guardar')
  );
}

/* ---------------- Categorías de edad ---------------- */
async function buildEdades(panel) {
  let edades = (await DB.getConfig('categoriasEdad'))?.value || CATEGORIAS_EDAD_SEED;
  edades = edades.map((e) => ({ ...e }));

  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', {}, [el('thead', {}, el('tr', {}, ['Etiqueta', 'Edad mínima', 'Edad máxima', ''].map((h) => el('th', {}, h))))]);
  const tbody = el('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);

  function draw() {
    tbody.innerHTML = '';
    edades.forEach((c, i) => {
      const labelInput = el('input', { value: c.label });
      const minInput = el('input', { type: 'number', value: c.min, style: 'width:80px;' });
      const maxInput = el('input', { type: 'number', value: c.max, style: 'width:80px;' });
      labelInput.addEventListener('input', () => (c.label = labelInput.value));
      minInput.addEventListener('input', () => (c.min = Number(minInput.value)));
      maxInput.addEventListener('input', () => (c.max = Number(maxInput.value)));
      tbody.appendChild(
        el('tr', {}, [
          el('td', {}, labelInput),
          el('td', {}, minInput),
          el('td', {}, maxInput),
          el('td', {}, el('button', {
            class: 'btn btn-danger btn-sm', type: 'button',
            onClick: () => { edades.splice(i, 1); draw(); },
          }, 'Quitar')),
        ])
      );
    });
  }
  draw();
  panel.appendChild(wrap);

  panel.appendChild(
    el('div', { class: 'flex gap-8 mt-16' }, [
      el('button', {
        class: 'btn btn-outline', type: 'button',
        onClick: () => { edades.push({ key: 'cat_' + Date.now(), label: 'Nueva categoría', min: 6, max: 8 }); draw(); },
      }, '+ Agregar categoría'),
      el('button', {
        class: 'btn btn-primary', type: 'button',
        onClick: async () => { await DB.setConfig('categoriasEdad', edades); toast('Categorías de edad guardadas', 'success'); },
      }, 'Guardar cambios'),
    ])
  );
}

/* ---------------- Posiciones ---------------- */
async function buildPosiciones(panel) {
  let posiciones = (await DB.getConfig('posiciones'))?.value || POSICIONES_SEED;
  posiciones = JSON.parse(JSON.stringify(posiciones));
  const catKeys = Object.keys(CATEGORIAS);

  const listWrap = el('div');
  panel.appendChild(el('p', { class: 'help-text' }, 'El peso de cada categoría indica qué tanto influye en el índice de idoneidad para esa posición. No es obligatorio que sumen exactamente 1.0.'));
  panel.appendChild(listWrap);

  function draw() {
    listWrap.innerHTML = '';
    Object.entries(posiciones).forEach(([key, pos]) => {
      const labelInput = el('input', { value: pos.label, style: 'font-weight:700; max-width:260px;' });
      labelInput.addEventListener('input', () => (pos.label = labelInput.value));

      const sumEl = el('span', { class: 'badge badge-gray' }, '');
      function updateSum() {
        const sum = catKeys.reduce((s, c) => s + (Number(pos.weights[c]) || 0), 0);
        sumEl.textContent = `Suma: ${Math.round(sum * 100) / 100}`;
      }

      const weightInputs = catKeys.map((c) => {
        const inp = el('input', { type: 'number', step: '0.05', min: '0', max: '1', value: pos.weights[c] ?? 0 });
        inp.addEventListener('input', () => { pos.weights[c] = Number(inp.value); updateSum(); });
        return el('div', { class: 'field' }, [el('label', {}, CATEGORIAS[c]), inp]);
      });

      updateSum();

      listWrap.appendChild(
        el('div', { class: 'card', style: 'box-shadow:none;' }, [
          el('div', { class: 'flex-between' }, [
            labelInput,
            el('div', { class: 'flex gap-8' }, [
              sumEl,
              el('button', {
                class: 'btn btn-danger btn-sm', type: 'button',
                onClick: () => { delete posiciones[key]; draw(); },
              }, 'Quitar posición'),
            ]),
          ]),
          el('div', { class: 'form-row mt-8' }, weightInputs),
        ])
      );
    });
  }
  draw();

  panel.appendChild(
    el('div', { class: 'flex gap-8 mt-16' }, [
      el('button', {
        class: 'btn btn-outline', type: 'button',
        onClick: () => {
          const key = 'pos_' + Date.now();
          posiciones[key] = { label: 'Nueva posición', weights: Object.fromEntries(catKeys.map((c) => [c, 0])) };
          draw();
        },
      }, '+ Agregar posición'),
      el('button', {
        class: 'btn btn-primary', type: 'button',
        onClick: async () => { await DB.setConfig('posiciones', posiciones); toast('Posiciones guardadas', 'success'); },
      }, 'Guardar cambios'),
    ])
  );
}

/* ---------------- Baremos ---------------- */
async function buildBaremos(panel) {
  let baremos = (await DB.getConfig('baremos'))?.value || BAREMOS_SEED;
  baremos = JSON.parse(JSON.stringify(baremos));

  const select = el('select', {}, Object.entries(baremos).map(([k, b]) => el('option', { value: k }, b.label)));
  panel.appendChild(el('div', { class: 'field', style: 'max-width:400px;' }, [el('label', {}, 'Prueba física'), select]));

  const gridHost = el('div', { class: 'table-wrap mt-16' });
  panel.appendChild(gridHost);

  function drawGrid() {
    const key = select.value;
    const baremo = baremos[key];
    gridHost.innerHTML = '';
    if (baremo.estimated) {
      gridHost.appendChild(el('p', { class: 'badge badge-amber' }, 'Tabla estimada — se recomienda calibrar con datos reales del club.'));
    }
    const table = el('table');
    const thead = el('thead', {}, el('tr', {}, [el('th', {}, 'Puntos'), ...baremo.table.ages.map((a) => el('th', {}, `${a} años`))]));
    table.appendChild(thead);
    const tbody = el('tbody');
    baremo.table.points.forEach((pt, rowIdx) => {
      const cells = baremo.table.ages.map((age) => {
        const input = el('input', { type: 'number', step: 'any', value: baremo.table.values[age][rowIdx], style: 'width:80px;' });
        input.addEventListener('input', () => { baremo.table.values[age][rowIdx] = Number(input.value); });
        return el('td', {}, input);
      });
      tbody.appendChild(el('tr', {}, [el('td', {}, el('strong', {}, String(pt))), ...cells]));
    });
    table.appendChild(tbody);
    gridHost.appendChild(table);
  }
  select.addEventListener('change', drawGrid);
  drawGrid();

  panel.appendChild(
    el('div', { class: 'flex gap-8 mt-16' }, [
      el('button', {
        class: 'btn btn-primary', type: 'button',
        onClick: async () => { await DB.setConfig('baremos', baremos); toast('Baremos guardados', 'success'); },
      }, 'Guardar cambios de esta tabla'),
      el('button', {
        class: 'btn btn-outline', type: 'button',
        onClick: () => {
          if (confirmDialog('¿Restaurar todos los baremos a los valores originales del estudio del club?')) {
            baremos = JSON.parse(JSON.stringify(BAREMOS_SEED));
            drawGrid();
          }
        },
      }, 'Restaurar valores originales'),
    ])
  );
}
