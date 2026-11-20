import { h, screenHead } from './dom.js';

export const title = 'Einstellungen';

export function render() {
  return [
    screenHead('Einstellungen'),
    h('section', { class: 'empty' },
      h('h2', {}, 'Deine Daten bleiben hier'),
      h('p', {}, 'Mixup speichert Klassen, Regeln und Ergebnisse nur auf diesem Gerät. Es gibt kein Konto und keine Cloud.'),
      h('span', { class: 'dev-note' }, 'Sicherung, Teamnamen und Anzeige-Optionen folgen in M2–M5'),
      h('a', { class: 'btn', href: '#/' }, 'Zur Klassenübersicht'),
    ),
  ];
}
