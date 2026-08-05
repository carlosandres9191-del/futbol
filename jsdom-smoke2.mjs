import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./index.html', 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost:8123/index.html', runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true });

global.window = dom.window;
global.document = dom.window.document;
try { Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true }); } catch {}
global.indexedDB = dom.window.indexedDB || global.indexedDB;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.FileReader = dom.window.FileReader;
global.Blob = dom.window.Blob;
global.URL = dom.window.URL;
dom.window.Chart = class { constructor(){} destroy(){} };

const errors = [];
dom.window.addEventListener('error', (e) => errors.push('[window error] ' + (e.error?.stack || e.message)));
process.on('unhandledRejection', (e) => errors.push('[unhandledRejection] ' + (e?.stack || e)));

await import('./js/app.js');
await new Promise((r) => setTimeout(r, 300));

function setHash(h) {
  dom.window.location.hash = '#' + h;
  dom.window.dispatchEvent(new dom.window.Event('hashchange'));
}
async function wait(ms=250){ await new Promise(r=>setTimeout(r,ms)); }

// 1) crear jugador
setHash('/jugadores/nuevo');
await wait(600);
document.getElementById('nombres').value = 'Juan';
document.getElementById('apellidos').value = 'Pérez';
document.getElementById('fechaNacimiento').value = '2013-05-10';
document.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
await wait(400);
console.log('Hash tras crear jugador:', dom.window.location.hash);

// 2) crear evaluacion para ese jugador
const playerId = dom.window.location.hash.split('/')[2];
setHash(`/evaluaciones/nueva?player=${playerId}`);
await wait(300);
const form = document.querySelector('form');
console.log('Formulario evaluación encontrado:', !!form);
if (form) {
  const talla = form.querySelector('#talla') || document.getElementById('talla');
  const peso = document.getElementById('peso');
  talla.value = 150; talla.dispatchEvent(new dom.window.Event('input', {bubbles:true}));
  peso.value = 42; peso.dispatchEvent(new dom.window.Event('input', {bubbles:true}));
  // llenar la primera prueba cuantitativa encontrada (fuerza abdominal)
  const numberInputs = [...form.querySelectorAll('input[type=number]')];
  console.log('Cantidad de inputs numéricos en el formulario:', numberInputs.length);
  numberInputs.forEach((inp, i) => { if (!inp.value) { inp.value = 20 + i; } });
  form.dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
  await wait(400);
  console.log('Hash tras guardar evaluación:', dom.window.location.hash);
}

// 3) ver perfil del jugador (radar/progreso/observaciones)
setHash(`/jugadores/${playerId}`);
await wait(400);
console.log('Contiene "Observaciones automáticas":', document.getElementById('app').innerHTML.includes('Observaciones automáticas'));
console.log('Contiene obs-box:', !!document.querySelector('.obs-box'));
console.log('Texto observaciones:', document.querySelector('.obs-box')?.textContent);

console.log('\nERRORES CAPTURADOS:', errors.length);
errors.forEach((e) => console.log(e));
