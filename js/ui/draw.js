// Zufallsperson ziehen (Overlay, Teams bleiben unberührt).
import { h, button, segmented } from './dom.js';
import { icon } from './icons.js';
import { openDialog } from './dialogs.js';
import { activeClass, update, getState } from '../store.js';
import { absentIds, currentResult, drawPerson, remainingInDraw } from '../model.js';
import { shuffle } from '../teams/random.js';
import { groupLabel } from '../labels.js';

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
