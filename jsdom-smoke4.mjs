import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('./index.html', 'utf-8');
const dom = new JSDOM(html, { url: 'http://localhost:8123/index.html', runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
try { Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true }); } catch {}
global.indexedDB = dom.window.indexedDB || global.indexedDB;
global.HTMLElement = dom.window.HTMLElement; global.CustomEvent = dom.window.CustomEvent;
global.FileReader = dom.window.FileReader; global.Blob = dom.window.Blob; global.URL = dom.window.URL;
dom.window.Chart = class { constructor(){} destroy(){} };
const errors = [];
dom.window.addEventListener('error', (e) => errors.push('[window error] ' + (e.error?.stack || e.message)));
process.on('unhandledRejection', (e) => errors.push('[unhandledRejection] ' + (e?.stack || e)));
await import('./js/app.js');
await new Promise(r=>setTimeout(r,300));
function setHash(h){ dom.window.location.hash = '#'+h; dom.window.dispatchEvent(new dom.window.Event('hashchange')); }
async function wait(ms=350){ await new Promise(r=>setTimeout(r,ms)); }

setHash('/jugadores/nuevo'); await wait(400);
document.getElementById('nombres').value='Test';
document.getElementById('apellidos').value='Player';
document.getElementById('fechaNacimiento').value='2012-01-01';
document.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles:true, cancelable:true}));
await wait(400);

setHash('/jugadores'); await wait(400);
console.log('Lista jugadores render len:', document.getElementById('app').innerHTML.length);

setHash('/evaluaciones'); await wait(400);
console.log('Lista evaluaciones render len:', document.getElementById('app').innerHTML.length);

setHash('/configuracion'); await wait(400);
const tabs = [...document.querySelectorAll('.tab-btn')];
console.log('Tabs configuracion:', tabs.map(t=>t.textContent));
// click en tab Baremos
const baremosTab = tabs.find(t=>t.textContent.includes('Baremos'));
baremosTab.dispatchEvent(new dom.window.Event('click', {bubbles:true}));
await wait(300);
const select = document.querySelector('select');
console.log('Select baremos options:', select ? [...select.options].map(o=>o.text) : null);
// cambiar de prueba en el selector
if (select) {
  select.value = select.options[2].value;
  select.dispatchEvent(new dom.window.Event('change', {bubbles:true}));
  await wait(200);
}
const saveBtns = [...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Guardar cambios de esta tabla'));
console.log('Boton guardar baremos encontrado:', saveBtns.length);
if (saveBtns[0]) { saveBtns[0].dispatchEvent(new dom.window.Event('click', {bubbles:true})); await wait(200); }

setHash('/backup'); await wait(400);
console.log('Backup render len:', document.getElementById('app').innerHTML.length);

console.log('\nERRORES CAPTURADOS:', errors.length);
errors.forEach(e=>console.log(e));
