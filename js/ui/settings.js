// Einstellungen: Anzeige, Teamnamen, Sicherung, Datenschutz, Über Mixup.
import { h, button, screenHead, segmented, toggle, formatDate, replaceKeepFocus } from './dom.js';
import { confirmDialog, toast } from './dialogs.js';
import { getState, update, replaceState } from '../store.js';
import { createState } from '../model.js';
import { exportBackup, importBackup } from '../backup.js';
import { APP_VERSION } from '../version.js';

export const title = 'Einstellungen';

const THEME_CHOICES = [
  { value: 'klar', label: 'Klar', hint: 'ruhig und hell (Standard)' },
  { value: 'poster', label: 'Poster', hint: 'dicke Linien, harte Schatten, Sticker' },
  { value: 'heft', label: 'Heft', hint: 'Karopapier, Klebezettel, Textmarker' },
  { value: 'akzent', label: 'Akzent', hint: 'hell mit kräftigen Farbköpfen' },
];

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

    section('Design', 'theme',
      h('p', { class: 'muted' }, 'Gilt für dieses Gerät. Teamfarben, Namen und Regeln bleiben gleich – nur das Aussehen ändert sich.'),
      h('div', { class: 'theme-picks', role: 'radiogroup', 'aria-label': 'Design' }, THEME_CHOICES.map((t) => h('label', { class: `theme-pick tp-${t.value}` },
        h('input', { type: 'radio', name: 'theme', value: t.value, checked: (s.theme || 'klar') === t.value, onChange: () => set({ theme: t.value }) }),
        h('span', { class: 'tp-frame', 'aria-hidden': 'true' },
          h('span', { class: 'tp-card' }, t.value === 'akzent' ? [h('b', {}, '1 Füchse'), h('span', {}, 'Aylin, Ben, Kübra')] : [h('b', {}, t.value === 'poster' ? 'A Füchse' : '1 Füchse'), 'Aylin, Ben, Kübra']),
          h('span', { class: 'tp-btn' }, 'Teams losen')),
        h('span', { class: 'tp-name' }, t.label, h('span', { class: 'muted' }, ` – ${t.hint}`))))),
    ),

    section('Anzeige', 'display',
      toggle('Misch-Animation beim Losen', s.animation, (v) => set({ animation: v }), { id: 's-anim', hint: 'Wird automatisch abgeschaltet, wenn das Gerät „Bewegung reduzieren“ verlangt.' }),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Namen in den Teamkarten'),
        segmented('name-order', [{ value: 'alpha', label: 'Alphabetisch' }, { value: 'draw', label: 'In Losreihenfolge' }], s.nameOrder, (v) => set({ nameOrder: v }), { label: 'Namen in den Teamkarten' })),
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
      h('p', { class: 'muted' }, 'Niveau und Geschlecht sind nur für die Teambildung da. Sie stehen nur in den Details einer Person (Name antippen) – nie in der Namensliste, der Klassenansicht oder im Druck.'),
    ),

    section('Tastenkürzel', 'keys',
      h('dl', { class: 'keys' }, [
        ['Leertaste', 'Teams losen bzw. neu losen'], ['K', 'Klassenansicht an/aus'], ['O', 'Optionen'],
        ['Z', 'Zufallsperson'], ['R', 'Reihenfolge'], ['V', 'Verlauf'], ['Strg + P', 'Drucken'], ['Esc', 'Schließen, Auswahl aufheben, Klassenansicht verlassen'],
      ].map(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
    ),

    section('Über Mixup', 'about',
      h('p', {}, `Version ${APP_VERSION}. Funktionsprinzip angelehnt an die iOS-App „Team Shake“; Name, Gestaltung, Texte und Algorithmus sind eigenständig.`),
      h('p', { class: 'muted' }, 'Schriften: Inter, Bricolage Grotesque, Schibsted Grotesk, Familjen Grotesk, Caveat – jeweils © ihre Autorinnen und Autoren, SIL Open Font License 1.1.'),
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
