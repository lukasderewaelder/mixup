// Gruppen gestalten (je Klasse): Vorlage im Dialog, Name und Farbe einzeln auf der Karte.
import { h, button, segmented } from './dom.js';
import { openDialog, promptDialog, toast } from './dialogs.js';
import { activeClass, update, getState, replaceState } from '../store.js';
import { GROUP_WORDS, normalizeName } from '../model.js';
import { COLOR_NAMES, groupLabel, groupCode, groupColor, templateLabel } from '../labels.js';
import { colorVars } from './team-card.js';
import { MAX_TEAMS } from '../teams/colors.js';

/** Kurztext der Vorlage für die Optionsleiste, z. B. „Gruppe A, B, C …“. */
export function styleSummary(style, k = 3) {
  const n = Math.max(1, Math.min(3, k));
  return Array.from({ length: n }, (_, i) => groupLabel(i, style)).join(', ') + (k > 3 ? ' …' : '');
}

/** Dialog „Gruppen gestalten“: Wort, Zählung, Vorschau, Zurücksetzen. onDone nach jeder Änderung. */
export function openGroupStyle(k, onDone) {
  const body = h('div', { class: 'group-style' });
  const set = (patch) => { update((s, cls) => { Object.assign(cls.groupStyle, patch); }); paint(); onDone?.(); };

  function paint() {
    const style = activeClass().groupStyle;
    const isCustom = style.word === 'custom';
    const custom = h('input', {
      class: 'input', type: 'text', name: 'eigenes-wort', autocomplete: 'off', spellcheck: 'false', value: style.customWord, maxlength: 30, placeholder: 'z. B. Crew, Labor, Insel …',
      'aria-label': 'Eigenes Wort', 'data-key': 'gs-custom',
      onInput: (e) => { update((s, cls) => { cls.groupStyle.customWord = normalizeName(e.target.value); }); preview.replaceWith(preview = previewRow()); onDone?.(); },
    });
    let preview = previewRow();
    const ownNames = Object.keys(style.names).length;
    const ownColors = Object.keys(style.colors).length;
    body.replaceChildren(
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Bezeichnung'),
        segmented('gs-word', [...GROUP_WORDS.map((w) => ({ value: w, label: w })), { value: 'custom', label: 'Eigenes' }], style.word, (v) => set({ word: v }), { label: 'Bezeichnung' }),
        isCustom ? custom : null),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Zählung'),
        segmented('gs-num', [{ value: 'number', label: '1, 2, 3' }, { value: 'letter', label: 'A, B, C' }, { value: 'color', label: 'Farbname' }], style.numbering, (v) => set({ numbering: v }), { label: 'Zählung' })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Vorschau'), preview),
      h('p', { class: 'muted' }, 'Einzelne Namen und Farben änderst du direkt auf der Teamkarte: Namen oder großes Zeichen antippen.'),
      ownNames || ownColors ? h('div', { class: 'opt-inline' },
        ownNames ? button(ownNames === 1 ? 'Eigenen Teamnamen zurücksetzen' : `${ownNames} eigene Teamnamen zurücksetzen`, { icon: 'reset', onClick: () => resetOwn('names', () => { paint(); onDone?.(); }) }) : null,
        ownColors ? button(ownColors === 1 ? 'Eigene Farbe zurücksetzen' : `${ownColors} eigene Farben zurücksetzen`, { icon: 'reset', variant: 'quiet', onClick: () => resetOwn('colors', () => { paint(); onDone?.(); }) }) : null) : null,
    );
    if (isCustom && document.activeElement === document.body) custom.focus();
  }

  function previewRow() {
    const style = activeClass().groupStyle;
    const n = Math.max(1, Math.min(k || 4, 8));
    return h('div', { class: 'gs-preview' }, Array.from({ length: n }, (_, i) => h('span', { class: 'gs-chip', ...colorVars(i, style) },
      groupCode(i, style) ? h('strong', {}, groupCode(i, style)) : h('span', { class: 'team-dot' }),
      h('span', {}, groupLabel(i, style)))), k > 8 ? h('span', { class: 'muted' }, '…') : null);
  }

  paint();
  openDialog({ title: 'Gruppen gestalten', body, size: 'wide', actions: [{ label: 'Fertig', variant: 'primary' }] });
}

/** Anzahl der von Hand vergebenen Teamnamen dieser Klasse. */
export const ownNameCount = (style) => Object.keys(style?.names || {}).length;

/** Eigene Teamnamen (names) oder Farben (colors) auf die Vorlage zurücksetzen – mit Rückgängig. */
export function resetOwn(kind, onDone) {
  const before = structuredClone(getState());
  update((s, cls) => { cls.groupStyle[kind] = {}; });
  onDone?.();
  toast(kind === 'names' ? 'Teamnamen zurückgesetzt – es gilt wieder die Vorlage.' : 'Farben zurückgesetzt.', {
    action: { label: 'Rückgängig', onClick: () => { replaceState(before); onDone?.(); } },
  });
}

/** Name einer Gruppe auf der Karte ändern (leer = Vorlage). */
export async function renameGroup(index, onDone) {
  const style = activeClass().groupStyle;
  const value = style.names[index] || '';
  const name = await promptDialog({
    title: `${groupLabel(index, style)} umbenennen`,
    label: `Eigener Name – leer lassen für „${templateLabel(index, style)}“`,
    value, confirmLabel: 'Übernehmen', maxLength: 40, validate: () => null,
  });
  if (name === null) return;
  update((s, cls) => {
    if (name) cls.groupStyle.names[index] = name; else delete cls.groupStyle.names[index];
  });
  onDone?.();
}

/** Farbe einer Gruppe auf der Karte wählen (20 geprüfte Farben). */
export function pickGroupColor(index, onDone) {
  const style = activeClass().groupStyle;
  const current = groupColor(index, style);
  const dlg = openDialog({
    title: `Farbe für ${groupLabel(index, style)}`,
    body: h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Farbe' }, Array.from({ length: MAX_TEAMS }, (_, c) => h('button', {
      type: 'button', class: `swatch${c === current ? ' is-current' : ''}`, role: 'radio', 'aria-checked': String(c === current),
      'aria-label': COLOR_NAMES[c], title: COLOR_NAMES[c], '--c': `var(--team-${c + 1})`,
      onClick: () => {
        update((s, cls) => { if (c === index % MAX_TEAMS) delete cls.groupStyle.colors[index]; else cls.groupStyle.colors[index] = c; });
        dlg.close();
        onDone?.();
      },
    }, h('span', { class: 'swatch-name' }, COLOR_NAMES[c])))),
  });
}
