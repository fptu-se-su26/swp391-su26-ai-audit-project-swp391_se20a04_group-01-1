const CACHE_NAME = 'danang-eventmap-offline-v1';
const MAPBOX_CACHE_NAME = 'mapbox-tiles-cache-v1';
const API_DATA_CACHE_NAME = 'api-data-cache-v1';

// Static resources to cache immediately on installation
const PRECACHE_ASSETS = [
    '/',
    '/index.html'
];

// API endpoints cần cache (network-first strategy)
const CACHEABLE_API_ENDPOINTS = [
    '/api/flood-zones',
    '/api/pois',
    '/api/event-roads'
];

/**
 * Lưu timestamp vào cache metadata
 */
async function cacheAPIResponseWithTimestamp(cache, request, response) {
    const clonedResponse = response.clone();
    
    const responseWithTimestamp = new Response(
        clonedResponse.body,
        {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers: new Headers(clonedResponse.headers)
        }
    );
    
    const now = new Date().toISOString();
    responseWithTimestamp.headers.set('X-Cache-Timestamp', now);
    
    await cache.put(request, responseWithTimestamp);
    
    return now;
}

/**
 * Lấy timestamp từ cached response
 */
function getTimestampFromResponse(response) {
    const timestamp = response.headers.get('X-Cache-Timestamp');
    return timestamp ? new Date(timestamp) : null;
}

/**
 * Format thời gian để hiển thị cho user
 */
function formatLastUpdateTime(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Vừa rồi';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Gửi message đến client
 */
function notifyClients(isOffline, endpoint, lastUpdate) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'API_OFFLINE_DATA',
                isOffline: isOffline,
                endpoint: endpoint,
                lastUpdate: lastUpdate
            });
        });
    });
}

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
                    if (cacheName !== CACHE_NAME && cacheName !== MAPBOX_CACHE_NAME && cacheName !== API_DATA_CACHE_NAME) {
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
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // 1. Handle Mapbox GL Tile (Stale-While-Revalidate)
    if (url.hostname.includes('api.mapbox.com') || url.hostname.includes('tiles.mapbox.com')) {
        event.respondWith(
            caches.open(MAPBOX_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse.status === 200) {
                                    cache.put(event.request, networkResponse.clone());
                                }
                            })
                            .catch(() => {});
                        return cachedResponse;
                    }

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

    // 2. Handle API endpoints (Network-First strategy)
    const isApiRequest = CACHEABLE_API_ENDPOINTS.some(endpoint => 
        url.pathname.startsWith(endpoint)
    );

    if (isApiRequest) {
        event.respondWith(
            fetch(event.request)
                .then(async (networkResponse) => {
                    if (networkResponse.status === 200) {
                        const cache = await caches.open(API_DATA_CACHE_NAME);
                        const timestamp = await cacheAPIResponseWithTimestamp(
                            cache, 
                            event.request, 
                            networkResponse
                        );
                        console.log(`[SW] Cached API data from ${url.pathname} at ${timestamp}`);
                        notifyClients(false, url.pathname, timestamp);
                    }
                    return networkResponse;
                })
                .catch(async (error) => {
                    console.log(`[SW] Network request failed for ${url.pathname}, trying cache...`, error);
                    
                    const cache = await caches.open(API_DATA_CACHE_NAME);
                    const cachedResponse = await cache.match(event.request);
                    
                    if (cachedResponse) {
                        const timestamp = getTimestampFromResponse(cachedResponse);
                        console.log(`[SW] Returning cached API data from ${url.pathname}`);
                        notifyClients(true, url.pathname, timestamp ? timestamp.toISOString() : null);
                        return cachedResponse;
                    }
                    
                    console.warn(`[SW] No cached data available for ${url.pathname}`);
                    return new Response(
                        JSON.stringify({ 
                            error: 'Không có dữ liệu. Kiểm tra kết nối mạng.',
                            offline: true
                        }),
                        {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // 3. Handle normal static assets (Cache-First)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    if (
                        networkResponse.status === 200 &&
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
                    console.warn('[SW] Fetch failed for static asset:', url.pathname, err);
                    return null;
                });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_API_CACHE') {
        caches.delete(API_DATA_CACHE_NAME).then(() => {
            console.log('[SW] API cache cleared');
            event.ports[0].postMessage({ success: true });
        });
    }
});