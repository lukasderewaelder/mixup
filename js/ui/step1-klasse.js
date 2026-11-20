import { h, screenHead, stepActions } from './dom.js';

export const title = 'Klasse';
export const step = 1;

export function render() {
  return [
    screenHead('Wer ist heute da?', 'Tippe auf einen Namen, um ihn für heute abwesend zu setzen.'),
    h('section', { class: 'empty' },
      h('p', {}, 'Hier stehen bald die Namen der Klasse.'),
      h('span', { class: 'dev-note' }, 'Namensliste, Abwesenheit und Regeln folgen in M2'),
    ),
    stepActions({ href: '#/', label: 'Klassen' }, { href: '#/einstellen', label: 'Weiter' }),
  ];
}
