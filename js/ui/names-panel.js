// Namensliste im Hauptbildschirm – wie im Original: eine Zeile pro Person, nur der Name.
// Rechts der Schalter „fehlt heute“ und › für die Details (Name, Niveau, Geschlecht, Regeln, Entfernen).
// Regeln entstehen im Auswahlmodus: Personen antippen, dann oben „Zusammen“ oder „Getrennt“.
import { h, button, iconButton, toggle, segmented } from './dom.js';
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

const sortedPlayers = (cls) => [...cls.players].sort((a, b) => byName(a.name, b.name));

/** @param {() => void} refresh  Hauptbildschirm neu zeichnen */
export function namesPanel(refresh) {
  const cls = activeClass();
  const total = cls.players.length;
  const present = presentCount(cls);
  const selecting = session.namesMode === 'select';

  return h('section', { class: `names-panel${selecting ? ' is-selecting' : ''}`, 'aria-label': 'Namen' },
    h('div', { class: 'panel-head' },
      h('h2', { class: 'panel-title' }, 'Namen'),
      total ? h('span', { class: 'count-pill', 'aria-live': 'polite' }, `${present} von ${total} da`) : null,
      h('span', { class: 'toolbar-spacer' }),
      !selecting && total && present < total
        ? button('Alle da', { icon: 'reset', variant: 'quiet', onClick: () => { update((s, c) => clearAbsent(c), { dataChange: false }); refresh(); }, 'data-key': 'all-present', title: 'Alle als anwesend markieren' })
        : null),
    selecting ? h('p', { class: 'panel-hint' }, 'Personen antippen, die immer zusammen sein oder möglichst getrennt werden sollen – dann oben „Zusammen“ oder „Getrennt“.') : null,
    total ? nameList(cls, selecting, refresh) : addWays(refresh));
}

// ---------- Liste ----------
function nameList(cls, selecting, refresh) {
  const absent = absentIds(cls);
  return h('ul', { class: `name-list${selecting ? ' is-selecting' : ''}`, 'aria-label': 'Namen' }, sortedPlayers(cls).map((p) => {
    const isAbsent = absent.has(p.id);
    if (selecting) {
      const sel = session.selected.has(p.id);
      return h('li', { class: `name-row${isAbsent ? ' is-absent' : ''}${sel ? ' is-selected' : ''}` },
        h('button', {
          type: 'button', class: 'nr-pick', role: 'checkbox', 'aria-checked': String(sel), 'data-key': `p-${p.id}`,
          onClick: () => { if (sel) session.selected.delete(p.id); else session.selected.add(p.id); refresh(); },
        },
        h('span', { class: 'nr-check', 'aria-hidden': 'true' }, icon('check', { size: 16 })),
        h('span', { class: 'nr-name' }, p.name)));
    }
    return h('li', { class: `name-row${isAbsent ? ' is-absent' : ''}` },
      h('button', { type: 'button', class: 'nr-open', 'data-key': `o-${p.id}`, 'aria-label': `${p.name}${isAbsent ? ' (fehlt heute)' : ''}: Details`, onClick: () => openPerson(p.id, refresh) },
        h('span', { class: 'nr-name' }, p.name), icon('next', { size: 20 })),
      h('button', {
        type: 'button', class: 'nr-absent', 'aria-pressed': String(isAbsent), 'aria-label': `${p.name} fehlt heute`, 'data-key': `a-${p.id}`,
        title: isAbsent ? 'Fehlt heute – antippen, wenn doch da' : 'Antippen, wenn heute nicht da',
        onClick: () => { update((s, c) => setAbsent(c, p.id, !isAbsent), { dataChange: false }); refresh(); },
      }, icon('absent', { size: 24 })));
  }));
}

/** Auswahlmodus starten (aus „Regeln“ oder aus den Details einer Person). */
export function startSelecting(firstId = null) {
  session.namesMode = 'select';
  session.selected.clear();
  if (firstId) session.selected.add(firstId);
  session.tab = 'names';
}

/** Aus der Auswahl eine Regel machen. */
export function makeRule(type) {
  const ids = [...session.selected];
  const group = update((s, c) => addGroup(c, type, ids));
  session.namesMode = 'present';
  session.selected.clear();
  if (group) toast(`Regel „${group.name}“ angelegt: ${type === 'together' ? 'immer zusammen' : 'möglichst getrennt'}.`);
}

// ---------- Details einer Person (Blatt mit Vorherige/Nächste) ----------
export function openPerson(startId, refresh) {
  let id = startId;
  const body = h('div', { class: 'person-sheet' });
  const prev = button(null, { icon: 'back', class: 'btn btn-icon', onClick: () => step(-1), 'data-key': 'ps-prev', 'aria-label': 'Vorherige Person', title: 'Vorherige Person' });
  const next = button(null, { icon: 'next', class: 'btn btn-icon', onClick: () => step(1), 'data-key': 'ps-next', 'aria-label': 'Nächste Person', title: 'Nächste Person' });
  const remove = button('Entfernen', { icon: 'trash', variant: 'danger', onClick: () => removePerson() });
  const dlg = openDialog({
    title: '', body, onClose: refresh, className: 'person-dialog',
    footer: [remove, h('span', { class: 'toolbar-spacer' }), prev, next, button('Fertig', { icon: 'check', variant: 'primary', onClick: () => dlg.close() })],
  });
  const titleEl = dlg.dialog.querySelector('.modal-head h2');

  function step(dir) {
    const list = sortedPlayers(activeClass());
    const i = list.findIndex((p) => p.id === id);
    const target = list[i + dir];
    if (!target) return;
    id = target.id;
    paint();
    (dir < 0 ? prev : next).focus({ preventScroll: true });
  }

  function removePerson() {
    const cls = activeClass();
    const p = cls.players.find((x) => x.id === id);
    if (!p) return;
    const before = structuredClone(getState());
    update((s, c) => removePlayers(c, [p.id]));
    dlg.close();
    toast(`${p.name} entfernt.`, { action: { label: 'Rückgängig', onClick: () => { replaceState(before); refresh(); } } });
  }

  function paint() {
    const cls = activeClass();
    const list = sortedPlayers(cls);
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) { dlg.close(); return; }
    const p = list[idx];
    titleEl.textContent = p.name;
    prev.disabled = idx === 0;
    next.disabled = idx === list.length - 1;
    const isAbsent = absentIds(cls).has(p.id);
    const others = (g) => g.playerIds.filter((x) => x !== p.id).map((x) => cls.players.find((q) => q.id === x)?.name).filter(Boolean).sort(byName);
    const letters = new Map(cls.groups.map((g, i) => [g.id, groupLetter(i)]));

    const out = h('output', { class: `level-out${p.level > 0 ? ' is-plus' : p.level < 0 ? ' is-minus' : ''}` }, formatLevel(p.level));
    const slider = h('input', {
      type: 'range', class: 'level-slider', min: LEVEL_MIN, max: LEVEL_MAX, step: 1, value: p.level, id: 'ps-level',
      'aria-valuetext': formatLevel(p.level), 'data-key': 'ps-level',
      onInput: (e) => {
        const v = Number(e.target.value);
        out.textContent = formatLevel(v);
        out.className = `level-out${v > 0 ? ' is-plus' : v < 0 ? ' is-minus' : ''}`;
        e.target.setAttribute('aria-valuetext', formatLevel(v));
      },
      onChange: (e) => { update((s, c) => { c.players.find((x) => x.id === p.id).level = Number(e.target.value); }); },
    });

    body.replaceChildren(
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'),
        h('input', {
          class: 'input', type: 'text', name: 'person-name', autocomplete: 'off', spellcheck: 'false', value: p.name, maxlength: 60, 'data-key': 'ps-name',
          onChange: (e) => {
            const res = update((s, c) => renamePlayer(c, p.id, e.target.value));
            if (!res.ok) { toast(res.reason, { tone: 'error' }); e.target.value = p.name; } else titleEl.textContent = activeClass().players.find((x) => x.id === p.id).name;
          },
        })),
      toggle('Fehlt heute', isAbsent, (v) => { update((s, c) => setAbsent(c, p.id, v), { dataChange: false }); paint(); }, { id: 'ps-absent', hint: 'Gilt nur für heute – morgen sind wieder alle da.' }),
      h('div', { class: 'field' },
        h('label', { class: 'field-label', for: 'ps-level' }, 'Niveau'),
        h('div', { class: 'level-field' }, h('span', { class: 'level-end', 'aria-hidden': 'true' }, '−5'), slider, h('span', { class: 'level-end', 'aria-hidden': 'true' }, '+5'), out),
        h('p', { class: 'field-hint' }, 'Nur für „Gleich stark“, „Gemischt“ und „Gleiches Niveau“. Erscheint nie in der Klassenansicht.')),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, 'Geschlecht'),
        segmented('ps-gender', [{ value: '', label: 'keine Angabe' }, ...Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }))], p.gender || '',
          (v) => { update((s, c) => { c.players.find((x) => x.id === p.id).gender = v || null; }); }, { label: 'Geschlecht' })),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, 'Regeln'),
        groupsOf(cls, p.id).length
          ? h('ul', { class: 'ps-rules' }, groupsOf(cls, p.id).map((g) => h('li', { class: `ps-rule${g.enabled === false ? ' is-off' : ''}` },
            h('span', { class: `rule-chip rule-${g.type}` }, icon(g.type, { size: 14 }), letters.get(g.id)),
            h('span', { class: 'rule-text' },
              h('span', { class: 'rule-name' }, g.name),
              h('span', { class: 'rule-members' }, `${g.type === 'together' ? 'Immer zusammen mit' : 'Möglichst getrennt von'} ${others(g).join(', ')}`)),
            iconButton('close', `${p.name} aus Regel ${g.name} nehmen`, { onClick: () => {
              update((s, c) => {
                const grp = c.groups.find((x) => x.id === g.id);
                grp.playerIds = grp.playerIds.filter((x) => x !== p.id);
                if (grp.playerIds.length < 2) c.groups = c.groups.filter((x) => x.id !== g.id);
              });
              paint();
            } }))))
          : h('p', { class: 'field-hint' }, 'Keine Regel.'),
        h('div', {}, button(`Neue Regel mit ${p.name}`, { icon: 'select', onClick: () => { startSelecting(p.id); dlg.close(); } }))),
    );
  }

  paint();
}

// ---------- Regeln (Blatt) ----------
export function openRules(refresh) {
  const body = h('div', { class: 'rules-sheet' });
  const paintAll = () => { paint(); refresh(); };
  const dlg = openDialog({
    title: 'Regeln', body, size: 'wide', onClose: refresh,
    footer: [h('span', { class: 'toolbar-spacer' }), button('Neue Regel', { icon: 'plus', variant: 'primary', onClick: () => { startSelecting(); dlg.close(); } })],
  });

  function paint() {
    const cls = activeClass();
    const groups = cls.groups;
    body.replaceChildren(
      h('p', { class: 'muted' }, '„Zusammen“ kommt immer ins selbe Team, „Getrennt“ möglichst in verschiedene Teams. Regeln gelten für jede Einteilung dieser Klasse.'),
      groups.length ? toggle('Beim Losen beachten', cls.options.rulesEnabled, (v) => { update((s, c) => { c.options.rulesEnabled = v; }); paintAll(); }, { id: 'rules-enabled' }) : null,
      groups.length
        ? h('ul', { class: `rule-list${cls.options.rulesEnabled ? '' : ' is-off'}` }, groups.map((g, i) => ruleRow(cls, g, i, paintAll)))
        : h('p', { class: 'empty-note' }, 'Noch keine Regeln. Mit „Neue Regel“ wählst du in der Namensliste Personen aus.'),
    );
  }
  paint();
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
        h('ul', { class: 'file-sample' }, entries.slice(0, 6).map((e) => h('li', {}, e.name, e.level != null ? `, Niveau ${formatLevel(e.level)}` : '', e.gender ? `, ${GENDER_LABEL[e.gender]}` : ''))),
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
