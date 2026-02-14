// PetTrust Premium Service Worker - Ultra-Resilience Strategy
const CACHE_NAME = 'pettrust-v2-cache';
const STATIC_ASSETS = [
    '/',
    '/landing-optimizada',
    '/index.html',
    '/manifest.json',
    '/logo-pettrust.png',
    '/robots.txt',
    '/sitemap.xml',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
];

// Install: Cache static resources for 100/100 Performance
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[PetTrust SW] Pre-caching critical assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Purge old versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// Fetch Strategy: Stale-While-Revalidate (Fastest for PWA)
self.addEventListener('fetch', (event) => {
    // Avoid non-GET and API calls
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchedResponse = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fail gracefully if totally offline
                    return null;
                });

                // Return cached instantly, or wait for network if not in cache
                return cachedResponse || fetchedResponse;
            });
        })
    );
});

// Sync: Placeholder for background GPS updates / form submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-walk-data') {
        console.log('[PetTrust SW] Syncing pending walk data...');
        // Execute background sync logic here
    }
});
