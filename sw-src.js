// Replace your entire public/sw-src.js file with this:

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

// --- WORKBOX PRECACHING ---
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// --- CACHING STRATEGIES ---
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new workbox.strategies.StaleWhileRevalidate({ cacheName: 'asset-cache' })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [ new workbox.expiration.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }) ]
  })
);

// --- BACKGROUND SYNC LOGIC ---
const DB_NAME = 'vme-offline-requests';
const STORE_NAME = 'checkin-requests';

const openDB = () => {
  return idb.openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

const syncCheckIns = async () => {
    console.log('[Service Worker] Background sync started.');
    const db = await openDB();
    const allRequests = await db.getAll(STORE_NAME);

    for (const request of allRequests) {
        try {
            const formData = new FormData();
            for (const key in request.body) {
                if (request.body[key] instanceof Blob) {
                     formData.append(key, request.body[key], 'proof.jpg');
                } else {
                     formData.append(key, request.body[key]);
                }
            }
            
            const response = await fetch('/checkin', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                console.log(`[Service Worker] Successfully synced request ${request.id}`);
                await db.delete(STORE_NAME, request.id);
            } else {
                console.error(`[Service Worker] Failed to sync request ${request.id}. Server responded with ${response.status}`);
            }
        } catch (error) {
            console.error(`[Service Worker] Error during sync for request ${request.id}:`, error);
        }
    }
    console.log('[Service Worker] Background sync finished.');
};

self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-checkin-sync') {
        event.waitUntil(syncCheckIns());
    }
});

// --- PUSH NOTIFICATION HANDLER ---
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received:', event);
    
    let notificationData = {
        title: 'VME App Notification',
        body: 'You have a new notification',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/icon-192x192.png',
        data: {
            url: '/dashboard'
        }
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = {
                title: payload.title || 'VME App Notification',
                body: payload.body || 'You have a new notification',
                icon: '/images/icons/icon-192x192.png',
                badge: '/images/icons/icon-192x192.png',
                data: {
                    url: payload.url || '/dashboard'
                },
                requireInteraction: true,
                vibrate: [200, 100, 200],
                tag: 'vme-notification'
            };
        } catch (err) {
            console.error('[Service Worker] Error parsing push data:', err);
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            data: notificationData.data,
            requireInteraction: notificationData.requireInteraction,
            vibrate: notificationData.vibrate,
            tag: notificationData.tag
        })
    );
});

// --- NOTIFICATION CLICK HANDLER ---
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked:', event);
    
    event.notification.close();
    
    const url = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/dashboard') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// --- STANDARD SERVICE WORKER LIFECYCLE ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});