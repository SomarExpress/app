const CACHE_NAME = 'somar-express-v1.0.5'; // ← Incrementa este número en cada actualización
const urlsToCache = [
  './',
  './comercios-panel.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación - forzar activación inmediata
self.addEventListener('install', (event) => {
  console.log('📦 Instalando nueva versión...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // ← Activar inmediatamente
  );
});

// Activación - limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('✅ Activando nueva versión...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // ← Tomar control inmediato
  );
});

// Fetch - Network First con fallback a caché
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar respuesta para guardar en caché
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si falla la red, usar caché
        return caches.match(event.request);
      })
  );
});

// Notificar a los clientes cuando hay actualización
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});