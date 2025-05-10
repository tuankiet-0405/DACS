// Service worker cho form đăng ký xe
const CACHE_NAME = 'car-registration-cache-v1';
const OFFLINE_URL = '/views/offline.html';

// Cài đặt service worker và cache tài nguyên cần thiết
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                OFFLINE_URL,
                '/public/js/notification-handler.js',
                '/public/css/styles.css'
            ]);
        })
    );
});

// Xử lý fetch requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request).catch(() => {
                    // Nếu không có mạng và request là HTML
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
    );
});

// Xử lý background sync cho thông báo
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncNotifications());
    }
});

// Hàm đồng bộ thông báo
async function syncNotifications() {
    try {
        const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        if (localNotifications.length === 0) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        for (const notification of localNotifications) {
            try {
                await fetch('/api/notifications/admin', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notification)
                });
            } catch (error) {
                console.error('Lỗi khi đồng bộ thông báo:', error);
            }
        }

        localStorage.removeItem('pendingNotifications');
    } catch (error) {
        console.error('Lỗi trong quá trình đồng bộ:', error);
    }
}
