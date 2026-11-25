// Mixup – Service Worker: App-Hülle vorab cachen, danach offline lauffähig.
// Der Block zwischen den Marken wird von tools/precache.mjs geschrieben – nicht von Hand ändern.
// >>> precache
const VERSION = 'e87c693b97';
const ASSETS = [
  './',
  './css/base.css',
  './css/components.css',
  './css/print.css',
  './css/screens.css',
  './css/themes.css',
  './css/tokens.css',
  './fonts/bricolage-grotesque-latin-ext-opsz-normal.woff2',
  './fonts/bricolage-grotesque-latin-opsz-normal.woff2',
  './fonts/caveat-latin-ext-wght-normal.woff2',
  './fonts/caveat-latin-wght-normal.woff2',
  './fonts/familjen-grotesk-latin-ext-wght-normal.woff2',
  './fonts/familjen-grotesk-latin-wght-normal.woff2',
  './fonts/inter-latin-ext-wght-normal.woff2',
  './fonts/inter-latin-wght-normal.woff2',
  './fonts/schibsted-grotesk-latin-ext-wght-normal.woff2',
  './fonts/schibsted-grotesk-latin-wght-normal.woff2',
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
  './js/labels.js',
  './js/model.js',
  './js/store.js',
  './js/teams/algorithm.js',
  './js/teams/blocks.js',
  './js/teams/colors.js',
  './js/teams/cost.js',
  './js/teams/random.js',
  './js/teams/sizes.js',
  './js/ui/banners.js',
  './js/ui/dialogs.js',
  './js/ui/dom.js',
  './js/ui/drag.js',
  './js/ui/draw.js',
  './js/ui/fit.js',
  './js/ui/group-style.js',
  './js/ui/icons.js',
  './js/ui/main.js',
  './js/ui/names-panel.js',
  './js/ui/options-panel.js',
  './js/ui/results-panel.js',
  './js/ui/session.js',
  './js/ui/settings.js',
  './js/ui/start.js',
  './js/ui/team-card.js',
  './js/version.js',
  './manifest.webmanifest',
];
// <<< precache

const CACHE = `mixup-${VERSION}`;

// cache: 'reload' umgeht den HTTP-Cache des Browsers (GitHub Pages: 10 Minuten), damit keine
// alten Dateien in den neuen Offline-Speicher geraten.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))));
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

// Netz zuerst (mit kurzer Wartezeit), sonst Offline-Speicher. So kommen neue Dateien sofort an,
// auch wenn das CDN von GitHub Pages sie erst nach dem neuen sw.js ausliefert. Ohne Netz oder bei
// sehr langsamem WLAN im Klassenraum antwortet der Offline-Speicher.
const NETWORK_TIMEOUT = 2500;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNetwork = fetch(request, { cache: 'no-cache' }).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(request, res.clone());
      return res;
    });
    event.waitUntil(fromNetwork.catch(() => {}));
    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT, null));
    try {
      const res = await Promise.race([fromNetwork, timeout]);
      if (res) return res;
    } catch { /* offline */ }
    const cached = (await cache.match(request, { ignoreSearch: true }))
      || (request.mode === 'navigate' ? await cache.match('./') : null);
    if (cached) return cached;
    try { return await fromNetwork; } catch { return Response.error(); }
  })());
});
