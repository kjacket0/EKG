/* Rhythm Venn service worker: works offline after the first visit.
   Bump CACHE when you want every device to drop old files. */
const CACHE = 'rhythm-venn-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('rhythm-venn-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  /* Open the cached page instantly, refresh it in the background. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match('./index.html');
        const net = fetch(req).then(r => { if (r && r.ok) c.put('./index.html', r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  /* Everything else: cached copy first, update behind it. Fonts are cached the first time they load. */
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
