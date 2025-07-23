import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// This line is replaced by the Workbox build process with a list of all your files to cache.
precacheAndRoute(self.__WB_MANIFEST);

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