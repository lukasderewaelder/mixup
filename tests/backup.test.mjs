import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, createClass, addPlayers } from '../js/model.js';
import { backupDue } from '../js/backup.js';

const DAY = 86400000;
const NOW = Date.parse('2026-11-20T12:00:00Z');
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

function state({ createdDaysAgo = 10, changedDaysAgo = 1, backupDaysAgo = null, reminder = true, snoozeDays = null } = {}) {
  const s = createState();
  const cls = createClass('9a');
  addPlayers(cls, [{ name: 'Anna' }]);
  cls.createdAt = iso(createdDaysAgo * DAY);
  s.classes.push(cls);
  s.settings.lastChangeAt = iso(changedDaysAgo * DAY);
  s.settings.lastBackupAt = backupDaysAgo == null ? null : iso(backupDaysAgo * DAY);
  s.settings.backupReminder = reminder;
  s.settings.backupSnoozeUntil = snoozeDays == null ? null : new Date(NOW + snoozeDays * DAY).toISOString();
  return s;
}

test('nie gesichert: erst nach drei Tagen erinnern', () => {
  assert.equal(backupDue(state({ createdDaysAgo: 1 }), NOW), false);
  assert.equal(backupDue(state({ createdDaysAgo: 4 }), NOW), true);
});

test('gesichert: nur nach Änderungen und wenn die Sicherung älter als 28 Tage ist', () => {
  assert.equal(backupDue(state({ backupDaysAgo: 10, changedDaysAgo: 1 }), NOW), false);
  assert.equal(backupDue(state({ backupDaysAgo: 40, changedDaysAgo: 1 }), NOW), true);
  assert.equal(backupDue(state({ backupDaysAgo: 40, changedDaysAgo: 50 }), NOW), false, 'keine Änderung seit Sicherung');
});

test('abgeschaltet, „Später“ oder leere Klassen: keine Erinnerung', () => {
  assert.equal(backupDue(state({ createdDaysAgo: 10, reminder: false }), NOW), false);
  assert.equal(backupDue(state({ createdDaysAgo: 10, snoozeDays: 3 }), NOW), false);
  const empty = createState();
  empty.classes.push(createClass('leer'));
  empty.settings.lastChangeAt = iso(DAY);
  assert.equal(backupDue(empty, NOW), false);
});
