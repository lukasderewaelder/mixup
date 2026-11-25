// Teams einstellen: „− Zahl +“ (mit Umschalter Teams / pro Team) für die obere Leiste, Statuszeile
// und das Blatt „Optionen“ mit den Reitern „Teams“ (Art, Rest-Regel, Gruppen, Schalter) und „Regeln“.
import { h, button, segmented, toggle, replaceKeepFocus } from './dom.js';
import { icon } from './icons.js';
import { openDialog } from './dialogs.js';
import { activeClass, update } from '../store.js';
import { presentCount, playersForToday } from '../model.js';
import { teamSizes, previewText, sizesShort, REMAINDERS } from '../teams/sizes.js';
import { buildBlocks } from '../teams/blocks.js';
import { MAX_TEAMS } from '../teams/colors.js';
import { openGroupStyle, styleSummary, ownNameCount, resetOwn } from './group-style.js';
import { rulesContent, startSelecting } from './names-panel.js';

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

/** „− Zahl +“ für die obere Leiste. Antippen der Zahl schaltet um: Anzahl Teams ⇄ Personen pro Team. */
export function sizeStepper(refresh) {
  const cls = activeClass();
  const o = cls.options;
  const n = presentCount(cls);
  const max = o.by === 'count' ? Math.max(1, Math.min(MAX_TEAMS, n)) : Math.max(1, n);
  const value = Math.min(Math.max(1, o.value), max);
  const unit = o.by === 'count' ? (value === 1 ? 'Team' : 'Teams') : 'pro Team';
  const set = (v) => { setOptions({ value: v }); refresh(); };
  const switchBy = () => {
    const by = o.by === 'count' ? 'size' : 'count';
    const remember = by === 'count' ? { sizeValue: o.value } : { countValue: o.value };
    setOptions({ ...remember, by, value: by === 'count' ? (o.countValue || 4) : (o.sizeValue || 4) });
    refresh();
  };
  return h('div', { class: 'tb-stepper', role: 'group', 'aria-label': o.by === 'count' ? 'Anzahl Teams' : 'Personen pro Team' },
    h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Weniger', disabled: value <= 1, 'data-key': 'minus', onClick: () => set(value - 1) }, '−'),
    h('button', {
      type: 'button', class: 'tb-count', 'data-key': 'by-switch', onClick: switchBy,
      'aria-label': `${value} ${o.by === 'count' ? 'Teams' : 'Personen pro Team'} – umschalten auf ${o.by === 'count' ? 'Personen pro Team' : 'Anzahl Teams'}`,
      title: o.by === 'count' ? 'Umschalten auf Personen pro Team' : 'Umschalten auf Anzahl Teams',
    },
    h('output', { class: 'step-number', 'aria-live': 'polite' }, value),
    h('span', { class: 'tb-unit' }, unit, icon('swap', { size: 13 }))),
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

// ---------- Blatt „Optionen“ mit zwei Reitern: Teams | Regeln ----------
export function openOptions(refresh, startTab = 'teams') {
  let tab = startTab;
  const body = h('div', { class: 'options-sheet' });
  const tabs = h('div', { class: 'tabs sheet-tabs', role: 'tablist', 'aria-label': 'Optionen' });
  const panel = h('div', { class: 'sheet-panel', role: 'tabpanel' });
  body.append(tabs, panel);
  const set = (patch) => { setOptions(patch); paint(); refresh(); };
  const newRule = button('Neue Regel', { icon: 'plus', onClick: () => { startSelecting(); dlg.close(); }, title: 'Personen in der Namensliste antippen' });

  function paint() {
    const cls = activeClass();
    const ruleCount = cls.groups.length;
    tabs.replaceChildren(...[['teams', 'sliders', 'Teams'], ['rules', 'together', ruleCount ? `Regeln (${ruleCount})` : 'Regeln']].map(([id, ic, label]) => h('button', {
      type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab), 'data-key': `opt-tab-${id}`,
      onClick: () => { tab = id; paint(); },
    }, icon(ic, { size: 18 }), h('span', {}, label))));
    newRule.hidden = tab !== 'rules';
    replaceKeepFocus(panel, tab === 'rules' ? rulesContent(() => { paint(); refresh(); }) : teamsContent(cls, set));
  }

  const dlg = openDialog({
    title: 'Optionen', body, size: 'wide', onClose: refresh, className: 'options-dialog',
    footer: [newRule, h('span', { class: 'toolbar-spacer' }), button('Fertig', { icon: 'check', variant: 'primary', onClick: () => dlg.close() })],
  });
  paint();
  return dlg;
}

function teamsContent(cls, set) {
  const { o, n, sizes, genders } = info(cls);
  const levelsSet = cls.players.some((p) => p.level !== 0);
  const mode = MODES.find((m) => m.value === o.mode) || MODES[0];
  const rest = remainderInfo(n, o);
  return [
    h('p', { class: 'sheet-lead' }, h('strong', {}, `${previewText(n, sizes)}.`), ' ',
      h('span', { class: 'muted' }, 'Die Zahl und „Teams“ oder „pro Team“ stellst du oben in der Leiste ein.')),
    h('div', { class: 'sheet-cols' },
      h('div', { class: 'sheet-col' },
        section('Art der Teams',
          segmented('mode', MODES, o.mode, (v) => set({ mode: v }), { label: 'Art der Teams' }),
          h('p', { class: 'field-hint' }, mode.hint),
          o.mode !== 'random' && !levelsSet ? notice('info', 'Noch keine Niveaus eingestellt – alle zählen als 0. Tippe in der Namensliste auf einen Namen, um das Niveau zu setzen.') : null),
        rest ? section('Wenn es nicht aufgeht', remainderField(o, rest, set)) : null),
      h('div', { class: 'sheet-col' },
        section('Gruppen',
          h('div', { class: 'opt-inline' },
            button('Gruppen gestalten', { icon: 'edit', onClick: () => openGroupStyle(sizes.length, () => set({})), title: 'Bezeichnung, Zählung und Farben der Gruppen' }),
            h('span', { class: 'style-summary' }, styleSummary(cls.groupStyle, sizes.length))),
          ownNameCount(cls.groupStyle) ? h('div', { class: 'opt-inline' },
            button('Eigene Teamnamen zurücksetzen', { icon: 'reset', variant: 'quiet', onClick: () => resetOwn('names', () => set({})), 'data-key': 'reset-names' }),
            h('span', { class: 'style-summary' }, ownNameCount(cls.groupStyle) === 1 ? '1 Team hat einen eigenen Namen.' : `${ownNameCount(cls.groupStyle)} Teams haben eigene Namen.`)) : null),
        section('Beim Losen',
          h('div', { class: 'toggles' },
            toggle('Geschlechter mischen', o.mixGender && genders.size > 1, (v) => set({ mixGender: v }), {
              id: 'opt-gender', disabled: genders.size < 2,
              hint: genders.size < 2 ? 'Dafür in der Namensliste beim Namen das Geschlecht eintragen.' : 'Verteilt die Geschlechter möglichst gleichmäßig.',
            }),
            toggle('Wiederholungen vermeiden', o.avoidRepeats, (v) => set({ avoidRepeats: v }), {
              id: 'opt-repeats', hint: 'Wer in den letzten drei Einteilungen zusammen war, kommt möglichst nicht wieder zusammen.',
            }))))),
  ];
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
