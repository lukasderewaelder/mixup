// Teamanzahl und Teamgrößen.
import { MAX_TEAMS } from './colors.js';

/**
 * Anzahl der Teams für n Anwesende.
 * by = 'count': value ist die gewünschte Teamanzahl.
 * by = 'size':  value ist die gewünschte Teamgröße. Es wird die Teamanzahl gewählt, bei der die
 *               Größen am wenigsten vom Wunsch abweichen; bei Gleichstand „lieber eine Person mehr“
 *               (E25): 25 Personen à 4 → 6 Teams (5 × 4, 1 × 5) statt 7 Teams (4 × 4, 3 × 3).
 * Ergebnis liegt immer in 1 … min(20, n); bei n = 0 ist es 0.
 */
export function teamCount(n, by, value) {
  if (!(n > 0)) return 0;
  const limit = Math.min(MAX_TEAMS, n);
  let k;
  if (by === 'size') {
    const size = Math.max(1, Math.round(Number(value) || 1));
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

/** Kleinste und größte Teamgröße sowie Anzahl der größeren Teams. */
export function sizeRange(n, k) {
  if (!(k > 0)) return { lo: 0, hi: 0, bigCount: 0 };
  const lo = Math.floor(n / k);
  const bigCount = n % k;
  return { lo, hi: bigCount ? lo + 1 : lo, bigCount };
}

const persons = (x) => (x === 1 ? '1 Person' : `${x} Personen`);
const teams = (x) => (x === 1 ? '1 Team' : `${x} Teams`);

/** Vorschau-Zeile für Schritt 2, z. B. „6 Teams: 5 × 4 und 1 × 5 Personen“. */
export function previewText(n, k) {
  if (!(n > 0) || !(k > 0)) return 'Niemand ist als anwesend markiert';
  const { lo, hi, bigCount } = sizeRange(n, k);
  if (k === 1) return `1 Team mit ${persons(n)}`;
  if (!bigCount) return `${teams(k)} mit je ${persons(lo)}`;
  return `${teams(k)}: ${k - bigCount} × ${lo} und ${bigCount} × ${persons(hi)}`;
}
