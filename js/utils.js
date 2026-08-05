/* ============================================================
   utils.js — funciones auxiliares reutilizables
   ============================================================ */

export function calcAge(fechaNacimientoISO, atDateISO = null) {
  if (!fechaNacimientoISO) return null;
  const born = new Date(fechaNacimientoISO);
  const at = atDateISO ? new Date(atDateISO) : new Date();
  let age = at.getFullYear() - born.getFullYear();
  const m = at.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < born.getDate())) age--;
  return age;
}

export function calcIMC(pesoKg, tallaCm) {
  if (!pesoKg || !tallaCm) return null;
  const tallaM = tallaCm / 100;
  const imc = pesoKg / (tallaM * tallaM);
  return Math.round(imc * 10) / 10;
}

// Clasificación aproximada de IMC infantil/juvenil (referencia orientativa,
// no diagnóstica). Ajustable desde Configuración.
export function clasificarIMC(imc) {
  if (imc == null) return '—';
  if (imc < 18.5) return 'Delgadez';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const BOOLEAN_ATTRS = new Set(['selected', 'required', 'checked', 'disabled', 'readonly', 'multiple']);

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (BOOLEAN_ATTRS.has(k)) {
      if (v) node.setAttribute(k, '');
    } else if (v !== undefined && v !== null) {
      node.setAttribute(k, v);
    }
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined || c === '') return;
    const isNode = typeof c === 'object' && typeof c.nodeType === 'number';
    node.appendChild(isNode ? c : document.createTextNode(String(c)));
  });
  return node;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function initials(nombres = '', apellidos = '') {
  const a = (nombres || '').trim().charAt(0);
  const b = (apellidos || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
}

export function toast(msg, type = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  host.appendChild(t);
  (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

export function confirmDialog(msg) {
  return window.confirm(msg);
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function navigate(path) {
  window.location.hash = path;
}

export function scoreColor(score) {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 8) return '#16a34a';
  if (score >= 6.5) return '#22c55e';
  if (score >= 5) return '#d97706';
  return '#dc2626';
}

export function scoreBarRow(label, value) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value * 10));
  const color = scoreColor(value);
  const row = el('div', { class: 'score-row' }, [
    el('div', { class: 'score-label' }, label),
    el('div', { class: 'score-track' }, [
      el('div', { class: 'score-fill', style: `width:${pct}%; background:${color};` }),
    ]),
    el('div', { class: 'score-value' }, value === null || value === undefined ? '—' : String(value)),
  ]);
  return row;
}
