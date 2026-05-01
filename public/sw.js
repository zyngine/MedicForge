/// <reference lib="webworker" />

const CACHE_NAME = 'medicforge-v6';
const OFFLINE_URL = '/offline';
const DATA_CACHE_NAME = 'medicforge-data-v1';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
  '/',
  '/offline',
  '/manifest.json',
  '/logo-icon.svg',
  '/logo.svg',
];

// API endpoints to cache for offline access
const _CACHEABLE_API_ROUTES = [
  '/api/courses',
  '/api/enrollments',
  '/api/skill-sheets',
  '/api/question-bank',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fallback to network
  cacheFirst: [
    /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
    /\.(woff|woff2|ttf|otf|eot)$/,
    /\/icons\//,
  ],
  // Network first, fallback to cache
  networkFirst: [
    /\/api\//,
    /\/_next\/data\//,
    /\/_next\/static\//,
    /\.css$/,
    /\.js$/,
  ],
  // Stale while revalidate (none — JS/CSS moved to networkFirst to avoid
  // serving stale chunks after deploys, which manifests as stuck loaders)
  staleWhileRevalidate: [],
};

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip Supabase auth/API requests - don't intercept these
  if (url.hostname.includes('supabase')) {
    return;
  }

  // Skip auth-related paths (login, register, password reset, callbacks)
  if (url.pathname.includes('/auth/') || url.pathname.includes('/rest/') ||
      url.pathname.includes('/login') || url.pathname.includes('/register') ||
      url.pathname.includes('/forgot-password') || url.pathname.includes('/set-password') ||
      url.pathname.includes('/reset-password')) {
    return;
  }

  // Skip all external requests (non same-origin)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Determine strategy based on URL
  const strategy = getStrategy(url.pathname);

  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// Determine caching strategy based on URL
function getStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    for (const pattern of patterns) {
      if (pattern.test(pathname)) {
        return strategy;
      }
    }
  }
  return 'networkFirst';
}

// Safe clone helper - only clone if response can be cloned
function safeClone(response) {
  try {
    if (response && response.status === 200 && !response.bodyUsed) {
      return response.clone();
    }
  } catch (_e) {
    // Ignore clone errors
  }
  return null;
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    const clone = safeClone(response);
    if (clone) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }
    return response;
  } catch (_error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const clone = safeClone(response);
    if (clone) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (response) => {
      const clone = safeClone(response);
      if (clone) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, clone);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, badge, url, tag } = data;

  const options = {
    body: body || '',
    icon: icon || '/logo-icon.svg',
    badge: badge || '/logo-icon.svg',
    tag: tag || 'medicforge-notification',
    data: { url: url || '/' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title || 'MedicForge', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Sync queued submissions when back online
async function syncSubmissions() {
  try {
    const db = await openDB();
    const submissions = await db.getAll('pending-submissions');

    for (const submission of submissions) {
      try {
        const response = await fetch('/api/v1/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data),
        });

        if (response.ok) {
          await db.delete('pending-submissions', submission.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync submission:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Sync submissions failed:', error);
  }
}

// Sync queued clinical logs when back online
async function syncClinicalLogs() {
  try {
    const db = await openDB();
    const logs = await db.getAll('pending-clinical-logs');

    for (const log of logs) {
      try {
        const response = await fetch('/api/clinical-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log.data),
        });

        if (response.ok) {
          await db.delete('pending-clinical-logs', log.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync clinical log:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Sync clinical logs failed:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'CACHE_DATA':
      cacheOfflineData(payload.key, payload.data);
      break;
    case 'GET_CACHED_DATA':
      getCachedData(payload.key).then((data) => {
        event.ports[0].postMessage({ type: 'CACHED_DATA', data });
      });
      break;
    case 'QUEUE_SYNC':
      queueForSync(payload.store, payload.data);
      break;
    case 'GET_PENDING_COUNT':
      getPendingCount().then((count) => {
        event.ports[0].postMessage({ type: 'PENDING_COUNT', count });
      });
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// Cache data for offline access
async function cacheOfflineData(key, data) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(`/offline-data/${key}`, response);
    console.log('[SW] Cached data for key:', key);
  } catch (error) {
    console.error('[SW] Failed to cache data:', error);
  }
}

// Get cached data
async function getCachedData(key) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const response = await cache.match(`/offline-data/${key}`);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[SW] Failed to get cached data:', error);
  }
  return null;
}

// Queue data for sync when back online
async function queueForSync(store, data) {
  try {
    const db = await openDB();
    await db.add(store, { data, timestamp: Date.now() });
    console.log('[SW] Queued for sync:', store);

    // Register sync if available
    if ('sync' in self.registration) {
      await self.registration.sync.register(`sync-${store}`);
    }
  } catch (error) {
    console.error('[SW] Failed to queue for sync:', error);
  }
}

// Get count of pending items
async function getPendingCount() {
  try {
    const db = await openDB();
    const submissions = await db.getAll('pending-submissions');
    const logs = await db.getAll('pending-clinical-logs');
    const skillAttempts = await db.getAll('pending-skill-attempts');
    const patientContacts = await db.getAll('pending-patient-contacts');
    return {
      submissions: submissions.length,
      clinicalLogs: logs.length,
      skillAttempts: skillAttempts.length,
      patientContacts: patientContacts.length,
      total: submissions.length + logs.length + skillAttempts.length + patientContacts.length,
    };
  } catch (error) {
    console.error('[SW] Failed to get pending count:', error);
    return { total: 0 };
  }
}

// Enhanced IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('medicforge-offline', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        getAll: (store) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        add: (store, data) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).add(data);
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        delete: (store, key) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).delete(key);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        clear: (store) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
      });
    };

    request.onupgradeneeded = (_event) => {
      const db = request.result;
      const stores = [
        'pending-submissions',
        'pending-clinical-logs',
        'pending-skill-attempts',
        'pending-patient-contacts',
        'offline-courses',
        'offline-questions',
      ];

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
  });
}

// Sync skill attempts
async function syncSkillAttempts() {
  try {
    const db = await openDB();
    const attempts = await db.getAll('pending-skill-attempts');

    for (const attempt of attempts) {
      try {
        const response = await fetch('/api/skill-sheet-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.data),
        });

        if (response.ok) {
          await db.delete('pending-skill-attempts', attempt.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync skill attempt:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Sync skill attempts failed:', error);
  }
}

// Sync patient contacts
async function syncPatientContacts() {
  try {
    const db = await openDB();
    const contacts = await db.getAll('pending-patient-contacts');

    for (const contact of contacts) {
      try {
        const response = await fetch('/api/patient-contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact.data),
        });

        if (response.ok) {
          await db.delete('pending-patient-contacts', contact.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync patient contact:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Sync patient contacts failed:', error);
  }
}

// Handle additional sync tags
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncSubmissions());
  }
  if (event.tag === 'sync-clinical-logs') {
    event.waitUntil(syncClinicalLogs());
  }
  if (event.tag === 'sync-pending-skill-attempts') {
    event.waitUntil(syncSkillAttempts());
  }
  if (event.tag === 'sync-pending-patient-contacts') {
    event.waitUntil(syncPatientContacts());
  }
});

// Periodic background sync for PWA
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-all-pending') {
    event.waitUntil(
      Promise.all([
        syncSubmissions(),
        syncClinicalLogs(),
        syncSkillAttempts(),
        syncPatientContacts(),
      ])
    );
  }
});

console.log('[SW] Service worker loaded - v5');
