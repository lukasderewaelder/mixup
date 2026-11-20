// Dezente Hinweise auf der Startseite: Sicherung fällig, App installieren.
import { h, button } from './dom.js';
import { icon } from './icons.js';
import { getState, update } from '../store.js';
import { backupDue, exportBackup, snoozeBackup } from '../backup.js';

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isAppleTouch = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function banners({ onChange }) {
  const list = [];
  const state = getState();

  if (backupDue(state)) {
    const never = !state.settings.lastBackupAt;
    list.push(banner('download',
      never ? 'Noch keine Sicherung vorhanden' : 'Zeit für eine neue Sicherung',
      'iPadOS und Browser können Website-Daten löschen, wenn die App länger nicht genutzt wird. Eine Sicherungsdatei schützt deine Klassen.',
      [
        button('Sicherung speichern', { variant: 'primary', onClick: () => { exportBackup(); onChange(); } }),
        button('Später', { variant: 'quiet', onClick: () => { snoozeBackup(); onChange(); } }),
      ]));
  }

  if (!isStandalone() && !state.settings.installHintDismissed && (installEvent || isAppleTouch())) {
    const dismiss = () => { update((s) => { s.settings.installHintDismissed = true; }, { dataChange: false }); onChange(); };
    list.push(banner('screen',
      'Mixup als App installieren',
      installEvent
        ? 'Dann startet Mixup wie eine eigene App und funktioniert auch ohne Internet.'
        : 'In Safari auf das Teilen-Symbol tippen und „Zum Home-Bildschirm“ wählen. Dann startet Mixup wie eine eigene App und funktioniert auch ohne Internet.',
      [
        installEvent ? button('Installieren', { variant: 'primary', onClick: async () => { installEvent.prompt(); await installEvent.userChoice; installEvent = null; dismiss(); } }) : null,
        button(installEvent ? 'Nicht jetzt' : 'Verstanden', { variant: 'quiet', onClick: dismiss }),
      ]));
  }

  return list.length ? h('div', { class: 'banners' }, list) : null;
}

function banner(iconName, title, text, actions) {
  return h('aside', { class: 'banner' },
    h('span', { class: 'banner-icon' }, icon(iconName, { size: 22 })),
    h('div', { class: 'banner-text' }, h('strong', {}, title), h('p', {}, text)),
    h('div', { class: 'banner-actions' }, actions),
  );
}
