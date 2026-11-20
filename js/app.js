// Mixup – Einstieg und Router (Hash-Routen, damit GitHub Pages ohne Server-Regeln reicht).
import * as start from './ui/start.js';
import * as main from './ui/main.js';
import * as settings from './ui/settings.js';
import { activeClass, subscribe, isStorageOk, getState } from './store.js';
import { toast } from './ui/dialogs.js';

const ROUTES = {
  '/': start,
  '/klasse': main,
  '/einstellungen': settings,
};
// Adressen aus Version 1.0 (Schritte 2 und 3) führen auf den Hauptbildschirm
const REDIRECTS = { '/einstellen': '/klasse', '/ergebnis': '/klasse' };

const mainEl = document.getElementById('main');
let currentScreen = null;
let lastPath = null;

function currentPath() {
  const path = location.hash.replace(/^#/, '') || '/';
  return REDIRECTS[path] || (ROUTES[path] ? path : '/');
}

function render() {
  const path = currentPath();
  if (`#${path}` !== location.hash && location.hash && location.hash !== '#/') { location.replace(`#${path}`); return; }
  const screen = ROUTES[path];
  if (screen.needsClass && !activeClass()) { location.replace('#/'); return; }
  if (currentScreen && currentScreen !== screen) currentScreen.leave?.();

  mainEl.replaceChildren(screen.render());
  currentScreen = screen;
  const cls = activeClass();
  document.title = screen === start ? 'Mixup' : screen === main && cls ? `${cls.name} · Mixup` : `${screen.title} · Mixup`;

  // Fokus auf die neue Überschrift (Screenreader + Tastatur), ohne zu springen
  if (lastPath !== null && path !== lastPath) {
    mainEl.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
  lastPath = path;
}

window.addEventListener('hashchange', render);

// ---------- Tastenkürzel ----------
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
  if ((e.key === ' ' || e.key === 'Enter') && t instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(t.tagName)) return; // Taste gehört der fokussierten Schaltfläche
  currentScreen?.onKey?.(e);
});

// ---------- Design (gilt für das ganze Gerät) ----------
const THEME_BG = { klar: '#ffffff', poster: '#fbf6ec', heft: '#ffffff', akzent: '#ffffff' };
function applyTheme() {
  const theme = getState().settings.theme || 'klar';
  if (theme === 'klar') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[theme] || '#ffffff');
}
applyTheme();
subscribe(applyTheme);

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
