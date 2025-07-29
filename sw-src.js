// Import the Workbox libraries from Google's CDN.
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// This is a placeholder for your file manifest. Workbox will use this.
workbox.precaching.precacheAndRoute([]);

// Caching strategy for CSS, JS, and Web Worker files.
// Stale-While-Revalidate: Serve from cache first (for speed), but update from network in the background.
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'asset-cache',
  })
);

// Caching strategy for images.
// Cache-First: Once an image is in the cache, it will be served from there.
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60, // Maximum 60 images
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      })
    ]
  })
);

// This is the most important part for the update prompt.
// It listens for a message from the client-side to activate the new service worker.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});