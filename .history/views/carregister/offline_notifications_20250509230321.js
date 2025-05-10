/**
 * Giải pháp gửi thông báo đăng ký xe về admin mà không cần internet
 * 
 * File này chứa các hàm cần thiết để lưu thông báo cục bộ khi không có kết nối internet
 * và đồng bộ lại với server khi có kết nối internet.
 * 
 * Hướng dẫn sử dụng:
 * 1. Thêm đoạn script này vào file selfdrive.html
 * 2. Thay thế đoạn mã gửi thông báo trực tiếp bằng hàm sendNotificationWithOfflineSupport
 */

// Hàm kiểm tra kết nối internet
function checkInternetConnection() {
    return navigator.onLine;
}

// RegisterServiceWorker for push notifications
async function registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered:', registration);
            
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission denied');
            }
            
            return registration;
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
    return null;
}

// Hàm lưu thông báo vào localStorage khi không có internet
function saveNotificationLocally(notification) {
    // Lấy danh sách thông báo đang chờ từ localStorage
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    
    // Thêm metadata cho thông báo
    const notificationWithMeta = {
        ...notification,
        id: Date.now().toString(), // ID tạm thời cho thông báo
        createdAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        lastAttempt: null,
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };
    
    // Thêm vào danh sách thông báo đang chờ
    localNotifications.push(notificationWithMeta);
    
    // Lưu lại vào localStorage
    try {
        localStorage.setItem('pendingNotifications', JSON.stringify(localNotifications));
        
        // Hiển thị thông báo push nếu được phép
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Thông báo đã được lưu offline', {
                body: 'Chúng tôi sẽ gửi thông báo khi có kết nối internet',
                icon: '/public/image/logo.png'
            });
        }
        
        console.log('Đã lưu thông báo cục bộ:', notificationWithMeta);
        
        // Thêm thông tin debug cho việc khắc phục sự cố
        console.log('Số lượng thông báo đang chờ:', localNotifications.length);
        console.log('Kích thước localStorage đã sử dụng (ước tính):', 
                   new Blob([JSON.stringify(localNotifications)]).size / 1024, 'KB');
        
        return true;
    } catch (error) {
        console.error('Lỗi khi lưu thông báo vào localStorage:', error);
        
        // Xử lý lỗi QuotaExceededError (localStorage đầy)
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage đầy, đang xóa các thông báo cũ nhất');
            
            // Xóa các thông báo cũ nhất để giải phóng không gian
            if (localNotifications.length > 10) {
                const sortedNotifications = [...localNotifications].sort((a, b) => 
                    new Date(a.createdAt) - new Date(b.createdAt));
                
                // Giữ lại 70% thông báo mới nhất
                const keepCount = Math.floor(sortedNotifications.length * 0.7);
                const newNotifications = sortedNotifications.slice(-keepCount);
                
                // Thêm thông báo hiện tại
                newNotifications.push(notificationWithMeta);
                
                // Lưu lại
                localStorage.setItem('pendingNotifications', JSON.stringify(newNotifications));
                console.log('Đã xóa thông báo cũ, giữ lại', newNotifications.length, 'thông báo');
                return true;
            }
        }
        return false;
    }
}

// Kiểm tra biến đếm số lần thử đồng bộ
let syncAttemptCount = 0;
const MAX_SYNC_RETRIES = 5;

// Hàm đồng bộ thông báo với server khi có internet
async function syncPendingNotifications() {
    if (!checkInternetConnection()) return false;
    
    // Tăng số lần thử
    syncAttemptCount++;
    if (syncAttemptCount > MAX_SYNC_RETRIES) {
        console.warn(`Đã thử đồng bộ ${syncAttemptCount} lần, tạm dừng để tránh gây quá tải`);
        stopPeriodicSync();
        return false;
    }
    
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    if (localNotifications.length === 0) {
        syncAttemptCount = 0; // Reset đếm nếu không có thông báo nào
        return true;
    }
    
    let syncedCount = 0;
    let errorCount = 0;
    const token = localStorage.getItem('token');
    const MAX_RETRY_ATTEMPTS = 3;
    
    // Clone array to avoid modifying while iterating
    const notifications = [...localNotifications];
    const remainingNotifications = [];
    
    // Hiển thị thông báo đang đồng bộ
    console.log(`Đang đồng bộ ${notifications.length} thông báo...`);
    
    for (const notification of notifications) {
        try {
            // Skip notifications that have exceeded max retry attempts
            if (notification.attempts >= MAX_RETRY_ATTEMPTS) {
                console.warn(`Thông báo ${notification.id} đã vượt quá số lần thử lại tối đa`);
                notification.status = 'failed';
                remainingNotifications.push(notification);
                continue;
            }

            // Update attempt count and time
            notification.attempts = (notification.attempts || 0) + 1;
            notification.lastAttempt = new Date().toISOString();
            notification.status = 'syncing';

            const response = await axios.post('/api/notifications', {
                ...notification,
                retryAttempt: notification.attempts,
                syncTime: new Date().toISOString()
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // 15 second timeout
            });

            if (response.data.success) {
                syncedCount++;
                // Thêm serverID và thời gian đồng bộ thành công
                notification.serverID = response.data.id || null;
                notification.syncedAt = new Date().toISOString();
                notification.status = 'synced';
                
                // Show success notification
                if ('Notification' in window && Notification.permission === 'granted' && notifications.length <= 3) {
                    new Notification('Đồng bộ thông báo thành công', {
                        body: `Đã gửi thông báo ${notification.tieu_de || ''}`,
                        icon: '/public/image/logo.png'
                    });
                }
                
                console.log(`Đã đồng bộ thông báo ${syncedCount}/${notifications.length}`);
            } else {
                // Đánh dấu lỗi và thêm lại vào danh sách
                notification.status = 'error';
                notification.errorMessage = response.data.message || 'Lỗi không xác định';
                remainingNotifications.push(notification);
                errorCount++;
            }
        } catch (error) {
            console.error('Lỗi khi đồng bộ thông báo:', error.message);
            errorCount++;
            
            // Đánh dấu lỗi
            notification.status = 'error';
            notification.errorMessage = error.message;
            notification.errorTime = new Date().toISOString();
            
            // Add notification back to queue with updated attempt count
            remainingNotifications.push(notification);
        }    }
    
    // Cập nhật lại localStorage với các thông báo còn lại
    if (remainingNotifications.length === 0) {
        localStorage.removeItem('pendingNotifications');
        syncAttemptCount = 0; // Reset counter on success
        console.log('Đã đồng bộ tất cả thông báo thành công');
        return true;
    } else {
        localStorage.setItem('pendingNotifications', JSON.stringify(remainingNotifications));
        console.log(`Còn ${remainingNotifications.length} thông báo chưa đồng bộ (${syncedCount} thành công, ${errorCount} lỗi)`);
        
        // Nếu vẫn còn thông báo bị lỗi, giảm tần suất cố gắng đồng bộ
        if (syncAttemptCount >= 3) {
            console.log('Đã thử nhiều lần, sẽ giảm tần suất đồng bộ');
            adjustSyncInterval();
        }
        
        return false;
    }
}

// Điều chỉnh khoảng thời gian đồng bộ dựa vào số lần thất bại
function adjustSyncInterval() {
    // Dừng interval hiện tại nếu có
    stopPeriodicSync();
    
    // Tính khoảng thời gian tăng dần dựa trên số lần thử
    const baseInterval = 5 * 60 * 1000; // 5 phút
    const maxInterval = 30 * 60 * 1000; // 30 phút
    const newInterval = Math.min(baseInterval * Math.pow(1.5, syncAttemptCount - 1), maxInterval);
    
    console.log(`Điều chỉnh khoảng thời gian đồng bộ: ${Math.round(newInterval / 60000)} phút`);
    
    // Khởi tạo interval mới
    syncInterval = setInterval(async () => {
        if (checkInternetConnection()) {
            await syncPendingNotifications();
        }
    }, newInterval);
}

// Hàm gửi thông báo có hỗ trợ offline
async function sendNotificationWithOfflineSupport(notification) {
    // Thêm timestamp để theo dõi thời gian tạo thông báo
    notification.thoi_gian_tao = new Date().toISOString();
    
    // Kiểm tra kết nối internet trước khi thực hiện
    const isOnline = checkInternetConnection();
    console.log('Trạng thái kết nối:', isOnline ? 'Online' : 'Offline');
    
    if (isOnline) {
        try {
            // Trước tiên, thử đồng bộ các thông báo đang chờ
            await syncPendingNotifications();
            
            // Gửi thông báo hiện tại
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Không tìm thấy token người dùng');
                return { success: false, message: 'Không có token người dùng' };
            }
            
            const notifyResponse = await axios.post('/api/notifications', notification, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // 15 giây timeout
            });
            
            console.log('Kết quả gửi thông báo:', notifyResponse.data);
            
            // Thêm ID thông báo trả về để theo dõi
            if (notifyResponse.data && notifyResponse.data.id) {
                console.log('Thông báo đã được gửi với ID:', notifyResponse.data.id);
            }
            
            return notifyResponse.data;
        } catch (error) {
            console.error('Lỗi khi gửi thông báo tới admin:', error);
            
            // Kiểm tra lại kết nối vì có thể mất kết nối trong quá trình gửi
            if (!checkInternetConnection() || 
                error.message.includes('Network Error') || 
                error.message.includes('timeout') ||
                error.code === 'ECONNABORTED') {
                
                console.log('Phát hiện lỗi kết nối, lưu thông báo vào localStorage');
                saveNotificationLocally(notification);
                
                // Thông báo cho người dùng
                Swal.fire({
                    icon: 'info',
                    title: 'Lưu thông báo offline',
                    text: 'Không thể kết nối tới máy chủ. Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
                    confirmButtonText: 'Đã hiểu'
                });
                
                return { success: true, offline: true, message: 'Thông báo đã được lưu offline', error: error.message };
            }
            
            throw error;
        }
    } else {
        // Không có kết nối internet, lưu vào localStorage
        console.log('Không có kết nối internet, lưu thông báo vào localStorage');
        saveNotificationLocally(notification);
        
        // Thông báo cho người dùng
        Swal.fire({
            icon: 'info',
            title: 'Lưu thông báo offline',
            text: 'Không có kết nối internet. Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
            confirmButtonText: 'Đã hiểu'
        });
        
        return { success: true, offline: true, message: 'Thông báo đã được lưu offline' };
    }
}

// Định nghĩa hàm đồng bộ định kỳ
let syncInterval = null;

function startPeriodicSync() {
    if (syncInterval) return;
    
    // Sync every 5 minutes while online
    syncInterval = setInterval(async () => {
        if (checkInternetConnection()) {
            await syncPendingNotifications();
        }
    }, 5 * 60 * 1000);
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Lắng nghe sự kiện online/offline
window.addEventListener('online', async () => {
    console.log('Đã kết nối lại internet, bắt đầu đồng bộ thông báo...');
    await syncPendingNotifications();
    startPeriodicSync();
    
    // Show online notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Đã kết nối lại internet', {
            body: 'Đang đồng bộ các thông báo...',
            icon: '/public/image/logo.png'
        });
    }
});

window.addEventListener('offline', () => {
    console.log('Mất kết nối internet');
    stopPeriodicSync();
    
    // Show offline notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Mất kết nối internet', {
            body: 'Các thông báo sẽ được lưu offline và gửi khi có kết nối',
            icon: '/public/image/logo.png'
        });
    }
});

// Khởi tạo service worker và xử lý thông báo khi tải trang
document.addEventListener('DOMContentLoaded', async function() {
    // Đăng ký service worker
    await registerServiceWorker();
    
    // Kiểm tra thông báo chưa đồng bộ
    const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    if (pendingNotifications.length > 0) {
        console.log(`Có ${pendingNotifications.length} thông báo đang chờ đồng bộ`);
        
        // Show notification about pending items
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Thông báo chưa đồng bộ', {
                body: `Có ${pendingNotifications.length} thông báo đang chờ gửi`,
                icon: '/public/image/logo.png'
            });
        }
        
        // Start sync if online
        if (checkInternetConnection()) {
            await syncPendingNotifications();
            startPeriodicSync();
        }
    }
});

/**
 * Ví dụ sử dụng:
 * 
 * Trong hàm xử lý submit form, thay thế đoạn gửi thông báo:
 * 
 * try {
 *   // ... Mã xử lý đăng ký xe thành công ...
 *   
 *   // Thay thế đoạn mã gửi thông báo cũ bằng đoạn này:
 *   const notification = {
 *     tieu_de: 'Xe mới cần duyệt',
 *     noi_dung: `Người dùng ${userData.ho_ten || ''} (ID: ${userData.id || ''}) vừa đăng ký xe ${brand} ${model} với biển số ${licensePlate}. ${carDetails}`,
 *     loai_thong_bao: 'car_registration',
 *     lien_ket: `/admin/cars/view/${carId}`
 *   };
 *   
 *   const notifyResult = await sendNotificationWithOfflineSupport(notification);
 *   
 *   if (notifyResult.offline) {
 *     console.log('Thông báo đã được lưu offline và sẽ gửi khi có kết nối internet');
 *   } else {
 *     console.log('Đã gửi thông báo thành công đến admin về xe mới');
 *   }
 * } catch (error) {
 *   // ... Xử lý lỗi ...
 * }
 */
