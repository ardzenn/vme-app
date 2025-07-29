importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

workbox.precaching.precacheAndRoute([]);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'asset-cache',
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      })
    ]
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/logo.png',
    data: { url: data.url }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(clients.openWindow(url));
});