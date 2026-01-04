const CACHE_NAME = 'snowdodge-v1';
const ASSETS = [
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './sw.js',
  '../src/main.js',
  '../src/game.js',
  '../src/render.js',
  '../src/input.js',
  '../src/audio.js',
  '../src/utils.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
