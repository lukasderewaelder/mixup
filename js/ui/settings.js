// Einstellungen: Anzeige, Teamnamen, Sicherung, Datenschutz, Über Mixup.
import { h, button, screenHead, segmented, toggle, formatDate, replaceKeepFocus } from './dom.js';
import { confirmDialog, toast } from './dialogs.js';
import { getState, update, replaceState } from '../store.js';
import { createState, normalizeName } from '../model.js';
import { MAX_TEAMS } from '../teams/colors.js';
import { exportBackup, importBackup } from '../backup.js';
import { APP_VERSION } from '../version.js';

export const title = 'Einstellungen';

let root;

export function render() {
  root = h('div', { class: 'settings' });
  paint();
  return root;
}

const set = (patch) => { update((s) => { Object.assign(s.settings, patch); }, { dataChange: false }); paint(); };

function paint() {
  const s = getState().settings;
  const scroll = scrollY;
  replaceKeepFocus(root, [
    screenHead('Einstellungen', null, h('a', { class: 'btn btn-quiet', href: '#/' }, 'Zu den Klassen')),

    section('Anzeige', 'display',
      toggle('Niveau in der Namensliste zeigen', s.showLevel, (v) => set({ showLevel: v }), { id: 's-level', hint: 'Nur in Schritt 1. In Teams, Beamer und Druck erscheint das Niveau nie.' }),
      toggle('Geschlecht in der Namensliste zeigen', s.showGender, (v) => set({ showGender: v }), { id: 's-gender', hint: 'Nur in Schritt 1.' }),
      toggle('Misch-Animation beim Losen', s.animation, (v) => set({ animation: v }), { id: 's-anim', hint: 'Wird automatisch abgeschaltet, wenn das Gerät „Bewegung reduzieren“ verlangt.' }),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Namen in den Teamkarten'),
        segmented('name-order', [{ value: 'alpha', label: 'Alphabetisch' }, { value: 'draw', label: 'In Losreihenfolge' }], s.nameOrder, (v) => set({ nameOrder: v }), { label: 'Namen in den Teamkarten' })),
    ),

    section('Teamnamen', 'names',
      h('p', { class: 'muted' }, 'Leer lassen für „Team 1“, „Team 2“ … Die Namen gelten für alle Klassen.'),
      h('div', { class: 'team-name-grid' }, Array.from({ length: MAX_TEAMS }, (_, i) => h('label', { class: 'team-name-field', '--c': `var(--team-${i + 1})` },
        h('span', { class: 'team-name-dot', 'aria-hidden': 'true' }, i + 1),
        h('input', {
          class: 'input', type: 'text', value: s.teamNames[i] || '', placeholder: `Team ${i + 1}`, maxlength: 40, 'aria-label': `Name für Team ${i + 1}`,
          onChange: (e) => {
            const names = [...getState().settings.teamNames];
            names[i] = normalizeName(e.target.value);
            while (names.length && !names.at(-1)) names.pop();
            update((st) => { st.settings.teamNames = names; }, { dataChange: false });
          },
        })))),
      s.teamNames.some(Boolean) ? button('Alle Teamnamen zurücksetzen', { variant: 'quiet', onClick: () => set({ teamNames: [] }) }) : null,
    ),

    section('Sicherung', 'backup',
      h('p', {}, s.lastBackupAt ? `Letzte Sicherung: ${formatDate(s.lastBackupAt, { time: true })}.` : 'Noch keine Sicherung gespeichert.'),
      h('p', { class: 'muted' }, 'Alle Klassen, Regeln, Einstellungen und der Verlauf landen in einer Datei. Damit ziehst du auf ein anderes Gerät um oder stellst Daten wieder her.'),
      h('div', { class: 'button-row' },
        button('Sicherung speichern', { icon: 'download', variant: 'primary', onClick: () => { exportBackup(); paint(); } }),
        button('Sicherung laden', { icon: 'upload', onClick: () => importBackup(paint) })),
      toggle('An Sicherung erinnern', s.backupReminder, (v) => set({ backupReminder: v }), { id: 's-remind', hint: 'Dezenter Hinweis auf der Startseite, wenn sich etwas geändert hat und die letzte Sicherung älter als vier Wochen ist.' }),
    ),

    section('Datenschutz', 'privacy',
      h('p', {}, 'Mixup speichert alles nur auf diesem Gerät im Browser-Speicher. Es gibt kein Konto, keine Cloud, keine Werbung und keine Statistik. Nichts wird an einen Server geschickt – nach dem ersten Laden läuft die App auch ganz ohne Internet.'),
      h('p', { class: 'muted' }, 'Niveau und Geschlecht sind nur für die Teambildung da und werden nirgends angezeigt, wo die Klasse mitschaut.'),
    ),

    section('Tastenkürzel', 'keys',
      h('dl', { class: 'keys' }, [
        ['1 / 2 / 3', 'Schritt wechseln'], ['Leertaste', 'Teams losen bzw. neu losen'], ['B', 'Beamer-Ansicht'],
        ['Z', 'Zufallsperson'], ['R', 'Reihenfolge'], ['V', 'Verlauf'], ['Strg + P', 'Drucken'], ['Esc', 'Schließen, Auswahl aufheben'],
      ].map(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
    ),

    section('Über Mixup', 'about',
      h('p', {}, `Version ${APP_VERSION}. Funktionsprinzip angelehnt an die iOS-App „Team Shake“; Name, Gestaltung, Texte und Algorithmus sind eigenständig.`),
      h('p', { class: 'muted' }, 'Schrift: Inter © The Inter Project Authors, SIL Open Font License 1.1.'),
    ),

    section('Alle Daten löschen', 'danger',
      h('p', { class: 'muted' }, 'Entfernt alle Klassen, Regeln, Einstellungen und den Verlauf von diesem Gerät.'),
      button('Alle Daten löschen', { icon: 'trash', variant: 'danger', onClick: wipe }),
    ),
  ]);
  scrollTo({ top: scroll });
}

function section(title, id, ...content) {
  return h('section', { class: 'panel settings-section', 'aria-labelledby': `set-${id}` },
    h('h2', { class: 'panel-title', id: `set-${id}` }, title), content);
}

async function wipe() {
  const n = getState().classes.length;
  const ok = await confirmDialog({
    title: 'Alle Daten löschen?',
    text: `${n === 1 ? '1 Klasse' : `${n} Klassen`} mit allen Namen, Regeln und dem Verlauf werden von diesem Gerät entfernt. Das lässt sich nur mit einer Sicherungsdatei rückgängig machen.`,
    confirmLabel: 'Alles löschen',
    danger: true,
  });
  if (!ok) return;
  replaceState(createState());
  toast('Alle Daten wurden gelöscht.');
  location.hash = '#/';
}
