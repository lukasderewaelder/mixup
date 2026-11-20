// Mixup – Service Worker: App-Hülle vorab cachen, danach offline lauffähig.
// Der Block zwischen den Marken wird von tools/precache.mjs geschrieben – nicht von Hand ändern.
// >>> precache
const VERSION = '990b462814';
const ASSETS = [
  './',
  './css/base.css',
  './css/components.css',
  './css/print.css',
  './css/screens.css',
  './css/tokens.css',
  './fonts/inter-latin-ext-wght-normal.woff2',
  './fonts/inter-latin-wght-normal.woff2',
  './icons/apple-touch-icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './index.html',
  './js/actions.js',
  './js/app.js',
  './js/backup.js',
  './js/import.js',
  './js/model.js',
  './js/store.js',
  './js/teams/algorithm.js',
  './js/teams/blocks.js',
  './js/teams/colors.js',
  './js/teams/cost.js',
  './js/teams/random.js',
  './js/teams/sizes.js',
  './js/ui/banners.js',
  './js/ui/beamer.js',
  './js/ui/dialogs.js',
  './js/ui/dom.js',
  './js/ui/draw.js',
  './js/ui/icons.js',
  './js/ui/session.js',
  './js/ui/settings.js',
  './js/ui/start.js',
  './js/ui/step1-klasse.js',
  './js/ui/step2-einstellen.js',
  './js/ui/step3-ergebnis.js',
  './js/ui/team-card.js',
  './js/version.js',
  './manifest.webmanifest',
];
// <<< precache

const CACHE = `mixup-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mixup-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Die Seite fragt per Nachricht, ob eine wartende Version übernehmen soll (Update-Hinweis in M6).
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      // Navigation offline: App-Hülle liefern
      if (request.mode === 'navigate') return (await caches.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
