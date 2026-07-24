const CACHE_NAME = 'danang-eventmap-offline-v1';
const MAPBOX_CACHE_NAME = 'mapbox-tiles-cache-v1';

// Static resources to cache immediately on installation
const PRECACHE_ASSETS = [
    '/',
    '/index.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('[SW] Pre-caching assets failed, will cache on the fly:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== MAPBOX_CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // 0. Bỏ qua cache hoàn toàn cho localhost trong quá trình phát triển (Tránh lỗi F5 không nhận code mới)
    if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
        event.respondWith(
            fetch(event.request).catch((err) => {
                // Nếu sập server hoặc mất mạng hoàn toàn, mới dùng cache dự phòng
                return caches.match(event.request).then(cached => cached || Promise.reject(err));
            })
        );
        return;
    }

    // 1. Handle Mapbox GL Tile or assets requests (Stale-While-Revalidate)
    if (url.hostname.includes('api.mapbox.com') || url.hostname.includes('tiles.mapbox.com')) {
        event.respondWith(
            caches.open(MAPBOX_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached immediately, fetch in background to update cache
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse.status === 200) {
                                    cache.put(event.request, networkResponse.clone());
                                }
                            })
                            .catch(() => {/* Ignore background sync errors when offline */});
                        return cachedResponse;
                    }

                    // Not cached, fetch and cache on the fly
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse.status === 200) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch((err) => {
                            console.error('[SW] Mapbox fetch failed offline:', err);
                            throw err;
                        });
                });
            })
        );
        return;
    }

    // 2. Handle normal static assets and backend API requests
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    // Only cache successful GET requests, ignore chrome extensions, socket.io, and backend api in dev
                    if (
                        networkResponse.status === 200 &&
                        !url.pathname.startsWith('/api') &&
                        !url.hostname.includes('localhost') &&
                        url.protocol.startsWith('http')
                    ) {
                        const clonedResponse = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clonedResponse);
                        });
                    }
                    return networkResponse;
                })
                .catch((err) => {
                    // Fail gracefully
                    return null;
                });
        })
    );
});
