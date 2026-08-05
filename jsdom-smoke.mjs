import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('./index.html', 'utf-8');
const dom = new JSDOM(html, {
  url: 'http://localhost:8123/index.html',
  runScripts: 'outside-only',
  resources: 'usable',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
try { Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true }); } catch {}
global.indexedDB = dom.window.indexedDB || global.indexedDB;
global.localStorage = { getItem(){return null}, setItem(){}, removeItem(){} };
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;
global.FileReader = dom.window.FileReader;
global.Blob = dom.window.Blob;
global.URL = dom.window.URL;
// Chart.js / XLSX not loaded via CDN in this environment - stub them
dom.window.Chart = class { constructor(){} destroy(){} };
dom.window.XLSX = undefined;

const errors = [];
dom.window.addEventListener('error', (e) => errors.push('[window error] ' + (e.error?.stack || e.message)));
process.on('unhandledRejection', (e) => errors.push('[unhandledRejection] ' + (e?.stack || e)));

const mod = await import('./js/app.js');

// dar tiempo a init() async
await new Promise((r) => setTimeout(r, 300));

const routes = ['/dashboard','/jugadores','/jugadores/nuevo','/evaluaciones','/evaluaciones/nueva','/medico','/medico/nueva','/nutricion','/nutricion/nueva','/reportes','/configuracion','/backup'];
for (const r of routes) {
  dom.window.location.hash = '#' + r;
  dom.window.dispatchEvent(new dom.window.Event('hashchange'));
  await new Promise((res) => setTimeout(res, 200));
  const title = document.getElementById('page-title')?.textContent;
  const bodyLen = document.getElementById('app')?.innerHTML.length || 0;
  console.log(`Ruta ${r} -> título="${title}" contenido=${bodyLen} chars`);
}

console.log('\nERRORES CAPTURADOS:', errors.length);
errors.forEach((e) => console.log(e));
