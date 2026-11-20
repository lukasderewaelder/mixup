import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateState, formatLevel, clampLevel, DEFAULT_GROUP_STYLE } from '../js/model.js';
import { groupLabel, groupCode, groupColor, templateLabel, COLOR_NAMES } from '../js/labels.js';
import { parseLevel } from '../js/import.js';
import { checkRules } from '../js/teams/algorithm.js';

const style = (patch) => ({ ...structuredClone(DEFAULT_GROUP_STYLE), ...patch });

describe('Gruppen-Bezeichnung', () => {
  test('Standard: Team 1, 2, 3 in den Farben 1, 2, 3', () => {
    assert.equal(groupLabel(0), 'Team 1');
    assert.equal(groupCode(2, style({})), '3');
    assert.equal(groupColor(2, style({})), 2);
  });

  test('Wort und Zählung: Gruppe A, Tisch C, eigenes Wort', () => {
    assert.equal(groupLabel(0, style({ word: 'Gruppe', numbering: 'letter' })), 'Gruppe A');
    assert.equal(groupLabel(2, style({ word: 'Tisch', numbering: 'letter' })), 'Tisch C');
    assert.equal(groupLabel(19, style({ word: 'Station', numbering: 'letter' })), 'Station T');
    assert.equal(groupLabel(1, style({ word: 'custom', customWord: 'Crew' })), 'Crew 2');
    assert.equal(groupLabel(1, style({ word: 'custom', customWord: '' })), 'Gruppe 2', 'leeres eigenes Wort → Gruppe');
  });

  test('Farbnamen folgen der gewählten Farbe; kein großes Zeichen', () => {
    const s = style({ word: 'Gruppe', numbering: 'color', colors: { 0: 14 } });
    assert.equal(groupLabel(0, s), `Gruppe ${COLOR_NAMES[14]}`);
    assert.equal(groupLabel(1, s), 'Gruppe Rost');
    assert.equal(groupCode(0, s), '');
  });

  test('eigener Name auf der Karte gewinnt; Zeichen bleibt', () => {
    const s = style({ numbering: 'letter', names: { 0: 'Füchse' } });
    assert.equal(groupLabel(0, s), 'Füchse');
    assert.equal(groupCode(0, s), 'A');
    assert.equal(templateLabel(0, s), 'Team A');
  });

  test('20 Farbnamen, alle verschieden', () => {
    assert.equal(new Set(COLOR_NAMES).size, 20);
  });

  test('Regel-Hinweise nutzen die Bezeichnung der Klasse', () => {
    const players = [{ id: 'a', name: 'Aylin' }, { id: 'b', name: 'Ben' }];
    const groups = [{ id: 'g', name: 'Streit', type: 'apart', playerIds: ['a', 'b'] }];
    const s = style({ word: 'Gruppe', numbering: 'letter' });
    const [w] = checkRules([['a', 'b'], []], { players, groups, label: (i) => groupLabel(i, s) });
    assert.equal(w.message, '„Streit“: Aylin und Ben sind beide in Gruppe A.');
  });
});

describe('Niveau −5 … +5', () => {
  test('Anzeige mit Vorzeichen und typografischem Minus', () => {
    assert.equal(formatLevel(3), '+3');
    assert.equal(formatLevel(0), '0');
    assert.equal(formatLevel(-4), '−4');
  });

  test('Begrenzen: außerhalb oder unlesbar → 0', () => {
    assert.equal(clampLevel(5), 5);
    assert.equal(clampLevel(-5), -5);
    assert.equal(clampLevel(6), 0);
    assert.equal(clampLevel('x'), 0);
    assert.equal(clampLevel(2.4), 2);
  });

  test('Import liest Vorzeichen', () => {
    assert.equal(parseLevel('+3'), 3);
    assert.equal(parseLevel('-2'), -2);
    assert.equal(parseLevel('−5'), -5);
    assert.equal(parseLevel('0'), 0);
    assert.equal(parseLevel('6'), null);
    assert.equal(parseLevel('w'), null);
  });

  test('Daten aus Version 1.0: Niveau 1–5 → −4 … +4, globale Teamnamen → jede Klasse', () => {
    const old = {
      version: 1,
      settings: { teamNames: ['Füchse', '', 'Eulen'], showLevel: false },
      classes: [{
        id: 'c', name: '9a',
        players: [1, 2, 3, 4, 5].map((l) => ({ id: `p${l}`, name: `P${l}`, level: l })),
      }],
    };
    const s = validateState(old);
    assert.deepEqual(s.classes[0].players.map((p) => p.level), [-4, -2, 0, 2, 4]);
    assert.deepEqual(s.classes[0].groupStyle.names, { 0: 'Füchse', 2: 'Eulen' });
    assert.equal(s.settings.teamNames, undefined);
    assert.equal(s.settings.showLevel, true);
    assert.equal(s.version, 2);
  });
});
