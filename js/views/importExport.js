/* ============================================================
   views/importExport.js — Copia de seguridad completa de la app
   (todo vive en IndexedDB del navegador; esto es la única forma
   de mover los datos a otro computador o navegador).
   ============================================================ */

import { DB } from '../db.js';
import { el, downloadJSON, toast, confirmDialog } from '../utils.js';

export async function renderBackup(container) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, 'Copia de seguridad'));
  card.appendChild(
    el('div', { class: 'obs-box', style: 'background:#fef3c7; border-color:#fde68a; color:#78350f;' }, [
      el('strong', {}, '⚠️ Importante: '),
      'toda la información de esta aplicación (jugadores, fotos, evaluaciones, fichas médicas y nutricionales) se guarda ',
      el('strong', {}, 'únicamente en este navegador, en este computador'),
      '. Si limpias los datos del navegador, cambias de equipo o de navegador, perderás la información salvo que tengas un respaldo. Se recomienda exportar un respaldo periódicamente (por ejemplo, después de cada jornada de evaluaciones).',
    ])
  );

  const stats = await getStats();
  card.appendChild(
    el('div', { class: 'grid grid-4 mt-16' }, [
      stat(stats.players, 'Jugadores'),
      stat(stats.evaluations, 'Evaluaciones'),
      stat(stats.medical, 'Registros médicos'),
      stat(stats.nutrition, 'Registros nutricionales'),
    ])
  );

  card.appendChild(el('hr', { class: 'divider' }));

  card.appendChild(el('h3', {}, 'Exportar respaldo'));
  card.appendChild(el('p', { class: 'help-text' }, 'Descarga un archivo .json con toda la información. Guárdalo en un lugar seguro (nube, USB, etc).'));
  card.appendChild(
    el('button', {
      class: 'btn btn-primary', onClick: async () => {
        const data = await DB.exportAll();
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJSON(data, `futbol-analytics-respaldo-${stamp}.json`);
        toast('Respaldo descargado', 'success');
      },
    }, '⬇️ Descargar respaldo completo (.json)')
  );

  card.appendChild(el('hr', { class: 'divider' }));

  card.appendChild(el('h3', {}, 'Restaurar / importar respaldo'));
  card.appendChild(el('p', { class: 'help-text' }, 'Selecciona un archivo .json exportado previamente desde esta misma aplicación.'));
  const modeSelect = el('select', { id: 'import-mode', style: 'max-width:320px;' }, [
    el('option', { value: 'merge' }, 'Combinar con los datos actuales'),
    el('option', { value: 'replace' }, 'Reemplazar todos los datos actuales'),
  ]);
  card.appendChild(el('div', { class: 'field', style: 'max-width:320px;' }, [el('label', {}, 'Modo de importación'), modeSelect]));

  const fileInput = el('input', { type: 'file', accept: 'application/json' });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const replace = modeSelect.value === 'replace';
    if (replace && !confirmDialog('Esto borrará todos los datos actuales y los reemplazará por los del archivo. ¿Continuar?')) {
      fileInput.value = '';
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._app !== 'futbol-analytics') {
        if (!confirmDialog('Este archivo no parece un respaldo de Futbol Analytics. ¿Intentar importarlo de todas formas?')) return;
      }
      await DB.importAll(data, { replace });
      toast('Datos importados correctamente', 'success');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error(err);
      toast('No se pudo leer el archivo: ' + err.message, 'error');
    }
  });
  card.appendChild(fileInput);

  card.appendChild(el('hr', { class: 'divider' }));

  card.appendChild(el('h3', {}, 'Zona de peligro'));
  card.appendChild(
    el('button', {
      class: 'btn btn-danger', onClick: async () => {
        if (confirmDialog('Esto elimina TODOS los jugadores, evaluaciones, fichas médicas, nutricionales y configuración. ¿Estás seguro? Esta acción no se puede deshacer.')) {
          await DB.wipeAll();
          toast('Todos los datos fueron eliminados', 'success');
          setTimeout(() => window.location.reload(), 600);
        }
      },
    }, '🗑️ Borrar todos los datos de la aplicación')
  );

  container.appendChild(card);
}

function stat(value, label) {
  return el('div', { class: 'stat-card' }, [el('div', { class: 'stat-value' }, String(value)), el('div', { class: 'stat-label' }, label)]);
}

async function getStats() {
  const [players, evaluations, medical, nutrition] = await Promise.all([
    DB.getAllPlayers(), DB.getAllEvaluations(), DB.getAllMedical(), DB.getAllNutrition(),
  ]);
  return { players: players.length, evaluations: evaluations.length, medical: medical.length, nutrition: nutrition.length };
}
