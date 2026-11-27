// Service worker: lets the app open without a connection once it has been visited.
// Network first (so updates arrive straight away), falling back to the saved copy when offline.
const CACHE = 'cuppa-v1';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'js/data/vocab.js', 'js/data/grammar.js', 'js/data/skills.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
