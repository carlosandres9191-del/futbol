/* ============================================================
   views/players.js — Listado y formulario (alta/edición) de
   jugadores, incluyendo carga de foto.
   ============================================================ */

import { DB } from '../db.js';
import {
  el, calcAge, formatDate, fileToBase64, initials, toast,
  navigate, confirmDialog, debounce,
} from '../utils.js';

export async function renderPlayersList(container) {
  const [players, posicionesCfg, edadesCfg] = await Promise.all([
    DB.getAllPlayers(),
    DB.getConfig('posiciones'),
    DB.getConfig('categoriasEdad'),
  ]);
  const posiciones = posicionesCfg?.value || {};
  const edades = edadesCfg?.value || [];

  const card = el('div', { class: 'card' });
  const header = el('div', { class: 'card-header' }, [
    el('h2', {}, `Jugadores (${players.length})`),
    el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Nuevo jugador'),
  ]);

  const searchInput = el('input', {
    type: 'search',
    placeholder: 'Buscar por nombre o apellido…',
    class: 'searchbar',
  });
  const catSelect = el('select', {}, [
    el('option', { value: '' }, 'Todas las categorías'),
    ...edades.map((c) => el('option', { value: c.key }, c.label)),
  ]);
  const posSelect = el('select', {}, [
    el('option', { value: '' }, 'Todas las posiciones'),
    ...Object.entries(posiciones).map(([k, p]) => el('option', { value: k }, p.label)),
  ]);

  const filters = el('div', { class: 'form-row', style: 'margin-bottom:16px;' }, [
    el('div', {}, [searchInput]),
    catSelect,
    posSelect,
  ]);

  const grid = el('div', { class: 'player-grid' });

  function draw() {
    const q = (searchInput.value || '').toLowerCase();
    const fc = catSelect.value || '';
    const fp = posSelect.value || '';

    const filtered = players.filter((p) => {
      const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase();
      if (q && !nombre.includes(q)) return false;
      if (fc && p.categoriaEdad !== fc) return false;
      if (fp && p.posicionPrincipal !== fp) return false;
      return true;
    });

    grid.innerHTML = '';
    if (!filtered.length) {
      grid.appendChild(
        el('div', { class: 'empty-state' }, [
          el('div', { class: 'icon' }, '🧑‍🤝‍🧑'),
          el('p', {}, players.length ? 'Ningún jugador coincide con el filtro.' : 'Aún no has registrado jugadores.'),
          !players.length
            ? el('button', { class: 'btn btn-primary', onClick: () => navigate('/jugadores/nuevo') }, '+ Registrar el primero')
            : null,
        ])
      );
      return;
    }

    filtered
      .sort((a, b) => `${a.apellidos}${a.nombres}`.localeCompare(`${b.apellidos}${b.nombres}`))
      .forEach((p) => {
        const age = calcAge(p.fechaNacimiento);
        const posLabel = posiciones[p.posicionPrincipal]?.label || 'Sin posición';
        grid.appendChild(
          el('div', { class: 'player-card', onClick: () => navigate(`/jugadores/${p.id}`) }, [
            p.fotoBase64
              ? el('img', { class: 'avatar', src: p.fotoBase64, alt: p.nombres })
              : el('div', { class: 'avatar' }, initials(p.nombres, p.apellidos)),
            el('div', { class: 'player-name' }, `${p.nombres || ''} ${p.apellidos || ''}`),
            el('div', { class: 'player-meta' }, [age !== null ? `${age} años · ` : '', posLabel]),
            el('div', { class: 'profile-tags' }, [
              p.club ? el('span', { class: 'badge badge-gray' }, p.club) : null,
              p.estado === 'inactivo' ? el('span', { class: 'badge badge-red' }, 'Inactivo') : el('span', { class: 'badge badge-green' }, 'Activo'),
            ]),
          ])
        );
      });
  }

  card.append(header, filters, grid);
  container.appendChild(card);

  draw();
  searchInput.addEventListener('input', debounce(draw, 150));
  catSelect.addEventListener('change', draw);
  posSelect.addEventListener('change', draw);
}

export async function renderPlayerForm(container, playerId) {
  const isEdit = !!playerId;
  const [player, posicionesCfg, edadesCfg] = await Promise.all([
    isEdit ? DB.getPlayer(playerId) : Promise.resolve(null),
    DB.getConfig('posiciones'),
    DB.getConfig('categoriasEdad'),
  ]);
  const posiciones = posicionesCfg?.value || {};
  const edades = edadesCfg?.value || [];

  if (isEdit && !player) {
    container.appendChild(el('div', { class: 'card' }, 'Jugador no encontrado.'));
    return;
  }

  const p = player || {
    nombres: '', apellidos: '', fechaNacimiento: '', sexo: 'M', lateralidad: 'Derecho',
    gradoEscolar: '', categoriaEdad: '', posicionPrincipal: '', posicionesSecundarias: '',
    club: '', equipo: '', fechaIngreso: '', estado: 'activo', tutor: '', telefono: '', email: '',
    notas: '', fotoBase64: '',
  };

  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, isEdit ? 'Editar jugador' : 'Nuevo jugador'));

  const form = el('form', {});

  // Foto
  let fotoData = p.fotoBase64 || '';
  const avatarPreview = p.fotoBase64
    ? el('img', { class: 'avatar avatar-lg', src: p.fotoBase64, id: 'avatar-preview' })
    : el('div', { class: 'avatar avatar-lg', id: 'avatar-preview' }, initials(p.nombres, p.apellidos));

  const fotoInput = el('input', { type: 'file', accept: 'image/*', id: 'foto-input' });
  fotoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fotoData = await fileToBase64(file);
    const newPreview = el('img', { class: 'avatar avatar-lg', id: 'avatar-preview', src: fotoData });
    avatarPreview.replaceWith(newPreview);
  });

  form.appendChild(
    el('div', { class: 'flex gap-12', style: 'align-items:center; margin-bottom:18px;' }, [
      avatarPreview,
      el('div', {}, [
        el('label', {}, 'Foto del jugador'),
        fotoInput,
        el('div', { class: 'help-text' }, 'Se guarda en tu navegador (no se sube a ningún servidor).'),
      ]),
    ])
  );

  function field(id, labelText, inputEl) {
    return el('div', { class: 'field' }, [el('label', { for: id }, labelText), inputEl]);
  }

  const fsDatos = el('fieldset', {}, [el('legend', {}, 'Datos básicos')]);
  fsDatos.appendChild(
    el('div', { class: 'form-row' }, [
      field('nombres', 'Nombres *', el('input', { id: 'nombres', required: true, value: p.nombres })),
      field('apellidos', 'Apellidos *', el('input', { id: 'apellidos', required: true, value: p.apellidos })),
    ])
  );
  fsDatos.appendChild(
    el('div', { class: 'form-row' }, [
      field('fechaNacimiento', 'Fecha de nacimiento *', el('input', { id: 'fechaNacimiento', type: 'date', required: true, value: p.fechaNacimiento })),
      field('sexo', 'Sexo', el('select', { id: 'sexo' }, [
        el('option', { value: 'M', selected: p.sexo === 'M' }, 'Masculino'),
        el('option', { value: 'F', selected: p.sexo === 'F' }, 'Femenino'),
      ])),
      field('lateralidad', 'Lateralidad (pierna hábil)', el('select', { id: 'lateralidad' }, [
        el('option', { value: 'Derecho', selected: p.lateralidad === 'Derecho' }, 'Derecho'),
        el('option', { value: 'Izquierdo', selected: p.lateralidad === 'Izquierdo' }, 'Izquierdo'),
        el('option', { value: 'Ambidiestro', selected: p.lateralidad === 'Ambidiestro' }, 'Ambidiestro'),
      ])),
    ])
  );
  fsDatos.appendChild(
    el('div', { class: 'form-row' }, [
      field('gradoEscolar', 'Grado escolar', el('input', { id: 'gradoEscolar', value: p.gradoEscolar })),
      field('categoriaEdad', 'Categoría', el('select', { id: 'categoriaEdad' }, [
        el('option', { value: '' }, 'Auto (según edad)'),
        ...edades.map((c) => el('option', { value: c.key, selected: p.categoriaEdad === c.key }, c.label)),
      ])),
      field('estado', 'Estado', el('select', { id: 'estado' }, [
        el('option', { value: 'activo', selected: p.estado === 'activo' }, 'Activo'),
        el('option', { value: 'inactivo', selected: p.estado === 'inactivo' }, 'Inactivo'),
      ])),
    ])
  );
  form.appendChild(fsDatos);

  const fsClub = el('fieldset', {}, [el('legend', {}, 'Club y posición')]);
  fsClub.appendChild(
    el('div', { class: 'form-row' }, [
      field('club', 'Club / entidad deportiva', el('input', { id: 'club', value: p.club })),
      field('equipo', 'Equipo / plantel', el('input', { id: 'equipo', value: p.equipo })),
      field('fechaIngreso', 'Fecha de ingreso', el('input', { id: 'fechaIngreso', type: 'date', value: p.fechaIngreso })),
    ])
  );
  fsClub.appendChild(
    el('div', { class: 'form-row' }, [
      field('posicionPrincipal', 'Posición principal', el('select', { id: 'posicionPrincipal' }, [
        el('option', { value: '' }, 'Sin definir'),
        ...Object.entries(posiciones).map(([k, pos]) => el('option', { value: k, selected: p.posicionPrincipal === k }, pos.label)),
      ])),
      field('posicionesSecundarias', 'Posiciones secundarias (texto libre)', el('input', { id: 'posicionesSecundarias', value: p.posicionesSecundarias })),
    ])
  );
  form.appendChild(fsClub);

  const fsContacto = el('fieldset', {}, [el('legend', {}, 'Contacto / acudiente')]);
  fsContacto.appendChild(
    el('div', { class: 'form-row' }, [
      field('tutor', 'Nombre del acudiente', el('input', { id: 'tutor', value: p.tutor })),
      field('telefono', 'Teléfono', el('input', { id: 'telefono', value: p.telefono })),
      field('email', 'Correo electrónico', el('input', { id: 'email', type: 'email', value: p.email })),
    ])
  );
  fsContacto.appendChild(field('notas', 'Notas / observaciones generales', el('textarea', { id: 'notas', rows: 3 }, p.notas)));
  form.appendChild(fsContacto);

  const actions = el('div', { class: 'flex gap-12' }, [
    el('button', { type: 'submit', class: 'btn btn-primary' }, isEdit ? 'Guardar cambios' : 'Registrar jugador'),
    el('button', { type: 'button', class: 'btn btn-outline', onClick: () => history.back() }, 'Cancelar'),
  ]);

  if (isEdit) {
    actions.appendChild(
      el('button', {
        type: 'button',
        class: 'btn btn-danger',
        style: 'margin-left:auto;',
        onClick: async () => {
          if (confirmDialog(`¿Eliminar a ${p.nombres} ${p.apellidos}? Esto también borra sus evaluaciones, ficha médica y nutricional.`)) {
            await DB.deletePlayer(playerId);
            toast('Jugador eliminado', 'success');
            navigate('/jugadores');
          }
        },
      }, 'Eliminar jugador')
    );
  }
  form.appendChild(actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      ...(isEdit ? { id: playerId } : {}),
      nombres: document.getElementById('nombres').value.trim(),
      apellidos: document.getElementById('apellidos').value.trim(),
      fechaNacimiento: document.getElementById('fechaNacimiento').value,
      sexo: document.getElementById('sexo').value,
      lateralidad: document.getElementById('lateralidad').value,
      gradoEscolar: document.getElementById('gradoEscolar').value.trim(),
      categoriaEdad: document.getElementById('categoriaEdad').value,
      estado: document.getElementById('estado').value,
      club: document.getElementById('club').value.trim(),
      equipo: document.getElementById('equipo').value.trim(),
      fechaIngreso: document.getElementById('fechaIngreso').value,
      posicionPrincipal: document.getElementById('posicionPrincipal').value,
      posicionesSecundarias: document.getElementById('posicionesSecundarias').value.trim(),
      tutor: document.getElementById('tutor').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      email: document.getElementById('email').value.trim(),
      notas: document.getElementById('notas').value.trim(),
      fotoBase64: fotoData,
    };

    if (!data.nombres || !data.apellidos || !data.fechaNacimiento) {
      toast('Completa nombres, apellidos y fecha de nacimiento', 'error');
      return;
    }

    let saved;
    if (isEdit) saved = await DB.updatePlayer(data);
    else saved = await DB.addPlayer(data);

    toast(isEdit ? 'Jugador actualizado' : 'Jugador registrado', 'success');
    navigate(`/jugadores/${saved.id}`);
  });

  card.appendChild(form);
  container.appendChild(card);
}
