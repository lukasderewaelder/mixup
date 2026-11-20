import { h, screenHead } from './dom.js';

export const title = 'Klassen';

export function render() {
  return [
    screenHead('Klassen', 'Wähle eine Klasse oder lege eine neue an.'),
    h('section', { class: 'empty', 'aria-label': 'Noch keine Klasse' },
      h('h2', {}, 'Noch keine Klasse angelegt'),
      h('p', {}, 'Namen kannst du eintippen, aus einer Liste einfügen oder als Datei laden. Alles bleibt auf diesem Gerät.'),
      h('a', { class: 'btn btn-primary', href: '#/klasse' }, 'Neue Klasse anlegen'),
      h('span', { class: 'dev-note' }, 'Klassenverwaltung folgt in M2'),
    ),
  ];
}
