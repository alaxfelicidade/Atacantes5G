const CACHE_NAME = 'a5g-runtime-v9';

// Arquivos estáticos que podem ser cacheados com segurança
const STATIC_ASSETS = [
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  // Pré-cacheia só assets estáticos; index.html NUNCA entra no cache
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Firebase: sempre da rede, sem cache
  if (url.includes('firebaseio.com')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Fontes Google: cache-first (raramente mudam)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // index.html: SEMPRE da rede (network-first), sem cache
  // Isso garante que o celular sempre pega a versão mais recente do Netlify
  if (url.includes('index.html') || url.endsWith('/') || url.split('/').pop() === '') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        caches.match('./index.html')
      )
    );
    return;
  }

  // Outros assets estáticos (ícones, manifest): cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
