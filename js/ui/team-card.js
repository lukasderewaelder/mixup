// Teamkarte – für Ergebnis, Klassenansicht und Druck.
import { h } from './dom.js';
import { byName } from '../model.js';
import { groupCode, groupColor, groupLabel, groupWord } from '../labels.js';

/** Namen eines Teams in der eingestellten Reihenfolge. */
export function orderedMembers(ids, players, settings) {
  const named = ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  return settings?.nameOrder === 'draw' ? named : named.sort((a, b) => byName(a.name, b.name));
}

/** CSS-Variablen für die Farbe der Gruppe an Position i. */
export function colorVars(i, style) {
  const n = groupColor(i, style) + 1;
  return { '--c': `var(--team-${n})`, '--c-tint': `var(--team-${n}-tint)`, '--c-ink': `var(--team-${n}-ink)` };
}

/**
 * @param {number} index
 * @param {{id,name}[]} members  bereits sortiert
 * @param {object} o
 *   style       Gruppen-Gestaltung der Klasse
 *   interactive Personen antippbar (Tauschen/Verschieben), Name und Farbe änderbar
 *   picked, onPick, onTeam, onRename, onColor
 */
export function teamCard(index, members, { style, interactive = false, picked = null, onPick, onTeam, onRename, onColor } = {}) {
  const code = groupCode(index, style);
  const custom = style?.names?.[index];
  // Neben dem großen Zeichen: eigener Name, sonst das Wort („Gruppe“) bzw. bei Farbnamen „Gruppe Blau“
  const title = custom || (code ? groupWord(style) : groupLabel(index, style));
  const count = members.length === 1 ? '1 Person' : `${members.length} Personen`;

  const mark = code
    ? h('span', { class: 'team-num' }, code)
    : h('span', { class: 'team-dot', 'aria-hidden': 'true' });

  const head = h('header', { class: 'team-head' },
    h('span', { class: 'team-name' },
      interactive
        ? h('button', { type: 'button', class: 'team-mark-btn', 'aria-label': `Farbe von ${groupLabel(index, style)} ändern`, title: 'Farbe ändern', onClick: (e) => { e.stopPropagation(); onColor?.(index); } }, mark)
        : mark,
      interactive
        ? h('button', { type: 'button', class: 'team-title-btn', title: 'Namen ändern', 'aria-label': `${groupLabel(index, style)} umbenennen`, onClick: (e) => { e.stopPropagation(); onRename?.(index); } }, h('span', { class: 'team-title' }, title))
        : h('span', { class: 'team-title' }, title)),
    h('span', { class: 'team-count' }, count));

  const list = h('ul', { class: 'team-members' }, members.map((p) => h('li', { 'data-id': p.id },
    interactive
      ? h('button', {
        type: 'button', class: `member${picked === p.id ? ' is-picked' : ''}`, 'data-key': `m-${p.id}`,
        'aria-pressed': String(picked === p.id),
        onClick: (e) => { e.stopPropagation(); onPick?.(p.id, index); },
      }, p.name)
      : h('span', { class: 'member' }, p.name))));

  const card = h('article', {
    class: `team-card${interactive && picked ? ' is-target' : ''}`,
    ...colorVars(index, style),
    '--i': index,
    'data-team': index,
    'aria-label': `${groupLabel(index, style)}, ${count}`,
  }, head, list);

  if (interactive && picked && !members.some((p) => p.id === picked)) {
    card.append(h('button', { type: 'button', class: 'move-here', 'data-key': `t-${index}`, onClick: () => onTeam?.(index) }, 'Hierher verschieben'));
  }
  return card;
}
