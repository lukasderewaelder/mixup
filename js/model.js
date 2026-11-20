// Datenmodell von Mixup – reine Funktionen ohne DOM und ohne Speicherzugriff (testbar).
import { DEFAULT_OPTIONS } from './teams/algorithm.js';
import { cryptoRandom, randInt } from './teams/random.js';

export const SCHEMA_VERSION = 2;
export const MAX_HISTORY = 10;
export const LEVEL_MIN = -5;
export const LEVEL_MAX = 5;
export const LEVELS = Array.from({ length: LEVEL_MAX - LEVEL_MIN + 1 }, (_, i) => LEVEL_MIN + i);
export const GENDERS = ['m', 'w', 'd'];
export const GENDER_LABEL = { m: 'männlich', w: 'weiblich', d: 'divers' };

export const DEFAULT_SETTINGS = {
  showLevel: true,        // Niveau in der Namensliste zeigen (in der Klassenansicht nie)
  showGender: false,      // Geschlecht in der Namensliste zeigen
  nameOrder: 'alpha',     // 'alpha' | 'draw' – Reihenfolge der Namen in den Teamkarten
  animation: true,
  backupReminder: true,
  lastBackupAt: null,
  lastChangeAt: null,
  installHintDismissed: false,
};

/** Gestaltung der Gruppen – je Klasse. names/colors: Position (0–19) → eigener Name / Paletten-Nr. */
export const GROUP_WORDS = ['Team', 'Gruppe', 'Tisch', 'Station', 'Mannschaft'];
export const NUMBERINGS = ['number', 'letter', 'color'];
export const DEFAULT_GROUP_STYLE = { word: 'Team', customWord: '', numbering: 'number', names: {}, colors: {} };

// ---------- Hilfen ----------
export function uid() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

/** Lokales Datum als JJJJ-MM-TT (Abwesenheit gilt pro Kalendertag). */
export function todayKey(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const normalizeName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const nameKey = (s) => normalizeName(s).toLocaleLowerCase('de');
export const byName = (a, b) => a.localeCompare(b, 'de', { sensitivity: 'base', numeric: true });

export const clampLevel = (x) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) && n >= LEVEL_MIN && n <= LEVEL_MAX ? n : 0;
};
/** „+2“, „0“, „−3“ (typografisches Minus). */
export const formatLevel = (l) => (l > 0 ? `+${l}` : l < 0 ? `−${-l}` : '0');
const cleanGender = (g) => (GENDERS.includes(g) ? g : null);

// ---------- Zustand ----------
export function createState() {
  return { version: SCHEMA_VERSION, classes: [], activeClassId: null, settings: { ...DEFAULT_SETTINGS } };
}

function cleanGroupStyle(raw, legacyNames = []) {
  const s = structuredClone(DEFAULT_GROUP_STYLE);
  if (raw && typeof raw === 'object') {
    if (GROUP_WORDS.includes(raw.word) || raw.word === 'custom') s.word = raw.word;
    s.customWord = normalizeName(raw.customWord).slice(0, 30);
    if (NUMBERINGS.includes(raw.numbering)) s.numbering = raw.numbering;
    for (const [k, v] of Object.entries(raw.names || {})) {
      const name = normalizeName(v).slice(0, 40);
      if (/^\d+$/.test(k) && Number(k) < 20 && name) s.names[k] = name;
    }
    for (const [k, v] of Object.entries(raw.colors || {})) {
      if (/^\d+$/.test(k) && Number(k) < 20 && Number.isInteger(v) && v >= 0 && v < 20) s.colors[k] = v;
    }
  }
  legacyNames.forEach((n, i) => { const name = normalizeName(n); if (name && i < 20 && !s.names[i]) s.names[i] = name.slice(0, 40); });
  return s;
}

export function createClass(name) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: normalizeName(name) || 'Neue Klasse',
    createdAt: now,
    updatedAt: now,
    players: [],
    groups: [],
    absent: { date: null, ids: [] },
    options: { ...DEFAULT_OPTIONS },
    history: [],
    currentResultId: null,
    draw: { mode: 'noRepeat', drawn: [], source: 'all' },
    groupStyle: structuredClone(DEFAULT_GROUP_STYLE),
  };
}

export function duplicateClass(cls, existingNames = []) {
  const copy = structuredClone(cls);
  const now = new Date().toISOString();
  Object.assign(copy, { id: uid(), createdAt: now, updatedAt: now, history: [], currentResultId: null });
  copy.absent = { date: null, ids: [] };
  copy.draw = { ...copy.draw, drawn: [] };
  let name = `${cls.name} (Kopie)`;
  for (let i = 2; existingNames.includes(name); i++) name = `${cls.name} (Kopie ${i})`;
  copy.name = name;
  return copy;
}

// ---------- Personen ----------
/**
 * Fügt Personen hinzu. Namen, die es (ohne Groß/Klein) schon gibt, werden übersprungen.
 * @returns {{added: object[], duplicates: string[]}}
 */
export function addPlayers(cls, entries) {
  const known = new Set(cls.players.map((p) => nameKey(p.name)));
  const added = [];
  const duplicates = [];
  for (const entry of entries) {
    const name = normalizeName(entry.name);
    if (!name) continue;
    const key = nameKey(name);
    if (known.has(key)) { duplicates.push(name); continue; }
    known.add(key);
    const player = { id: uid(), name, level: clampLevel(entry.level ?? 0), gender: cleanGender(entry.gender) };
    cls.players.push(player);
    added.push(player);
  }
  return { added, duplicates };
}

export function renamePlayer(cls, id, newName) {
  const name = normalizeName(newName);
  if (!name) return { ok: false, reason: 'Der Name darf nicht leer sein.' };
  if (cls.players.some((p) => p.id !== id && nameKey(p.name) === nameKey(name))) {
    return { ok: false, reason: `„${name}“ gibt es schon. Ein Zusatz hilft, z. B. „${name} M.“.` };
  }
  const p = cls.players.find((x) => x.id === id);
  if (p) p.name = name;
  return { ok: true };
}

/** Entfernt Personen auch aus Regeln, Abwesenheit, Ziehung und Verlauf. */
export function removePlayers(cls, ids) {
  const gone = new Set(ids);
  cls.players = cls.players.filter((p) => !gone.has(p.id));
  for (const g of cls.groups) g.playerIds = g.playerIds.filter((id) => !gone.has(id));
  cls.groups = cls.groups.filter((g) => g.playerIds.length >= 2);
  cls.absent.ids = cls.absent.ids.filter((id) => !gone.has(id));
  cls.draw.drawn = cls.draw.drawn.filter((id) => !gone.has(id));
  for (const entry of cls.history) entry.teams = entry.teams.map((t) => t.filter((id) => !gone.has(id)));
}

// ---------- Anwesenheit (gilt nur für den heutigen Tag) ----------
export function absentIds(cls, today = todayKey()) {
  return cls.absent?.date === today ? new Set(cls.absent.ids) : new Set();
}

export function setAbsent(cls, id, absent, today = todayKey()) {
  const set = absentIds(cls, today);
  if (absent) set.add(id); else set.delete(id);
  cls.absent = { date: today, ids: [...set] };
}

export function clearAbsent(cls, today = todayKey()) {
  cls.absent = { date: today, ids: [] };
}

/** Personen mit active-Flag für den Algorithmus. */
export function playersForToday(cls, today = todayKey()) {
  const absent = absentIds(cls, today);
  return cls.players.map((p) => ({ ...p, active: !absent.has(p.id) }));
}

export function presentCount(cls, today = todayKey()) {
  const absent = absentIds(cls, today);
  return cls.players.filter((p) => !absent.has(p.id)).length;
}

// ---------- Regeln ----------
export function defaultGroupName(cls, ids) {
  const names = ids.map((id) => cls.players.find((p) => p.id === id)?.name).filter(Boolean);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} und ${names.length - 2} weitere`;
}

export function addGroup(cls, type, ids) {
  const unique = [...new Set(ids)].filter((id) => cls.players.some((p) => p.id === id));
  if (unique.length < 2) return null;
  const group = { id: uid(), name: defaultGroupName(cls, unique), type, playerIds: unique, enabled: true };
  cls.groups.push(group);
  return group;
}

export function groupsOf(cls, playerId) {
  return cls.groups.filter((g) => g.playerIds.includes(playerId));
}

// ---------- Ergebnisse und Verlauf ----------
/**
 * Speichert ein Losergebnis. replaceCurrent: „Neu losen“ ersetzt das gerade angezeigte Ergebnis,
 * damit verworfene Versuche weder den Verlauf füllen noch das Gedächtnis verfälschen.
 */
export function recordResult(cls, { teams, warnings = [] }, options, { replaceCurrent = false } = {}) {
  const entry = { id: uid(), at: new Date().toISOString(), options: { ...DEFAULT_OPTIONS, ...options }, teams, warnings, order: null, edited: false };
  if (replaceCurrent && cls.history[0]?.id === cls.currentResultId) cls.history[0] = entry;
  else cls.history.unshift(entry);
  cls.history = cls.history.slice(0, MAX_HISTORY);
  cls.currentResultId = entry.id;
  return entry;
}

export function currentResult(cls) {
  return cls.history.find((e) => e.id === cls.currentResultId) || null;
}

/** Frühere Einteilungen für das Gedächtnis (ohne das Ergebnis, das ersetzt wird). */
export function memoryFor(cls, { replaceCurrent = false } = {}) {
  const list = replaceCurrent && cls.history[0]?.id === cls.currentResultId ? cls.history.slice(1) : cls.history;
  return list.map((e) => ({ teams: e.teams }));
}

/** Person in ein anderes Team setzen (manuell, Größen dürfen dann abweichen). */
export function movePlayer(entry, playerId, toTeam) {
  const from = entry.teams.findIndex((t) => t.includes(playerId));
  if (from < 0 || from === toTeam || !entry.teams[toTeam]) return false;
  entry.teams[from] = entry.teams[from].filter((id) => id !== playerId);
  entry.teams[toTeam] = [...entry.teams[toTeam], playerId];
  entry.edited = true;
  return true;
}

/** Zwei Personen aus verschiedenen Teams tauschen. */
export function swapPlayers(entry, a, b) {
  const ta = entry.teams.findIndex((t) => t.includes(a));
  const tb = entry.teams.findIndex((t) => t.includes(b));
  if (ta < 0 || tb < 0 || ta === tb) return false;
  entry.teams[ta] = entry.teams[ta].map((id) => (id === a ? b : id));
  entry.teams[tb] = entry.teams[tb].map((id) => (id === b ? a : id));
  entry.edited = true;
  return true;
}

// ---------- Zufallsperson und Reihenfolge ----------
/**
 * Zieht eine Person aus pool (IDs). mode 'noRepeat': jede Person erst wieder, wenn alle dran waren.
 * @returns {{id: string|null, remaining: number, newRound: boolean}}
 */
export function drawPerson(cls, pool, rng = cryptoRandom) {
  if (!pool.length) return { id: null, remaining: 0, newRound: false };
  if (cls.draw.mode !== 'noRepeat') {
    return { id: pool[randInt(pool.length, rng)], remaining: pool.length, newRound: false };
  }
  const drawn = new Set(cls.draw.drawn);
  let open = pool.filter((id) => !drawn.has(id));
  let newRound = false;
  if (!open.length) {
    cls.draw.drawn = cls.draw.drawn.filter((id) => !pool.includes(id));
    open = [...pool];
    newRound = true;
  }
  const id = open[randInt(open.length, rng)];
  cls.draw.drawn.push(id);
  return { id, remaining: open.length - 1, newRound };
}

export function remainingInDraw(cls, pool) {
  if (cls.draw.mode !== 'noRepeat') return pool.length;
  const drawn = new Set(cls.draw.drawn);
  const open = pool.filter((id) => !drawn.has(id)).length;
  return open || pool.length;
}

// ---------- Prüfen, Laden, Zusammenführen ----------
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** Prüft und bereinigt einen Zustand (aus Speicher oder Sicherungsdatei). Wirft bei Unbrauchbarem. */
export function validateState(raw) {
  if (!isObj(raw) || !Array.isArray(raw.classes)) throw new Error('Das ist keine Mixup-Sicherung.');
  if (Number(raw.version) > SCHEMA_VERSION) throw new Error('Diese Sicherung stammt aus einer neueren Mixup-Version. Bitte die App aktualisieren.');
  const legacy = !(Number(raw.version) >= 2); // Version 1: Niveau 1–5, Teamnamen global
  const state = createState();
  const { teamNames: legacyNames = [], ...rawSettings } = isObj(raw.settings) ? raw.settings : {};
  state.settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  if (legacy) state.settings.showLevel = true; // Klassenansicht blendet das Niveau ohnehin aus
  const levelOf = (l) => (legacy ? ([1, 2, 3, 4, 5].includes(Number(l)) ? (Number(l) - 3) * 2 : 0) : clampLevel(l));

  for (const c of raw.classes) {
    if (!isObj(c) || !c.id) continue;
    const cls = createClass(c.name);
    Object.assign(cls, {
      id: String(c.id),
      createdAt: c.createdAt || cls.createdAt,
      updatedAt: c.updatedAt || cls.updatedAt,
      options: { ...DEFAULT_OPTIONS, ...(isObj(c.options) ? c.options : {}) },
    });
    const seen = new Set();
    for (const p of Array.isArray(c.players) ? c.players : []) {
      const name = normalizeName(p?.name);
      if (!name || !p.id || seen.has(String(p.id))) continue;
      seen.add(String(p.id));
      cls.players.push({ id: String(p.id), name, level: levelOf(p.level), gender: cleanGender(p.gender) });
    }
    const valid = (id) => seen.has(String(id));
    for (const g of Array.isArray(c.groups) ? c.groups : []) {
      const ids = [...new Set((g?.playerIds || []).map(String))].filter(valid);
      if (ids.length < 2 || !['together', 'apart'].includes(g.type)) continue;
      cls.groups.push({ id: String(g.id || uid()), name: normalizeName(g.name) || defaultGroupName(cls, ids), type: g.type, playerIds: ids, enabled: g.enabled !== false });
    }
    if (isObj(c.absent)) cls.absent = { date: c.absent.date || null, ids: (c.absent.ids || []).map(String).filter(valid) };
    for (const e of (Array.isArray(c.history) ? c.history : []).slice(0, MAX_HISTORY)) {
      if (!isObj(e) || !Array.isArray(e.teams)) continue;
      cls.history.push({
        id: String(e.id || uid()), at: e.at || new Date().toISOString(),
        options: { ...DEFAULT_OPTIONS, ...(isObj(e.options) ? e.options : {}) },
        teams: e.teams.map((t) => (Array.isArray(t) ? t.map(String).filter(valid) : [])),
        warnings: Array.isArray(e.warnings) ? e.warnings : [],
        order: isObj(e.order) ? e.order : null,
        edited: Boolean(e.edited),
      });
    }
    cls.currentResultId = cls.history.some((e) => e.id === c.currentResultId) ? c.currentResultId : null;
    if (isObj(c.draw)) cls.draw = { mode: c.draw.mode === 'any' ? 'any' : 'noRepeat', drawn: (c.draw.drawn || []).map(String).filter(valid), source: 'all' };
    cls.groupStyle = cleanGroupStyle(c.groupStyle, legacy && Array.isArray(legacyNames) ? legacyNames : []);
    state.classes.push(cls);
  }
  state.activeClassId = state.classes.some((c) => c.id === raw.activeClassId) ? raw.activeClassId : null;
  return state;
}

/** Sicherung zusammenführen: neue Klassen kommen dazu, bei gleicher Klasse gewinnt die neuere. */
export function mergeStates(current, incoming) {
  const merged = structuredClone(current);
  let added = 0, updated = 0;
  for (const cls of incoming.classes) {
    const i = merged.classes.findIndex((c) => c.id === cls.id);
    if (i < 0) { merged.classes.push(cls); added++; }
    else if ((cls.updatedAt || '') > (merged.classes[i].updatedAt || '')) { merged.classes[i] = cls; updated++; }
  }
  return { state: merged, added, updated };
}
