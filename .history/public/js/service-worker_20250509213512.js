// Service worker để xử lý thông báo offline
const CACHE_NAME = 'notification-cache-v1';

// Install service worker và cache các tài nguyên cần thiết
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll([
                    '/public/js/offline-notifications.js',
                    '/views/offline.html'
                ]);
            })
    );
});

// Activate service worker và xóa cache cũ
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
        })
    );
});

// Xử lý sync thông báo khi có kết nối
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(
            syncNotifications()
        );
    }
});

// Hàm đồng bộ thông báo
async function syncNotifications() {
    try {
        const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        if (pendingNotifications.length === 0) return;

        // Gửi lại các thông báo đang chờ
        for (const notification of pendingNotifications) {
            try {
                const response = await fetch('/api/notifications/resend', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notification)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.error('Lỗi khi gửi lại thông báo:', err);
                // Giữ lại thông báo chưa gửi được để thử lại sau
                continue;
            }
        }

        // Xóa các thông báo đã gửi thành công
        localStorage.removeItem('pendingNotifications');

    } catch (error) {
        console.error('Lỗi khi đồng bộ thông báo:', error);
        throw error;
    }
}

// Fetch để lấy nội dung khi offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Nếu request có trong cache thì trả về từ cache
                if (response) {
                    return response;
                }

                // Nếu không có trong cache thì fetch từ network
                return fetch(event.request).then(networkResponse => {
                    // Nếu response là opaque thì không cache
                    if (networkResponse.type === 'opaque') {
                        return networkResponse;
                    }

                    // Cache response mới
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch(() => {
                    // Nếu fetch thất bại và request là GET, trả về trang offline
                    if (event.request.method === 'GET') {
                        return caches.match('/views/offline.html');
                    }
                    throw new Error('Request failed');
                });
            })
    );
});
