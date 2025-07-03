// public/sw.js
const CACHE_NAME = 'heartbeat-widget-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/HeartIcon.png',
  '/HeartIcon.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for heartbeat synchronization
self.addEventListener('sync', (event) => {
  if (event.tag === 'heartbeat-sync') {
    event.waitUntil(doHeartbeatSync());
  }
});

// Push notification handler for partner heartbeats
self.addEventListener('push', (event) => {
  const options = {
    body: 'Your partner sent you a heartbeat 💓',
    icon: '/HeartIcon.png',
    badge: '/HeartIcon.png',
    tag: 'heartbeat',
    vibrate: [200, 100, 200],
    silent: false,
    actions: [
      {
        action: 'pulse-back',
        title: 'Send back 💕'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Heartbeat Widget', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'pulse-back') {
    // Handle sending pulse back
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({ action: 'send-pulse' });
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  } else {
    // Open the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Periodic background sync for maintaining connection
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'heartbeat-keepalive') {
    event.waitUntil(doKeepAlive());
  }
});

async function doHeartbeatSync() {
  try {
    // This would sync with your backend service
    console.log('Syncing heartbeat data...');
    
    // Example: check for missed heartbeats, sync color changes, etc.
    const settings = await getStoredSettings();
    if (settings) {
      // Perform sync operations
      await syncWithPartner(settings);
    }
  } catch (error) {
    console.error('Heartbeat sync failed:', error);
  }
}

async function doKeepAlive() {
  try {
    // Maintain connection with partner
    const connectionId = await getConnectionId();
    if (connectionId) {
      await pingPartner(connectionId);
    }
  } catch (error) {
    console.error('Keep alive failed:', error);
  }
}

async function getStoredSettings() {
  // Helper to get settings from IndexedDB or cache
  return new Promise((resolve) => {
    // Implementation would depend on your storage strategy
    resolve(null);
  });
}

async function getConnectionId() {
  // Helper to get connection ID
  return new Promise((resolve) => {
    // Implementation would depend on your storage strategy
    resolve(null);
  });
}

async function syncWithPartner(settings) {
  // Implementation for syncing with partner device
  console.log('Syncing with partner...', settings);
}

async function pingPartner(connectionId) {
  // Implementation for keeping connection alive
  console.log('Pinging partner...', connectionId);
}