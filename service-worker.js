const CACHE_NAME = 'somar-express-v1.0.7';
const urlsToCache = [
  './',
  './comercios-panel.html',
  './clientes.html',
  './manifest.json',
  './manifest-clientes.json'
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('📦 Instalando Service Worker v1.0.7...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Archivos en caché');
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('⚠️ Error al cachear algunos archivos:', error);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('🔄 Activando Service Worker...');
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
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  // Solo cachear recursos propios, no externos con CORS
  const url = new URL(event.request.url);
  const isExternal = url.origin !== location.origin;
  
  // Ignorar recursos externos de CDN para evitar problemas de CORS
  if (isExternal && (
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('router.project-osrm.org') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('tile.openstreetmap.org')
  )) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Solo cachear respuestas exitosas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(() => {
            // Ignorar errores de caché
          });
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || new Response('', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      })
  );
});

// Mensaje para skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});