import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { TEAM_COLORS, MAX_TEAMS, contrast } from '../js/teams/colors.js';
import { currentAndExpected } from '../tools/precache.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('20 Teamfarben, wie in der Planung (1–20 Teams)', () => {
  assert.equal(MAX_TEAMS, 20);
});

test('Teamfarben sind lesbar: Kopf ≥ 4,5 : 1 auf Weiß, Namen ≥ 7 : 1 auf der Kartenfläche', () => {
  for (const [i, c] of TEAM_COLORS.entries()) {
    assert.ok(contrast(c.strong, '#ffffff') >= 4.5, `Team ${i + 1}: Kopf zu hell`);
    assert.ok(contrast(c.strong, c.tint) >= 4.0, `Team ${i + 1}: Kopf auf Fläche zu schwach`);
    assert.ok(contrast(c.ink, c.tint) >= 7, `Team ${i + 1}: Namen zu schwach`);
  }
});

test('Design „Heft“: Namen auf den Klebezetteln (22 % Teamfarbe auf Weiß) gut lesbar, ≥ 7 : 1', () => {
  const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');
  for (const [i, c] of TEAM_COLORS.entries()) {
    const note = mix(c.strong, '#ffffff', 0.22);
    assert.ok(contrast(c.ink, note) >= 7, `Team ${i + 1}: ${contrast(c.ink, note).toFixed(1)}`);
    assert.ok(contrast(c.strong, note) >= 3, `Team ${i + 1}: Zeichen zu schwach`);
  }
});

test('Design „Akzent“ und „Poster“: weiße Schrift auf Teamfarbe ≥ 4,5 : 1', () => {
  for (const c of TEAM_COLORS) assert.ok(contrast('#ffffff', c.strong) >= 4.5);
});

test('Teamfarben in JS und CSS stimmen überein', () => {
  const css = read('css/tokens.css');
  for (const [i, c] of TEAM_COLORS.entries()) {
    const n = i + 1;
    for (const [suffix, value] of [['', c.strong], ['-tint', c.tint], ['-ink', c.ink]]) {
      const m = css.match(new RegExp(`--team-${n}${suffix}:\\s*(#[0-9a-f]{6})`, 'i'));
      assert.ok(m, `--team-${n}${suffix} fehlt in tokens.css`);
      assert.equal(m[1].toLowerCase(), value, `--team-${n}${suffix} weicht ab`);
    }
  }
});

test('Manifest verweist nur auf vorhandene Icons', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.lang, 'de');
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(icon.src, root)), `${icon.src} fehlt`);
});

test('sw.js-Dateiliste ist aktuell (sonst: npm run precache)', () => {
  const { sw, expected } = currentAndExpected();
  assert.equal(sw, expected);
});
