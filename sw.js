// Service Worker for TEAM Management App - MINIMAL VERSION
const CACHE_NAME = 'team-app-v2-minimal';

// Install event - skip caching for now
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2 (minimal)...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - PASS THROUGH (no caching)
self.addEventListener('fetch', (event) => {
  // Just fetch from network, no caching
  // This prevents caching issues and "can't open page" errors
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.log('[SW] Fetch failed:', event.request.url, err);
      // If it's a navigation request, try to serve index.html from cache
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html').then(response => {
          return response || new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      }
      throw err;
    })
  );
});

// Background sync event (for future use)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[SW] Syncing data in background...');
  // Future: Sync offline changes to Firebase
}

// Push notification event (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TEAM Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
