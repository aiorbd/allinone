const CACHE_VERSION = 'v1';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;

// Files you want cached for offline
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/styles.css',
  '/app.js'
];

// Offline fallback (you can create offline.html or use index.html as fallback)
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== PRECACHE && k !== RUNTIME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Strategy: network-first for HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // skip extensions/data requests
  if (request.url.startsWith('chrome-extension://') || request.url.startsWith('data:')) return;

  // HTML pages -> network first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // Static files (css, js, images) -> cache first
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          return cached || (await caches.match(OFFLINE_URL));
        }
      })()
    );
  }
});

// Optional: listen for messages to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});