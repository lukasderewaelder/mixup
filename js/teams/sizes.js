// Teamanzahl und Teamgrößen.
import { MAX_TEAMS } from './colors.js';

/**
 * Was passiert bei „Personen pro Team“, wenn es nicht aufgeht (Beispiel 25 Personen à 4):
 * auto   – geringste Abweichung, bei Gleichstand lieber eine Person mehr (E25) → 5 × 4, 1 × 5
 * plus   – Teams bekommen eine Person mehr                                     → 5 × 4, 1 × 5
 * single – der Rest bildet ein eigenes Team                                    → 6 × 4, 1 × 1
 * minus  – mehrere Teams bekommen eine Person weniger                          → 4 × 4, 3 × 3
 */
export const REMAINDERS = ['auto', 'plus', 'single', 'minus'];

/**
 * Anzahl der Teams für n Anwesende (Regel „auto“).
 * by = 'count': value ist die gewünschte Teamanzahl.
 * by = 'size':  value ist die gewünschte Teamgröße; gewählt wird die Teamanzahl mit der geringsten
 *               Abweichung, bei Gleichstand „lieber eine Person mehr“ (E25).
 * Ergebnis liegt immer in 1 … min(20, n); bei n = 0 ist es 0.
 */
export function teamCount(n, by, value) {
  if (!(n > 0)) return 0;
  const limit = Math.min(MAX_TEAMS, n);
  let k;
  if (by === 'size') {
    const size = clampSize(value);
    const fewer = Math.max(1, Math.floor(n / size));
    const more = Math.ceil(n / size);
    const tooBig = Math.ceil(n / fewer) - size;               // so viele Personen über dem Wunsch
    const tooSmall = more > fewer ? size - Math.floor(n / more) : Infinity; // so viele darunter
    k = tooSmall < tooBig ? more : fewer;
  } else {
    k = Math.round(Number(value) || 1);
  }
  return Math.min(limit, Math.max(1, k));
}

const clampSize = (value) => Math.max(1, Math.round(Number(value) || 1));

/** n Personen gleichmäßig auf k Teams (Größen unterscheiden sich um höchstens 1), absteigend. */
export function evenSizes(n, k) {
  if (!(n > 0) || !(k > 0)) return [];
  const lo = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => (i < extra ? lo + 1 : lo));
}

/**
 * Zielgrößen aller Teams (absteigend). Die Rest-Regel gilt nur bei „Personen pro Team“;
 * mehr als 20 Teams werden auf 20 gleichmäßige Teams begrenzt.
 */
export function teamSizes(n, by, value, remainder = 'auto') {
  if (!(n > 0)) return [];
  if (by !== 'size' || !REMAINDERS.includes(remainder) || remainder === 'auto') return evenSizes(n, teamCount(n, by, value));
  const size = clampSize(value);
  let sizes;
  if (remainder === 'plus') sizes = evenSizes(n, Math.max(1, Math.floor(n / size)));
  else if (remainder === 'minus') sizes = evenSizes(n, Math.ceil(n / size));
  else {
    const full = Math.floor(n / size);
    const rest = n % size;
    sizes = full ? [...Array(full).fill(size), ...(rest ? [rest] : [])] : [n];
  }
  return sizes.length > MAX_TEAMS ? evenSizes(n, MAX_TEAMS) : sizes;
}

/** Kleinste und größte Teamgröße sowie Anzahl der größeren Teams (gleichmäßige Verteilung). */
export function sizeRange(n, k) {
  if (!(k > 0)) return { lo: 0, hi: 0, bigCount: 0 };
  const lo = Math.floor(n / k);
  const bigCount = n % k;
  return { lo, hi: bigCount ? lo + 1 : lo, bigCount };
}

const persons = (x) => (x === 1 ? '1 Person' : `${x} Personen`);
const teams = (x) => (x === 1 ? '1 Team' : `${x} Teams`);

/** Kurzform der Aufteilung, z. B. „6 × 4 und 1 × 1“ (häufigste Größe zuerst). */
export function sizesShort(sizes) {
  const groups = [...sizes.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const parts = groups.map(([s, c]) => `${c} × ${s}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}` : parts[0] || '';
}

/**
 * Vorschau-Zeile, z. B. „6 Teams: 5 × 4 und 1 × 5 Personen“.
 * @param {number} n
 * @param {number|number[]} kOrSizes  Teamanzahl (gleichmäßig) oder Zielgrößen
 */
export function previewText(n, kOrSizes) {
  const sizes = Array.isArray(kOrSizes) ? kOrSizes : evenSizes(n, kOrSizes);
  if (!(n > 0) || !sizes.length) return 'Niemand ist als anwesend markiert';
  const k = sizes.length;
  if (k === 1) return `1 Team mit ${persons(n)}`;
  const distinct = new Set(sizes);
  if (distinct.size === 1) return `${teams(k)} mit je ${persons(sizes[0])}`;
  const groups = [...sizes.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const lastSize = groups.at(-1)[0];
  return `${teams(k)}: ${sizesShort(sizes)} ${lastSize === 1 ? 'Person' : 'Personen'}`;
}
