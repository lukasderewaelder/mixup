// Schritt 3: Ergebnis – Teamkarten, Hinweise, Verschieben/Tauschen, Werkzeuge.
import { h, button, screenHead, stepActions, replaceKeepFocus, formatDate, relativeDay } from './dom.js';
import { icon } from './icons.js';
import { openDialog, toast } from './dialogs.js';
import { activeClass, getState, update, replaceState } from '../store.js';
import { currentResult, movePlayer, swapPlayers } from '../model.js';
import { checkRules } from '../teams/algorithm.js';
import { drawTeams } from '../actions.js';
import { session } from './session.js';
import { teamCard, orderedMembers, teamLabel } from './team-card.js';
import { openDraw, openOrder } from './draw.js';
import { openBeamer } from './beamer.js';

export const title = 'Ergebnis';
export const step = 3;
export const needsClass = true;

const MODE_LABEL = { random: 'zufällig', balanced: 'ausgeglichen', equal: 'gleiches Niveau' };
let root;

let fresh = false;

export function render() {
  root = h('div', { class: 'step3' });
  fresh = true;
  paint();
  fresh = false;
  if (session.playAnimation) {
    session.playAnimation = false;
    const grid = root.querySelector('.team-grid');
    if (grid) requestAnimationFrame(() => playShuffle(grid));
  }
  return root;
}

export function onKey(e) {
  const k = e.key.toLowerCase();
  if (k === 'escape' && session.pickedPlayer) { session.pickedPlayer = null; paint(); return true; }
  if (k === ' ') { e.preventDefault(); reroll(); return true; }
  if (k === 'b') { openBeamer(); return true; }
  if (k === 'z') { openDraw(); return true; }
  if (k === 'r') { openOrder(); return true; }
  if (k === 'v') { openHistory(); return true; }
  return false;
}

function paint() {
  const cls = activeClass();
  if (!cls) return;
  const entry = currentResult(cls);
  const settings = getState().settings;

  if (!entry) {
    replaceKeepFocus(root, [
      screenHead('Teams', 'Noch nicht gelost.'),
      h('section', { class: 'empty' }, h('p', {}, 'Stelle in Schritt 2 ein, wie viele Teams entstehen sollen, und tippe auf „Teams losen“.'),
        h('a', { class: 'btn btn-primary', href: '#/einstellen' }, h('span', {}, 'Teams einstellen'), icon('next'))),
      stepActions({ href: '#/einstellen', label: 'Teams einstellen' }, null),
    ]);
    return;
  }

  const teams = entry.teams.map((ids) => orderedMembers(ids, cls.players, settings));
  const k = teams.length;
  const picked = session.pickedPlayer;
  const lead = `${k === 1 ? '1 Team' : `${k} Teams`}, ${MODE_LABEL[entry.options.mode] || 'zufällig'}, gelost ${relativeDay(entry.at)} um ${new Date(entry.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr${entry.edited ? ', von Hand angepasst' : ''}.`;

  replaceKeepFocus(root, [
    h('div', { class: 'print-head' }, h('strong', {}, cls.name), h('span', {}, `Teams vom ${formatDate(entry.at, { time: true })}`)),
    screenHead('Teams', lead),
    h('div', { class: 'toolbar toolbar-result' },
      button('Neu losen', { icon: 'shuffle', variant: 'primary', onClick: reroll, 'data-key': 'reroll', title: 'Neu losen (Leertaste)' }),
      button('Beamer', { icon: 'screen', onClick: () => openBeamer(), title: 'Vollbild für Tafel und Beamer (B)' }),
      button('Zufallsperson', { icon: 'dice', onClick: () => openDraw(), title: 'Eine Person ziehen (Z)' }),
      button('Reihenfolge', { icon: 'order', onClick: openOrder, title: 'Reihenfolge auslosen (R)' }),
      button('Drucken', { icon: 'print', onClick: () => window.print(), title: 'Drucken oder als PDF sichern' }),
      button('Verlauf', { icon: 'history', variant: 'quiet', onClick: openHistory, title: 'Frühere Einteilungen (V)' }),
    ),
    warningsBox(entry),
    h('p', { class: `pick-hint${picked ? ' is-on' : ''}`, 'aria-live': 'polite' },
      picked
        ? `${cls.players.find((p) => p.id === picked)?.name}: eine Person in einem anderen Team antippen zum Tauschen – oder „Hierher verschieben“. Esc bricht ab.`
        : 'Tipp: Eine Person antippen, um sie zu verschieben oder zu tauschen.'),
    h('section', { class: `team-grid cols-${Math.min(k, 4)}${fresh ? ' is-fresh' : ''}`, 'aria-label': 'Teams' },
      teams.map((members, i) => teamCard(i, members, { settings, interactive: true, picked, onPick: pick, onTeam: moveTo }))),
    stepActions({ href: '#/einstellen', label: 'Teams einstellen' }, null),
  ]);
}

function warningsBox(entry) {
  const list = entry.warnings || [];
  if (!list.length) return null;
  return h('aside', { class: 'notices', 'aria-label': 'Hinweise zu den Regeln' },
    list.map((w) => h('p', { class: 'notice' }, icon('alert', { size: 18 }), h('span', {}, w.message))));
}

// ---------- Neu losen ----------
function reroll() {
  const before = structuredClone(getState());
  const result = drawTeams({ replaceCurrent: true });
  if (!result.teams.length) { toast(result.warnings[0]?.message || 'Losen nicht möglich.'); return; }
  const old = root;
  old.replaceWith(render());
  toast('Neu gelost.', { action: { label: 'Rückgängig', onClick: () => { replaceState(before); session.pickedPlayer = null; paint(); } }, duration: 4000 });
}

// ---------- Verschieben und Tauschen ----------
function recheck(cls, entry) {
  const groups = entry.options.rulesEnabled ? cls.groups.filter((g) => g.enabled !== false) : [];
  entry.warnings = checkRules(entry.teams, { players: cls.players, groups });
}

function pick(id) {
  const current = session.pickedPlayer;
  if (!current) { session.pickedPlayer = id; paint(); return; }
  if (current === id) { session.pickedPlayer = null; paint(); return; }
  const cls = activeClass();
  const entry = currentResult(cls);
  const sameTeam = entry.teams.some((t) => t.includes(current) && t.includes(id));
  if (sameTeam) { session.pickedPlayer = id; paint(); return; }
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); swapPlayers(e, current, id); recheck(c, e); });
  session.pickedPlayer = null;
  paint();
  const name = (x) => cls.players.find((p) => p.id === x)?.name;
  toast(`${name(current)} und ${name(id)} getauscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } } });
}

function moveTo(teamIndex) {
  const id = session.pickedPlayer;
  if (!id) return;
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); movePlayer(e, id, teamIndex); recheck(c, e); });
  session.pickedPlayer = null;
  paint();
  const cls = activeClass();
  toast(`${cls.players.find((p) => p.id === id)?.name} ist jetzt in ${teamLabel(teamIndex, getState().settings)}.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } } });
}

// ---------- Verlauf ----------
function openHistory() {
  const cls = activeClass();
  const settings = getState().settings;
  const dlg = openDialog({
    title: 'Verlauf',
    size: 'wide',
    body: [
      h('p', { class: 'muted' }, 'Die letzten zehn Einteilungen dieser Klasse. „Wiederholungen vermeiden“ berücksichtigt die drei neuesten.'),
      cls.history.length
        ? h('ol', { class: 'history-list' }, cls.history.map((e, i) => {
          const isCurrent = e.id === cls.currentResultId;
          const names = e.teams.map((t, ti) => `${teamLabel(ti, settings)}: ${t.map((id) => cls.players.find((p) => p.id === id)?.name).filter(Boolean).join(', ')}`);
          return h('li', { class: `history-item${isCurrent ? ' is-current' : ''}` },
            h('div', { class: 'history-text' },
              h('strong', {}, formatDate(e.at, { time: true })),
              h('span', { class: 'muted' }, `${e.teams.length} Teams, ${MODE_LABEL[e.options.mode] || 'zufällig'}${e.edited ? ', angepasst' : ''}${i < 3 ? ', zählt fürs Gedächtnis' : ''}`),
              h('span', { class: 'history-teams' }, names.join(' · '))),
            isCurrent
              ? h('span', { class: 'badge' }, 'Wird angezeigt')
              : button('Anzeigen', { onClick: () => { update((s, c) => { c.currentResultId = e.id; }, { dataChange: false }); session.pickedPlayer = null; dlg.close(); paint(); } }));
        }))
        : h('p', {}, 'Noch keine Einteilungen.'),
    ],
  });
}

// ---------- Misch-Animation (~1,5 s) ----------
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

async function playShuffle(grid) {
  if (reducedMotion() || !getState().settings.animation) return;
  const items = [...grid.querySelectorAll('.team-members li')];
  if (!items.length) return;
  grid.classList.add('is-shuffling');
  const rect = grid.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = Math.min(rect.top + rect.height / 2, rect.top + (innerHeight - rect.top) / 2);
  const rx = Math.min(rect.width * 0.32, 340);
  const ry = Math.min(Math.max(rect.height, 200) * 0.28, 160);
  const layer = h('div', { class: 'shuffle-layer', 'aria-hidden': 'true' });
  document.body.append(layer);

  const spot = () => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  };

  const animations = items.map((li, i) => {
    const target = li.getBoundingClientRect();
    const chip = h('span', { class: 'shuffle-chip', style: { left: `${target.left}px`, top: `${target.top}px`, height: `${target.height}px` } }, li.textContent);
    layer.append(chip);
    const color = getComputedStyle(li.closest('.team-card')).getPropertyValue('--c').trim();
    const [x1, y1] = spot();
    const [x2, y2] = spot();
    const d = (x, y) => `translate(${x - target.left - 40}px, ${y - target.top - target.height / 2}px)`;
    return chip.animate([
      { transform: `${d(x1, y1)} scale(.85)`, opacity: 0, background: '#ffffff', color: '#161b26' },
      { transform: `${d(x2, y2)} scale(1)`, opacity: 1, background: '#ffffff', color: '#161b26', offset: 0.42 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, background: 'rgba(255,255,255,0)', color: color || '#161b26', offset: 0.92 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, background: 'rgba(255,255,255,0)', color: 'inherit' },
    ], { duration: 1200, delay: Math.min(i * 14, 320), easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'both' });
  });

  try { await Promise.all(animations.map((a) => a.finished)); } catch { /* abgebrochen */ }
  grid.classList.remove('is-shuffling');
  layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(() => layer.remove(), () => layer.remove());
}
