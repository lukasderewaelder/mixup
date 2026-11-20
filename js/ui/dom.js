// Kleiner Helfer zum Bauen von DOM-Knoten. Text wird immer als textContent gesetzt
// (Namen sind Nutzereingaben – nie als HTML einfügen).
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('--')) el.style.setProperty(key, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
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

/** Kopf eines Bildschirms: Überschrift + optionaler Einleitungssatz + Aktionen rechts. */
export function screenHead(title, lead, ...actions) {
  return h('div', { class: 'screen-head' },
    h('div', {}, h('h1', { tabindex: '-1' }, title), lead ? h('p', { class: 'lead' }, lead) : null),
    actions.length ? h('div', { class: 'screen-head-actions' }, actions) : null,
  );
}

/** Untere Leiste mit Zurück/Weiter. */
export function stepActions(back, next) {
  return h('div', { class: 'step-actions' },
    back ? h('a', { class: 'btn btn-quiet', href: back.href }, back.label) : h('span'),
    next ? h('a', { class: 'btn btn-primary', href: next.href }, next.label) : h('span'),
  );
}
