importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

// --- CACHING STRATEGIES (Workbox) ---
workbox.precaching.precacheAndRoute([]);

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

// --- BACKGROUND SYNC LOGIC (The new part) ---

const DB_NAME = 'vme-offline-requests';
const STORE_NAME = 'checkin-requests';

// Helper to open the IndexedDB database
const openDB = () => {
  return idb.openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// The main function that runs when the browser detects a connection
const syncCheckIns = async () => {
    console.log('[Service Worker] Background sync started.');
    const db = await openDB();
    const allRequests = await db.getAll(STORE_NAME);

    for (const request of allRequests) {
        try {
            const formData = new FormData();
            // Reconstruct the FormData from the saved object
            for (const key in request.body) {
                // If the value is a Blob (like our photo), append it directly
                if (request.body[key] instanceof Blob) {
                     formData.append(key, request.body[key], 'proof.jpg');
                } else {
                     formData.append(key, request.body[key]);
                }
            }
            
            // Send the request to the server
            const response = await fetch('/checkin', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                console.log(`[Service Worker] Successfully synced request ${request.id}`);
                // If successful, delete it from the local database
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

// Listen for the 'sync' event from the browser
self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-checkin-sync') {
        event.waitUntil(syncCheckIns());
    }
});

// --- STANDARD SERVICE WORKER LIFECYCLE ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});