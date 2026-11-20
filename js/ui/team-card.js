// Teamkarte – gemeinsam für Ergebnis, Beamer und Druck.
import { h } from './dom.js';
import { byName } from '../model.js';

export function teamLabel(index, settings) {
  const custom = settings?.teamNames?.[index];
  return custom ? custom : `Team ${index + 1}`;
}

/** Namen eines Teams in der eingestellten Reihenfolge. */
export function orderedMembers(ids, players, settings) {
  const named = ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  return settings?.nameOrder === 'draw' ? named : named.sort((a, b) => byName(a.name, b.name));
}

/**
 * @param {number} index
 * @param {{id,name}[]} members  bereits sortiert
 * @param {object} o  settings, interactive (Ergebnis: Personen antippbar), picked, onPick, onTeam
 */
export function teamCard(index, members, { settings, interactive = false, picked = null, onPick, onTeam } = {}) {
  const n = index + 1;
  const custom = settings?.teamNames?.[index];
  const count = members.length === 1 ? '1 Person' : `${members.length} Personen`;

  const head = h('header', { class: 'team-head' },
    h('span', { class: 'team-name' }, h('span', { class: 'team-num' }, n), h('span', { class: 'team-title' }, custom || 'Team')),
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
    '--c': `var(--team-${n})`, '--c-tint': `var(--team-${n}-tint)`, '--c-ink': `var(--team-${n}-ink)`,
    '--i': index,
    'data-team': index,
    'aria-label': `${teamLabel(index, settings)}, ${count}`,
  }, head, list);

  if (interactive && picked) {
    const already = members.some((p) => p.id === picked);
    if (!already) {
      card.append(h('button', { type: 'button', class: 'move-here', 'data-key': `t-${index}`, onClick: () => onTeam?.(index) }, `Hierher verschieben`));
    }
  }
  return card;
}
