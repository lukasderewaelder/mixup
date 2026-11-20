// Teambildung: gierige Startverteilung mit Zufall, danach lokale Verbesserung durch
// Verschieben und Tauschen. Reines Modul ohne DOM – testbar mit node --test.
import { cryptoRandom, randInt, shuffle } from './random.js';
import { teamSizes } from './sizes.js';
import { buildBlocks } from './blocks.js';
import { createCostModel } from './cost.js';

export const DEFAULT_OPTIONS = {
  by: 'count',          // 'count' | 'size'
  value: 4,
  mode: 'random',       // 'random' | 'strength' | 'balanced' | 'equal'
  remainder: 'auto',    // nur bei by = 'size': 'auto' | 'plus' | 'single' | 'minus' (siehe sizes.js)
  mixGender: false,
  rulesEnabled: true,
  avoidRepeats: true,
};

const MAX_TRIES = 4000;  // Verbesserungsversuche je Durchgang
const PATIENCE = 600;    // Abbruch nach so vielen Versuchen ohne Verbesserung
const RESTARTS = 3;      // Durchgänge, der beste gewinnt (nur wenn es etwas zu optimieren gibt)
const EPS = 1e-9;

/**
 * @param {object} input
 * @param {{id, name, level?, gender?, active?}[]} input.players
 * @param {{id, name, type: 'together'|'apart', playerIds: string[], enabled?}[]} [input.groups]
 * @param {object} [input.options]   siehe DEFAULT_OPTIONS
 * @param {{teams: string[][]}[]} [input.history]  frühere Einteilungen, neueste zuerst
 * @param {() => number} [input.rng]
 * @param {(i: number) => string} [input.label]  Bezeichnung der Gruppe i in Hinweisen (Standard „Team i+1“)
 * @returns {{teams: string[][], k: number, warnings: {type, message, groupId?}[], cost: number}}
 */
export function makeTeams({ players, groups = [], options = {}, history = [], rng = cryptoRandom, label }) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const present = players.filter((p) => p.active !== false);
  const n = present.length;
  if (!n) return { teams: [], k: 0, warnings: [{ type: 'no-players', message: 'Niemand ist als anwesend markiert.' }], cost: 0 };

  const sizes = teamSizes(n, opts.by, opts.value, opts.remainder);
  const k = sizes.length;
  const warnings = [];
  if (opts.by === 'count' && Math.round(opts.value) > k) {
    warnings.push({ type: 'fewer-teams', message: `Es werden ${k} statt ${Math.round(opts.value)} Teams gebildet (${n} Personen anwesend, höchstens 20 Teams).` });
  }

  const hi = sizes[0];
  const presentIds = new Set(present.map((p) => p.id));
  const rules = opts.rulesEnabled ? groups.filter((g) => g.enabled !== false) : [];
  const together = rules.filter((g) => g.type === 'together');
  const apart = rules
    .filter((g) => g.type === 'apart')
    .map((g) => g.playerIds.filter((id) => presentIds.has(id)))
    .filter((ids) => ids.length >= 2);

  const { blocks, warnings: blockWarnings } = buildBlocks(present.map((p) => p.id), together, hi);
  warnings.push(...blockWarnings);

  const model = createCostModel({ players: present, apartGroups: apart, history, options: opts, k });
  const ctx = { k, sizes, model, rng, opts };

  let best = null;
  const runs = model.active && k > 1 ? RESTARTS : 1;
  for (let r = 0; r < runs; r++) {
    const state = distribute(blocks, ctx);
    if (model.active && k > 1) improve(state, ctx);
    const cost = state.costs.reduce((a, b) => a + b, 0);
    if (!best || cost < best.cost - EPS) best = { ...state, cost };
  }

  const teams = shuffle(best.teamBlocks.map((bs) => bs.flat()), rng);
  const tooBig = new Set(blockWarnings.map((w) => w.groupId));
  // Reihenfolge: Hinweise aus der Verteilung vor denen der Schlussprüfung; je Regel/Team nur einmal
  const all = [
    ...warnings,
    ...best.splitWarnings(together),
    ...checkRules(teams, { players: present, groups: rules, label }).filter((w) => !(w.type === 'together-split' && tooBig.has(w.groupId))),
  ];
  const seen = new Set();
  const unique = all.filter((w) => {
    const key = `${w.type}|${w.groupId ?? ''}|${w.team ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { teams, k, warnings: unique, cost: best.cost };
}

/** Gierige Startverteilung: große Blöcke zuerst, jeweils ins Team mit dem geringsten Kostenzuwachs. */
function distribute(blocks, { k, sizes: targetSizes, model, rng, opts }) {
  const queue = shuffle(blocks.map((b) => [...b]), rng);
  const levelSum = (b) => b.reduce((s, id) => s + model.level.get(id), 0) / b.length;
  queue.sort((a, b) => b.length - a.length || (opts.mode !== 'random' ? levelSum(b) - levelSum(a) : 0));

  // Jedes Team bekommt eine feste Zielgröße (zufällig zugeordnet); die lokale Suche darf sie später tauschen.
  const target = shuffle([...targetSizes], rng);
  const teamBlocks = Array.from({ length: k }, () => []);
  const sizes = new Array(k).fill(0);
  const costs = new Array(k).fill(0);
  const splitBlocks = [];

  const fits = (t, b) => sizes[t] + b <= target[t];

  while (queue.length) {
    const block = queue.shift();
    let bestDelta = Infinity;
    let choices = [];
    for (let t = 0; t < k; t++) {
      if (!fits(t, block.length)) continue;
      const delta = model.active ? model.teamCost([...teamBlocks[t].flat(), ...block]) - costs[t] : 0;
      if (delta < bestDelta - EPS) { bestDelta = delta; choices = [t]; }
      else if (Math.abs(delta - bestDelta) <= EPS) choices.push(t);
    }
    if (!choices.length) {
      // Block passt nirgends mehr am Stück → einzeln verteilen
      splitBlocks.push(block);
      queue.unshift(...block.map((id) => [id]));
      continue;
    }
    const t = choices[randInt(choices.length, rng)];
    teamBlocks[t].push(block);
    sizes[t] += block.length;
    if (model.active) costs[t] += bestDelta;
  }

  return {
    teamBlocks,
    sizes,
    costs: model.active ? teamBlocks.map((bs) => model.teamCost(bs.flat())) : costs,
    splitWarnings: (together) => splitBlocks.length ? splitMessages(splitBlocks, together) : [],
  };
}

function splitMessages(splitBlocks, together) {
  const out = [];
  for (const block of splitBlocks) {
    const set = new Set(block);
    for (const g of together) {
      if (g.playerIds.some((id) => set.has(id))) {
        out.push({ type: 'together-split', groupId: g.id, message: `„${g.name}“ konnte nicht zusammenbleiben – die Teams sind dafür zu klein.` });
      }
    }
  }
  return out;
}

/** Lokale Suche: Blöcke verschieben oder tauschen, solange die Kosten sinken. */
function improve(state, { k, model, rng }) {
  const { teamBlocks, sizes, costs } = state;
  // Erlaubt, wenn die beiden Teams ihre Größen behalten oder untereinander tauschen –
  // so bleibt die geplante Aufteilung (z. B. 6 × 4 und 1 × 1) immer erhalten.
  const keepsSizes = (a, b, sa, sb) => (sa === sizes[a] && sb === sizes[b]) || (sa === sizes[b] && sb === sizes[a]);
  for (let i = 0, idle = 0; i < MAX_TRIES && idle < PATIENCE; i++) {
    idle++;
    const a = randInt(k, rng);
    if (!teamBlocks[a].length) continue;
    let b = randInt(k - 1, rng);
    if (b >= a) b++;
    const xi = randInt(teamBlocks[a].length, rng);
    const x = teamBlocks[a][xi];

    let yi = -1;
    let y = [];
    if (rng() >= 0.5 && teamBlocks[b].length) {
      yi = randInt(teamBlocks[b].length, rng);
      y = teamBlocks[b][yi];
    }
    const sa = sizes[a] - x.length + y.length;
    const sb = sizes[b] - y.length + x.length;
    if (!keepsSizes(a, b, sa, sb)) continue;

    const newA = teamBlocks[a].filter((_, j) => j !== xi);
    const newB = teamBlocks[b].filter((_, j) => j !== yi);
    if (yi >= 0) newA.push(y);
    newB.push(x);
    const ca = model.teamCost(newA.flat());
    const cb = model.teamCost(newB.flat());
    if (ca + cb < costs[a] + costs[b] - EPS) {
      teamBlocks[a] = newA; teamBlocks[b] = newB;
      sizes[a] = sa; sizes[b] = sb;
      costs[a] = ca; costs[b] = cb;
      idle = 0;
    }
  }
}

const joinNames = (names) => (names.length <= 2 ? names.join(' und ') : `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`);

/**
 * Prüft fertige Teams gegen die Regeln (auch nach manuellem Verschieben in Schritt 3).
 * @param {string[][]} teams
 * @param {{players: {id,name}[], groups: object[]}} ctx  nur aktive Regeln übergeben
 */
export function checkRules(teams, { players, groups, label = (t) => `Team ${t + 1}` }) {
  const name = new Map(players.map((p) => [p.id, p.name]));
  const teamOf = new Map();
  teams.forEach((ids, t) => ids.forEach((id) => teamOf.set(id, t)));
  const k = teams.length;
  const warnings = [];

  for (const g of groups) {
    const members = g.playerIds.filter((id) => teamOf.has(id));
    if (members.length < 2) continue;

    if (g.type === 'together') {
      if (new Set(members.map((id) => teamOf.get(id))).size > 1) {
        warnings.push({ type: 'together-split', groupId: g.id, message: `„${g.name}“ ist auf mehrere Teams verteilt.` });
      }
    } else if (g.type === 'apart') {
      const allowed = Math.ceil(members.length / k); // größere Gruppen: so gleichmäßig wie möglich
      const byTeam = new Map();
      for (const id of members) {
        const t = teamOf.get(id);
        if (!byTeam.has(t)) byTeam.set(t, []);
        byTeam.get(t).push(id);
      }
      for (const [t, ids] of [...byTeam].sort((x, y) => x[0] - y[0])) {
        if (ids.length > allowed) {
          const names = joinNames(ids.map((id) => name.get(id)));
          const verb = ids.length === 2 ? 'sind beide' : 'sind';
          warnings.push({ type: 'apart-violated', groupId: g.id, team: t, message: `„${g.name}“: ${names} ${verb} in ${label(t)}.` });
        }
      }
    }
  }
  return warnings;
}
