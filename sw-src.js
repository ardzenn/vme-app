import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// This line is replaced by the Workbox build process with a list of all your files to cache.
precacheAndRoute(self.__WB_MANIFEST);
// Cache Pages
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate()
);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [{ maxEntries: 20 }],
  })
);

// --- Background Sync for Check-ins ---
const bgSyncPlugin = new BackgroundSyncPlugin('checkinQueue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

// This strategy will apply the background sync plugin to failed check-in requests.
const networkWithBackgroundSync = new NetworkOnly({
  plugins: [bgSyncPlugin]
});

// This tells the service worker to intercept POST requests to the '/checkin' URL.
registerRoute(
  ({ url }) => url.pathname === '/checkin',
  networkWithBackgroundSync,
  'POST'
);
// Add these event listeners to the bottom of public/sw-src.js
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/images/logo.png', // Your app's logo
        data: {
            url: data.url
        }
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});