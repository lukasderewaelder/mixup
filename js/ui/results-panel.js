// Ergebnis im Hauptbildschirm: Teamkarten, Regel-Hinweise, Tauschen/Verschieben, Verlauf, Misch-Animation.
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

  const grid = h('section', { class: `team-grid${classView ? ' cv-grid' : ` cols-${Math.min(k, 4)}`}${fresh ? ' is-fresh' : ''}`, 'aria-label': 'Teams' },
    teams.map((members, i) => teamCard(i, members, {
      style, interactive: true, picked,
      onPick: (id) => pick(id, refresh),
      onTeam: (t) => moveTo(t, refresh),
      onRename: (t) => renameGroup(t, refresh),
      onColor: (t) => pickGroupColor(t, refresh),
    })));

  const pickHint = picked
    ? h('p', { class: 'pick-hint is-on', 'aria-live': 'polite' }, `${nameOf(picked)}: eine Person in einem anderen Team antippen zum Tauschen – oder „Hierher verschieben“. Esc bricht ab.`)
    : null;

  if (classView) return h('div', { class: 'cv-body' }, h('div', { class: 'print-head' }, h('strong', {}, cls.name), h('span', {}, `Teams vom ${formatDate(entry.at, { time: true })}`)), pickHint, grid);

  const lead = `${k === 1 ? '1 Team' : `${k} Teams`}, ${MODE_LABEL[entry.options.mode] || 'Zufällig'}, gelost ${relativeDay(entry.at)} um ${new Date(entry.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr${entry.edited ? ', von Hand angepasst' : ''}.`;
  return h('section', { class: 'results', 'aria-label': 'Ergebnis' },
    h('div', { class: 'print-head' }, h('strong', {}, cls.name), h('span', {}, `Teams vom ${formatDate(entry.at, { time: true })}`)),
    h('p', { class: 'results-lead' }, lead),
    warningsBox(entry),
    pickHint || h('p', { class: 'pick-hint' }, 'Person antippen zum Tauschen oder Verschieben · Name oder Zeichen einer Karte antippen zum Umbenennen oder Färben.'),
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
  const cls = activeClass();
  const entry = currentResult(cls);
  if (entry.teams.some((t) => t.includes(current) && t.includes(id))) { session.pickedPlayer = id; refresh(); return; }
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); swapPlayers(e, current, id); recheck(c, e); });
  session.pickedPlayer = null;
  refresh();
  const name = (x) => cls.players.find((p) => p.id === x)?.name;
  toast(`${name(current)} und ${name(id)} getauscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
}

function moveTo(teamIndex, refresh) {
  const id = session.pickedPlayer;
  if (!id) return;
  const before = structuredClone(getState());
  update((s, c) => { const e = currentResult(c); movePlayer(e, id, teamIndex); recheck(c, e); });
  session.pickedPlayer = null;
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

// ---------- Misch-Animation (~1,5 s) ----------
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function playShuffle(grid) {
  if (!grid || reducedMotion() || !getState().settings.animation) return;
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
    const member = li.querySelector('.member');
    const cs = getComputedStyle(member);
    const chip = h('span', { class: 'shuffle-chip', style: { left: `${target.left}px`, top: `${target.top}px`, height: `${target.height}px`, fontSize: cs.fontSize, fontWeight: cs.fontWeight } }, li.textContent);
    layer.append(chip);
    const color = getComputedStyle(li.closest('.team-card')).getPropertyValue('--c-ink').trim() || '#161b26';
    const [x1, y1] = spot();
    const [x2, y2] = spot();
    const d = (x, y) => `translate(${x - target.left - 40}px, ${y - target.top - target.height / 2}px)`;
    return chip.animate([
      { transform: `${d(x1, y1)} scale(.85)`, opacity: 0, background: '#ffffff', color: '#161b26' },
      { transform: `${d(x2, y2)} scale(1)`, opacity: 1, background: '#ffffff', color: '#161b26', offset: 0.42 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, background: 'rgba(255,255,255,0)', color, offset: 0.92 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, background: 'rgba(255,255,255,0)', color },
    ], { duration: 1200, delay: Math.min(i * 14, 320), easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'both' });
  });
  try { await Promise.all(animations.map((a) => a.finished)); } catch { /* abgebrochen */ }
  grid.classList.remove('is-shuffling');
  layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(() => layer.remove(), () => layer.remove());
}
