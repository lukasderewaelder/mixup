// Namensliste im Hauptbildschirm: Anwesenheit, Namen erfassen und bearbeiten, Regeln.
import { h, button, iconButton, toggle } from './dom.js';
import { icon } from './icons.js';
import { openDialog, promptDialog, toast } from './dialogs.js';
import { activeClass, getState, update, replaceState } from '../store.js';
import {
  addPlayers, renamePlayer, removePlayers, absentIds, setAbsent, clearAbsent, presentCount,
  addGroup, groupsOf, byName, formatLevel, LEVEL_MIN, LEVEL_MAX, GENDER_LABEL,
} from '../model.js';
import { parseNameList, parseCsv } from '../import.js';
import { session } from './session.js';

export const groupLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`);

/** @param {() => void} refresh  Hauptbildschirm neu zeichnen */
export function namesPanel(refresh) {
  const cls = activeClass();
  const total = cls.players.length;
  const present = presentCount(cls);
  const mode = session.namesMode;
  const setMode = (m) => { session.namesMode = m; session.selected.clear(); refresh(); };

  const head = h('div', { class: 'panel-head' },
    h('h2', { class: 'panel-title' }, 'Namen'),
    total ? h('span', { class: 'count-pill', 'aria-live': 'polite' }, `${present} von ${total} da`) : null);

  const hint = !total ? null
    : mode === 'select' ? 'Personen antippen, die immer zusammen oder möglichst getrennt sein sollen.'
      : mode === 'edit' ? 'Namen ändern, Niveau (−5 bis +5) und Geschlecht einstellen oder Personen entfernen. Beides erscheint nie in der Klassenansicht.'
        : 'Antippen, wenn jemand heute fehlt.';

  return h('section', { class: `names-panel mode-${mode}`, 'aria-label': 'Namen' },
    head,
    total ? toolbar(mode, present, total, setMode, refresh) : null,
    hint ? h('p', { class: 'panel-hint' }, hint) : null,
    total ? (mode === 'edit' ? editList(cls, refresh) : nameGrid(cls, mode, refresh)) : addWays(refresh),
    mode !== 'edit' && total ? rulesSection(cls, refresh) : null,
    mode === 'select' ? selectBar(setMode, refresh) : null,
  );
}

// ---------- Werkzeugleiste ----------
function toolbar(mode, present, total, setMode, refresh) {
  if (mode === 'edit') {
    return h('div', { class: 'toolbar' },
      button('Namen hinzufügen', { icon: 'plus', onClick: () => openAddNames('type', refresh) }),
      h('span', { class: 'toolbar-spacer' }),
      button('Fertig', { icon: 'check', variant: 'primary', onClick: () => setMode('present'), 'data-key': 'edit-done' }));
  }
  if (mode === 'select') {
    return h('div', { class: 'toolbar' },
      button('Alle abwählen', { icon: 'close', disabled: !session.selected.size, onClick: () => { session.selected.clear(); refresh(); } }),
      h('span', { class: 'toolbar-spacer' }),
      button('Fertig', { icon: 'check', variant: 'quiet', onClick: () => setMode('present') }));
  }
  return h('div', { class: 'toolbar' },
    button('Namen', { icon: 'plus', onClick: () => openAddNames('type', refresh), title: 'Namen hinzufügen' }),
    button('Regel', { icon: 'select', onClick: () => setMode('select'), title: 'Personen auswählen, die zusammen oder getrennt sein sollen' }),
    button('Bearbeiten', { icon: 'edit', onClick: () => setMode('edit'), title: 'Namen, Niveau und Geschlecht bearbeiten' }),
    h('span', { class: 'toolbar-spacer' }),
    present < total ? button('Alle da', { icon: 'reset', variant: 'quiet', onClick: () => { update((s, c) => clearAbsent(c), { dataChange: false }); refresh(); }, 'data-key': 'all-present' }) : null,
  );
}

// ---------- Namensraster ----------
function nameGrid(cls, mode, refresh) {
  const absent = absentIds(cls);
  const letters = new Map(cls.groups.map((g, i) => [g.id, groupLetter(i)]));
  const { showLevel, showGender } = getState().settings;
  const players = [...cls.players].sort((a, b) => byName(a.name, b.name));

  return h('ul', { class: 'name-grid', 'aria-label': 'Namen' }, players.map((p) => {
    const isAbsent = absent.has(p.id);
    const selected = session.selected.has(p.id);
    const chips = groupsOf(cls, p.id).map((g) => h('span', {
      class: `rule-chip rule-${g.type}${g.enabled === false ? ' is-off' : ''}`,
      title: `${g.type === 'together' ? 'Zusammen' : 'Getrennt'}: ${g.name}`,
    }, icon(g.type, { size: 14 }), letters.get(g.id)));

    const props = mode === 'select'
      ? { role: 'checkbox', 'aria-checked': String(selected), onClick: () => { if (selected) session.selected.delete(p.id); else session.selected.add(p.id); refresh(); } }
      : { 'aria-pressed': String(!isAbsent), 'aria-label': `${p.name}, ${isAbsent ? 'fehlt heute' : 'ist da'}`, onClick: () => { update((s, c) => setAbsent(c, p.id, !isAbsent), { dataChange: false }); refresh(); } };

    return h('li', {},
      h('button', { type: 'button', class: `name-tile${isAbsent ? ' is-absent' : ''}${selected ? ' is-selected' : ''}`, 'data-key': `p-${p.id}`, ...props },
        mode === 'select' ? h('span', { class: 'tile-check', 'aria-hidden': 'true' }, icon('check', { size: 16 })) : null,
        h('span', { class: 'tile-name' }, p.name),
        h('span', { class: 'tile-meta' },
          isAbsent && mode !== 'select' ? h('span', { class: 'absent-label' }, 'fehlt') : null,
          showLevel ? h('span', { class: `meta-badge level-badge${p.level > 0 ? ' is-plus' : p.level < 0 ? ' is-minus' : ''}`, title: `Niveau ${formatLevel(p.level)}` }, formatLevel(p.level)) : null,
          showGender && p.gender ? h('span', { class: 'meta-badge', title: GENDER_LABEL[p.gender] }, p.gender) : null,
          chips)));
  }));
}

// ---------- Auswahl → Regel ----------
function selectBar(setMode, refresh) {
  const n = session.selected.size;
  const make = (type) => {
    const ids = [...session.selected];
    const group = update((s, c) => addGroup(c, type, ids));
    setMode('present');
    if (group) toast(`Regel „${group.name}“ angelegt: ${type === 'together' ? 'immer zusammen' : 'möglichst getrennt'}.`);
  };
  return h('div', { class: 'select-bar', role: 'region', 'aria-label': 'Regel anlegen' },
    h('span', { class: 'select-count', 'aria-live': 'polite' }, n === 1 ? '1 ausgewählt' : `${n} ausgewählt`),
    h('div', { class: 'select-actions' },
      button('Abbrechen', { variant: 'quiet', onClick: () => setMode('present') }),
      button('Getrennt', { icon: 'apart', disabled: n < 2, onClick: () => make('apart'), title: 'Möglichst auf verschiedene Teams verteilen' }),
      button('Zusammen', { icon: 'together', variant: 'primary', disabled: n < 2, onClick: () => make('together'), title: 'Immer ins selbe Team' })));
}

// ---------- Regeln ----------
function rulesSection(cls, refresh) {
  const groups = cls.groups;
  return h('section', { class: 'rules', 'aria-labelledby': 'rules-title' },
    h('div', { class: 'section-head' },
      h('h3', { id: 'rules-title' }, 'Regeln'),
      groups.length ? toggle('Beim Losen beachten', cls.options.rulesEnabled, (v) => { update((s, c) => { c.options.rulesEnabled = v; }); refresh(); }, { id: 'rules-enabled' }) : null),
    groups.length
      ? h('ul', { class: `rule-list${cls.options.rulesEnabled ? '' : ' is-off'}` }, groups.map((g, i) => ruleRow(cls, g, i, refresh)))
      : h('p', { class: 'muted small' }, 'Noch keine Regeln. Mit „Regel“ wählst du Personen aus, die immer zusammen sein oder möglichst getrennt werden sollen.'));
}

function ruleRow(cls, g, i, refresh) {
  const names = g.playerIds.map((id) => cls.players.find((p) => p.id === id)?.name).filter(Boolean).sort(byName);
  return h('li', { class: `rule-row${g.enabled === false ? ' is-off' : ''}` },
    h('span', { class: `rule-chip rule-${g.type}` }, icon(g.type, { size: 14 }), groupLetter(i)),
    h('div', { class: 'rule-text' },
      h('span', { class: 'rule-name' }, g.name),
      h('span', { class: 'rule-members' }, `${g.type === 'together' ? 'Immer zusammen' : 'Möglichst getrennt'}: ${names.join(', ')}`)),
    h('div', { class: 'rule-actions' },
      toggle(`Regel ${g.name} aktiv`, g.enabled !== false, (v) => { update((s, c) => { c.groups.find((x) => x.id === g.id).enabled = v; }); refresh(); }, { id: `rule-${g.id}` }),
      iconButton('edit', `Regel ${g.name} umbenennen`, { onClick: async () => {
        const name = await promptDialog({ title: 'Regel umbenennen', label: 'Name der Regel', value: g.name, validate: (v) => (v.trim() ? null : 'Bitte einen Namen eingeben.') });
        if (!name) return;
        update((s, c) => { c.groups.find((x) => x.id === g.id).name = name; });
        refresh();
      } }),
      iconButton('trash', `Regel ${g.name} löschen`, { onClick: () => {
        const before = structuredClone(getState());
        update((s, c) => { c.groups = c.groups.filter((x) => x.id !== g.id); });
        refresh();
        toast(`Regel „${g.name}“ gelöscht.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
      } })));
}

// ---------- Bearbeiten ----------
function editList(cls, refresh) {
  const players = [...cls.players].sort((a, b) => byName(a.name, b.name));
  return h('ul', { class: 'edit-list', 'aria-label': 'Namen bearbeiten' }, players.map((p) => editRow(p, refresh)));
}

function editRow(p, refresh) {
  const out = h('output', { class: `level-out${p.level > 0 ? ' is-plus' : p.level < 0 ? ' is-minus' : ''}` }, formatLevel(p.level));
  const slider = h('input', {
    type: 'range', class: 'level-slider', min: LEVEL_MIN, max: LEVEL_MAX, step: 1, value: p.level,
    'aria-label': `Niveau von ${p.name}`, 'aria-valuetext': formatLevel(p.level), 'data-key': `l-${p.id}`,
    onInput: (e) => {
      const v = Number(e.target.value);
      out.textContent = formatLevel(v);
      out.className = `level-out${v > 0 ? ' is-plus' : v < 0 ? ' is-minus' : ''}`;
      e.target.setAttribute('aria-valuetext', formatLevel(v));
    },
    onChange: (e) => { update((s, c) => { c.players.find((x) => x.id === p.id).level = Number(e.target.value); }); },
  });
  return h('li', { class: 'edit-row' },
    h('input', {
      class: 'input edit-name', type: 'text', name: `name-${p.id}`, autocomplete: 'off', spellcheck: 'false', value: p.name, 'aria-label': `Name von ${p.name}`, 'data-key': `n-${p.id}`, maxlength: 60,
      onChange: (e) => {
        const res = update((s, c) => renamePlayer(c, p.id, e.target.value));
        if (!res.ok) { toast(res.reason, { tone: 'error' }); e.target.value = p.name; }
      },
    }),
    h('div', { class: 'level-field' }, h('span', { class: 'level-end', 'aria-hidden': 'true' }, '−5'), slider, h('span', { class: 'level-end', 'aria-hidden': 'true' }, '+5'), out),
    h('select', {
      class: 'input gender-pick', 'aria-label': `Geschlecht von ${p.name}`, 'data-key': `g-${p.id}`,
      onChange: (e) => { update((s, c) => { c.players.find((x) => x.id === p.id).gender = e.target.value || null; }); },
    },
    h('option', { value: '', selected: !p.gender }, 'Geschlecht –'),
    Object.entries(GENDER_LABEL).map(([v, label]) => h('option', { value: v, selected: p.gender === v }, label))),
    iconButton('trash', `${p.name} entfernen`, { onClick: () => {
      const before = structuredClone(getState());
      update((s, c) => removePlayers(c, [p.id]));
      refresh();
      toast(`${p.name} entfernt.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
    } }));
}

// ---------- Namen hinzufügen ----------
function addWays(refresh) {
  const way = (iconName, label, text, tab) => h('button', { type: 'button', class: 'add-way', onClick: () => openAddNames(tab, refresh) },
    h('span', { class: 'add-way-icon' }, icon(iconName, { size: 26 })),
    h('span', { class: 'add-way-label' }, label),
    h('span', { class: 'add-way-text' }, text));
  return h('div', { class: 'add-ways' },
    way('keyboard', 'Eintippen', 'Name für Name, Enter für den nächsten.', 'type'),
    way('paste', 'Liste einfügen', 'Aus Excel, Schulverwaltung oder Notizen – ein Name pro Zeile.', 'paste'),
    way('file', 'Datei laden', 'CSV- oder Textdatei, optional mit Niveau und Geschlecht.', 'file'));
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

export function openAddNames(startTab = 'type', refresh = () => {}) {
  let tab = startTab;
  const panel = h('div', { class: 'add-panel' });
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Art der Eingabe' });
  const TABS = [['type', 'keyboard', 'Eintippen'], ['paste', 'paste', 'Liste einfügen'], ['file', 'file', 'Datei laden']];

  function showTab(next) {
    tab = next;
    tabs.replaceChildren(...TABS.map(([id, ic, label]) => h('button', {
      type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab), onClick: () => showTab(id),
    }, icon(ic, { size: 18 }), h('span', {}, label))));
    panel.replaceChildren(tab === 'type' ? typePanel() : tab === 'paste' ? pastePanel() : filePanel());
    panel.querySelector('input[type=text], textarea')?.focus();
  }

  function typePanel() {
    const list = h('ul', { class: 'added-list', 'aria-live': 'polite' });
    const input = h('input', { class: 'input', type: 'text', name: 'neuer-name', placeholder: 'z. B. Aylin Demir …', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'words', enterkeyhint: 'next', maxlength: 60, 'aria-label': 'Name' });
    const add = () => {
      const res = update((s, cls) => addPlayers(cls, [{ name: input.value }]));
      if (res.added.length) { list.prepend(h('li', {}, icon('check', { size: 16 }), res.added[0].name)); refresh(); }
      else if (res.duplicates.length) toast(`„${res.duplicates[0]}“ gibt es schon. Ein Zusatz hilft, z. B. „${res.duplicates[0]} M.“.`, { tone: 'error' });
      input.value = '';
      input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    return h('div', {}, h('div', { class: 'input-row' }, input, button('Hinzufügen', { icon: 'plus', onClick: add })), list);
  }

  function pastePanel() {
    const count = h('p', { class: 'muted', 'aria-live': 'polite' }, 'Ein Name pro Zeile. Nummern und Aufzählungszeichen werden entfernt.');
    const area = h('textarea', { class: 'input textarea', name: 'namensliste', autocomplete: 'off', spellcheck: 'false', rows: 10, placeholder: 'Aylin Demir\nBen Schulz\nClara Weber\n…', 'aria-label': 'Namen, einer pro Zeile' });
    const addBtn = button('Hinzufügen', { variant: 'primary', icon: 'plus', disabled: true, onClick: () => {
      reportAdd(update((s, cls) => addPlayers(cls, parseNameList(area.value))));
      refresh();
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
        h('ul', { class: 'file-sample' }, entries.slice(0, 6).map((e) => h('li', {}, e.name, e.level != null ? ` · Niveau ${formatLevel(e.level)}` : '', e.gender ? ` · ${GENDER_LABEL[e.gender]}` : ''))),
        entries.length > 6 ? h('p', { class: 'muted' }, `… und ${entries.length - 6} weitere`) : null,
        h('div', { class: 'panel-foot' }, h('span'), button(`${entries.length} Namen hinzufügen`, { variant: 'primary', icon: 'plus', onClick: () => {
          reportAdd(update((s, cls) => addPlayers(cls, entries)));
          refresh();
          dlg.close();
        } })));
    });
    return h('div', {},
      h('label', { class: 'file-drop', for: 'name-file' }, icon('file', { size: 28 }), h('span', {}, 'CSV- oder Textdatei auswählen'),
        h('span', { class: 'muted' }, 'Spalten wie „Vorname; Nachname; Niveau; Geschlecht“ werden erkannt. Niveau −5 bis +5.')),
      input, preview);
  }

  const dlg = openDialog({ title: 'Namen hinzufügen', body: [tabs, panel], size: 'wide', onClose: refresh });
  showTab(tab);
}
