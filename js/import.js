// Namen aus eingefügtem Text oder CSV-/Textdatei lesen – reine Funktionen (testbar).
import { normalizeName } from './model.js';

const BULLET = /^\s*(?:[-*•·–]\s+|\d{1,3}[.)]\s+)/;   // „- Anna“, „• Anna“, „12. Anna“, „3) Anna“

/**
 * Eingefügte Liste: ein Name pro Zeile. Aufzählungszeichen und Nummern am Zeilenanfang
 * werden entfernt; Kommas bleiben Teil des Namens („Müller, Anna“).
 */
export function parseNameList(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => normalizeName(line.replace(BULLET, '')))
    .filter(Boolean)
    .map((name) => ({ name }));
}

const HEADER = {
  name: /^(name|namen|schüler(in)?|person|teilnehmer(in)?)$/i,
  first: /^(vorname|rufname|first ?name)$/i,
  last: /^(nachname|familienname|last ?name|surname)$/i,
  level: /^(niveau|stärke|staerke|level|leistung)$/i,
  gender: /^(geschlecht|gender|m\/w\/d|mwd)$/i,
};

const GENDER_MAP = { m: 'm', männlich: 'm', maennlich: 'm', junge: 'm', w: 'w', f: 'w', weiblich: 'w', mädchen: 'w', maedchen: 'w', d: 'd', divers: 'd' };

function detectDelimiter(lines) {
  const sample = lines.slice(0, 10).join('\n');
  const counts = [';', '\t', ','].map((d) => [d, sample.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : null;
}

function splitLine(line, delimiter) {
  if (!delimiter) return [line];
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/** Niveau −5 … +5; akzeptiert „+3“, „-3“ und „−3“ (typografisches Minus). */
export const parseLevel = (v) => {
  const s = String(v ?? '').trim().replace(/^[−–]/, '-');
  return /^[+-]?[0-5]$/.test(s) ? Number(s) : null;
};
const parseGender = (v) => GENDER_MAP[String(v).trim().toLocaleLowerCase('de')] ?? null;

/**
 * CSV-/Textdatei. Erkennt Trennzeichen (; Tab ,), Kopfzeile mit Spalten wie Name, Vorname,
 * Nachname, Niveau/Stärke, Geschlecht. Ohne Kopfzeile: 1. Spalte Name; weitere Spalten werden
 * als Niveau (1–5) oder Geschlecht (m/w/d) erkannt.
 * @returns {{entries: {name, level?, gender?}[], columns: string[]}}
 */
export function parseCsv(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { entries: [], columns: [] };
  const delimiter = detectDelimiter(lines);
  if (!delimiter) return { entries: parseNameList(lines.join('\n')), columns: ['Name'] };

  const rows = lines.map((l) => splitLine(l, delimiter));
  const head = rows[0];
  const col = {};
  head.forEach((cell, i) => {
    for (const [key, re] of Object.entries(HEADER)) if (col[key] === undefined && re.test(cell.trim())) col[key] = i;
  });
  const hasHeader = col.name !== undefined || col.first !== undefined || col.last !== undefined;

  const entries = [];
  const columns = [];
  if (hasHeader) {
    if (col.first !== undefined || col.last !== undefined) columns.push('Vorname/Nachname'); else columns.push('Name');
    if (col.level !== undefined) columns.push('Niveau');
    if (col.gender !== undefined) columns.push('Geschlecht');
    for (const r of rows.slice(1)) {
      const name = col.first !== undefined || col.last !== undefined
        ? [r[col.first], r[col.last]].filter(Boolean).join(' ')
        : r[col.name];
      if (!normalizeName(name)) continue;
      entries.push({
        name: normalizeName(name),
        level: col.level !== undefined ? parseLevel(r[col.level]) : null,
        gender: col.gender !== undefined ? parseGender(r[col.gender]) : null,
      });
    }
    return { entries, columns };
  }

  columns.push('Name');
  let sawLevel = false, sawGender = false;
  for (const r of rows) {
    const name = normalizeName(r[0]);
    if (!name) continue;
    let level = null, gender = null;
    for (const cell of r.slice(1)) {
      if (level === null && parseLevel(cell) !== null) { level = parseLevel(cell); sawLevel = true; }
      else if (gender === null && parseGender(cell)) { gender = parseGender(cell); sawGender = true; }
    }
    entries.push({ name, level, gender });
  }
  if (sawLevel) columns.push('Niveau');
  if (sawGender) columns.push('Geschlecht');
  return { entries, columns };
}
