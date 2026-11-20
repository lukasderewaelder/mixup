// Größte Schrift finden, bei der alle Teamkarten ohne Scrollen und ohne Namensumbruch passen.
// Spaltenzahl wird mitgesucht. Das Raster braucht eine feste Höhe (CSS) und nutzt --fs / --cols.
export function fitGrid(grid, k) {
  if (!grid?.isConnected || !k) return;
  const avail = grid.clientHeight;
  if (!avail) return;
  // Nur die Namen der Personen begrenzen die Schrift; lange Gruppentitel werden mit „…“ gekürzt.
  const lines = [...grid.querySelectorAll('.member')];
  const fits = () => grid.scrollHeight <= avail + 1 && lines.every((el) => el.scrollWidth <= el.clientWidth + 1);
  let best = { cols: Math.min(k, 3), size: 12 };
  for (let cols = 1; cols <= Math.min(k, 6); cols++) {
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
