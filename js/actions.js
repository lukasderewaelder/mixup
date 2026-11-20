// Abläufe, die mehrere Bildschirme brauchen.
import { makeTeams } from './teams/algorithm.js';
import { playersForToday, memoryFor, recordResult, createClass, addPlayers, addGroup } from './model.js';
import { update } from './store.js';
import { session } from './ui/session.js';
import { groupLabel } from './labels.js';

/**
 * Lost Teams für die aktive Klasse und speichert das Ergebnis.
 * replaceCurrent: „Neu losen“ ersetzt das angezeigte Ergebnis.
 * @returns {object} Ergebnis von makeTeams
 */
export function drawTeams({ replaceCurrent = false } = {}) {
  return update((state, cls) => {
    const result = makeTeams({
      players: playersForToday(cls),
      groups: cls.groups,
      options: cls.options,
      history: cls.options.avoidRepeats ? memoryFor(cls, { replaceCurrent }) : [],
      label: (i) => groupLabel(i, cls.groupStyle),
    });
    if (result.teams.length) {
      recordResult(cls, result, cls.options, { replaceCurrent });
      session.playAnimation = true;
      session.pickedPlayer = null;
      session.view = 'class';
      session.tab = 'teams';
    }
    return result;
  });
}

const EXAMPLE_NAMES = ['Aylin', 'Ben', 'Clara', 'Deniz', 'Emil', 'Fatma', 'Greta', 'Hamza', 'Ida', 'Jonas', 'Kübra', 'Leon',
  'Mira', 'Noah', 'Olivia', 'Paul', 'Rania', 'Samuel', 'Tilda', 'Umut', 'Vivien', 'Yusuf', 'Zoe', 'Anton'];

/** Beispielklasse mit erfundenen Namen zum Ausprobieren. */
export function createExampleClass(existingNames) {
  let name = 'Beispielklasse';
  for (let i = 2; existingNames.includes(name); i++) name = `Beispielklasse ${i}`;
  const cls = createClass(name);
  addPlayers(cls, EXAMPLE_NAMES.map((n, i) => ({ name: n, level: ((i * 7) % 11) - 5, gender: i % 2 ? 'w' : 'm' })));
  const id = (n) => cls.players.find((p) => p.name === n).id;
  addGroup(cls, 'together', [id('Ben'), id('Emil')]);
  addGroup(cls, 'apart', [id('Jonas'), id('Leon'), id('Noah')]);
  return cls;
}
