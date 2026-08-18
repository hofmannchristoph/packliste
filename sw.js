/*
 * Service Worker: App-Shell offline verfügbar halten.
 *
 * VERSION ist zugleich die Fassung, die die App unter Sync anzeigt – sie liest
 * den Namen dieses Caches aus. Bei jeder Veröffentlichung hochzählen.
 */

const VERSION = 'packliste-v27';
/** So lange darf das Netz brauchen, bevor der Cache einspringt. */
const NETZ_FRIST_MS = 2000;
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
  'src/liste.js',
  'vendor/supabase-js-2.110.2.mjs',
  'vendor/node/buffer.mjs',
  'vendor/node/process.mjs',
  'vendor/node/events.mjs',
  'vendor/node/tty.mjs',
  'vendor/node/async_hooks.mjs',
  'src/tabelle.js',
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
    (async () => {
      const cached = await caches.match(request);
      /*
       * Netz zuerst, aber nur zwei Sekunden lang.
       *
       * Ohne Frist wartete der Start bei halb erreichbarem Netz auf das
       * Zeitlimit des Browsers – im Ferienhaus mit einem Balken also lange,
       * obwohl die ganze App längst im Cache lag. Antwortet das Netz nicht
       * rechtzeitig, wird der Cache ausgeliefert; die Antwort aus dem Netz
       * aktualisiert ihn trotzdem, sobald sie eintrifft.
       */
      const ausDemNetz = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        });

      if (!cached) {
        try {
          return await ausDemNetz;
        } catch {
          if (request.mode === 'navigate') {
            const shell = await caches.match('index.html');
            if (shell) return shell;
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      }

      const frist = new Promise((loese) => setTimeout(() => loese(null), NETZ_FRIST_MS));
      const res = await Promise.race([ausDemNetz.catch(() => null), frist]);
      return res ?? cached;
    })()
  );
});
