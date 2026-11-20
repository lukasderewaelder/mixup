// Optionsleiste im Hauptbildschirm: Aufteilen, Art, Gruppen gestalten, weitere Optionen, Losen.
import { h, button, segmented, toggle } from './dom.js';
import { icon } from './icons.js';
import { activeClass, update } from '../store.js';
import { presentCount, playersForToday } from '../model.js';
import { teamCount, sizeRange, previewText } from '../teams/sizes.js';
import { buildBlocks } from '../teams/blocks.js';
import { MAX_TEAMS } from '../teams/colors.js';
import { openGroupStyle, styleSummary } from './group-style.js';
import { session } from './session.js';

export const MODES = [
  { value: 'random', label: 'Zufällig', hint: 'Reines Losglück. Regeln und Gedächtnis gelten trotzdem.' },
  { value: 'strength', label: 'Gleich stark', hint: 'Alle Teams haben zusammen gleich viel Niveau – wenn Teams gegeneinander antreten. Ein größeres Team bekommt dafür etwas schwächere Personen.' },
  { value: 'balanced', label: 'Gemischt', hint: 'Jedes Team bekommt im Schnitt dasselbe Niveau – eine gute Mischung für Gruppenarbeit.' },
  { value: 'equal', label: 'Gleiches Niveau', hint: 'Personen mit ähnlichem Niveau kommen zusammen – z. B. für Aufgaben in verschiedenen Schwierigkeitsstufen.' },
];
export const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));

/**
 * @param {() => void} refresh
 * @param {() => void} go  Teams losen
 */
export function optionsPanel(refresh, go) {
  const cls = activeClass();
  const o = cls.options;
  const n = presentCount(cls);
  const k = teamCount(n, o.by, o.value);
  const max = o.by === 'count' ? Math.max(1, Math.min(MAX_TEAMS, n)) : Math.max(1, n);
  const value = Math.min(Math.max(1, o.value), max);
  const set = (patch) => { update((s, c) => { Object.assign(c.options, patch); }); refresh(); };

  const genders = new Set(playersForToday(cls).filter((p) => p.active && p.gender).map((p) => p.gender));
  const levelsSet = cls.players.some((p) => p.level !== 0);
  const rules = cls.groups.filter((g) => g.enabled !== false);
  const mode = MODES.find((m) => m.value === o.mode) || MODES[0];

  const active = [
    o.mixGender && genders.size > 1 ? 'Geschlechter mischen' : null,
    o.rulesEnabled && rules.length ? (rules.length === 1 ? '1 Regel' : `${rules.length} Regeln`) : null,
    o.avoidRepeats ? 'Wiederholungen vermeiden' : null,
  ].filter(Boolean);

  const more = h('details', { class: 'more-options', open: session.moreOpen || null, onToggle: (e) => { session.moreOpen = e.target.open; } },
    h('summary', {}, h('span', { class: 'more-title' }, 'Weitere Optionen'), h('span', { class: 'more-summary' }, active.length ? active.join(' · ') : 'keine aktiv')),
    h('div', { class: 'toggles' },
      toggle('Geschlechter mischen', o.mixGender && genders.size > 1, (v) => set({ mixGender: v }), {
        id: 'opt-gender', disabled: genders.size < 2,
        hint: genders.size < 2 ? 'Dafür unter „Bearbeiten“ das Geschlecht eintragen.' : 'Verteilt die Geschlechter möglichst gleichmäßig.',
      }),
      toggle('Regeln beachten', o.rulesEnabled && rules.length > 0, (v) => set({ rulesEnabled: v }), {
        id: 'opt-rules', disabled: !rules.length,
        hint: rules.length ? `${rules.length === 1 ? '1 Regel' : `${rules.length} Regeln`} für zusammen oder getrennt.` : 'Noch keine Regeln angelegt.',
      }),
      toggle('Wiederholungen vermeiden', o.avoidRepeats, (v) => set({ avoidRepeats: v }), {
        id: 'opt-repeats', hint: 'Wer in den letzten drei Einteilungen zusammen war, kommt möglichst nicht wieder zusammen.',
      })));

  return h('section', { class: 'options-panel', 'aria-label': 'Teams einstellen' },
    h('div', { class: 'opt-row opt-size' },
      segmented('by', [{ value: 'count', label: 'Anzahl Teams' }, { value: 'size', label: 'Personen pro Team' }], o.by, (by) => {
        const remember = by === 'count' ? { sizeValue: o.value } : { countValue: o.value };
        set({ ...remember, by, value: by === 'count' ? (o.countValue || 4) : (o.sizeValue || 4) });
      }, { label: 'Aufteilen nach' }),
      h('div', { class: 'stepper-row' },
        h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Weniger', disabled: value <= 1, 'data-key': 'minus', onClick: () => set({ value: value - 1 }) }, '−'),
        h('output', { class: 'step-number', 'aria-live': 'polite', 'aria-label': `${value} ${o.by === 'count' ? 'Teams' : 'Personen pro Team'}` }, value),
        h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Mehr', disabled: value >= max, 'data-key': 'plus', onClick: () => set({ value: value + 1 }) }, '+')),
      h('p', { class: 'preview-line' }, previewText(n, k))),
    h('div', { class: 'opt-row' },
      segmented('mode', MODES, o.mode, (v) => set({ mode: v }), { label: 'Art der Teams' }),
      h('p', { class: 'mode-hint' }, mode.hint),
      o.mode !== 'random' && !levelsSet ? notice('info', 'Noch keine Niveaus eingestellt – alle zählen als 0. Niveaus setzt du unter „Bearbeiten“.') : null),
    h('div', { class: 'opt-row opt-inline' },
      button(`Gruppen gestalten`, { icon: 'edit', onClick: () => openGroupStyle(k, refresh), title: 'Bezeichnung, Zählung und Farben der Gruppen' }),
      h('span', { class: 'style-summary' }, styleSummary(cls.groupStyle, k))),
    more,
    preWarnings(cls, n, k),
    h('div', { class: 'go-row' },
      h('span', { class: 'kbd-hint' }, h('kbd', {}, 'Leertaste')),
      button(cls.history.length ? 'Neu losen' : 'Teams losen', { icon: 'shuffle', variant: 'primary', onClick: go, disabled: !n, 'data-key': 'go', class: 'btn btn-primary btn-draw' })),
  );
}

function notice(iconName, text) {
  return h('p', { class: 'notice' }, icon(iconName, { size: 18 }), h('span', {}, text));
}

/** Hinweise, die man schon vor dem Losen sehen kann (zu große Zusammen-Gruppen). */
function preWarnings(cls, n, k) {
  if (!cls.options.rulesEnabled || !n) return null;
  const present = playersForToday(cls).filter((p) => p.active).map((p) => p.id);
  const { hi } = sizeRange(n, k);
  const { warnings } = buildBlocks(present, cls.groups.filter((g) => g.type === 'together' && g.enabled !== false), hi);
  return warnings.length ? h('div', { class: 'notices' }, warnings.map((w) => notice('alert', w.message))) : null;
}
