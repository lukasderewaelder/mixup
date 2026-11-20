// Kostenfunktion der Teambildung. Je kleiner, desto besser.
// Alle Anteile hängen nur von den Mitgliedern EINES Teams ab – so lässt sich beim Tauschen
// die Änderung aus zwei Teams berechnen, ohne alles neu zu rechnen.

// Rangfolge: Getrennt ≫ Geschlecht ≈ Niveau > Wiederholung. Wiederholungen sind ein „Nice to have“
// und dürfen den gewählten Ausgleich nur bei sehr kleinen Unterschieden beeinflussen
// (gemessen: 26 Personen, 5 Teams, alle Optionen → Niveau-Abweichung ≤ 0,3, Geschlecht exakt).
export const WEIGHTS = {
  apart: 10000, // je Paar einer Getrennt-Gruppe im selben Team
  repeat: 10,   // je gemeinsames Paar aus früheren Einteilungen (× 3 / 2 / 1 nach Alter)
  gender: 300,  // je Person Abweichung von der Geschlechter-Zielquote
  balance: 300, // „ausgeglichen“: Abweichung des Niveau-Durchschnitts (quadratisch, × Teamgröße)
  equal: 300,   // „gleiches Niveau“: Streuung der Niveaus innerhalb des Teams
};

export const DEFAULT_LEVEL = 3;
const HISTORY_WEIGHTS = [3, 2, 1];

const pairKey = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/**
 * @param {object} p
 * @param {{id, level?, gender?}[]} p.players   anwesende Personen
 * @param {string[][]} p.apartGroups             IDs je Getrennt-Gruppe (nur Anwesende, ≥ 2)
 * @param {{teams: string[][]}[]} p.history      frühere Einteilungen, neueste zuerst
 * @param {object} p.options                     mode, mixGender, avoidRepeats
 */
export function createCostModel({ players, apartGroups = [], history = [], options = {} }) {
  const n = players.length;
  const level = new Map(players.map((p) => [p.id, Number.isFinite(p.level) ? p.level : DEFAULT_LEVEL]));
  const mean = n ? [...level.values()].reduce((a, b) => a + b, 0) / n : 0;

  // Getrennt: Person → Liste der Gruppennummern
  const apartOf = new Map();
  apartGroups.forEach((ids, gi) => {
    for (const id of ids) {
      if (!apartOf.has(id)) apartOf.set(id, []);
      apartOf.get(id).push(gi);
    }
  });

  // Wiederholungen: Paar → Gewicht
  const pairWeight = new Map();
  if (options.avoidRepeats) {
    history.slice(0, HISTORY_WEIGHTS.length).forEach((entry, age) => {
      for (const team of entry?.teams || []) {
        for (let i = 0; i < team.length; i++) {
          for (let j = i + 1; j < team.length; j++) {
            if (!level.has(team[i]) || !level.has(team[j])) continue;
            const key = pairKey(team[i], team[j]);
            pairWeight.set(key, (pairWeight.get(key) || 0) + HISTORY_WEIGHTS[age]);
          }
        }
      }
    });
  }

  // Geschlechter: nur gepflegte Angaben zählen
  const gender = new Map();
  const genderTotal = new Map();
  if (options.mixGender) {
    for (const p of players) {
      if (!p.gender) continue;
      gender.set(p.id, p.gender);
      genderTotal.set(p.gender, (genderTotal.get(p.gender) || 0) + 1);
    }
  }
  const useGender = genderTotal.size > 1;
  const mode = options.mode || 'random';

  const active = apartGroups.length > 0 || pairWeight.size > 0 || useGender || mode === 'balanced' || mode === 'equal';

  function teamCost(ids) {
    const s = ids.length;
    if (!s) return 0;
    let cost = 0;

    if (apartOf.size) {
      const counts = new Map();
      for (const id of ids) for (const gi of apartOf.get(id) || []) counts.set(gi, (counts.get(gi) || 0) + 1);
      for (const c of counts.values()) cost += WEIGHTS.apart * (c * (c - 1)) / 2;
    }

    if (pairWeight.size) {
      for (let i = 0; i < s; i++) {
        for (let j = i + 1; j < s; j++) {
          const w = pairWeight.get(pairKey(ids[i], ids[j]));
          if (w) cost += WEIGHTS.repeat * w;
        }
      }
    }

    if (useGender) {
      const counts = new Map();
      for (const id of ids) {
        const g = gender.get(id);
        if (g) counts.set(g, (counts.get(g) || 0) + 1);
      }
      for (const [g, total] of genderTotal) cost += WEIGHTS.gender * Math.abs((counts.get(g) || 0) - (total * s) / n);
    }

    if (mode === 'balanced' || mode === 'equal') {
      let sum = 0;
      for (const id of ids) sum += level.get(id);
      const m = sum / s;
      if (mode === 'balanced') cost += WEIGHTS.balance * s * (m - mean) ** 2;
      else for (const id of ids) cost += WEIGHTS.equal * (level.get(id) - m) ** 2;
    }
    return cost;
  }

  return { teamCost, active, level };
}
