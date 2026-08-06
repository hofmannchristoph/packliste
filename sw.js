/* Service Worker: App-Shell offline verfügbar halten. */

const VERSION = 'packliste-v14';
const SHELL = [
  './',
  'index.html',
  'assets/style.css',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-180.png',
  'manifest.webmanifest',
  'src/app.js',
  'src/model.js',
  'src/icons.js',
  'src/seed.js',
  'src/generator.js',
  'src/store.js',
  'src/sync.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // `reload` umgeht den HTTP-Cache – sonst landet beim Update alter Code im Cache.
      .then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Supabase und andere Fremd-Hosts nie cachen.
  if (url.origin !== location.origin) return;

  /*
   * Netzwerk zuerst, Cache als Rückfallebene.
   *
   * Umgekehrt (Cache zuerst) wäre die App einen Tick schneller, aber nach
   * einem Update auf GitHub Pages würden die Geräte weiter die alte Version
   * anzeigen, bis der Cache irgendwann ausgetauscht wird. Für eine Liste,
   * die zwei Leute gleichzeitig benutzen, ist Aktualität wichtiger.
   */
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      })
  );
});
