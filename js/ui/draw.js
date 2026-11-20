// Zufallsperson ziehen und Reihenfolge auslosen (Overlays, Teams bleiben unberührt).
import { h, button, segmented } from './dom.js';
import { icon } from './icons.js';
import { openDialog } from './dialogs.js';
import { activeClass, update, getState } from '../store.js';
import { absentIds, currentResult, drawPerson, remainingInDraw, byName } from '../model.js';
import { shuffle } from '../teams/random.js';
import { groupLabel, groupColor } from '../labels.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !getState().settings.animation;

function presentIdsFor(cls) {
  const absent = absentIds(cls);
  return cls.players.filter((p) => !absent.has(p.id)).map((p) => p.id);
}

function currentTeams(cls) {
  const res = currentResult(cls);
  if (!res) return [];
  const present = new Set(presentIdsFor(cls));
  return res.teams.map((t) => t.filter((id) => present.has(id)));
}

export function openDraw({ team = null } = {}) {
  const cls = activeClass();
  if (!cls) return;
  const nameOf = (id) => cls.players.find((p) => p.id === id)?.name ?? '';
  const teams = currentTeams(cls);
  let source = team != null && teams[team] ? String(team) : 'all';
  let busy = false;

  const pool = () => (source === 'all' ? presentIdsFor(cls) : teams[Number(source)] || []);
  const nameEl = h('p', { class: 'draw-name', 'aria-live': 'assertive' }, 'Bereit?');
  const subEl = h('p', { class: 'draw-sub' });
  const resetBtn = button('Zurücksetzen', { icon: 'reset', variant: 'quiet', onClick: () => {
    update((s, c) => { c.draw.drawn = c.draw.drawn.filter((id) => !pool().includes(id)); }, { dataChange: false });
    nameEl.textContent = 'Bereit?';
    nameEl.classList.remove('is-final');
    refresh();
  } });
  const drawBtn = button('Ziehen', { icon: 'dice', variant: 'primary', onClick: () => go() });
  drawBtn.classList.add('btn-draw');

  function refresh() {
    const p = pool();
    const mode = activeClass().draw.mode;
    resetBtn.hidden = mode !== 'noRepeat';
    if (!p.length) subEl.textContent = 'Niemand zum Ziehen da.';
    else if (mode === 'noRepeat') {
      const left = remainingInDraw(activeClass(), p);
      subEl.textContent = left === p.length ? `Alle ${p.length} sind im Topf.` : `Noch ${left} von ${p.length} im Topf.`;
    } else subEl.textContent = `Ziehen aus ${p.length} Personen, Wiederholung möglich.`;
    drawBtn.disabled = !p.length;
  }

  async function go() {
    if (busy || !pool().length) return;
    busy = true;
    const p = pool();
    const res = update((s, c) => drawPerson(c, p), { dataChange: false });
    nameEl.classList.remove('is-final');
    if (!reducedMotion() && p.length > 1) {
      const names = shuffle(p.map(nameOf));
      for (let i = 0, delay = 40; delay < 170; i++, delay *= 1.16) {
        nameEl.textContent = names[i % names.length];
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    nameEl.textContent = nameOf(res.id);
    nameEl.classList.add('is-final');
    if (res.newRound) subEl.textContent = 'Alle waren dran – eine neue Runde beginnt.';
    else refresh();
    busy = false;
  }

  const controls = h('div', { class: 'draw-controls' },
    segmented('draw-mode', [{ value: 'noRepeat', label: 'Jede Person einmal' }, { value: 'any', label: 'Immer aus allen' }], cls.draw.mode, (v) => {
      update((s, c) => { c.draw.mode = v; }, { dataChange: false });
      refresh();
    }, { label: 'Ziehen' }),
    teams.length ? h('label', { class: 'field field-inline' }, h('span', { class: 'field-label' }, 'Aus'),
      h('select', { class: 'input', onChange: (e) => { source = e.target.value; nameEl.textContent = 'Bereit?'; refresh(); } },
        h('option', { value: 'all', selected: source === 'all' }, 'allen Anwesenden'),
        teams.map((t, i) => h('option', { value: String(i), selected: source === String(i) }, groupLabel(i, cls.groupStyle))))) : null,
  );

  const dlg = openDialog({
    title: 'Zufallsperson',
    size: 'full',
    className: 'draw-dialog',
    body: [h('div', { class: 'draw-stage-big' }, nameEl, subEl), controls, h('div', { class: 'draw-buttons' }, resetBtn, drawBtn)],
  });
  dlg.dialog.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !['SELECT', 'INPUT', 'BUTTON'].includes(e.target.tagName)) { e.preventDefault(); go(); }
  });
  drawBtn.focus();
  refresh();
}

/** Reihenfolge auslosen: Teams (falls vorhanden) oder alle Anwesenden. */
export function openOrder() {
  const cls = activeClass();
  if (!cls) return;
  const settings = getState().settings;
  const teams = currentTeams(cls);
  let kind = teams.length ? 'teams' : 'people';
  const list = h('ol', { class: 'order-list' });

  function roll() {
    if (kind === 'teams') {
      const order = shuffle(teams.map((_, i) => i));
      list.replaceChildren(...order.map((t) => h('li', { class: 'order-item', '--c': `var(--team-${groupColor(t, cls.groupStyle) + 1})` },
        h('span', { class: 'order-dot' }), h('span', { class: 'order-team' }, groupLabel(t, cls.groupStyle)),
        h('span', { class: 'order-members' }, teams[t].map((id) => cls.players.find((p) => p.id === id)?.name).sort(byName).join(', ')))));
    } else {
      const ids = shuffle(presentIdsFor(cls));
      list.replaceChildren(...ids.map((id) => h('li', { class: 'order-item' }, h('span', { class: 'order-team' }, cls.players.find((p) => p.id === id).name))));
    }
    if (!reducedMotion()) {
      list.querySelectorAll('li').forEach((li, i) => li.animate(
        [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, delay: Math.min(i * 30, 600), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    }
  }

  const head = teams.length ? segmented('order-kind', [{ value: 'teams', label: 'Teams' }, { value: 'people', label: 'Alle Personen' }], kind, (v) => { kind = v; roll(); }, { label: 'Was auslosen?' }) : null;
  openDialog({
    title: 'Reihenfolge',
    size: 'wide',
    className: 'order-dialog',
    body: [head, list],
    actions: [{ label: 'Neu auslosen', icon: 'shuffle', variant: 'primary', onClick: () => { roll(); return false; } }],
  });
  roll();
}
