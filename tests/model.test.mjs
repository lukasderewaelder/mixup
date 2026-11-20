import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import { parseNameList, parseCsv } from '../js/import.js';
import { seededRandom } from '../js/teams/random.js';

const TODAY = '2026-11-20';

function sampleClass() {
  const cls = M.createClass('9a Chemie');
  M.addPlayers(cls, ['Aylin', 'Ben', 'Clara', 'Deniz', 'Emil', 'Fatma'].map((name) => ({ name })));
  return cls;
}
const id = (cls, name) => cls.players.find((p) => p.name === name).id;

describe('Personen', () => {
  test('hinzufügen: Leerzeichen bereinigt, Doppelte (ohne Groß/Klein) übersprungen', () => {
    const cls = sampleClass();
    const { added, duplicates } = M.addPlayers(cls, [{ name: '  Greta   Maier ' }, { name: 'aylin' }, { name: '' }, { name: 'Greta Maier' }]);
    assert.deepEqual(added.map((p) => p.name), ['Greta Maier']);
    assert.deepEqual(duplicates, ['aylin', 'Greta Maier']);
    assert.equal(added[0].level, 0);
    assert.equal(added[0].gender, null);
  });

  test('umbenennen verhindert Dubletten', () => {
    const cls = sampleClass();
    assert.equal(M.renamePlayer(cls, id(cls, 'Ben'), 'clara').ok, false);
    assert.equal(M.renamePlayer(cls, id(cls, 'Ben'), '').ok, false);
    assert.equal(M.renamePlayer(cls, id(cls, 'Ben'), 'Ben K.').ok, true);
  });

  test('löschen entfernt Person überall; zu kleine Regeln verschwinden', () => {
    const cls = sampleClass();
    const [a, b, c] = ['Aylin', 'Ben', 'Clara'].map((n) => id(cls, n));
    M.addGroup(cls, 'together', [a, b]);
    M.addGroup(cls, 'apart', [a, b, c]);
    M.setAbsent(cls, a, true, TODAY);
    M.recordResult(cls, { teams: [[a, b], [c]] }, {});
    M.removePlayers(cls, [a]);
    assert.equal(cls.players.length, 5);
    assert.equal(cls.groups.length, 1);
    assert.deepEqual(cls.groups[0].playerIds, [b, c]);
    assert.deepEqual(cls.absent.ids, []);
    assert.deepEqual(cls.history[0].teams, [[b], [c]]);
  });
});

describe('Anwesenheit', () => {
  test('gilt nur für den Tag, an dem sie gesetzt wurde', () => {
    const cls = sampleClass();
    M.setAbsent(cls, id(cls, 'Ben'), true, TODAY);
    assert.equal(M.presentCount(cls, TODAY), 5);
    assert.equal(M.presentCount(cls, '2026-11-21'), 6);
    assert.equal(M.playersForToday(cls, TODAY).find((p) => p.name === 'Ben').active, false);
    M.setAbsent(cls, id(cls, 'Clara'), true, '2026-11-21');
    assert.equal(M.presentCount(cls, '2026-11-21'), 5, 'alte Abwesenheit verfällt');
  });
});

describe('Regeln', () => {
  test('Standardname aus Mitgliedern', () => {
    const cls = sampleClass();
    const g = M.addGroup(cls, 'together', ['Aylin', 'Ben', 'Clara', 'Deniz'].map((n) => id(cls, n)));
    assert.equal(g.name, 'Aylin, Ben und 2 weitere');
    assert.equal(M.addGroup(cls, 'apart', [id(cls, 'Emil')]), null);
  });
});

describe('Verlauf', () => {
  test('höchstens 10 Einträge, neueste zuerst', () => {
    const cls = sampleClass();
    for (let i = 0; i < 12; i++) M.recordResult(cls, { teams: [[String(i)]] }, {});
    assert.equal(cls.history.length, 10);
    assert.deepEqual(cls.history[0].teams, [['11']]);
    assert.equal(M.currentResult(cls).teams[0][0], '11');
  });

  test('„Neu losen“ ersetzt das aktuelle Ergebnis und zählt nicht fürs Gedächtnis', () => {
    const cls = sampleClass();
    M.recordResult(cls, { teams: [['a', 'b']] }, {});
    M.recordResult(cls, { teams: [['c', 'd']] }, {});
    assert.equal(M.memoryFor(cls, { replaceCurrent: true }).length, 1);
    M.recordResult(cls, { teams: [['e', 'f']] }, {}, { replaceCurrent: true });
    assert.equal(cls.history.length, 2);
    assert.deepEqual(cls.history[0].teams, [['e', 'f']]);
  });

  test('verschieben und tauschen', () => {
    const entry = { teams: [['a', 'b'], ['c']] };
    assert.ok(M.movePlayer(entry, 'b', 1));
    assert.deepEqual(entry.teams, [['a'], ['c', 'b']]);
    assert.ok(M.swapPlayers(entry, 'a', 'c'));
    assert.deepEqual(entry.teams, [['c'], ['a', 'b']]);
    assert.equal(M.swapPlayers(entry, 'a', 'b'), false, 'gleiches Team');
    assert.ok(entry.edited);
  });
});

describe('Zufallsperson', () => {
  test('ohne Zurücklegen: alle genau einmal, dann neue Runde', () => {
    const cls = sampleClass();
    const pool = cls.players.map((p) => p.id);
    const rng = seededRandom(3);
    const seen = [];
    for (let i = 0; i < 6; i++) seen.push(M.drawPerson(cls, pool, rng).id);
    assert.equal(new Set(seen).size, 6);
    assert.equal(M.remainingInDraw(cls, pool), 6, 'alle dran → wieder voll');
    const next = M.drawPerson(cls, pool, rng);
    assert.equal(next.newRound, true);
    assert.equal(next.remaining, 5);
  });

  test('immer aus allen: Wiederholungen möglich', () => {
    const cls = sampleClass();
    cls.draw.mode = 'any';
    const pool = cls.players.slice(0, 2).map((p) => p.id);
    const rng = seededRandom(1);
    const ids = Array.from({ length: 20 }, () => M.drawPerson(cls, pool, rng).id);
    assert.ok(ids.some((x, i) => i && x === ids[i - 1]));
  });
});

describe('Laden und Sicherung', () => {
  test('validateState: verlustfrei hin und zurück (Abnahme 7)', () => {
    const s = M.createState();
    const cls = sampleClass();
    M.addGroup(cls, 'apart', [id(cls, 'Aylin'), id(cls, 'Ben')]);
    M.recordResult(cls, { teams: [[id(cls, 'Aylin')], [id(cls, 'Ben')]] }, { value: 2 });
    s.classes.push(cls);
    s.activeClassId = cls.id;
    cls.groupStyle = { word: 'custom', customWord: 'Tisch', numbering: 'letter', names: { 0: 'Füchse' }, colors: { 1: 7 } };
    const back = M.validateState(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(back, s);
  });

  test('validateState bereinigt kaputte Teile und lehnt Fremdes ab', () => {
    assert.throws(() => M.validateState({ foo: 1 }), /keine Mixup-Sicherung/);
    assert.throws(() => M.validateState({ version: 99, classes: [] }), /neueren/);
    const s = M.validateState({ version: 2, classes: [{ id: 'c', name: 'X', players: [{ id: 'p', name: ' A ', level: 9, gender: 'x' }, { name: 'ohne id' }], groups: [{ type: 'together', playerIds: ['p', 'fehlt'] }] }] });
    assert.deepEqual(s.classes[0].players, [{ id: 'p', name: 'A', level: 0, gender: null }]);
    assert.equal(s.classes[0].groups.length, 0);
  });

  test('zusammenführen: neue Klassen dazu, neuere Fassung gewinnt', () => {
    const a = M.createState();
    const c1 = M.createClass('A'); c1.updatedAt = '2026-01-01';
    a.classes.push(c1);
    const b = M.createState();
    const c1b = structuredClone(c1); c1b.name = 'A neu'; c1b.updatedAt = '2026-02-01';
    b.classes.push(c1b, M.createClass('B'));
    const { state, added, updated } = M.mergeStates(a, b);
    assert.equal(added, 1);
    assert.equal(updated, 1);
    assert.equal(state.classes[0].name, 'A neu');
  });

  test('Klasse duplizieren: neue ID, ohne Verlauf, eindeutiger Name', () => {
    const cls = sampleClass();
    M.recordResult(cls, { teams: [] }, {});
    const copy = M.duplicateClass(cls, ['9a Chemie (Kopie)']);
    assert.notEqual(copy.id, cls.id);
    assert.equal(copy.name, '9a Chemie (Kopie 2)');
    assert.equal(copy.history.length, 0);
    assert.equal(copy.players.length, 6);
  });
});

describe('Import', () => {
  test('eingefügte Liste: Aufzählungen und Nummern entfernt', () => {
    const r = parseNameList('1. Anna\n- Ben\n• Clara\n\n  Deniz  \nMüller, Emil\n3) Fatma');
    assert.deepEqual(r.map((e) => e.name), ['Anna', 'Ben', 'Clara', 'Deniz', 'Müller, Emil', 'Fatma']);
  });

  test('CSV mit Kopfzeile Vorname;Nachname;Niveau;Geschlecht', () => {
    const r = parseCsv('﻿Nachname;Vorname;Niveau;Geschlecht\nMeier;Anna;4;w\nYılmaz;Can;x;männlich\n');
    assert.deepEqual(r.entries, [
      { name: 'Anna Meier', level: 4, gender: 'w' },
      { name: 'Can Yılmaz', level: null, gender: 'm' },
    ]);
    assert.deepEqual(r.columns, ['Vorname/Nachname', 'Niveau', 'Geschlecht']);
  });

  test('CSV ohne Kopfzeile, Komma, Anführungszeichen', () => {
    const r = parseCsv('"Müller, Anna",3,w\nBen,m\nClara');
    assert.deepEqual(r.entries, [
      { name: 'Müller, Anna', level: 3, gender: 'w' },
      { name: 'Ben', level: null, gender: 'm' },
      { name: 'Clara', level: null, gender: null },
    ]);
  });

  test('Textdatei ohne Trennzeichen = eine Person pro Zeile', () => {
    assert.deepEqual(parseCsv('Anna\r\nBen\r\n').entries.map((e) => e.name), ['Anna', 'Ben']);
  });
});
