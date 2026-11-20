import { h, button, iconButton, screenHead, relativeDay, replaceKeepFocus } from './dom.js';
import { icon } from './icons.js';
import { openDialog, promptDialog, confirmDialog, toast } from './dialogs.js';
import { getState, update, replaceState } from '../store.js';
import { createClass, duplicateClass, presentCount } from '../model.js';
import { drawTeams, createExampleClass } from '../actions.js';
import { resetStep1, session } from './session.js';
import { banners } from './banners.js';

export const title = 'Klassen';

let root;

export function render() {
  root = h('div', { class: 'start' });
  paint();
  return root;
}

function paint() {
  const { classes } = getState();
  const sorted = [...classes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  replaceKeepFocus(root, [
    screenHead('Klassen', classes.length ? 'Wähle eine Klasse oder lege eine neue an.' : null,
      classes.length ? button('Neue Klasse', { icon: 'plus', variant: 'primary', onClick: newClass }) : null),
    banners({ onChange: paint }),
    classes.length
      ? h('section', { class: 'class-grid', 'aria-label': 'Deine Klassen' }, sorted.map(classCard))
      : emptyState(),
  ]);
}

function emptyState() {
  return h('section', { class: 'empty empty-start' },
    h('div', { class: 'empty-art', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('span', { '--c': `var(--team-${n})` }))),
    h('h2', {}, 'Noch keine Klasse angelegt'),
    h('p', {}, 'Lege eine Klasse an und trage die Namen ein – tippen, als Liste einfügen oder aus einer Datei laden. Alles bleibt auf diesem Gerät.'),
    h('div', { class: 'button-row' },
      button('Neue Klasse anlegen', { icon: 'plus', variant: 'primary', onClick: newClass }),
      button('Mit Beispielklasse ausprobieren', { onClick: example }),
    ),
  );
}

function classCard(cls) {
  const total = cls.players.length;
  const present = presentCount(cls);
  const last = cls.history[0];
  const meta = [
    total === 1 ? '1 Person' : `${total} Personen`,
    present < total ? `${present} da` : null,
    cls.groups.length ? (cls.groups.length === 1 ? '1 Regel' : `${cls.groups.length} Regeln`) : null,
  ].filter(Boolean).join(', ');

  return h('article', { class: 'class-card' },
    h('header', { class: 'class-card-head' },
      h('h2', {}, h('a', { href: '#/klasse', class: 'class-link', onClick: (e) => { e.preventDefault(); open(cls.id); } }, cls.name)),
      iconButton('more', `${cls.name} verwalten`, { onClick: () => manage(cls) }),
    ),
    h('p', { class: 'class-meta' }, meta),
    h('p', { class: 'class-last' }, last ? `Zuletzt gelost ${relativeDay(last.at)}` : 'Noch nicht gelost'),
    h('div', { class: 'class-card-actions' },
      button('Öffnen', { onClick: () => open(cls.id) }),
      last && present
        ? button('Wie letztes Mal losen', { icon: 'bolt', variant: 'primary', onClick: () => quick(cls.id), title: 'Mit den zuletzt genutzten Einstellungen sofort losen' })
        : null,
    ),
  );
}

function open(id) {
  update((s) => { s.activeClassId = id; }, { dataChange: false });
  resetStep1();
  location.hash = '#/klasse';
}

function quick(id) {
  update((s) => { s.activeClassId = id; }, { dataChange: false });
  const result = drawTeams();
  if (!result.teams.length) { toast(result.warnings[0]?.message || 'Losen nicht möglich.'); return; }
  location.hash = '#/ergebnis';
}

const uniqueName = (exceptId) => (v) => {
  const name = v.trim();
  if (!name) return 'Bitte einen Namen eingeben.';
  if (getState().classes.some((c) => c.id !== exceptId && c.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) return 'Diesen Klassennamen gibt es schon.';
  return null;
};

async function newClass() {
  const name = await promptDialog({ title: 'Neue Klasse', label: 'Name der Klasse, z. B. „9a Chemie“', confirmLabel: 'Anlegen', validate: uniqueName(null) });
  if (!name) return;
  const cls = createClass(name);
  update((s) => { s.classes.push(cls); s.activeClassId = cls.id; });
  resetStep1();
  session.openAddNames = true;
  location.hash = '#/klasse';
}

function example() {
  const cls = createExampleClass(getState().classes.map((c) => c.name));
  update((s) => { s.classes.push(cls); });
  paint();
  toast('Beispielklasse mit 24 erfundenen Namen angelegt.');
}

function manage(cls) {
  const dlg = openDialog({
    title: cls.name,
    body: menuList([
      ['edit', 'Umbenennen', () => rename(cls)],
      ['select', 'Duplizieren', () => duplicate(cls)],
      ['trash', 'Löschen', () => remove(cls), 'danger'],
    ], () => dlg.close()),
  });
}

/** Liste großer Menütasten; schließt den Dialog vor der Aktion. */
export function menuList(items, close) {
  return h('div', { class: 'menu-list' }, items.map(([iconName, label, fn, tone]) =>
    h('button', { type: 'button', class: `menu-item${tone ? ` menu-item-${tone}` : ''}`, onClick: () => { close(); fn(); } }, icon(iconName), h('span', {}, label))));
}

async function rename(cls) {
  const name = await promptDialog({ title: 'Klasse umbenennen', label: 'Name der Klasse', value: cls.name, validate: uniqueName(cls.id) });
  if (!name) return;
  update((s) => { s.classes.find((c) => c.id === cls.id).name = name; });
  paint();
}

function duplicate(cls) {
  const copy = duplicateClass(cls, getState().classes.map((c) => c.name));
  update((s) => { s.classes.push(copy); });
  paint();
  toast(`„${copy.name}“ angelegt – mit Namen und Regeln, ohne Verlauf.`);
}

async function remove(cls) {
  const ok = await confirmDialog({
    title: `„${cls.name}“ löschen?`,
    text: `Die Klasse mit ${cls.players.length} Namen, allen Regeln und dem Verlauf wird entfernt.`,
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (!ok) return;
  const before = structuredClone(getState());
  update((s) => {
    s.classes = s.classes.filter((c) => c.id !== cls.id);
    if (s.activeClassId === cls.id) s.activeClassId = null;
  });
  paint();
  toast(`„${cls.name}“ gelöscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } }, duration: 8000 });
}
