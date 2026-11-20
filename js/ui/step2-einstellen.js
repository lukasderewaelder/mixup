import { h, screenHead, stepActions } from './dom.js';

export const title = 'Teams einstellen';
export const step = 2;

export function render() {
  return [
    screenHead('Teams einstellen', 'Lege fest, wie viele Teams entstehen sollen.'),
    h('section', { class: 'draw-stage', 'aria-label': 'Losen' },
      h('p', { class: 'preview-line' }, '6 Teams mit 4 oder 5 Personen'),
      h('a', { class: 'btn btn-primary btn-draw', href: '#/ergebnis' }, 'Losen'),
      h('span', { class: 'dev-note' }, 'Anzahl, Größe, Modus und Vorschau folgen in M3'),
    ),
    stepActions({ href: '#/klasse', label: 'Zurück' }, null),
  ];
}
