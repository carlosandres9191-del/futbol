/* ============================================================
   app.js — Punto de entrada, router hash-based y navegación
   ============================================================ */

import { DB } from './db.js';
import { seedIfEmpty } from './seed.js';
import { toast, navigate } from './utils.js';

import { renderDashboard } from './views/dashboard.js';
import { renderPlayersList, renderPlayerForm } from './views/players.js';
import { renderPlayerProfile } from './views/playerProfile.js';
import {
  renderEvaluationsList,
  renderEvaluationForm,
  renderEvaluationDetail,
} from './views/evaluation.js';
import { renderMedicalList, renderMedicalForm } from './views/medical.js';
import { renderNutritionList, renderNutritionForm } from './views/nutrition.js';
import { renderReports } from './views/reports.js';
import { renderSettings } from './views/settings.js';
import { renderBackup } from './views/importExport.js';

const app = document.getElementById('app');
const pageTitle = document.getElementById('page-title');
const nav = document.getElementById('main-nav');

const TITLES = {
  dashboard: 'Panel general',
  jugadores: 'Jugadores',
  evaluaciones: 'Evaluaciones físicas',
  medico: 'Ficha médica',
  nutricion: 'Ficha nutricional',
  reportes: 'Reportes',
  configuracion: 'Configuración',
  backup: 'Copia de seguridad',
};

function setActiveNav(section) {
  nav.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === section);
  });
  pageTitle.textContent = TITLES[section] || 'Futbol Analytics';
  document.title = `${TITLES[section] || ''} · Futbol Analytics`;
}

// Token de renderizado: evita que una navegación en curso (que aún espera
// datos de IndexedDB) sobrescriba a una navegación posterior más reciente,
// y evita duplicar contenido si el evento hashchange llega más de una vez.
let renderToken = 0;

async function router() {
  const myToken = ++renderToken;

  const rawHash = window.location.hash.replace(/^#/, '') || '/dashboard';
  const hash = rawHash.split('?')[0]; // separar la ruta de los parámetros de consulta (?player=...)
  const parts = hash.split('/').filter(Boolean);
  const section = parts[0] || 'dashboard';

  // Se construye en un contenedor separado (fuera del DOM visible) y sólo
  // se intercambia con el contenido real si esta sigue siendo la navegación
  // más reciente una vez resueltas las promesas.
  const buffer = document.createElement('div');
  setActiveNav(section);

  try {
    switch (section) {
      case 'dashboard':
        await renderDashboard(buffer);
        break;

      case 'jugadores':
        if (parts[1] === 'nuevo') await renderPlayerForm(buffer, null);
        else if (parts[2] === 'editar') await renderPlayerForm(buffer, parts[1]);
        else if (parts[1]) await renderPlayerProfile(buffer, parts[1]);
        else await renderPlayersList(buffer);
        break;

      case 'evaluaciones':
        if (parts[1] === 'nueva') await renderEvaluationForm(buffer, null, getQueryParam('player'));
        else if (parts[2] === 'editar') await renderEvaluationForm(buffer, parts[1], null);
        else if (parts[1]) await renderEvaluationDetail(buffer, parts[1]);
        else await renderEvaluationsList(buffer);
        break;

      case 'medico':
        if (parts[1] === 'nueva') await renderMedicalForm(buffer, null, getQueryParam('player'));
        else if (parts[2] === 'editar') await renderMedicalForm(buffer, parts[1], null);
        else await renderMedicalList(buffer);
        break;

      case 'nutricion':
        if (parts[1] === 'nueva') await renderNutritionForm(buffer, null, getQueryParam('player'));
        else if (parts[2] === 'editar') await renderNutritionForm(buffer, parts[1], null);
        else await renderNutritionList(buffer);
        break;

      case 'reportes':
        await renderReports(buffer);
        break;

      case 'configuracion':
        await renderSettings(buffer);
        break;

      case 'backup':
        await renderBackup(buffer);
        break;

      default:
        buffer.innerHTML = '<div class="card">Página no encontrada.</div>';
    }
  } catch (err) {
    console.error(err);
    buffer.innerHTML = `<div class="card"><h3>Ocurrió un error al cargar esta sección</h3><p class="muted">${err.message}</p></div>`;
  }

  // Si mientras se esperaban los datos el usuario navegó a otra ruta,
  // se descarta este resultado desactualizado.
  if (myToken !== renderToken) return;
  app.innerHTML = '';
  app.appendChild(buffer);
}

function getQueryParam(name) {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  return params.get(name);
}

async function init() {
  await seedIfEmpty(DB);

  const club = await DB.getConfig('clubInfo');
  if (club?.value?.nombreClub) {
    document.getElementById('club-name').textContent = club.value.nombreClub;
  }

  window.addEventListener('hashchange', router);
  router();

  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('quick-add-player').addEventListener('click', () => {
    navigate('/jugadores/nuevo');
  });

  nav.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });
}

window.futbolAnalytics = { DB, navigate, toast };

init();
