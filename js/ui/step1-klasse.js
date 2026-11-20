// Schritt 1: Klasse – wer ist heute da? Namen erfassen, bearbeiten, Regeln anlegen.
import { h, button, iconButton, screenHead, stepActions, replaceKeepFocus, toggle } from './dom.js';
import { icon } from './icons.js';
import { openDialog, promptDialog, toast } from './dialogs.js';
import { activeClass, getState, update, replaceState } from '../store.js';
import {
  addPlayers, renamePlayer, removePlayers, absentIds, setAbsent, clearAbsent, presentCount,
  addGroup, groupsOf, byName, LEVELS, GENDER_LABEL,
} from '../model.js';
import { parseNameList, parseCsv } from '../import.js';
import { session } from './session.js';
import { openDraw } from './draw.js';

export const title = 'Klasse';
export const step = 1;
export const needsClass = true;

let root;

export function render() {
  root = h('div', { class: 'step1' });
  paint();
  if (session.openAddNames) {
    session.openAddNames = false;
    queueMicrotask(openAddNames);
  }
  return root;
}

export function onKey(e) {
  if (e.key === 'Escape' && session.step1Mode !== 'present') { setMode('present'); return true; }
  return false;
}

export const groupLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`);

function paint() {
  const cls = activeClass();
  if (!cls) return;
  const total = cls.players.length;
  const present = presentCount(cls);
  const mode = session.step1Mode;
  const lead = !total
    ? 'Noch keine Namen. Füge die Klasse hinzu, um loszulegen.'
    : mode === 'select' ? 'Tippe die Personen an, die immer zusammen oder getrennt sein sollen.'
      : mode === 'edit' ? 'Namen ändern, Niveau und Geschlecht pflegen oder Personen entfernen.'
        : `${present} von ${total} da. Tippe auf einen Namen, wenn jemand fehlt.`;

  replaceKeepFocus(root, [
    screenHead(cls.name, lead, iconButton('edit', 'Klasse umbenennen', { onClick: renameClass })),
    toolbar(cls, mode, present, total),
    total ? (mode === 'edit' ? editList(cls) : nameGrid(cls, mode)) : addEmpty(),
    mode !== 'edit' && total ? rulesSection(cls) : null,
    mode === 'select' ? selectBar(cls) : stepActions({ href: '#/', label: 'Klassen' }, { href: '#/einstellen', label: 'Teams einstellen', disabled: !present }),
  ]);
}

// ---------- Werkzeugleiste ----------
function toolbar(cls, mode, present, total) {
  if (!total) return null;
  if (mode === 'edit') {
    return h('div', { class: 'toolbar' },
      button('Namen hinzufügen', { icon: 'plus', onClick: openAddNames }),
      h('span', { class: 'toolbar-spacer' }),
      button('Fertig', { icon: 'check', variant: 'primary', onClick: () => setMode('present'), 'data-key': 'edit-done' }));
  }
  if (mode === 'select') {
    // Leiste bleibt stehen, damit die Namen beim Umschalten nicht springen
    return h('div', { class: 'toolbar' },
      button('Alle abwählen', { icon: 'close', disabled: !session.selected.size, onClick: () => { session.selected.clear(); paint(); } }),
      h('span', { class: 'toolbar-spacer' }),
      button('Fertig', { icon: 'check', variant: 'quiet', onClick: () => setMode('present') }));
  }
  return h('div', { class: 'toolbar' },
    button('Namen hinzufügen', { icon: 'plus', onClick: openAddNames }),
    button('Regel anlegen', { icon: 'select', onClick: () => setMode('select'), title: 'Personen auswählen, die zusammen oder getrennt sein sollen' }),
    button('Bearbeiten', { icon: 'edit', onClick: () => setMode('edit') }),
    h('span', { class: 'toolbar-spacer' }),
    present < total ? button('Alle da', { icon: 'reset', variant: 'quiet', onClick: allPresent, 'data-key': 'all-present' }) : null,
    button('Zufallsperson', { icon: 'dice', variant: 'quiet', onClick: () => openDraw(), disabled: !present }),
  );
}

function setMode(mode) {
  session.step1Mode = mode;
  session.selected.clear();
  paint();
  root.querySelector('h1')?.focus({ preventScroll: true });
}

function allPresent() {
  update((s, cls) => clearAbsent(cls), { dataChange: false });
  paint();
}

// ---------- Namensraster ----------
function nameGrid(cls, mode) {
  const absent = absentIds(cls);
  const letters = new Map(cls.groups.map((g, i) => [g.id, groupLetter(i)]));
  const { showLevel, showGender } = getState().settings;
  const players = [...cls.players].sort((a, b) => byName(a.name, b.name));

  return h('ul', { class: `name-grid mode-${mode}`, 'aria-label': 'Namen' }, players.map((p) => {
    const isAbsent = absent.has(p.id);
    const selected = session.selected.has(p.id);
    const chips = groupsOf(cls, p.id).map((g) => h('span', {
      class: `rule-chip rule-${g.type}${g.enabled === false ? ' is-off' : ''}`,
      title: `${g.type === 'together' ? 'Zusammen' : 'Getrennt'}: ${g.name}`,
    }, icon(g.type, { size: 14 }), letters.get(g.id)));

    const props = mode === 'select'
      ? { role: 'checkbox', 'aria-checked': String(selected), onClick: () => toggleSelect(p.id) }
      : { 'aria-pressed': String(!isAbsent), 'aria-label': `${p.name}, ${isAbsent ? 'fehlt heute' : 'ist da'}`, onClick: () => togglePresent(p.id, !isAbsent) };

    return h('li', {},
      h('button', {
        type: 'button',
        class: `name-tile${isAbsent ? ' is-absent' : ''}${selected ? ' is-selected' : ''}`,
        'data-key': `p-${p.id}`,
        ...props,
      },
      mode === 'select' ? h('span', { class: 'tile-check', 'aria-hidden': 'true' }, icon('check', { size: 16 })) : null,
      h('span', { class: 'tile-name' }, p.name),
      h('span', { class: 'tile-meta' },
        isAbsent && mode !== 'select' ? h('span', { class: 'absent-label' }, 'fehlt') : null,
        showLevel ? h('span', { class: 'meta-badge', title: `Niveau ${p.level}` }, `N${p.level}`) : null,
        showGender && p.gender ? h('span', { class: 'meta-badge', title: GENDER_LABEL[p.gender] }, p.gender) : null,
        chips,
      )));
  }));
}

function togglePresent(id, makeAbsent) {
  update((s, cls) => setAbsent(cls, id, makeAbsent), { dataChange: false });
  paint();
}

function toggleSelect(id) {
  if (session.selected.has(id)) session.selected.delete(id); else session.selected.add(id);
  paint();
}

// ---------- Auswahl → Regel ----------
function selectBar(cls) {
  const n = session.selected.size;
  return h('div', { class: 'select-bar', role: 'region', 'aria-label': 'Regel anlegen' },
    h('span', { class: 'select-count', 'aria-live': 'polite' }, n === 1 ? '1 Person ausgewählt' : `${n} Personen ausgewählt`),
    h('div', { class: 'select-actions' },
      button('Abbrechen', { variant: 'quiet', onClick: () => setMode('present'), 'data-key': 'sel-cancel' }),
      button('Getrennt', { icon: 'apart', disabled: n < 2, onClick: () => makeRule('apart'), 'data-key': 'sel-apart', title: 'Diese Personen möglichst auf verschiedene Teams verteilen' }),
      button('Zusammen', { icon: 'together', variant: 'primary', disabled: n < 2, onClick: () => makeRule('together'), 'data-key': 'sel-together', title: 'Diese Personen immer ins selbe Team' }),
    ));
}

function makeRule(type) {
  const ids = [...session.selected];
  const group = update((s, cls) => addGroup(cls, type, ids));
  setMode('present');
  if (group) toast(`Regel „${group.name}“ angelegt: ${type === 'together' ? 'immer zusammen' : 'möglichst getrennt'}.`);
}

// ---------- Regeln ----------
function rulesSection(cls) {
  const groups = cls.groups;
  return h('section', { class: 'rules', 'aria-labelledby': 'rules-title' },
    h('div', { class: 'section-head' },
      h('h2', { id: 'rules-title' }, 'Regeln'),
      groups.length ? toggle('Beim Losen beachten', cls.options.rulesEnabled, (v) => { update((s, c) => { c.options.rulesEnabled = v; }); paint(); }, { id: 'rules-enabled' }) : null),
    groups.length
      ? h('ul', { class: `rule-list${cls.options.rulesEnabled ? '' : ' is-off'}` }, groups.map((g, i) => ruleRow(cls, g, i)))
      : h('p', { class: 'muted' }, 'Noch keine Regeln. Mit „Regel anlegen“ wählst du Personen aus, die immer zusammen sein oder möglichst getrennt werden sollen.'),
  );
}

function ruleRow(cls, g, i) {
  const names = g.playerIds.map((id) => cls.players.find((p) => p.id === id)?.name).filter(Boolean).sort(byName);
  return h('li', { class: `rule-row${g.enabled === false ? ' is-off' : ''}` },
    h('span', { class: `rule-chip rule-${g.type}` }, icon(g.type, { size: 14 }), groupLetter(i)),
    h('div', { class: 'rule-text' },
      h('span', { class: 'rule-name' }, g.name),
      h('span', { class: 'rule-members' }, `${g.type === 'together' ? 'Immer zusammen' : 'Möglichst getrennt'}: ${names.join(', ')}`)),
    h('div', { class: 'rule-actions' },
      toggle(`Regel ${g.name} aktiv`, g.enabled !== false, (v) => { update((s, c) => { c.groups.find((x) => x.id === g.id).enabled = v; }); paint(); }, { id: `rule-${g.id}` }),
      iconButton('edit', `Regel ${g.name} umbenennen`, { onClick: () => renameRule(g), 'data-key': `rr-${g.id}` }),
      iconButton('trash', `Regel ${g.name} löschen`, { onClick: () => deleteRule(g) }),
    ));
}

async function renameRule(g) {
  const name = await promptDialog({ title: 'Regel umbenennen', label: 'Name der Regel', value: g.name, validate: (v) => (v.trim() ? null : 'Bitte einen Namen eingeben.') });
  if (!name) return;
  update((s, c) => { c.groups.find((x) => x.id === g.id).name = name; });
  paint();
}

function deleteRule(g) {
  const before = structuredClone(getState());
  update((s, c) => { c.groups = c.groups.filter((x) => x.id !== g.id); });
  paint();
  toast(`Regel „${g.name}“ gelöscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } } });
}

// ---------- Bearbeiten ----------
function editList(cls) {
  const players = [...cls.players].sort((a, b) => byName(a.name, b.name));
  return h('div', {},
    h('p', { class: 'edit-hint muted' },'Niveau 1 bis 5 wird nur für „ausgeglichen“ und „gleiches Niveau“ gebraucht. Niveau und Geschlecht erscheinen nie in den Teams, am Beamer oder im Druck.'),
    h('ul', { class: 'edit-list', 'aria-label': 'Namen bearbeiten' }, players.map((p) => editRow(p))),
  );
}

function editRow(p) {
  return h('li', { class: 'edit-row' },
    h('input', {
      class: 'input edit-name', type: 'text', value: p.name, 'aria-label': `Name von ${p.name}`, 'data-key': `n-${p.id}`, maxlength: 60,
      onChange: (e) => {
        const res = update((s, c) => renamePlayer(c, p.id, e.target.value));
        if (!res.ok) { toast(res.reason, { tone: 'error' }); e.target.value = p.name; }
      },
    }),
    h('div', { class: 'level-pick', role: 'radiogroup', 'aria-label': `Niveau von ${p.name}` }, LEVELS.map((l) => h('label', { class: 'level-opt', title: `Niveau ${l}` },
      h('input', { type: 'radio', name: `lvl-${p.id}`, value: l, checked: p.level === l, 'data-key': `l-${p.id}-${l}`, onChange:() => { update((s, c) => { c.players.find((x) => x.id === p.id).level = l; }); } }),
      h('span', {}, l)))),
    h('select', {
      class: 'input gender-pick', 'aria-label': `Geschlecht von ${p.name}`,
      onChange: (e) => { update((s, c) => { c.players.find((x) => x.id === p.id).gender = e.target.value || null; }); },
    },
    h('option', { value: '', selected: !p.gender }, 'Geschlecht –'),
    Object.entries(GENDER_LABEL).map(([v, label]) => h('option', { value: v, selected: p.gender === v }, label))),
    iconButton('trash', `${p.name} entfernen`, { onClick: () => deletePlayer(p) }),
  );
}

function deletePlayer(p) {
  const before = structuredClone(getState());
  update((s, c) => removePlayers(c, [p.id]));
  paint();
  toast(`${p.name} entfernt.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); paint(); } } });
}

// ---------- Klasse umbenennen ----------
async function renameClass() {
  const cls = activeClass();
  const name = await promptDialog({
    title: 'Klasse umbenennen', label: 'Name der Klasse', value: cls.name,
    validate: (v) => {
      if (!v.trim()) return 'Bitte einen Namen eingeben.';
      if (getState().classes.some((c) => c.id !== cls.id && c.name.toLocaleLowerCase('de') === v.trim().toLocaleLowerCase('de'))) return 'Diesen Klassennamen gibt es schon.';
      return null;
    },
  });
  if (!name) return;
  update((s, c) => { c.name = name; });
  paint();
}

// ---------- Namen hinzufügen ----------
function addEmpty() {
  return h('section', { class: 'empty' },
    h('div', { class: 'add-ways' },
      addWay('keyboard', 'Eintippen', 'Name für Name, Enter für den nächsten.', () => openAddNames('type')),
      addWay('paste', 'Liste einfügen', 'Aus Excel, Schulverwaltung oder Notizen – ein Name pro Zeile.', () => openAddNames('paste')),
      addWay('file', 'Datei laden', 'CSV- oder Textdatei, optional mit Niveau und Geschlecht.', () => openAddNames('file')),
    ));
}

function addWay(iconName, label, text, onClick) {
  return h('button', { type: 'button', class: 'add-way', onClick },
    h('span', { class: 'add-way-icon' }, icon(iconName, { size: 26 })),
    h('span', { class: 'add-way-label' }, label),
    h('span', { class: 'add-way-text' }, text));
}

function reportAdd({ added, duplicates }) {
  if (!added.length && !duplicates.length) return;
  let msg = added.length === 1 ? '1 Name hinzugefügt.' : `${added.length} Namen hinzugefügt.`;
  if (duplicates.length) {
    const shown = duplicates.slice(0, 4).join(', ') + (duplicates.length > 4 ? ' …' : '');
    msg += ` Schon vorhanden, übersprungen: ${shown}. Für zwei Personen mit gleichem Namen einen Zusatz verwenden, z. B. „Leon M.“.`;
  }
  toast(msg, { duration: duplicates.length ? 9000 : 4000 });
}

export function openAddNames(startTab = 'type') {
  let tab = typeof startTab === 'string' ? startTab : 'type';
  const panel = h('div', { class: 'add-panel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Art der Eingabe' });
  const TABS = [['type', 'keyboard', 'Eintippen'], ['paste', 'paste', 'Liste einfügen'], ['file', 'file', 'Datei laden']];

  function showTab(next) {
    tab = next;
    tabs.replaceChildren(...TABS.map(([id, ic, label]) => h('button', {
      type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab), id: `tab-${id}`,
      onClick: () => showTab(id),
    }, icon(ic, { size: 18 }), h('span', {}, label))));
    panel.replaceChildren(tab === 'type' ? typePanel() : tab === 'paste' ? pastePanel() : filePanel());
    panel.querySelector('input[type=text], textarea')?.focus();
  }

  function typePanel() {
    const list = h('ul', { class: 'added-list', 'aria-live': 'polite' });
    const input = h('input', { class: 'input', type: 'text', placeholder: 'Name', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'next', maxlength: 60, 'aria-label': 'Name' });
    const add = () => {
      const res = update((s, cls) => addPlayers(cls, [{ name: input.value }]));
      if (res.added.length) {
        list.prepend(h('li', {}, icon('check', { size: 16 }), res.added[0].name));
        paint();
      } else if (res.duplicates.length) {
        toast(`„${res.duplicates[0]}“ gibt es schon. Ein Zusatz hilft, z. B. „${res.duplicates[0]} M.“.`, { tone: 'error' });
      }
      input.value = '';
      input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    return h('div', {},
      h('div', { class: 'input-row' }, input, button('Hinzufügen', { icon: 'plus', onClick: add })),
      list);
  }

  function pastePanel() {
    const count = h('p', { class: 'muted', 'aria-live': 'polite' }, 'Ein Name pro Zeile. Nummern und Aufzählungszeichen werden entfernt.');
    const area = h('textarea', { class: 'input textarea', rows: 10, placeholder: 'Aylin Demir\nBen Schulz\nClara Weber\n…', 'aria-label': 'Namen, einer pro Zeile' });
    const addBtn = button('Hinzufügen', { variant: 'primary', icon: 'plus', disabled: true, onClick: () => {
      reportAdd(update((s, cls) => addPlayers(cls, parseNameList(area.value))));
      paint();
      dlg.close();
    } });
    area.addEventListener('input', () => {
      const n = parseNameList(area.value).length;
      count.textContent = n ? (n === 1 ? '1 Name erkannt.' : `${n} Namen erkannt.`) : 'Ein Name pro Zeile. Nummern und Aufzählungszeichen werden entfernt.';
      addBtn.disabled = !n;
    });
    return h('div', {}, area, h('div', { class: 'panel-foot' }, count, addBtn));
  }

  function filePanel() {
    const preview = h('div', { class: 'file-preview' });
    const input = h('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain', class: 'file-input', id: 'name-file' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const { entries, columns } = parseCsv(await file.text());
      if (!entries.length) { preview.replaceChildren(h('p', { class: 'field-error' }, 'In der Datei wurden keine Namen gefunden.')); return; }
      preview.replaceChildren(
        h('p', {}, `${entries.length} Namen erkannt. Gelesene Spalten: ${columns.join(', ')}.`),
        h('ul', { class: 'file-sample' }, entries.slice(0, 6).map((e) => h('li', {}, e.name, e.level ? ` · Niveau ${e.level}` : '', e.gender ? ` · ${GENDER_LABEL[e.gender]}` : ''))),
        entries.length > 6 ? h('p', { class: 'muted' }, `… und ${entries.length - 6} weitere`) : null,
        h('div', { class: 'panel-foot' }, h('span'), button(`${entries.length} Namen hinzufügen`, { variant: 'primary', icon: 'plus', onClick: () => {
          reportAdd(update((s, cls) => addPlayers(cls, entries)));
          paint();
          dlg.close();
        } })),
      );
    });
    return h('div', {},
      h('label', { class: 'file-drop', for: 'name-file' }, icon('file', { size: 28 }), h('span', {}, 'CSV- oder Textdatei auswählen'),
        h('span', { class: 'muted' }, 'Spalten wie „Vorname; Nachname; Niveau; Geschlecht“ werden erkannt.')),
      input, preview);
  }

  const dlg = openDialog({ title: 'Namen hinzufügen', body: [tabs, panel], size: 'wide', onClose: paint });
  showTab(tab);
}
