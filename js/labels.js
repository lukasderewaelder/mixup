// Bezeichnung und Farbe der Gruppen (je Klasse) – reine Funktionen (testbar).
import { DEFAULT_GROUP_STYLE } from './model.js';

/** Deutsche Namen der 20 Teamfarben (Reihenfolge wie css/tokens.css). */
export const COLOR_NAMES = [
  'Blau', 'Rost', 'Türkis', 'Lila', 'Ocker', 'Himmelblau', 'Himbeere', 'Grün', 'Violett', 'Orange',
  'Petrol', 'Magenta', 'Oliv', 'Azur', 'Rot', 'Smaragd', 'Flieder', 'Bernstein', 'Ozean', 'Pink',
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRST';
const style = (s) => s || DEFAULT_GROUP_STYLE;

/** Wort der Vorlage: „Team“, „Gruppe“ … oder das eigene Wort. */
export function groupWord(s) {
  s = style(s);
  return s.word === 'custom' ? (s.customWord || 'Gruppe') : s.word;
}

/** Paletten-Nummer (0–19) der Gruppe an Position i. */
export function groupColor(i, s) {
  const c = style(s).colors?.[i];
  return Number.isInteger(c) ? c : i % COLOR_NAMES.length;
}

/** Großes Zeichen auf der Karte: „3“, „C“ – bei Farbnamen leer (die Karte zeigt einen Farbpunkt). */
export function groupCode(i, s) {
  s = style(s);
  if (s.numbering === 'letter') return LETTERS[i] ?? String(i + 1);
  if (s.numbering === 'color') return '';
  return String(i + 1);
}

/** Text ohne eigenen Namen: „Gruppe 3“, „Gruppe C“, „Gruppe Blau“. */
export function templateLabel(i, s) {
  s = style(s);
  const suffix = s.numbering === 'color' ? COLOR_NAMES[groupColor(i, s)] : groupCode(i, s);
  return `${groupWord(s)} ${suffix}`;
}

/** Eigener Name, sonst Vorlage. */
export function groupLabel(i, s) {
  return style(s).names?.[i] || templateLabel(i, s);
}
