// Mixup – Einstieg und Router (Hash-Routen, damit GitHub Pages ohne Server-Regeln reicht).
import * as start from './ui/start.js';
import * as klasse from './ui/step1-klasse.js';
import * as einstellen from './ui/step2-einstellen.js';
import * as ergebnis from './ui/step3-ergebnis.js';
import * as settings from './ui/settings.js';
import { activeClass, subscribe, isStorageOk } from './store.js';
import { toast } from './ui/dialogs.js';
import { session, resetStep1 } from './ui/session.js';

const ROUTES = {
  '/': start,
  '/klasse': klasse,
  '/einstellen': einstellen,
  '/ergebnis': ergebnis,
  '/einstellungen': settings,
};
const STEP_PATHS = ['/klasse', '/einstellen', '/ergebnis'];

const main = document.getElementById('main');
const stepper = document.querySelector('.stepper');
let currentScreen = null;
let lastPath = null;

function currentPath() {
  const path = location.hash.replace(/^#/, '') || '/';
  return ROUTES[path] ? path : '/';
}

function render() {
  const path = currentPath();
  const screen = ROUTES[path];
  if (screen.needsClass && !activeClass()) { location.replace('#/'); return; }
  if (path !== lastPath) {
    if (lastPath === '/klasse') resetStep1();
    session.pickedPlayer = null;
  }

  main.replaceChildren(...[screen.render()].flat());
  currentScreen = screen;
  const cls = activeClass();
  document.title = screen === start ? 'Mixup' : `${screen.step && cls ? `${cls.name} – ` : ''}${screen.title} · Mixup`;

  // Schrittanzeige nur in den drei Schritten
  stepper.hidden = !screen.step;
  for (const link of stepper.querySelectorAll('a[data-step]')) {
    const n = Number(link.dataset.step);
    if (n === screen.step) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
    link.classList.toggle('is-done', Boolean(screen.step) && n < screen.step);
  }

  // Fokus auf die neue Überschrift (Screenreader + Tastatur), ohne zu springen
  if (lastPath !== null && path !== lastPath) {
    main.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  lastPath = path;
}

window.addEventListener('hashchange', render);

// ---------- Tastenkürzel ----------
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
  if (document.querySelector('dialog[open], .beamer')) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
  if ((e.key === ' ' || e.key === 'Enter') && t instanceof HTMLElement && ['BUTTON', 'A'].includes(t.tagName)) return; // Taste gehört der fokussierten Schaltfläche
  if (currentScreen?.onKey?.(e)) return;
  if (['1', '2', '3'].includes(e.key) && activeClass()) {
    location.hash = `#${STEP_PATHS[Number(e.key) - 1]}`;
  }
});

// ---------- Speicherprobleme melden (einmal) ----------
let warned = false;
subscribe(() => {
  if (!isStorageOk() && !warned) {
    warned = true;
    toast('Speichern ist in diesem Browser gerade nicht möglich (privates Fenster?). Änderungen gehen beim Schließen verloren.', { tone: 'error', duration: 10000 });
  }
});

render();

// ---------- Service Worker + Update-Hinweis (nicht auf dem Entwicklungsserver) ----------
const isDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && !isDev) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const offer = (worker) => toast('Eine neue Version von Mixup ist da.', {
      duration: 30000,
      action: { label: 'Neu laden', onClick: () => worker.postMessage('skip-waiting') },
    });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }).catch(() => { /* ohne Offline-Fähigkeit läuft die App trotzdem */ });
}
