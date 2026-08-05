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
await new Promise(r=>setTimeout(r,300));
function setHash(h){ dom.window.location.hash = '#'+h; dom.window.dispatchEvent(new dom.window.Event('hashchange')); }
async function wait(ms=350){ await new Promise(r=>setTimeout(r,ms)); }

// crear 2 jugadores
async function crearJugador(nombres, apellidos, fecha){
  setHash('/jugadores/nuevo'); await wait(400);
  document.getElementById('nombres').value = nombres;
  document.getElementById('apellidos').value = apellidos;
  document.getElementById('fechaNacimiento').value = fecha;
  document.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
  await wait(400);
  return dom.window.location.hash.split('/')[2];
}
const p1 = await crearJugador('Ana','Gómez','2012-02-15');
const p2 = await crearJugador('Luis','Ramírez','2013-08-01');
console.log('Jugadores creados:', p1, p2);

// evaluacion rapida para p1
setHash(`/evaluaciones/nueva?player=${p1}`); await wait(400);
document.getElementById('talla').value = 145; document.getElementById('talla').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
document.getElementById('peso').value = 38; document.getElementById('peso').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
[...document.querySelectorAll('input[type=number]')].forEach((inp,i)=>{ if(!inp.value) inp.value = 30+i; });
document.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
await wait(400);
console.log('Eval p1 guardada, hash:', dom.window.location.hash);

// registro medico
setHash(`/medico/nueva?player=${p1}`); await wait(400);
let form = document.querySelector('form');
console.log('Form medico presente:', !!form);
form.dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
await wait(400);
console.log('Medico guardado, hash:', dom.window.location.hash);

// registro nutricional
setHash(`/nutricion/nueva?player=${p1}`); await wait(400);
form = document.querySelector('form');
console.log('Form nutricion presente:', !!form);
document.getElementById('peso').value = 38;
document.getElementById('talla').value = 145;
form.dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
await wait(400);
console.log('Nutricion guardado, hash:', dom.window.location.hash);

// reportes
setHash('/reportes'); await wait(400);
console.log('Reportes render len:', document.getElementById('app').innerHTML.length);

// configuracion: cambiar nombre club y guardar
setHash('/configuracion'); await wait(400);
const nombreClubInput = document.getElementById('nombreClub');
console.log('Config nombreClub input presente:', !!nombreClubInput);
if (nombreClubInput) {
  nombreClubInput.value = 'Club de Prueba FC';
  const saveBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Guardar');
  saveBtn.dispatchEvent(new dom.window.Event('click', {bubbles:true}));
  await wait(300);
}

// backup export (solo probar que no truene la función DB.exportAll)
const appMod = await import('./js/db.js');
const backup = await appMod.DB.exportAll();
console.log('Backup players:', backup.players.length, 'evaluations:', backup.evaluations.length, 'medical:', backup.medical.length, 'nutrition:', backup.nutrition.length);

console.log('\nERRORES CAPTURADOS:', errors.length);
errors.forEach(e=>console.log(e));
