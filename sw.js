// Replace your entire public/sw-src.js file with this:

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

// --- WORKBOX PRECACHING ---
workbox.precaching.precacheAndRoute([{"revision":"76a452c1b1160d49776122861fdc8b5c","url":"css/style.css"},{"revision":"7707a66ab4970cb474fa7cea19f04242","url":"images/default-profile.png"},{"revision":"0623ad108a2b6f82adb2c100030a9d86","url":"images/group-default.png"},{"revision":"9ad2b9eeeeaee6901e2aaae796f23a55","url":"images/icons/icon-192x192.png"},{"revision":"c39e9302b7021c513cc0fc5f8bd5758a","url":"images/icons/icon-512x512.png"},{"revision":"5e7a1fa96a03386a735848507f0ff2d6","url":"images/logo.png"},{"revision":"11cf3b8c69adbd281fcd3b1c7475f87e","url":"images/screenshots/desktop-screenshot.png"},{"revision":"73aacd19865f507abf80cce56c35990d","url":"images/screenshots/mobile-screenshot.png"},{"revision":"16c8de74cb6b9eb048951bea0a88a205","url":"js/app-init.js"},{"revision":"152ed23d49c2f1d767c0e9fb91a8eca7","url":"js/chat-widget.js"},{"revision":"8d08176190d7993489c9ab9a9a310de4","url":"js/chat.js"},{"revision":"4892cdf0d1111d98b81f140da6dcc628","url":"js/dashboard-main.js"},{"revision":"9d2a1b8412a5cf5125380e09a84683e4","url":"js/improved-location-tracker.js"},{"revision":"0aabe21f3eb71566e81b3b51c908e2d3","url":"js/notifications.js"},{"revision":"b6050acdbd5962de2ce830a71acdabdf","url":"js/push-client.js"},{"revision":"aaaf303e3ea7327e0bc5673b38916b54","url":"js/script.js"},{"revision":"da8d4e721b5480c6bbefc472681ad49f","url":"location-tracker.js"},{"revision":"7d15d799395910e1625715ffaf4c79dd","url":"manifest.json"},{"revision":"6534d4e5efa46062b27e2b390d88e8ca","url":"uploads/687dd4d6aa97dcce4d359f4f-1753175333631.png"},{"revision":"6722795ca392a58d5e837ad4d0ef5b71","url":"uploads/687dd4d6aa97dcce4d359f4f-1753175337740.png"},{"revision":"6722795ca392a58d5e837ad4d0ef5b71","url":"uploads/687dd4d6aa97dcce4d359f4f-1753175400424.png"},{"revision":"ac9a97d2d948662b20a3a728795b0642","url":"uploads/687dd4d6aa97dcce4d359f4f-1753179479898.png"},{"revision":"aaddfc86c565c62cd858a9978512f111","url":"uploads/687dd4d6aa97dcce4d359f4f-1753430970340.png"},{"revision":"7619de702cf634b5384e5d74bf1461ea","url":"uploads/687dd4d6aa97dcce4d359f4f-1753562927399.png"},{"revision":"13490df548cb03f0f3e5b6ff3392f4be","url":"uploads/687f76f37d84d4d87fac507b-1753184804564.png"},{"revision":"d597a2b2110a8da67510c10681db3c6c","url":"uploads/687f76f37d84d4d87fac507b-1753184945583.png"},{"revision":"6534d4e5efa46062b27e2b390d88e8ca","url":"uploads/orders/attachment-1753227955998.png"},{"revision":"7d53093ae639b50ee500aad0e320676a","url":"uploads/orders/attachment-1753228760912.png"},{"revision":"7d53093ae639b50ee500aad0e320676a","url":"uploads/orders/attachment-1753228767947.png"},{"revision":"60b5d8b6b2d32876546278e872f4b141","url":"uploads/orders/attachment-1753229205808.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/attachment-1753229612053.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/attachment-1753229738764.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/attachment-1753229792416.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/attachment-1753230260766.jpg"},{"revision":"699bbf14afb55275f4cfee4bff393b94","url":"uploads/orders/attachment-1753230557860.png"},{"revision":"295da8d86c7ca6a45d971a4c123b2c5e","url":"uploads/orders/attachment-1753230924999.png"},{"revision":"d1e8ba9b639f4ecc6c406a3a00f502e6","url":"uploads/orders/attachment-1753231128990.png"},{"revision":"60b5d8b6b2d32876546278e872f4b141","url":"uploads/orders/attachment-1753231625648.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/attachment-1753231707118.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/order-1753224975365.jpg"},{"revision":"7d53093ae639b50ee500aad0e320676a","url":"uploads/orders/order-1753226093384.png"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/orders/order-1753227526640.jpg"},{"revision":"7b3082f4cb69ac31f2ffb210e988bf46","url":"uploads/txn_comments/txn-687dd4d6aa97dcce4d359f4f-1753329855096.jpg"},{"revision":"20881908395fa262c29b15fe6fad13eb","url":"uploads/txn_comments/txn-687dd4d6aa97dcce4d359f4f-1753427748576.jpg"}]);

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