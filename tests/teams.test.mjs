import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom, shuffle } from '../js/teams/random.js';
import { teamCount, sizeRange, previewText } from '../js/teams/sizes.js';
import { buildBlocks } from '../js/teams/blocks.js';
import { makeTeams, checkRules } from '../js/teams/algorithm.js';

// ---------- Hilfen ----------
const NAMES = ['Aylin', 'Ben', 'Clara', 'Deniz', 'Emil', 'Fatma', 'Greta', 'Hamza', 'Ida', 'Jonas', 'Kübra', 'Leon',
  'Mira', 'Noah', 'Olivia', 'Paul', 'Rania', 'Samuel', 'Tilda', 'Umut', 'Vivien', 'Yusuf', 'Zoe', 'Anton',
  'Lina', 'Milan', 'Nele', 'Oskar', 'Pia', 'Quentin', 'Rosa', 'Sinan', 'Tara', 'Ugo', 'Vera'];

function makePlayers(n, rng, extra = () => ({})) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: NAMES[i] || `P${i + 1}`, active: true, ...extra(i, rng) }));
}

function assertValid(result, players, label = '') {
  const present = players.filter((p) => p.active !== false).map((p) => p.id).sort();
  const placed = result.teams.flat().sort();
  assert.deepEqual(placed, present, `${label}: jede anwesende Person genau einmal`);
  const sizes = result.teams.map((t) => t.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${label}: Größen ${sizes}`);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---------- Zufall ----------
describe('Zufall', () => {
  test('Startwert liefert reproduzierbare Folge', () => {
    const a = seededRandom(42), b = seededRandom(42);
    for (let i = 0; i < 10; i++) assert.equal(a(), b());
  });
  test('shuffle ergibt eine Umordnung derselben Elemente', () => {
    const arr = shuffle([...Array(30).keys()], seededRandom(1));
    assert.deepEqual([...arr].sort((x, y) => x - y), [...Array(30).keys()]);
    assert.notDeepEqual(arr, [...Array(30).keys()]);
  });
});

// ---------- Größen ----------
describe('Teamanzahl und -größen', () => {
  test('Anzahl: begrenzt auf 1 … min(20, n)', () => {
    assert.equal(teamCount(0, 'count', 4), 0);
    assert.equal(teamCount(25, 'count', 4), 4);
    assert.equal(teamCount(3, 'count', 5), 3);
    assert.equal(teamCount(35, 'count', 30), 20);
    assert.equal(teamCount(10, 'count', 0), 1);
  });
  test('Größe: lieber eine Person mehr (E25), aber nie größere Abweichung', () => {
    assert.equal(teamCount(25, 'size', 4), 6);  // 5 × 4 + 1 × 5 statt 4 × 4 + 3 × 3
    assert.equal(teamCount(24, 'size', 4), 6);
    assert.equal(teamCount(7, 'size', 4), 2);   // 4 + 3 statt 1 × 7
    assert.equal(teamCount(10, 'size', 4), 2);  // 5 + 5 (gleich weit weg wie 4 + 3 + 3)
    assert.equal(teamCount(5, 'size', 4), 1);
    assert.equal(teamCount(3, 'size', 4), 1);
    assert.equal(teamCount(26, 'size', 2), 13);
    assert.equal(teamCount(35, 'size', 1), 20);
  });
  test('Größenbereich', () => {
    assert.deepEqual(sizeRange(25, 6), { lo: 4, hi: 5, bigCount: 1 });
    assert.deepEqual(sizeRange(24, 6), { lo: 4, hi: 4, bigCount: 0 });
  });
  test('Vorschau-Text', () => {
    assert.equal(previewText(25, 6), '6 Teams: 5 × 4 und 1 × 5 Personen');
    assert.equal(previewText(24, 6), '6 Teams mit je 4 Personen');
    assert.equal(previewText(5, 1), '1 Team mit 5 Personen');
    assert.equal(previewText(3, 3), '3 Teams mit je 1 Person');
    assert.equal(previewText(0, 0), 'Niemand ist als anwesend markiert');
  });
});

// ---------- Zusammen-Blöcke ----------
describe('Zusammen-Blöcke', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  test('überlappende Gruppen werden zu einem Block', () => {
    const { blocks } = buildBlocks(ids, [
      { id: 'g1', name: 'X', playerIds: ['a', 'b'] },
      { id: 'g2', name: 'Y', playerIds: ['b', 'c'] },
    ], 4);
    const big = blocks.find((b) => b.includes('a'));
    assert.deepEqual([...big].sort(), ['a', 'b', 'c']);
    assert.equal(blocks.length, 4);
  });
  test('zu großer Block: Gruppe wird nicht angewendet und gemeldet', () => {
    const { blocks, warnings } = buildBlocks(ids, [
      { id: 'g1', name: 'Freunde', playerIds: ['a', 'b', 'c', 'd', 'e'] },
    ], 4);
    assert.equal(blocks.length, 6);
    assert.equal(warnings[0].type, 'together-too-big');
    assert.match(warnings[0].message, /„Freunde“ umfasst 5 Personen, ein Team aber höchstens 4/);
  });
  test('Abwesende zählen nicht', () => {
    const { blocks } = buildBlocks(['a', 'b'], [{ id: 'g', name: 'Z', playerIds: ['a', 'x', 'y'] }], 2);
    assert.equal(blocks.length, 2);
  });
});

// ---------- Teambildung ----------
describe('Teambildung: Grundregeln', () => {
  test('niemand anwesend → Hinweis, keine Teams', () => {
    const r = makeTeams({ players: [{ id: 'a', name: 'A', active: false }] });
    assert.deepEqual(r.teams, []);
    assert.equal(r.warnings[0].type, 'no-players');
  });

  test('Abnahme 3: jede Person genau einmal, Größen um max. 1 verschieden (500 Zufallsfälle)', () => {
    const rng = seededRandom(7);
    for (let run = 0; run < 500; run++) {
      const n = 1 + Math.floor(rng() * 35);
      const players = makePlayers(n, rng, (i, r) => ({
        level: -5 + Math.floor(r() * 11),
        gender: ['m', 'w', 'd', null][Math.floor(r() * 4)],
        active: r() > 0.1,
      }));
      if (!players.some((p) => p.active)) players[0].active = true;
      const options = {
        by: rng() < 0.5 ? 'count' : 'size',
        value: 1 + Math.floor(rng() * 22),
        mode: ['random', 'strength', 'balanced', 'equal'][Math.floor(rng() * 4)],
        mixGender: rng() < 0.5,
      };
      const r = makeTeams({ players, options, rng });
      assertValid(r, players, `Lauf ${run}`);
      assert.ok(r.teams.length >= 1 && r.teams.length <= 20);
    }
  });

  test('Abwesende werden nicht eingeteilt', () => {
    const players = makePlayers(10, null);
    players[3].active = false;
    const r = makeTeams({ players, options: { value: 3 }, rng: seededRandom(3) });
    assert.ok(!r.teams.flat().includes('p4'));
    assertValid(r, players);
  });

  test('zu viele Teams gewünscht → Hinweis', () => {
    const r = makeTeams({ players: makePlayers(3, null), options: { value: 5 }, rng: seededRandom(1) });
    assert.equal(r.teams.length, 3);
    assert.equal(r.warnings[0].type, 'fewer-teams');
  });

  test('reiner Zufall: verschiedene Läufe ergeben verschiedene Teams', () => {
    const players = makePlayers(24, null);
    const a = makeTeams({ players, options: { value: 4 } });
    const b = makeTeams({ players, options: { value: 4 } });
    const key = (r) => r.teams.map((t) => [...t].sort().join(',')).sort().join('|');
    assert.notEqual(key(a), key(b));
  });

  test('reiner Zufall: jede Person landet etwa gleich oft mit jeder anderen zusammen', () => {
    const players = makePlayers(12, null);
    const rng = seededRandom(11);
    const together = new Map();
    const runs = 3000;
    for (let i = 0; i < runs; i++) {
      for (const t of makeTeams({ players, options: { value: 3 }, rng }).teams) {
        if (t.includes('p1')) for (const id of t) if (id !== 'p1') together.set(id, (together.get(id) || 0) + 1);
      }
    }
    // Erwartung: 3 von 11 anderen → 3/11 der Läufe
    const expected = (runs * 3) / 11;
    for (const [id, c] of together) assert.ok(Math.abs(c - expected) < expected * 0.12, `${id}: ${c} statt ≈ ${expected.toFixed(0)}`);
  });
});

describe('Teambildung: Regeln (Abnahme 4)', () => {
  test('Zusammen-Gruppen bleiben immer zusammen', () => {
    const rng = seededRandom(21);
    for (let run = 0; run < 200; run++) {
      const players = makePlayers(25, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11) }));
      const groups = [
        { id: 'g1', name: 'Freunde', type: 'together', playerIds: ['p1', 'p2', 'p3'] },
        { id: 'g2', name: 'Lernpaar', type: 'together', playerIds: ['p10', 'p11'] },
      ];
      const r = makeTeams({ players, groups, options: { by: 'size', value: 4, mode: run % 2 ? 'balanced' : 'random' }, rng });
      assertValid(r, players);
      const teamOf = (id) => r.teams.findIndex((t) => t.includes(id));
      assert.equal(teamOf('p1'), teamOf('p2'));
      assert.equal(teamOf('p1'), teamOf('p3'));
      assert.equal(teamOf('p10'), teamOf('p11'));
      assert.deepEqual(r.warnings, []);
    }
  });

  test('Getrennt-Gruppe ≤ Teamanzahl: alle in verschiedenen Teams', () => {
    const rng = seededRandom(5);
    for (let run = 0; run < 200; run++) {
      const players = makePlayers(24, rng);
      const groups = [{ id: 'g', name: 'Streithähne', type: 'apart', playerIds: ['p1', 'p2', 'p3', 'p4'] }];
      const r = makeTeams({ players, groups, options: { value: 4 }, rng });
      const teams = ['p1', 'p2', 'p3', 'p4'].map((id) => r.teams.findIndex((t) => t.includes(id)));
      assert.equal(new Set(teams).size, 4);
      assert.deepEqual(r.warnings, []);
    }
  });

  test('Getrennt-Gruppe > Teamanzahl: so gleichmäßig wie möglich', () => {
    const rng = seededRandom(6);
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    for (let run = 0; run < 100; run++) {
      const r = makeTeams({ players: makePlayers(20, rng), groups: [{ id: 'g', name: 'X', type: 'apart', playerIds: ids }], options: { value: 4 }, rng });
      for (const t of r.teams) assert.ok(t.filter((id) => ids.includes(id)).length <= 2);
      assert.deepEqual(r.warnings, []);
    }
  });

  test('Zusammen + Getrennt widersprechen sich → Verstoß wird namentlich gemeldet', () => {
    const groups = [
      { id: 'g1', name: 'Paar', type: 'together', playerIds: ['p1', 'p2'] },
      { id: 'g2', name: 'Streit', type: 'apart', playerIds: ['p1', 'p2'] },
    ];
    const r = makeTeams({ players: makePlayers(12, null), groups, options: { value: 3 }, rng: seededRandom(2) });
    assert.equal(r.warnings.length, 1);
    assert.equal(r.warnings[0].type, 'apart-violated');
    assert.match(r.warnings[0].message, /^„Streit“: Aylin und Ben sind beide in Team \d\.$/);
  });

  test('Regeln abgeschaltet (global oder einzeln) werden ignoriert', () => {
    const players = makePlayers(12, null);
    const groups = [{ id: 'g', name: 'Paar', type: 'together', playerIds: ['p1', 'p2', 'p3', 'p4', 'p5'] }];
    for (const [g, opt] of [[groups, { rulesEnabled: false }], [[{ ...groups[0], enabled: false }], {}]]) {
      const r = makeTeams({ players, groups: g, options: { value: 3, ...opt }, rng: seededRandom(4) });
      assert.deepEqual(r.warnings, []);
    }
  });

  test('zu große Zusammen-Gruppe wird gemeldet, nicht doppelt', () => {
    const groups = [{ id: 'g', name: 'Clique', type: 'together', playerIds: ['p1', 'p2', 'p3', 'p4', 'p5'] }];
    const r = makeTeams({ players: makePlayers(12, null), groups, options: { value: 3 }, rng: seededRandom(4) });
    assert.equal(r.warnings.length, 1);
    assert.equal(r.warnings[0].type, 'together-too-big');
  });

  test('Zusammen-Blöcke, die nicht aufgehen, werden aufgeteilt und gemeldet', () => {
    // 2 Teams à 4: Blöcke 3 + 3 + 2 passen nicht am Stück
    const groups = [
      { id: 'a', name: 'A', type: 'together', playerIds: ['p1', 'p2', 'p3'] },
      { id: 'b', name: 'B', type: 'together', playerIds: ['p4', 'p5', 'p6'] },
      { id: 'c', name: 'C', type: 'together', playerIds: ['p7', 'p8'] },
    ];
    const players = makePlayers(8, null);
    const r = makeTeams({ players, groups, options: { value: 2 }, rng: seededRandom(9) });
    assertValid(r, players);
    assert.ok(r.warnings.some((w) => w.type === 'together-split'));
  });

  test('checkRules nach manuellem Verschieben', () => {
    const players = makePlayers(4, null);
    const groups = [{ id: 'g', name: 'Paar', type: 'together', playerIds: ['p1', 'p2'] }];
    assert.deepEqual(checkRules([['p1', 'p2'], ['p3', 'p4']], { players, groups }), []);
    assert.equal(checkRules([['p1', 'p3'], ['p2', 'p4']], { players, groups })[0].type, 'together-split');
  });
});

describe('Teambildung: Ausgleich', () => {
  test('Abnahme 5: gemischt – Niveau-Durchschnitte weichen höchstens 1,0 ab (Skala −5…+5) (24 Personen, 4 Teams)', () => {
    const rng = seededRandom(13);
    for (let run = 0; run < 100; run++) {
      const players = makePlayers(24, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11) }));
      const level = new Map(players.map((p) => [p.id, p.level]));
      const r = makeTeams({ players, options: { value: 4, mode: 'balanced' }, rng });
      const means = r.teams.map((t) => mean(t.map((id) => level.get(id))));
      assert.ok(Math.max(...means) - Math.min(...means) <= 1.0, `Lauf ${run}: ${means.map((m) => m.toFixed(2))}`);
    }
  });

  test('ausgeglichen auch bei ungleichen Teamgrößen (25 Personen à 4)', () => {
    const rng = seededRandom(14);
    for (let run = 0; run < 50; run++) {
      const players = makePlayers(25, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11) }));
      const level = new Map(players.map((p) => [p.id, p.level]));
      const r = makeTeams({ players, options: { by: 'size', value: 4, mode: 'balanced' }, rng });
      const means = r.teams.map((t) => mean(t.map((id) => level.get(id))));
      assert.ok(Math.max(...means) - Math.min(...means) <= 1.2, `Lauf ${run}: ${means.map((m) => m.toFixed(2))}`);
    }
  });

  test('gleiches Niveau pro Team: Teams sind deutlich einheitlicher als bei Zufall', () => {
    const rng = seededRandom(15);
    const spread = (teams, level) => mean(teams.map((t) => {
      const m = mean(t.map((id) => level.get(id)));
      return mean(t.map((id) => (level.get(id) - m) ** 2));
    }));
    let equal = 0, random = 0;
    for (let run = 0; run < 50; run++) {
      const players = makePlayers(24, rng, (i) => ({ level: [-4, -1, 2, 5][i % 4] })); // je 6 × vier Niveaus
      const level = new Map(players.map((p) => [p.id, p.level]));
      equal += spread(makeTeams({ players, options: { value: 4, mode: 'equal' }, rng }).teams, level);
      random += spread(makeTeams({ players, options: { value: 4, mode: 'random' }, rng }).teams, level);
    }
    assert.ok(equal / 50 < 0.9, `Streuung gleiches Niveau: ${(equal / 50).toFixed(3)}`);
    assert.ok(equal * 5 < random, `kaum besser als Zufall: ${equal} vs. ${random}`);
  });

  test('Gleich stark (Wettkampf): Summen der Teams weichen höchstens 2 ab – auch bei ungleichen Größen', () => {
    const rng = seededRandom(18);
    for (let run = 0; run < 100; run++) {
      const players = makePlayers(25, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11) }));
      const level = new Map(players.map((p) => [p.id, p.level]));
      const r = makeTeams({ players, options: { by: 'size', value: 4, mode: 'strength' }, rng });
      assertValid(r, players);
      const sums = r.teams.map((t) => t.reduce((s, id) => s + level.get(id), 0));
      assert.ok(Math.max(...sums) - Math.min(...sums) <= 2, `Lauf ${run}: Summen ${sums}`);
    }
  });

  test('Gleich stark vs. Gemischt: das größere Team bekommt bei „Gleich stark“ schwächere Personen', () => {
    // 9 Personen, Summe 20 → je Team 10: das 5er-Team hat dann Ø 2,0, das 4er-Team Ø 2,5
    const rng = seededRandom(19);
    let smallerMean = 0;
    for (let run = 0; run < 50; run++) {
      const players = makePlayers(9, rng, (i) => ({ level: [4, 4, 3, 3, 2, 2, 1, 0, 1][i] }));
      const level = new Map(players.map((p) => [p.id, p.level]));
      const r = makeTeams({ players, options: { value: 2, mode: 'strength' }, rng });
      const big = r.teams.find((t) => t.length === 5);
      const small = r.teams.find((t) => t.length === 4);
      const avg = (t) => mean(t.map((id) => level.get(id)));
      if (avg(big) < avg(small)) smallerMean++;
    }
    assert.ok(smallerMean >= 45, `nur ${smallerMean} von 50`);
  });

  test('Geschlechter gleichmäßig: 12 m / 12 w in 4 Teams → je 3 / 3', () => {
    const rng = seededRandom(16);
    for (let run = 0; run < 100; run++) {
      const players = makePlayers(24, rng, (i) => ({ gender: i % 2 ? 'w' : 'm', level: (i % 5) * 2 - 4 }));
      const g = new Map(players.map((p) => [p.id, p.gender]));
      const mode = ['random', 'balanced'][run % 2];
      const r = makeTeams({ players, options: { value: 4, mode, mixGender: true }, rng });
      for (const t of r.teams) assert.equal(t.filter((id) => g.get(id) === 'w').length, 3, `Lauf ${run} (${mode})`);
    }
  });

  test('Niveau fehlt → zählt als 0, kein Absturz', () => {
    const players = makePlayers(10, null);
    const r = makeTeams({ players, options: { value: 2, mode: 'balanced' }, rng: seededRandom(1) });
    assertValid(r, players);
  });
});

describe('Teambildung: Wiederholungen vermeiden (Abnahme 6)', () => {
  const repeatedPairs = (teams, previous) => {
    const old = new Set();
    for (const t of previous) for (const a of t) for (const b of t) if (a < b) old.add(`${a}|${b}`);
    let c = 0;
    for (const t of teams) for (const a of t) for (const b of t) if (a < b && old.has(`${a}|${b}`)) c++;
    return c;
  };

  test('deutlich weniger alte Paare als reiner Zufall (24 Personen, 6 Teams, 200 Läufe)', () => {
    const rng = seededRandom(17);
    const players = makePlayers(24, rng);
    let withMemory = 0, without = 0;
    for (let run = 0; run < 200; run++) {
      const previous = makeTeams({ players, options: { value: 6 }, rng }).teams;
      const history = [{ teams: previous }];
      withMemory += repeatedPairs(makeTeams({ players, history, options: { value: 6, avoidRepeats: true }, rng }).teams, previous);
      without += repeatedPairs(makeTeams({ players, history, options: { value: 6, avoidRepeats: false }, rng }).teams, previous);
    }
    assert.ok(withMemory < without * 0.15, `mit Gedächtnis ${withMemory}, ohne ${without}`);
  });

  test('alle Optionen zugleich: Ausgleich und Geschlechter bleiben vorrangig vor Wiederholungen', () => {
    const rng = seededRandom(5);
    for (let run = 0; run < 60; run++) {
      const players = makePlayers(26, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11), gender: i % 3 ? 'w' : 'm' }));
      const p = new Map(players.map((x) => [x.id, x]));
      const options = { value: 5, mode: 'balanced', mixGender: true, avoidRepeats: true };
      const history = [];
      for (let h = 0; h < 3; h++) history.unshift({ teams: makeTeams({ players, history, options, rng }).teams });
      const r = makeTeams({ players, history, options, rng });
      const means = r.teams.map((t) => mean(t.map((id) => p.get(id).level)));
      assert.ok(Math.max(...means) - Math.min(...means) <= 1.0, `Lauf ${run}: Niveau ${means.map((m) => m.toFixed(2))}`);
      for (const t of r.teams) {
        const w = t.filter((id) => p.get(id).gender === 'w').length;
        assert.ok(Math.abs(w - (t.length * 17) / 26) <= 1, `Lauf ${run}: ${w} w in Team mit ${t.length}`);
      }
    }
  });

  test('Regeln haben Vorrang vor Wiederholungen', () => {
    const players = makePlayers(12, null);
    const groups = [{ id: 'g', name: 'Paar', type: 'together', playerIds: ['p1', 'p2'] }];
    const history = [{ teams: [['p1', 'p2', 'p3', 'p4'], ['p5', 'p6', 'p7', 'p8'], ['p9', 'p10', 'p11', 'p12']] }];
    const r = makeTeams({ players, groups, history, options: { value: 3 }, rng: seededRandom(3) });
    assert.ok(r.teams.some((t) => t.includes('p1') && t.includes('p2')));
  });
});

describe('Laufzeit', () => {
  test('Abnahme 2: 35 Personen mit allen Optionen unter 300 ms', () => {
    const rng = seededRandom(99);
    const players = makePlayers(35, rng, (i, r) => ({ level: -5 + Math.floor(r() * 11), gender: i % 2 ? 'w' : 'm' }));
    const groups = [
      { id: 'a', name: 'A', type: 'together', playerIds: ['p1', 'p2', 'p3'] },
      { id: 'b', name: 'B', type: 'apart', playerIds: ['p4', 'p5', 'p6', 'p7'] },
    ];
    const history = [1, 2, 3].map(() => ({ teams: makeTeams({ players, options: { value: 6 }, rng }).teams }));
    const start = performance.now();
    makeTeams({ players, groups, history, options: { value: 6, mode: 'balanced', mixGender: true, avoidRepeats: true }, rng });
    const ms = performance.now() - start;
    assert.ok(ms < 300, `${ms.toFixed(0)} ms`);
  });
});
