// Alles passt auf einen Bildschirm (iPad/PC): Teamkarten und Namensliste werden so angeordnet,
// dass nie gescrollt werden muss.

/** iPad (quer und hoch) und PC: Hauptbildschirm ohne Scrollen. Telefone scrollen weiter. */
const FIT_MQ = matchMedia('(min-width: 700px) and (min-height: 600px)');
export const isFitLayout = () => FIT_MQ.matches;
export const onFitChange = (fn) => FIT_MQ.addEventListener('change', fn);

/**
 * Größte Schrift finden, bei der alle Teamkarten ohne Scrollen und ohne Namensumbruch passen.
 * Spaltenzahl wird mitgesucht. Das Raster braucht eine feste Höhe (CSS) und nutzt --fs / --cols.
 * @param {number} [max]  größte Schrift in px (Klassenansicht groß, Bearbeiten-Ansicht kleiner)
 */
export function fitGrid(grid, k, { max = 110 } = {}) {
  if (!grid?.isConnected || !k) return;
  const avail = grid.clientHeight;
  if (!avail) return;
  // Namen der Personen dürfen nie umbrechen; Gruppentitel dürfen zwischen Wörtern umbrechen,
  // aber kein einzelnes Wort darf über den Rand ragen.
  const lines = [...grid.querySelectorAll('.member, .team-title')];
  const fits = () => grid.scrollHeight <= avail + 1 && lines.every((el) => el.scrollWidth <= el.clientWidth + 1);
  let best = { cols: Math.min(k, 3), size: 12 };
  for (let cols = 1; cols <= Math.min(k, 6); cols++) {
    grid.style.setProperty('--cols', cols);
    let lo = 11, hi = max + 1;
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

const ROW_H = 48;      // Zeilenhöhe der Namensliste (≥ 44 px Tippfläche)
const COL_W_ONE = 300; // eine Spalte: breit, mit ›
const COL_W = 196;     // mehrere Spalten: schmaler, ohne ›

/** Namensliste in so viele Spalten legen, dass alle Namen ohne Scrollen sichtbar sind. */
export function fitNames(list) {
  if (!list?.isConnected) return;
  const rows = [...list.children];
  const n = rows.length;
  list.classList.remove('is-cols', 'is-multi');
  list.style.removeProperty('--rows');
  list.style.removeProperty('--col-w');
  if (!n) return;
  const avail = list.clientHeight - 2; // Platz bis zum unteren Rand (Liste ist hier flex: 1)
  const perCol = Math.max(1, Math.floor(avail / ROW_H));
  const cols = Math.ceil(n / perCol);
  const used = Math.ceil(n / cols); // Zeilen gleichmäßig verteilen
  list.style.setProperty('--rows', used);
  list.style.setProperty('--row-h', `${ROW_H}px`);
  list.style.setProperty('--col-w', `${cols === 1 ? COL_W_ONE : COL_W}px`);
  list.classList.add('is-cols');
  list.classList.toggle('is-multi', cols > 1);
  rows.forEach((li, i) => {
    li.classList.toggle('is-col-end', i % used === used - 1 || i === n - 1);
    li.classList.toggle('is-last-col', Math.floor(i / used) === cols - 1);
  });
  return { cols, rows: used };
}
