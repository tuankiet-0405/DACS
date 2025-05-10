// Service worker cho form đăng ký xe
const CACHE_NAME = 'car-registration-cache-v1';
const OFFLINE_URL = '/views/offline.html';
const NOTIFICATION_STORE = 'notifications';

// Cài đặt service worker và cache tài nguyên cần thiết
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll([
                    OFFLINE_URL,
                    '/public/js/notification-handler.js',
                    '/public/css/styles.css'
                ]);
            }),
            // Tạo object store cho notifications
            openIndexedDB()
        ])
    );
});

// Khởi tạo IndexedDB
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CarRegistrationDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
                db.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

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

// Hàm lưu thông báo vào IndexedDB
async function saveNotification(notification) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
        const store = transaction.objectStore(NOTIFICATION_STORE);
        const request = store.add(notification);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Hàm lấy và xóa thông báo từ IndexedDB
async function getPendingNotifications() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([NOTIFICATION_STORE], 'readwrite');
        const store = transaction.objectStore(NOTIFICATION_STORE);
        const request = store.getAll();
        
        request.onsuccess = async () => {
            const notifications = request.result;
            if (notifications.length > 0) {
                // Xóa các thông báo đã lấy
                const clearRequest = store.clear();
                await new Promise(resolve => clearRequest.onsuccess = resolve);
            }
            resolve(notifications);
        };
        request.onerror = () => reject(request.error);
    });
}

// Hàm đồng bộ thông báo
async function syncNotifications() {
    try {
        const notifications = await getPendingNotifications();
        if (notifications.length === 0) return;

        const token = await getValidToken();
        if (!token) {
            throw new Error('No valid token available');
        }

        for (const notification of notifications) {
            try {
                const response = await fetch('/api/notifications/admin', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notification)
                });

                if (!response.ok) {
                    throw new Error('Failed to sync notification');
                }
            } catch (error) {
                // Nếu gửi thất bại, lưu lại thông báo để thử lại sau
                await saveNotification(notification);
                console.error('Lỗi khi đồng bộ thông báo:', error);
            }
        }
    } catch (error) {
        console.error('Lỗi trong quá trình đồng bộ:', error);
        throw error; // Để service worker biết sync thất bại và thử lại sau
    }
}

// Hàm lấy token hợp lệ
async function getValidToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        // Kiểm tra token có hợp lệ không
        const response = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            localStorage.removeItem('token');
            return null;
        }
        
        return token;
    } catch (error) {
        console.error('Lỗi khi xác thực token:', error);
        return null;
    }
}
