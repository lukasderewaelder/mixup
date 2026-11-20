// Kleiner Helfer zum Bauen von DOM-Knoten. Text wird immer als textContent gesetzt
// (Namen sind Nutzereingaben – nie als HTML einfügen).
import { icon } from './icons.js';

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('--')) el.style.setProperty(key, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value' && 'value' in el) el.value = value;
    else if (key === 'checked' || key === 'disabled' || key === 'selected') el[key] = Boolean(value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Taste mit optionalem Symbol. variant: '', 'primary', 'quiet', 'danger'. */
export function button(label, { icon: iconName, variant = '', onClick, title, type = 'button', ...rest } = {}) {
  return h('button', { type, class: `btn ${variant ? `btn-${variant}` : ''}`.trim(), onClick, title, ...rest },
    iconName ? icon(iconName) : null, label ? h('span', {}, label) : null);
}

export function iconButton(iconName, label, { onClick, ...rest } = {}) {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onClick, ...rest }, icon(iconName, { size: 22 }));
}

/** Kopf eines Bildschirms: Überschrift + optionaler Einleitungssatz + Aktionen rechts. */
export function screenHead(title, lead, ...rawActions) {
  const actions = rawActions.filter(Boolean);
  return h('div', { class: 'screen-head' },
    h('div', { class: 'screen-head-text' }, h('h1', { tabindex: '-1' }, title), lead ? h('p', { class: 'lead' }, lead) : null),
    actions.length ? h('div', { class: 'screen-head-actions' }, actions) : null,
  );
}

/** Untere Leiste mit Zurück/Weiter (Links auf Hash-Routen). */
export function stepActions(back, next) {
  return h('div', { class: 'step-actions' },
    back ? h('a', { class: 'btn btn-quiet', href: back.href }, icon('back'), h('span', {}, back.label)) : h('span'),
    next instanceof Node ? next : next ? h('a',{ class: `btn btn-primary${next.disabled ? ' is-disabled' : ''}`, href: next.href, 'aria-disabled': next.disabled ? 'true' : null }, h('span', {}, next.label), icon('next')) : h('span'),
  );
}

/** Segment-Schalter (eine Auswahl aus wenigen). */
export function segmented(name, options, value, onChange, { label } = {}) {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    options.map((o) => h('label', { class: 'segment' },
      h('input', { type: 'radio', name, value: o.value, checked: o.value === value, onChange: () => onChange(o.value) }),
      h('span', {}, o.label),
    )));
}

/** Ein/Aus-Schalter mit Beschriftung und optionaler Erklärung. */
export function toggle(label, checked, onChange, { hint, disabled, id } = {}) {
  const inputId = id || `t-${Math.random().toString(36).slice(2, 8)}`;
  return h('label', { class: `toggle${disabled ? ' is-disabled' : ''}`, for: inputId },
    h('span', { class: 'toggle-text' }, h('span', { class: 'toggle-label' }, label), hint ? h('span', { class: 'toggle-hint' }, hint) : null),
    h('input', { type: 'checkbox', role: 'switch', id: inputId, checked, disabled, onChange: (e) => onChange(e.target.checked) }),
    h('span', { class: 'switch', 'aria-hidden': 'true' }),
  );
}

/** Ersetzt den Inhalt und stellt den Fokus wieder her (Elemente mit data-key). */
export function replaceKeepFocus(container, nodes) {
  const active = document.activeElement;
  const key = active && container.contains(active) ? active.dataset.key : null;
  container.replaceChildren(...[nodes].flat(Infinity).filter((n) => n != null && n !== false));
  if (key) container.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}

export function formatDate(iso, { time = false } = {}) {
  const d = new Date(iso);
  const opts = { day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  let s = d.toLocaleDateString('de-DE', opts);
  if (time) s += `, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
  return s;
}

/** Relative Datumsangabe für Übersichten: „heute“, „gestern“, „am 18. November“. */
export function relativeDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days === 0) return 'heute';
  if (days === 1) return 'gestern';
  return `am ${formatDate(iso)}`;
}
