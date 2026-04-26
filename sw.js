const CACHE = 'nexus-v9';

const FILES = [
  '.',
  'index.html',
  'manifest.json',
  'css/main.css',
  'css/components.css',
  'css/animations.css',
  'css/modules.css',
  'js/icons.js',
  'js/security.js',
  'js/app.js',
  'js/ui.js',
  'js/sync.js',
  'js/auth.js',
  'js/musculation.js',
  'js/agenda.js',
  'js/stockage.js',
  'js/nutrition.js',
  'js/finances.js',
  'js/notes.js',
  'js/pomodoro.js',
  'js/meteo.js',
  'js/contacts.js',
  'js/stats.js',
  'js/assistant.js',
  'js/annonces.js',
  'js/lock.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Laisse passer les requêtes Firebase / API externes sans les cacher
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('open-meteo.com') ||
      url.includes('nominatim.openstreetmap.org') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first pour tout le reste (app shell)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('index.html'));
    })
  );
});
