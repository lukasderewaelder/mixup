// Ergebnis im Hauptbildschirm: Teamkarten, Regel-Hinweise, Tauschen/Verschieben (Antippen oder Ziehen),
// Verlauf, Animation „Mischen und Austeilen“.
import { h, button, formatDate, relativeDay } from './dom.js';
import { icon } from './icons.js';
import { openDialog, toast } from './dialogs.js';
import { activeClass, getState, update, replaceState } from '../store.js';
import { currentResult, movePlayer, swapPlayers } from '../model.js';
import { checkRules } from '../teams/algorithm.js';
import { groupLabel } from '../labels.js';
import { session } from './session.js';
import { teamCard, orderedMembers } from './team-card.js';
import { renameGroup, pickGroupColor } from './group-style.js';
import { MODE_LABEL } from './options-panel.js';
import { isFitLayout } from './fit.js';
import { enableDrag } from './drag.js';

/**
 * @param {() => void} refresh
 * @param {{classView?: boolean, fresh?: boolean}} o
 * @returns {Node|null}
 */
export function resultsPanel(refresh, { classView = false, fresh = false } = {}) {
  const cls = activeClass();
  const entry = currentResult(cls);
  if (!entry) {
    return classView ? null : h('section', { class: 'results-empty' },
      h('div', { class: 'empty-art', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('span', { '--c': `var(--team-${n})` }))),
      h('p', {}, 'Noch nicht gelost. Stelle oben ein, wie viele Teams entstehen sollen, und tippe auf „Teams losen“.'));
  }
  const settings = getState().settings;
  const style = cls.groupStyle;
  const teams = entry.teams.map((ids) => orderedMembers(ids, cls.players, settings));
  const k = teams.length;
  const picked = session.pickedPlayer;
  const nameOf = (id) => cls.players.find((p) => p.id === id)?.name;

  // Klassenansicht und iPad/PC: Schrift passt sich an (fitGrid), sonst normales Raster zum Scrollen
  const fitted = classView || isFitLayout();
  const grid = h('section', { class: `team-grid${fitted ? ' cv-grid' : ` cols-${Math.min(k, 4)}`}${fitted && !classView ? ' is-edit' : ''}${fresh ? ' is-fresh' : ''}`, 'aria-label': 'Teams' },
    teams.map((members, i) => teamCard(i, members, {
      style, interactive: true, picked,
      onPick: (id) => pick(id, refresh),
      onTeam: (t) => moveTo(t, refresh),
      onRename: (t) => renameGroup(t, refresh),
      onColor: (t) => pickGroupColor(t, refresh),
    })));
  enableDrag(grid, {
    immediate: fitted,
    onSwap: (a, b) => { session.pickedPlayer = null; swap(a, b, refresh); },
    onMove: (id, t) => { session.pickedPlayer = null; move(id, t, refresh); },
  });

  const pickHint = picked
    ? h('p', { class: 'pick-hint is-on', 'aria-live': 'polite' }, `${nameOf(picked)}: eine Person in einem anderen Team antippen zum Tauschen – oder „Hierher verschieben“. Esc bricht ab.`)
    : null;

  if (classView) return h('div', { class: 'cv-body' }, h('div', { class: 'print-head' }, h('strong', {}, cls.name), h('span', {}, `Teams vom ${formatDate(entry.at, { time: true })}`)), pickHint, grid);

  const lead = `${k === 1 ? '1 Team' : `${k} Teams`}, ${MODE_LABEL[entry.options.mode] || 'Zufällig'}, gelost ${relativeDay(entry.at)} um ${new Date(entry.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr${entry.edited ? ', von Hand angepasst' : ''}.`;
  return h('section', { class: 'results', 'aria-label': 'Ergebnis' },
    h('div', { class: 'print-head' }, h('strong', {}, cls.name), h('span', {}, `Teams vom ${formatDate(entry.at, { time: true })}`)),
    h('p', { class: 'results-lead' }, lead),
    warningsBox(entry),
    pickHint || h('p', { class: 'pick-hint' }, 'Namen in ein anderes Team ziehen oder antippen zum Tauschen und Verschieben · Name oder Zeichen einer Karte antippen zum Umbenennen oder Färben.'),
    grid);
}

function warningsBox(entry) {
  const list = entry.warnings || [];
  if (!list.length) return null;
  return h('aside', { class: 'notices', 'aria-label': 'Hinweise zu den Regeln' },
    list.map((w) => h('p', { class: 'notice' }, icon('alert', { size: 18 }), h('span', {}, w.message))));
}

// ---------- Verschieben und Tauschen ----------
function recheck(cls, entry) {
  const groups = entry.options.rulesEnabled ? cls.groups.filter((g) => g.enabled !== false) : [];
  entry.warnings = checkRules(entry.teams, { players: cls.players, groups, label: (i) => groupLabel(i, cls.groupStyle) });
}

function pick(id, refresh) {
  const current = session.pickedPlayer;
  if (!current || current === id) { session.pickedPlayer = current === id ? null : id; refresh(); return; }
  const entry = currentResult(activeClass());
  if (entry.teams.some((t) => t.includes(current) && t.includes(id))) { session.pickedPlayer = id; refresh(); return; }
  session.pickedPlayer = null;
  swap(current, id, refresh);
}

function moveTo(teamIndex, refresh) {
  const id = session.pickedPlayer;
  if (!id) return;
  session.pickedPlayer = null;
  move(id, teamIndex, refresh);
}

function swap(a, b, refresh) {
  const cls = activeClass();
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); swapPlayers(e, a, b); recheck(c, e); });
  refresh();
  const name = (x) => cls.players.find((p) => p.id === x)?.name;
  toast(`${name(a)} und ${name(b)} getauscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
}

function move(id, teamIndex, refresh) {
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); movePlayer(e, id, teamIndex); recheck(c, e); });
  refresh();
  const cls = activeClass();
  toast(`${cls.players.find((p) => p.id === id)?.name} ist jetzt in ${groupLabel(teamIndex, cls.groupStyle)}.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
}

// ---------- Verlauf ----------
export function openHistory(refresh) {
  const cls = activeClass();
  const dlg = openDialog({
    title: 'Verlauf',
    size: 'wide',
    body: [
      h('p', { class: 'muted' }, 'Die letzten zehn Einteilungen dieser Klasse. „Wiederholungen vermeiden“ berücksichtigt die drei neuesten.'),
      cls.history.length
        ? h('ol', { class: 'history-list' }, cls.history.map((e, i) => {
          const isCurrent = e.id === cls.currentResultId;
          const names = e.teams.map((t, ti) => `${groupLabel(ti, cls.groupStyle)}: ${t.map((id) => cls.players.find((p) => p.id === id)?.name).filter(Boolean).join(', ')}`);
          return h('li', { class: `history-item${isCurrent ? ' is-current' : ''}` },
            h('div', { class: 'history-text' },
              h('strong', {}, formatDate(e.at, { time: true })),
              h('span', { class: 'muted' }, `${e.teams.length} Teams, ${MODE_LABEL[e.options.mode] || 'Zufällig'}${e.edited ? ', angepasst' : ''}${i < 3 ? ', zählt fürs Gedächtnis' : ''}`),
              h('span', { class: 'history-teams' }, names.join(' · '))),
            isCurrent
              ? h('span', { class: 'badge' }, 'Wird angezeigt')
              : button('Anzeigen', { onClick: () => { update((s, c) => { c.currentResultId = e.id; }, { dataChange: false }); session.pickedPlayer = null; dlg.close(); refresh(); } }));
        }))
        : h('p', {}, 'Noch keine Einteilungen.'),
    ],
  });
}

// ---------- Animation „Mischen und Austeilen“ (~2 s, Antippen oder Taste überspringt) ----------
// Alle Namen fliegen zu einem Stapel in der Mitte, der Stapel wird gemischt, dann werden die Namen
// wie Karten reihum an die Teams ausgeteilt. Jede Karte hüpft kurz, wenn ein Name landet.
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const GATHER = 420, SHUFFLE = 480, FLY = 400;

export async function playShuffle(grid) {
  if (!grid || reducedMotion() || !getState().settings.animation) return;
  const cards = [...grid.querySelectorAll('.team-card')];
  const perTeam = cards.map((c) => [...c.querySelectorAll('.team-members li')]);
  const n = perTeam.reduce((sum, l) => sum + l.length, 0);
  if (!n) return;
  // Reihum austeilen: erstes Team, zweites Team, … dann die zweite Runde
  const deal = [];
  for (let round = 0; deal.length < n; round++) perTeam.forEach((l) => { if (l[round]) deal.push(l[round]); });

  grid.classList.add('is-shuffling');
  const rect = grid.getBoundingClientRect();
  const px = rect.left + rect.width / 2;
  const py = Math.min(rect.top + rect.height / 2, rect.top + (innerHeight - rect.top) / 2);
  const step = Math.max(24, Math.min(70, 1100 / n));
  const layer = h('div', { class: 'shuffle-layer', 'aria-hidden': 'true' });
  document.body.append(layer);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const flights = deal.map((li, i) => {
    const member = li.querySelector('.member');
    const target = member.getBoundingClientRect();
    const cs = getComputedStyle(member);
    const card = li.closest('.team-card');
    const chip = h('span', {
      class: 'shuffle-chip',
      style: { left: `${target.left}px`, top: `${target.top}px`, height: `${target.height}px`, fontSize: cs.fontSize, fontWeight: cs.fontWeight },
      '--c': getComputedStyle(card).getPropertyValue('--c'),
    }, member.textContent);
    layer.prepend(chip); // zuerst ausgeteilte Namen liegen oben auf dem Stapel
    const w = chip.offsetWidth || target.width;
    const to = (x, y) => `translate(${x - target.left - w / 2}px, ${y - target.top - target.height / 2}px)`;
    const a = Math.random() * Math.PI * 2;
    const far = Math.max(innerWidth, innerHeight) * rnd(0.35, 0.6);
    const tilt = rnd(-12, 12);
    const ox = rnd(-14, 14), oy = rnd(-10, 10);
    const side = i % 2 ? 1 : -1;
    const wait = GATHER + SHUFFLE + i * step;
    const total = wait + FLY;
    const o = (ms) => Math.min(1, ms / total);
    const midX = (px + target.left + target.width / 2) / 2;
    const midY = Math.min(py, target.top) - 60;
    const anim = chip.animate([
      { transform: `${to(px + Math.cos(a) * far, py + Math.sin(a) * far)} rotate(${tilt * 3}deg) scale(.7)`, opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: `${to(px + ox, py + oy)} rotate(${tilt}deg)`, opacity: 1, offset: o(GATHER), easing: 'ease-in-out' },
      { transform: `${to(px + ox + side * rnd(40, 90), py + oy - rnd(0, 18))} rotate(${-tilt}deg)`, opacity: 1, offset: o(GATHER + SHUFFLE * 0.45), easing: 'ease-in-out' },
      { transform: `${to(px + ox, py + oy)} rotate(${tilt}deg)`, opacity: 1, offset: o(GATHER + SHUFFLE), easing: 'linear' },
      { transform: `${to(px + ox, py + oy)} rotate(${tilt}deg)`, opacity: 1, offset: o(wait), easing: 'cubic-bezier(.3,.6,.4,1)' },
      { transform: `${to(midX, midY)} rotate(${tilt / 2}deg) scale(1.15)`, opacity: 1, offset: o(wait + FLY * 0.5), easing: 'cubic-bezier(.5,0,.7,.4)' },
      { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
    ], { duration: total, fill: 'both' });
    return anim.finished.then(() => land(li, chip, card), () => land(li, chip, card));
  });

  // Überspringen: Antippen oder Taste
  const skip = () => layer.getAnimations({ subtree: true }).forEach((a) => a.finish());
  addEventListener('pointerdown', skip, { once: true, capture: true });
  addEventListener('keydown', skip, { once: true, capture: true });
  await Promise.all(flights);
  removeEventListener('pointerdown', skip, { capture: true });
  removeEventListener('keydown', skip, { capture: true });
  grid.classList.remove('is-shuffling');
  layer.remove();
}

const bumping = new WeakSet();
function land(li, chip, card) {
  chip.remove();
  li.classList.add('is-landed');
  li.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  if (!bumping.has(card)) {
    bumping.add(card);
    card.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px) scale(1.012)' }, { transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' })
      .finished.finally(() => bumping.delete(card));
  }
}
