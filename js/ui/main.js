// Hauptbildschirm einer Klasse – wie im Original: Namen, Optionen, Losen und Teams auf einer Seite.
// Nach dem Losen erscheint die Klassenansicht: nur die Teams, groß, ohne Niveau und Einstellungen.
import { h, button, iconButton, replaceKeepFocus } from './dom.js';
import { promptDialog, toast } from './dialogs.js';
import { activeClass, getState, update, replaceState } from '../store.js';
import { currentResult, presentCount } from '../model.js';
import { drawTeams } from '../actions.js';
import { session } from './session.js';
import { namesPanel, openAddNames } from './names-panel.js';
import { optionsPanel } from './options-panel.js';
import { resultsPanel, openHistory, playShuffle } from './results-panel.js';
import { openDraw, openOrder } from './draw.js';
import { fitGrid } from './fit.js';

export const title = 'Klasse';
export const needsClass = true;

const REPLACE_WINDOW = 10 * 60 * 1000; // „Neu losen“ innerhalb von 10 Minuten ersetzt den letzten Versuch
let root;

export function render() {
  root = h('div', { class: 'main-screen' });
  paint({ fresh: true });
  if (session.openAddNames) {
    session.openAddNames = false;
    queueMicrotask(() => openAddNames('type', paint));
  }
  return root;
}

export function leave() {
  document.documentElement.classList.remove('class-view-on');
}

export function onKey(e) {
  const k = e.key.toLowerCase();
  const hasResult = Boolean(currentResult(activeClass()));
  if (k === 'escape') {
    if (session.pickedPlayer) { session.pickedPlayer = null; paint(); return true; }
    if (session.view === 'class') { setView('edit'); return true; }
    if (session.namesMode !== 'present') { session.namesMode = 'present'; session.selected.clear(); paint(); return true; }
    return false;
  }
  if (k === ' ') { e.preventDefault(); go(); return true; }
  if (k === 'k' && hasResult) { setView(session.view === 'class' ? 'edit' : 'class'); return true; }
  if (k === 'z') { openDraw(); return true; }
  if (k === 'r') { openOrder(); return true; }
  if (k === 'v' && session.view === 'edit') { openHistory(paint); return true; }
  return false;
}

function setView(view) {
  session.view = view;
  session.pickedPlayer = null;
  if (view === 'edit') session.tab = 'teams';
  paint();
  scrollTo({ top: 0 });
}

function paint({ fresh = false } = {}) {
  const cls = activeClass();
  if (!cls || !root) return;
  const entry = currentResult(cls);
  const classView = session.view === 'class' && Boolean(entry);
  document.documentElement.classList.toggle('class-view-on', classView);

  if (classView) {
    replaceKeepFocus(root, h('div', { class: 'class-view' },
      h('div', { class: 'cv-bar' },
        h('h1', { class: 'cv-title', tabindex: '-1' }, cls.name),
        h('div', { class: 'cv-actions' },
          button('Neu losen', { icon: 'shuffle', variant: 'primary', onClick: go, 'data-key': 'cv-go', title: 'Neu losen (Leertaste)' }),
          button('Zufallsperson', { icon: 'dice', onClick: () => openDraw(), title: 'Zufallsperson (Z)' }),
          button('Reihenfolge', { icon: 'order', onClick: openOrder, title: 'Reihenfolge (R)' }),
          button('Einstellungen einblenden', { icon: 'gear', variant: 'quiet', onClick: () => setView('edit'), 'data-key': 'cv-edit', title: 'Namen, Niveau und Optionen zeigen (K oder Esc)' }))),
      resultsPanel(paint, { classView: true, fresh })));
    afterPaint(fresh, entry.teams.length, true);
    return;
  }

  const total = cls.players.length;
  const present = presentCount(cls);
  replaceKeepFocus(root, [
    h('div', { class: 'main-head' },
      h('div', { class: 'main-title' },
        h('h1', { tabindex: '-1' }, cls.name),
        iconButton('edit', 'Klasse umbenennen', { onClick: renameClass })),
      h('div', { class: 'main-actions' },
        button('Zufallsperson', { icon: 'dice', variant: 'quiet', onClick: () => openDraw(), disabled: !present, title: 'Zufallsperson (Z)' }),
        button('Reihenfolge', { icon: 'order', variant: 'quiet', onClick: openOrder, disabled: !present, title: 'Reihenfolge (R)' }),
        entry ? button('Verlauf', { icon: 'history', variant: 'quiet', onClick: () => openHistory(paint), title: 'Frühere Einteilungen (V)' }) : null,
        entry ? button('Drucken', { icon: 'print', variant: 'quiet', onClick: () => window.print(), title: 'Drucken oder als PDF sichern' }) : null,
        entry ? button('Klassenansicht', { icon: 'screen', onClick: () => setView('class'), title: 'Nur die Teams zeigen (K)' }) : null)),
    h('div', { class: 'view-tabs', role: 'tablist', 'aria-label': 'Ansicht' },
      tabButton('names', total ? `Namen ${present}/${total}` : 'Namen'),
      tabButton('teams', 'Teams')),
    h('div', { class: `main-grid show-${session.tab}` },
      h('div', { class: 'col-names' },
        namesPanel(paint),
        total ? h('div', { class: 'names-footer' }, button(entry ? 'Neu losen' : 'Teams losen', { icon: 'shuffle', variant: 'primary', onClick: go, disabled: !present, class: 'btn btn-primary btn-draw' })) : null),
      h('div', { class: 'col-teams' },
        optionsPanel(paint, go),
        resultsPanel(paint, { fresh }))),
  ]);
  afterPaint(fresh, entry?.teams.length || 0, false);
}

function tabButton(id, label) {
  return h('button', {
    type: 'button', role: 'tab', class: 'view-tab', 'aria-selected': String(session.tab === id), 'data-key': `tab-${id}`,
    onClick: () => { session.tab = id; paint(); },
  }, label);
}

function afterPaint(fresh, k, classView) {
  const grid = root.querySelector('.team-grid');
  const animate = fresh && session.playAnimation;
  if (animate) session.playAnimation = false;
  requestAnimationFrame(() => {
    if (classView) fitGrid(grid, k);
    if (animate) playShuffle(grid);
  });
}

addEventListener('resize', () => {
  if (root?.isConnected && session.view === 'class') {
    const entry = currentResult(activeClass());
    if (entry) fitGrid(root.querySelector('.cv-grid'), entry.teams.length);
  }
});

/** Losen: innerhalb von 10 Minuten nach dem letzten, unveränderten Ergebnis zählt es als „neuer Versuch“. */
function go() {
  const cls = activeClass();
  if (!presentCount(cls)) { toast('Niemand ist als anwesend markiert.'); return; }
  const last = cls.history[0];
  const replace = Boolean(last && last.id === cls.currentResultId && !last.edited && Date.now() - Date.parse(last.at) < REPLACE_WINDOW);
  const before = replace ? structuredClone(getState()) : null;
  const result = drawTeams({ replaceCurrent: replace });
  if (!result.teams.length) { toast(result.warnings[0]?.message || 'Losen nicht möglich.'); return; }
  session.view = 'class';
  session.tab = 'teams';
  paint({ fresh: true });
  if (replace) toast('Neu gelost.', { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } }, duration: 4000 });
}

async function renameClass() {
  const cls = activeClass();
  const name = await promptDialog({
    title: 'Klasse umbenennen', label: 'Name der Klasse', value: cls.name,
    validate: (v) => {
      if (!v.trim()) return 'Bitte einen Namen eingeben.';
      if (getState().classes.some((c) => c.id !== cls.id && c.name.toLocaleLowerCase('de') === v.trim().toLocaleLowerCase('de'))) return 'Diesen Klassennamen gibt es schon.';
      return null;
    },
  });
  if (!name) return;
  update((s, c) => { c.name = name; });
  paint();
}
