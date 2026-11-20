// Sicherung als JSON-Datei: speichern, laden (ersetzen oder zusammenführen), Erinnerung.
import { getState, update, replaceState } from './store.js';
import { validateState, mergeStates, todayKey } from './model.js';
import { h } from './ui/dom.js';
import { openDialog, toast } from './ui/dialogs.js';

const DAY = 86400000;
export const REMIND_AFTER_DAYS = 28;
export const FIRST_REMINDER_DAYS = 3;

export function exportBackup() {
  const state = getState();
  const data = JSON.stringify({ app: 'Mixup', exportedAt: new Date().toISOString(), ...state }, null, 1);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `Mixup-Sicherung ${todayKey()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  update((s) => { s.settings.lastBackupAt = new Date().toISOString(); s.settings.backupSnoozeUntil = null; }, { dataChange: false });
  toast('Sicherung gespeichert. Bewahre die Datei z. B. in „Dateien“ oder in deiner Schul-Cloud auf.');
}

/** Datei wählen, prüfen und fragen: ersetzen oder zusammenführen. onDone wird nach dem Laden aufgerufen. */
export function importBackup(onDone) {
  const input = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let incoming;
    try {
      incoming = validateState(JSON.parse(await file.text()));
    } catch (err) {
      toast(err instanceof SyntaxError ? 'Die Datei ist keine gültige Sicherung.' : err.message, { tone: 'error' });
      return;
    }
    const n = incoming.classes.length;
    const current = getState();
    openDialog({
      title: 'Sicherung laden',
      body: [
        h('p', {}, `Die Datei enthält ${n === 1 ? '1 Klasse' : `${n} Klassen`}${incoming.classes.length ? `: ${incoming.classes.map((c) => c.name).join(', ')}` : ''}.`),
        current.classes.length ? h('p', { class: 'muted' }, 'Zusammenführen ergänzt fehlende Klassen und übernimmt bei gleichen Klassen die neuere Fassung. Ersetzen löscht alles, was jetzt auf diesem Gerät ist.') : null,
      ],
      actions: current.classes.length
        ? [
          { label: 'Abbrechen', variant: 'quiet' },
          { label: 'Alles ersetzen', variant: 'danger', onClick: () => finish(incoming, 'ersetzt') },
          { label: 'Zusammenführen', variant: 'primary', onClick: () => {
            const { state, added, updated } = mergeStates(current, incoming);
            finish(state, `zusammengeführt: ${added} neu, ${updated} aktualisiert`);
          } },
        ]
        : [{ label: 'Abbrechen', variant: 'quiet' }, { label: 'Laden', variant: 'primary', onClick: () => finish(incoming, 'geladen') }],
    });
    function finish(state, what) {
      state.settings = { ...state.settings, lastBackupAt: new Date().toISOString() };
      replaceState(state);
      toast(`Sicherung ${what}.`);
      onDone?.();
    }
  });
  document.body.append(input);
  input.click();
}

/** Ist eine Erinnerung fällig? Nur nach Änderungen und wenn die letzte Sicherung alt ist oder fehlt. */
export function backupDue(state = getState(), now = Date.now()) {
  const s = state.settings;
  if (!s.backupReminder) return false;
  if (!state.classes.some((c) => c.players.length)) return false;
  if (s.backupSnoozeUntil && now < Date.parse(s.backupSnoozeUntil)) return false;
  const lastBackup = s.lastBackupAt ? Date.parse(s.lastBackupAt) : 0;
  const lastChange = s.lastChangeAt ? Date.parse(s.lastChangeAt) : 0;
  if (lastChange <= lastBackup) return false;
  if (!lastBackup) {
    // Noch nie gesichert: erst erinnern, wenn die Daten ein paar Tage alt sind (nicht gleich beim Ausprobieren)
    const oldest = Math.min(...state.classes.filter((c) => c.players.length).map((c) => Date.parse(c.createdAt) || now));
    return now - oldest > FIRST_REMINDER_DAYS * DAY;
  }
  return now - lastBackup > REMIND_AFTER_DAYS * DAY;
}

export function snoozeBackup(days = 7) {
  update((s) => { s.settings.backupSnoozeUntil = new Date(Date.now() + days * DAY).toISOString(); }, { dataChange: false });
}
