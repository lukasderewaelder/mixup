// Namen per Drag-and-Drop zwischen Teamkarten verschieben (Maus, Stift und Finger).
// Der gegriffene Name hebt sich ab und wandert in Teamfarbe mit; sein Platz bleibt gestrichelt frei.
// Loslassen auf einem Namen in einem anderen Team = tauschen, auf einer anderen Karte = verschieben.
import { h } from './dom.js';

const MOVE_PX = 6;      // ab dieser Bewegung beginnt das Ziehen
const HOLD_MS = 260;    // Telefon (Seite scrollt): erst kurz halten, dann ziehen

/**
 * @param {HTMLElement} grid  Raster mit .team-card[data-team] und button.member (li[data-id])
 * @param {{onSwap:(a:string,b:string)=>void, onMove:(id:string,team:number)=>void, immediate:boolean}} o
 *        immediate: Finger zieht sofort (Ansicht scrollt nicht); sonst erst nach kurzem Halten
 */
export function enableDrag(grid, { onSwap, onMove, immediate }) {
  let st = null;          // aktueller Zug
  let suppressClick = false;

  grid.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('button.member');
    if (!el || !grid.contains(el) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const li = el.closest('li[data-id]');
    const card = el.closest('.team-card');
    if (!li || !card) return;
    const r = el.getBoundingClientRect();
    st = {
      id: li.dataset.id, el, card, team: Number(card.dataset.team), pointerId: e.pointerId,
      x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top,
      active: false, ready: immediate || e.pointerType !== 'touch', timer: null, target: null,
    };
    if (!st.ready) st.timer = setTimeout(() => { if (st) { st.ready = true; activate(e.clientX, e.clientY); } }, HOLD_MS);
    addEventListener('pointermove', onMoveEvt, { passive: false });
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', cancel);
  });

  // iOS: Scrollen unterdrücken, solange gezogen wird
  grid.addEventListener('touchmove', (e) => { if (st?.active) e.preventDefault(); }, { passive: false });
  grid.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  grid.addEventListener('contextmenu', (e) => { if (st) e.preventDefault(); });

  function onMoveEvt(e) {
    if (!st || e.pointerId !== st.pointerId) return;
    const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
    if (!st.active) {
      if (!st.ready) { if (dist > MOVE_PX * 1.5) cancel(); return; } // Finger will scrollen
      if (dist < MOVE_PX) return;
      activate(e.clientX, e.clientY);
    }
    e.preventDefault();
    place(e.clientX, e.clientY);
    findTarget(e.clientX, e.clientY);
  }

  function activate(x, y) {
    if (!st || st.active) return;
    st.active = true;
    const cs = getComputedStyle(st.el);
    const cardCs = getComputedStyle(st.card);
    st.ghost = h('div', {
      class: 'drag-ghost', 'aria-hidden': 'true',
      style: { width: `${st.el.offsetWidth}px`, height: `${st.el.offsetHeight}px`, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, padding: cs.padding },
      '--c': cardCs.getPropertyValue('--c'),
    }, st.el.textContent);
    document.body.append(st.ghost);
    st.el.classList.add('is-lifted');
    grid.classList.add('is-dragging');
    navigator.vibrate?.(8);
    place(x, y);
  }

  function place(x, y) {
    st.ghost.style.transform = `translate(${x - st.dx}px, ${y - st.dy}px) rotate(-3deg) scale(1.08)`;
  }

  function findTarget(x, y) {
    const hit = document.elementFromPoint(x, y);
    const card = hit?.closest?.('.team-card');
    const member = hit?.closest?.('button.member');
    let target = null;
    if (card && grid.contains(card) && Number(card.dataset.team) !== st.team) {
      const otherId = member?.closest('li[data-id]')?.dataset.id;
      target = otherId ? { swap: otherId, el: member, card } : { move: Number(card.dataset.team), card };
    }
    if (st.target?.card !== target?.card || st.target?.el !== target?.el) {
      st.target?.card.classList.remove('is-drop');
      st.target?.el?.classList.remove('is-drop-swap');
      target?.card.classList.add('is-drop');
      target?.el?.classList.add('is-drop-swap');
    }
    st.target = target;
  }

  function onUp(e) {
    if (!st || e.pointerId !== st.pointerId) return;
    const { active, target, id } = st;
    if (active) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 60);
    }
    cleanup();
    if (!active || !target) return;
    if (target.swap) onSwap(id, target.swap);
    else onMove(id, target.move);
  }

  function cancel() { cleanup(); }

  function cleanup() {
    if (!st) return;
    clearTimeout(st.timer);
    st.ghost?.remove();
    st.el.classList.remove('is-lifted');
    st.target?.card.classList.remove('is-drop');
    st.target?.el?.classList.remove('is-drop-swap');
    grid.classList.remove('is-dragging');
    removeEventListener('pointermove', onMoveEvt);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', cancel);
    st = null;
  }
}
