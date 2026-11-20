// Mixup – Einstieg und Router (Hash-Routen, damit GitHub Pages ohne Server-Regeln reicht).
import * as start from './ui/start.js';
import * as klasse from './ui/step1-klasse.js';
import * as einstellen from './ui/step2-einstellen.js';
import * as ergebnis from './ui/step3-ergebnis.js';
import * as settings from './ui/settings.js';

const ROUTES = {
  '/': start,
  '/klasse': klasse,
  '/einstellen': einstellen,
  '/ergebnis': ergebnis,
  '/einstellungen': settings,
};

const main = document.getElementById('main');
const stepper = document.querySelector('.stepper');

function currentPath() {
  const path = location.hash.replace(/^#/, '') || '/';
  return ROUTES[path] ? path : '/';
}

function render() {
  const screen = ROUTES[currentPath()];
  main.replaceChildren(...[screen.render()].flat());
  document.title = screen === start ? 'Mixup' : `${screen.title} · Mixup`;

  // Schrittanzeige nur in den drei Schritten
  stepper.hidden = !screen.step;
  for (const link of stepper.querySelectorAll('a[data-step]')) {
    const n = Number(link.dataset.step);
    if (n === screen.step) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
    link.classList.toggle('is-done', Boolean(screen.step) && n < screen.step);
  }

  // Fokus auf die neue Überschrift (Screenreader + Tastatur), ohne zu springen
  const heading = main.querySelector('h1');
  if (heading && render.started) heading.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
  render.started = true;
}

window.addEventListener('hashchange', render);
render();

// Service Worker nur im echten Betrieb (nicht auf dem Entwicklungsserver)
const isDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && !isDev) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-Fähigkeit fehlt dann, App läuft trotzdem */ });
}
