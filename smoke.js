const puppeteer = require('puppeteer');

const routes = [
  '/#/dashboard',
  '/#/jugadores',
  '/#/jugadores/nuevo',
  '/#/evaluaciones',
  '/#/medico',
  '/#/medico/nueva',
  '/#/nutricion',
  '/#/nutricion/nueva',
  '/#/reportes',
  '/#/configuracion',
  '/#/backup',
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));
  page.on('requestfailed', (req) => errors.push('[requestfailed] ' + req.url() + ' ' + (req.failure()?.errorText || '')));

  await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle0' });

  for (const r of routes) {
    await page.evaluate((route) => { window.location.hash = route.replace('/#','#'); }, r);
    await new Promise((res) => setTimeout(res, 400));
  }

  // Simular: crear un jugador y una evaluacion
  await page.evaluate(() => { window.location.hash = '#/jugadores/nuevo'; });
  await new Promise((res) => setTimeout(res, 300));
  await page.type('#nombres', 'Juan');
  await page.type('#apellidos', 'Pérez');
  await page.type('#fechaNacimiento', '2013-05-10');
  await page.click('button[type=submit]');
  await new Promise((res) => setTimeout(res, 500));

  const url = page.url();
  console.log('URL tras crear jugador:', url);

  await page.evaluate(() => { window.location.hash = '#/evaluaciones/nueva'; });
  await new Promise((res) => setTimeout(res, 400));
  const hasForm = await page.$('form');
  console.log('Formulario de evaluación presente:', !!hasForm);

  console.log('ERRORS FOUND:', errors.length);
  errors.slice(0, 40).forEach((e) => console.log(e));

  await browser.close();
})();
