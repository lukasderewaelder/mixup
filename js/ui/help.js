// Kurzanleitung (in unter einer Minute lesbar): links die Schritte, rechts was die Optionen bewirken.
import { h } from './dom.js';
import { openDialog } from './dialogs.js';

const STEPS = [
  ['Namen eintragen', '„+ Namen“: eintippen, Liste einfügen oder Datei laden.'],
  ['Wer fehlt?', '⊘ neben dem Namen antippen. Gilt nur für heute.'],
  ['Größe wählen', 'Mit − und + die Zahl einstellen. Die Zahl antippen wechselt zwischen „Teams“ und „pro Team“.'],
  ['Losen', '„Teams losen“ oder Leertaste. Danach zeigt die Klassenansicht die Teams groß für die Tafel.'],
  ['Anpassen', 'Einen Namen in ein anderes Team ziehen: auf einen Namen = tauschen, auf die Karte = verschieben.'],
];

const EFFECTS = [
  ['Zufällig', 'reines Losglück.'],
  ['Gleich stark', 'jedes Team hat dieselbe Niveau-Summe – für Wettkämpfe.'],
  ['Gemischt', 'jedes Team hat im Schnitt dasselbe Niveau – für Gruppenarbeit.'],
  ['Gleiches Niveau', 'ähnlich Starke kommen zusammen – für gestufte Aufgaben.'],
  ['Niveau −5 bis +5', 'Namen antippen. Erscheint nie in der Klassenansicht.'],
  ['Regeln', '„Zusammen“ = immer im selben Team, „Getrennt“ = möglichst verschiedene Teams.'],
  ['Geschlechter mischen', 'verteilt sie gleichmäßig auf die Teams.'],
  ['Wiederholungen vermeiden', 'wer in den letzten drei Einteilungen zusammen war, kommt möglichst nicht wieder zusammen.'],
  ['Wenn es nicht aufgeht', 'nur bei „pro Team“: ein Team mehr oder weniger Personen, oder der Rest bildet ein eigenes Team.'],
];

export function openHelp() {
  openDialog({
    title: 'Kurzanleitung',
    size: 'wide',
    className: 'help-dialog',
    body: h('div', { class: 'help' },
      h('section', { class: 'help-col' },
        h('h3', { class: 'sheet-title' }, 'So geht’s'),
        h('ol', { class: 'help-steps' }, STEPS.map(([t, d]) => h('li', {}, h('strong', {}, t), ' ', d)))),
      h('section', { class: 'help-col' },
        h('h3', { class: 'sheet-title' }, 'Was die Optionen bewirken'),
        h('ul', { class: 'help-effects' }, EFFECTS.map(([t, d]) => h('li', {}, h('strong', {}, `${t}:`), ' ', d))),
        h('p', { class: 'field-hint' }, 'Alles unter „Optionen“. Die Namen bleiben nur auf diesem Gerät.'))),
    actions: [{ label: 'Verstanden', icon: 'check', variant: 'primary' }],
  });
}
