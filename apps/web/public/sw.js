// Service Worker for Ketdik Web App
// Provides offline support for checklist viewing and queues uploads

const CACHE_NAME = 'ketdik-v1';
const RUNTIME_CACHE = 'ketdik-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/applications',
  '/chat',
  '/profile',
  '/offline',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] Serving from cache (offline):', url.pathname);
              return cached;
            }
            // Return offline page if no cache
            return new Response(
              JSON.stringify({
                success: false,
                error: { message: 'You are offline. Please check your connection.' },
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Page requests - cache first for speed
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached, but update in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached - return offline page
          return caches.match('/offline').then((offline) => {
            return (
              offline ||
              new Response('<h1>Offline</h1><p>Please check your connection.</p>', {
                headers: { 'Content-Type': 'text/html' },
              })
            );
          });
        });
    })
  );
});

// Background sync for queued uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-documents') {
    console.log('[SW] Syncing queued uploads...');
    event.waitUntil(syncQueuedUploads());
  }
});

async function syncQueuedUploads() {
  // Get queued uploads from IndexedDB
  // This would integrate with the upload queue
  console.log('[SW] Processing queued uploads');
  // Implementation would go here
}

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Ketdik';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/images/ketdik-icon.png',
    badge: '/images/ketdik-icon.png',
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});

