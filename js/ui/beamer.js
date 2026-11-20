// Beamer-Ansicht: nur Teamkarten, Vollbild, Schriftgröße passt sich dem Platz an.
import { h } from './dom.js';
import { icon } from './icons.js';
import { activeClass, getState } from '../store.js';
import { currentResult } from '../model.js';
import { teamCard, orderedMembers } from './team-card.js';

let current = null;

export function openBeamer() {
  const cls = activeClass();
  const entry = cls && currentResult(cls);
  if (!entry || current) return;
  const settings = getState().settings;
  const teams = entry.teams.map((ids) => orderedMembers(ids, cls.players, settings));

  const grid = h('div', { class: 'beamer-grid' }, teams.map((m, i) => teamCard(i, m, { settings })));
  const closeBtn = h('button', { type: 'button', class: 'beamer-close', 'aria-label': 'Beamer-Ansicht schließen', onClick: close }, icon('close', { size: 26 }));
  const el = h('div', { class: 'beamer', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Teams ${cls.name}`, tabindex: '-1' },
    h('div', { class: 'beamer-bar' }, h('span', { class: 'beamer-title' }, cls.name), closeBtn),
    grid);
  document.body.append(el);
  document.documentElement.classList.add('beamer-open');
  current = { el, grid, teams };

  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const onResize = () => fit();
  const onFs = () => { if (!document.fullscreenElement && !document.webkitFullscreenElement) close(); };
  document.addEventListener('keydown', onKey, true);
  addEventListener('resize', onResize);
  current.cleanup = () => {
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('webkitfullscreenchange', onFs);
  };

  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    Promise.resolve(req.call(el)).then(() => {
      document.addEventListener('fullscreenchange', onFs);
      document.addEventListener('webkitfullscreenchange', onFs);
    }).catch(() => { /* Vollbild nicht erlaubt: Overlay bleibt trotzdem */ });
  }
  el.focus();
  requestAnimationFrame(fit);
  setTimeout(fit, 350); // nach dem Wechsel in den Vollbildmodus erneut
}

function close() {
  if (!current) return;
  current.cleanup();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
  current.el.remove();
  document.documentElement.classList.remove('beamer-open');
  current = null;
}

/** Größte Schrift finden, bei der alle Teams ohne Scrollen passen (Spaltenzahl wird mitgesucht). */
function fit() {
  if (!current) return;
  const { grid, teams } = current;
  const k = teams.length;
  const avail = grid.clientHeight;
  // Namen werden nie umgebrochen – passt ein Name nicht in seine Karte, ist die Schrift zu groß.
  const lines = [...grid.querySelectorAll('.member, .team-name')];
  const fits = () => grid.scrollHeight <= avail + 1 && lines.every((el) => el.scrollWidth <= el.clientWidth + 1);
  let best = { cols: Math.min(k, 3), size: 12 };
  const maxCols = Math.min(k, 6);
  for (let cols = 1; cols <= maxCols; cols++) {
    grid.style.setProperty('--cols', cols);
    let lo = 11, hi = 110;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      grid.style.setProperty('--fs', `${mid}px`);
      if (fits()) lo = mid; else hi = mid;
    }
    if (lo > best.size) best = { cols, size: lo };
  }
  grid.style.setProperty('--cols', best.cols);
  grid.style.setProperty('--fs', `${best.size}px`);
}
