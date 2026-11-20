import { h, screenHead, stepActions } from './dom.js';

export const title = 'Ergebnis';
export const step = 3;

// Erfundene Beispielnamen, nur um das Kartenbild zu zeigen (bis M3 echte Teams liefert).
const SAMPLE = [
  ['Aylin', 'Ben', 'Clara', 'Deniz'],
  ['Emil', 'Fatma', 'Greta', 'Hamza', 'Ida'],
  ['Jonas', 'Kübra', 'Leon', 'Mira'],
  ['Noah', 'Olivia', 'Paul', 'Rania'],
  ['Samuel', 'Tilda', 'Umut', 'Vivien', 'Yusuf'],
  ['Zoe', 'Anton', 'Lina', 'Milan'],
];

export function teamCard(index, members) {
  const n = index + 1;
  return h('article', {
    class: 'team-card',
    '--c': `var(--team-${n})`, '--c-tint': `var(--team-${n}-tint)`, '--c-ink': `var(--team-${n}-ink)`,
    '--i': index,
    'aria-label': `Team ${n}, ${members.length} Personen`,
  },
    h('header', { class: 'team-head' },
      h('span', { class: 'team-name' }, 'Team', h('span', { class: 'team-num' }, n)),
      h('span', { class: 'team-count' }, `${members.length} Personen`),
    ),
    h('ul', { class: 'team-members' }, members.map((m) => h('li', {}, m))),
  );
}

export function render() {
  return [
    screenHead('Teams', 'Beispiel mit erfundenen Namen.',
      h('a', { class: 'btn', href: '#/einstellen' }, 'Neu losen')),
    h('section', { class: 'team-grid is-fresh', 'aria-label': 'Teams' }, SAMPLE.map((m, i) => teamCard(i, m))),
    stepActions({ href: '#/einstellen', label: 'Zurück' }, null),
  ];
}
