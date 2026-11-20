// Schritt 2: Teams einstellen – Anzahl/Größe, Art, Optionen, Vorschau, Losen.
import { h, button, screenHead, stepActions, segmented, toggle, replaceKeepFocus } from './dom.js';
import { icon } from './icons.js';
import { toast } from './dialogs.js';
import { activeClass, update } from '../store.js';
import { presentCount, playersForToday, currentResult } from '../model.js';
import { teamCount, sizeRange, previewText } from '../teams/sizes.js';
import { buildBlocks } from '../teams/blocks.js';
import { MAX_TEAMS } from '../teams/colors.js';
import { drawTeams } from '../actions.js';

export const title = 'Teams einstellen';
export const step = 2;
export const needsClass = true;

const MODES = [
  { value: 'random', label: 'Zufällig', hint: 'Reines Losglück. Regeln und Gedächtnis gelten trotzdem.' },
  { value: 'balanced', label: 'Ausgeglichen', hint: 'Jedes Team bekommt eine ähnliche Mischung aus allen Niveaus.' },
  { value: 'equal', label: 'Gleiches Niveau', hint: 'Personen mit ähnlichem Niveau kommen zusammen – z. B. für Aufgaben in verschiedenen Schwierigkeitsstufen.' },
];

let root;

export function render() {
  root = h('div', { class: 'step2' });
  paint();
  return root;
}

export function onKey(e) {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); return true; }
  return false;
}

function setOption(patch) {
  update((s, cls) => { Object.assign(cls.options, patch); });
  paint();
}

function paint() {
  const cls = activeClass();
  if (!cls) return;
  const o = cls.options;
  const n = presentCount(cls);
  const k = teamCount(n, o.by, o.value);
  const max = o.by === 'count' ? Math.max(1, Math.min(MAX_TEAMS, n)) : Math.max(1, n);
  const value = Math.min(Math.max(1, o.value), max);

  const genders = new Set(playersForToday(cls).filter((p) => p.active && p.gender).map((p) => p.gender));
  const levelsSet = cls.players.some((p) => p.level !== 3);
  const groups = cls.groups.filter((g) => g.enabled !== false);
  const mode = MODES.find((m) => m.value === o.mode) || MODES[0];

  replaceKeepFocus(root, [
    screenHead('Teams einstellen', n === 1 ? '1 Person ist da.' : `${n} Personen sind da.`),
    h('div', { class: 'settings-grid' },
      h('section', { class: 'panel', 'aria-labelledby': 'size-title' },
        h('h2', { id: 'size-title', class: 'panel-title' }, 'Aufteilen'),
        segmented('by', [{ value: 'count', label: 'Anzahl Teams' }, { value: 'size', label: 'Personen pro Team' }], o.by, (by) => {
          const remember = by === 'count' ? { sizeValue: o.value } : { countValue: o.value };
          setOption({ ...remember, by, value: by === 'count' ? (o.countValue || 4) : (o.sizeValue || 4) });
        }, { label: 'Aufteilen nach' }),
        h('div', { class: 'stepper-row' },
          h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Weniger', disabled: value <= 1, 'data-key': 'minus', onClick: () => setOption({ value: value - 1 }) }, '−'),
          h('output', { class: 'step-value', 'aria-live': 'polite' }, h('span', { class: 'step-number' }, value), h('span', { class: 'step-unit' }, o.by === 'count' ? (value === 1 ? 'Team' : 'Teams') : (value === 1 ? 'Person pro Team' : 'Personen pro Team'))),
          h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Mehr', disabled: value >= max, 'data-key': 'plus', onClick: () => setOption({ value: value + 1 }) }, '+'),
        ),
        h('p', { class: 'preview-line' }, previewText(n, k)),
      ),
      h('section', { class: 'panel', 'aria-labelledby': 'mode-title' },
        h('h2', { id: 'mode-title', class: 'panel-title' }, 'Art der Teams'),
        segmented('mode', MODES, o.mode, (v) => setOption({ mode: v }), { label: 'Art der Teams' }),
        h('p', { class: 'mode-hint' }, mode.hint),
        o.mode !== 'random' && !levelsSet ? notice('info', 'Noch keine Niveaus gepflegt – alle zählen als 3. Niveaus setzt du in Schritt 1 unter „Bearbeiten“.') : null,
        h('div', { class: 'toggles' },
          toggle('Geschlechter mischen', o.mixGender && genders.size > 1, (v) => setOption({ mixGender: v }), {
            id: 'opt-gender', disabled: genders.size < 2,
            hint: genders.size < 2 ? 'Dafür in Schritt 1 unter „Bearbeiten“ das Geschlecht eintragen.' : 'Verteilt die Geschlechter möglichst gleichmäßig.',
          }),
          toggle('Regeln beachten', o.rulesEnabled && groups.length > 0, (v) => setOption({ rulesEnabled: v }), {
            id: 'opt-rules', disabled: !groups.length,
            hint: groups.length ? `${groups.length === 1 ? '1 Regel' : `${groups.length} Regeln`} für zusammen oder getrennt.` : 'Noch keine Regeln angelegt.',
          }),
          toggle('Wiederholungen vermeiden', o.avoidRepeats, (v) => setOption({ avoidRepeats: v }), {
            id: 'opt-repeats',
            hint: 'Wer in den letzten drei Einteilungen zusammen war, kommt möglichst nicht wieder zusammen.',
          }),
        ),
      ),
    ),
    preWarnings(cls, n, k),
    stepActions({ href: '#/klasse', label: 'Klasse' }, h('div', { class: 'go-group' },
      currentResult(cls) ? h('a', { class: 'btn btn-quiet', href: '#/ergebnis' }, 'Letztes Ergebnis') : null,
      h('span', { class: 'kbd-hint' }, h('kbd', {}, 'Leertaste')),
      button('Teams losen', { icon: 'shuffle', variant: 'primary', onClick: go, disabled: !n, 'data-key': 'go', class: 'btn btn-primary btn-draw' }),
    )),
  ]);
}

function notice(iconName, text) {
  return h('p', { class: 'notice' }, icon(iconName, { size: 18 }), h('span', {}, text));
}

/** Hinweise, die man schon vor dem Losen sehen kann. */
function preWarnings(cls, n, k) {
  if (!cls.options.rulesEnabled || !n) return null;
  const present = playersForToday(cls).filter((p) => p.active).map((p) => p.id);
  const { hi } = sizeRange(n, k);
  const { warnings } = buildBlocks(present, cls.groups.filter((g) => g.type === 'together' && g.enabled !== false), hi);
  return warnings.length ? h('div', { class: 'notices' }, warnings.map((w) => notice('alert', w.message))) : null;
}

function go() {
  const result = drawTeams();
  if (!result.teams.length) { toast(result.warnings[0]?.message || 'Losen nicht möglich.'); return; }
  location.hash = '#/ergebnis';
}
