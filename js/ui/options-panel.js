// Teams einstellen: „− Zahl +“ für die obere Leiste, Statuszeile und das Blatt „Optionen“
// (Aufteilen nach, Art, Gruppen gestalten, Rest-Regel, weitere Schalter).
import { h, button, segmented, toggle } from './dom.js';
import { icon } from './icons.js';
import { openDialog } from './dialogs.js';
import { activeClass, update } from '../store.js';
import { presentCount, playersForToday } from '../model.js';
import { teamSizes, previewText, sizesShort, REMAINDERS } from '../teams/sizes.js';
import { buildBlocks } from '../teams/blocks.js';
import { MAX_TEAMS } from '../teams/colors.js';
import { openGroupStyle, styleSummary } from './group-style.js';

export const MODES = [
  { value: 'random', label: 'Zufällig', hint: 'Reines Losglück. Regeln und Gedächtnis gelten trotzdem.' },
  { value: 'strength', label: 'Gleich stark', hint: 'Alle Teams haben zusammen gleich viel Niveau – wenn Teams gegeneinander antreten. Ein größeres Team bekommt dafür etwas schwächere Personen.' },
  { value: 'balanced', label: 'Gemischt', hint: 'Jedes Team bekommt im Schnitt dasselbe Niveau – eine gute Mischung für Gruppenarbeit.' },
  { value: 'equal', label: 'Gleiches Niveau', hint: 'Personen mit ähnlichem Niveau kommen zusammen – z. B. für Aufgaben in verschiedenen Schwierigkeitsstufen.' },
];
export const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));

const REMAINDER_LABEL = { auto: 'Rest automatisch', plus: 'Rest: eine Person mehr', single: 'Rest: eigenes Team', minus: 'Rest: eine Person weniger' };
const REMAINDER_CHOICES = [
  { value: 'auto', title: 'Automatisch', text: 'Was am wenigsten vom Wunsch abweicht' },
  { value: 'plus', title: 'Teams bekommen eine Person mehr', text: '' },
  { value: 'single', title: 'Rest bildet ein eigenes Team', text: '' },
  { value: 'minus', title: 'Mehrere Teams eine Person weniger', text: '' },
];

function info(cls) {
  const o = cls.options;
  const n = presentCount(cls);
  const sizes = teamSizes(n, o.by, o.value, o.remainder);
  const genders = new Set(playersForToday(cls).filter((p) => p.active && p.gender).map((p) => p.gender));
  const rules = cls.groups.filter((g) => g.enabled !== false);
  return { o, n, sizes, genders, rules };
}

const setOptions = (patch) => update((s, c) => { Object.assign(c.options, patch); });

/** „− Zahl +“ für die obere Leiste. Darunter steht, was gezählt wird (Teams / pro Team). */
export function sizeStepper(refresh) {
  const cls = activeClass();
  const o = cls.options;
  const n = presentCount(cls);
  const max = o.by === 'count' ? Math.max(1, Math.min(MAX_TEAMS, n)) : Math.max(1, n);
  const value = Math.min(Math.max(1, o.value), max);
  const unit = o.by === 'count' ? (value === 1 ? 'Team' : 'Teams') : 'pro Team';
  const set = (v) => { setOptions({ value: v }); refresh(); };
  return h('div', { class: 'tb-stepper', role: 'group', 'aria-label': o.by === 'count' ? 'Anzahl Teams' : 'Personen pro Team' },
    h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Weniger', disabled: value <= 1, 'data-key': 'minus', onClick: () => set(value - 1) }, '−'),
    h('span', { class: 'tb-count' },
      h('output', { class: 'step-number', 'aria-live': 'polite', 'aria-label': `${value} ${o.by === 'count' ? 'Teams' : 'Personen pro Team'}` }, value),
      h('span', { class: 'tb-unit', 'aria-hidden': 'true' }, unit)),
    h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Mehr', disabled: value >= max, 'data-key': 'plus', onClick: () => set(value + 1) }, '+'));
}

/** Eine Zeile unter der Leiste: was beim Losen herauskommt und welche Optionen gelten. */
export function statusLine(cls) {
  const { o, n, sizes, genders, rules } = info(cls);
  const rest = remainderInfo(n, o);
  const extras = [
    MODE_LABEL[o.mode] || 'Zufällig',
    rest?.differs && o.remainder !== 'auto' ? REMAINDER_LABEL[o.remainder] : null,
    o.mixGender && genders.size > 1 ? 'Geschlechter gemischt' : null,
    o.rulesEnabled && rules.length ? (rules.length === 1 ? '1 Regel' : `${rules.length} Regeln`) : null,
    o.avoidRepeats ? 'ohne Wiederholungen' : null,
  ].filter(Boolean);
  return h('div', { class: 'main-status' },
    h('p', { class: 'status-line' },
      h('strong', { class: 'status-sizes' }, `${previewText(n, sizes)}.`),
      h('span', { class: 'status-extras' }, extras.join(', '))),
    preWarnings(cls, n, sizes));
}

function notice(iconName, text) {
  return h('p', { class: 'notice' }, icon(iconName, { size: 18 }), h('span', {}, text));
}

/** Hinweise, die man schon vor dem Losen sehen kann (zu große Zusammen-Gruppen). */
function preWarnings(cls, n, sizes) {
  if (!cls.options.rulesEnabled || !n) return null;
  const present = playersForToday(cls).filter((p) => p.active).map((p) => p.id);
  const { warnings } = buildBlocks(present, cls.groups.filter((g) => g.type === 'together' && g.enabled !== false), sizes[0]);
  return warnings.length ? h('div', { class: 'notices' }, warnings.map((w) => notice('alert', w.message))) : null;
}

// ---------- Blatt „Optionen“ ----------
export function openOptions(refresh) {
  const body = h('div', { class: 'options-sheet' });
  const set = (patch) => { setOptions(patch); paint(); refresh(); };

  function paint() {
    const cls = activeClass();
    const { o, n, sizes, genders, rules } = info(cls);
    const levelsSet = cls.players.some((p) => p.level !== 0);
    const mode = MODES.find((m) => m.value === o.mode) || MODES[0];
    const rest = remainderInfo(n, o);
    const scroll = body.closest('.modal-body')?.scrollTop;

    body.replaceChildren(
      section('Aufteilen nach',
        segmented('by', [{ value: 'count', label: 'Anzahl Teams' }, { value: 'size', label: 'Personen pro Team' }], o.by, (by) => {
          const remember = by === 'count' ? { sizeValue: o.value } : { countValue: o.value };
          set({ ...remember, by, value: by === 'count' ? (o.countValue || 4) : (o.sizeValue || 4) });
        }, { label: 'Aufteilen nach' }),
        h('p', { class: 'field-hint' }, `${previewText(n, sizes)}. Die Zahl stellst du oben mit − und + ein.`)),
      rest ? section('Wenn es nicht aufgeht', remainderField(o, rest, set)) : null,
      section('Art der Teams',
        segmented('mode', MODES, o.mode, (v) => set({ mode: v }), { label: 'Art der Teams' }),
        h('p', { class: 'field-hint' }, mode.hint),
        o.mode !== 'random' && !levelsSet ? notice('info', 'Noch keine Niveaus eingestellt – alle zählen als 0. Tippe in der Namensliste auf einen Namen, um das Niveau zu setzen.') : null),
      section('Gruppen',
        h('div', { class: 'opt-inline' },
          button('Gruppen gestalten', { icon: 'edit', onClick: () => openGroupStyle(sizes.length, () => { paint(); refresh(); }), title: 'Bezeichnung, Zählung und Farben der Gruppen' }),
          h('span', { class: 'style-summary' }, styleSummary(cls.groupStyle, sizes.length)))),
      section('Beim Losen',
        h('div', { class: 'toggles' },
          toggle('Geschlechter mischen', o.mixGender && genders.size > 1, (v) => set({ mixGender: v }), {
            id: 'opt-gender', disabled: genders.size < 2,
            hint: genders.size < 2 ? 'Dafür in der Namensliste beim Namen das Geschlecht eintragen.' : 'Verteilt die Geschlechter möglichst gleichmäßig.',
          }),
          toggle('Regeln beachten', o.rulesEnabled && rules.length > 0, (v) => set({ rulesEnabled: v }), {
            id: 'opt-rules', disabled: !cls.groups.length,
            hint: cls.groups.length ? `${rules.length === 1 ? '1 Regel' : `${rules.length} Regeln`} für zusammen oder getrennt.` : 'Noch keine Regeln angelegt (Taste „Regeln“).',
          }),
          toggle('Wiederholungen vermeiden', o.avoidRepeats, (v) => set({ avoidRepeats: v }), {
            id: 'opt-repeats', hint: 'Wer in den letzten drei Einteilungen zusammen war, kommt möglichst nicht wieder zusammen.',
          }))),
    );
    const mb = body.closest('.modal-body');
    if (mb && scroll != null) mb.scrollTop = scroll;
  }

  paint();
  openDialog({ title: 'Optionen', body, size: 'wide', onClose: refresh, actions: [{ label: 'Fertig', icon: 'check', variant: 'primary' }] });
}

function section(title, ...content) {
  return h('section', { class: 'sheet-section' }, h('h3', { class: 'sheet-title' }, title), content);
}

// ---------- Rest-Regel (nur „Personen pro Team“) ----------
function remainderInfo(n, o) {
  if (o.by !== 'size' || !n) return null;
  const variants = Object.fromEntries(REMAINDERS.map((r) => [r, teamSizes(n, 'size', o.value, r)]));
  const differs = new Set(Object.values(variants).map((v) => v.join(','))).size > 1;
  return { variants, differs };
}

function remainderField(o, rest, set) {
  if (!rest.differs) return h('p', { class: 'field-hint' }, 'Die Teams gehen genau auf – keine Rest-Regel nötig.');
  return h('fieldset', { class: 'remainder' },
    h('legend', { class: 'visually-hidden' }, 'Wenn es nicht aufgeht'),
    h('div', { class: 'choice-list' }, REMAINDER_CHOICES.map((c) => h('label', { class: 'choice' },
      h('input', { type: 'radio', name: 'remainder', value: c.value, checked: o.remainder === c.value, onChange: () => set({ remainder: c.value }) }),
      h('span', { class: 'choice-text' },
        h('span', { class: 'choice-title' }, c.title),
        h('span', { class: 'choice-sub' }, `${rest.variants[c.value].length} Teams: ${sizesShort(rest.variants[c.value])}${c.text ? `. ${c.text}` : ''}`))))));
}
