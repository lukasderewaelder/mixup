// Zusammen-Regeln → Blöcke (Union-Find). Personen eines Blocks landen immer im selben Team.

/**
 * @param {string[]} ids        anwesende Personen
 * @param {{id,name,playerIds}[]} groups  aktive Zusammen-Gruppen
 * @param {number} maxSize      größte erlaubte Teamgröße
 * @returns {{blocks: string[][], warnings: object[]}}
 * Gruppen werden der Reihe nach verbunden. Würde ein Block dadurch größer als maxSize,
 * wird diese Gruppe nicht angewendet und als Hinweis gemeldet.
 */
export function buildBlocks(ids, groups, maxSize) {
  const parent = new Map(ids.map((id) => [id, id]));
  const size = new Map(ids.map((id) => [id, 1]));
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };

  const warnings = [];
  for (const group of groups) {
    const members = group.playerIds.filter((id) => parent.has(id));
    if (members.length < 2) continue;
    const roots = [...new Set(members.map(find))];
    const total = roots.reduce((sum, r) => sum + size.get(r), 0);
    if (total > maxSize) {
      warnings.push({
        type: 'together-too-big',
        groupId: group.id,
        message: `„${group.name}“ umfasst ${total} Personen, ein Team aber höchstens ${maxSize} – diese Regel wurde nicht angewendet.`,
      });
      continue;
    }
    const [first, ...rest] = roots;
    for (const r of rest) {
      parent.set(r, first);
      size.set(first, size.get(first) + size.get(r));
    }
  }

  const byRoot = new Map();
  for (const id of ids) {
    const r = find(id);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(id);
  }
  return { blocks: [...byRoot.values()], warnings };
}
