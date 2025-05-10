// Service Worker for offline notifications
const CACHE_VERSION = 'v1';
const CACHE_NAME = `car-registration-${CACHE_VERSION}`;

// Assets to cache
const ASSETS_TO_CACHE = [
    '/public/image/logo.png',
    '/public/css/styles.css',
    '/views/carregister/offline_notifications.js'
];

// Install event - cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching core assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Service Worker: Removing old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Cache new successful responses
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Fetch failed:', error);
                    });
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Có thông báo mới',
        icon: '/public/image/logo.png',
        badge: '/public/image/logo.png',
        data: data.data || {},
        actions: [
            {
                action: 'view',
                title: 'Xem chi tiết'
            },
            {
                action: 'close',
                title: 'Đóng'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view' && event.notification.data.url) {
        clients.openWindow(event.notification.data.url);
    }
});

// Sync notifications when back online
self.addEventListener('sync', event => {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(
            syncNotifications()
        );
    }
});
