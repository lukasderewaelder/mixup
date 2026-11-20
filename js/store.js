// Zustand der App: laden, ändern, speichern (localStorage, Schlüssel „mixup:v1“).
import { createState, validateState } from './model.js';

const KEY = 'mixup:v1';
let state = load();
let storageOk = true;
const listeners = new Set();

function load() {
  if (typeof localStorage === 'undefined') return createState(); // z. B. in Node-Tests
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return validateState(JSON.parse(raw));
  } catch (err) {
    console.warn('Mixup: gespeicherte Daten unlesbar, starte leer.', err);
    try { localStorage.setItem(`${KEY}:defekt-${Date.now()}`, localStorage.getItem(KEY) || ''); } catch { /* egal */ }
  }
  return createState();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export const getState = () => state;
export const isStorageOk = () => storageOk;

export function activeClass() {
  return state.classes.find((c) => c.id === state.activeClassId) || null;
}

/**
 * Zustand ändern. mutate(state, cls) bekommt die aktive Klasse mit.
 * dataChange: zählt als Änderung an Klassen/Regeln (für die Sicherungs-Erinnerung).
 */
export function update(mutate, { dataChange = true } = {}) {
  const cls = activeClass();
  const result = mutate(state, cls);
  const now = new Date().toISOString();
  if (dataChange) {
    state.settings.lastChangeAt = now;
    if (cls) cls.updatedAt = now;
  }
  persist();
  for (const fn of listeners) fn(state);
  return result;
}

/** Ganzen Zustand ersetzen (Sicherung laden, alles löschen). */
export function replaceState(next) {
  state = next;
  persist();
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
