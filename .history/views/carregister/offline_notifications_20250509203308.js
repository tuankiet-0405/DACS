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
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    const notificationWithMeta = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        lastAttempt: null
    };
    
    localNotifications.push(notificationWithMeta);
    localStorage.setItem('pendingNotifications', JSON.stringify(localNotifications));
    
    // Show offline notification to user
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Thông báo đã được lưu offline', {
            body: 'Chúng tôi sẽ gửi thông báo khi có kết nối internet',
            icon: '/public/image/logo.png'
        });
    }
    
    console.log('Đã lưu thông báo cục bộ:', notificationWithMeta);
    return true;
}

// Hàm đồng bộ thông báo với server khi có internet
async function syncPendingNotifications() {
    if (!checkInternetConnection()) return false;
    
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    if (localNotifications.length === 0) return true;
    
    let syncedCount = 0;
    const token = localStorage.getItem('token');
    
    for (const notification of localNotifications) {
        try {
            await axios.post('/api/notifications', notification, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            syncedCount++;
            console.log(`Đã đồng bộ thông báo ${syncedCount}/${localNotifications.length}`);
        } catch (error) {
            console.error('Lỗi khi đồng bộ thông báo:', error);
            break; // Dừng đồng bộ nếu gặp lỗi
        }
    }
    
    if (syncedCount === localNotifications.length) {
        localStorage.removeItem('pendingNotifications');
        console.log('Đã đồng bộ tất cả thông báo thành công');
        return true;
    } else {
        // Lưu lại các thông báo chưa đồng bộ được
        const remainingNotifications = localNotifications.slice(syncedCount);
        localStorage.setItem('pendingNotifications', JSON.stringify(remainingNotifications));
        console.log(`Còn ${remainingNotifications.length} thông báo chưa đồng bộ`);
        return false;
    }
}

// Hàm gửi thông báo có hỗ trợ offline
async function sendNotificationWithOfflineSupport(notification) {
    // Hiển thị thông báo đang xử lý cho người dùng
    const isShowingSuccessMessage = true;
    
    if (checkInternetConnection()) {
        try {
            // Thử đồng bộ các thông báo đang chờ
            await syncPendingNotifications();
            
            // Gửi thông báo hiện tại
            const token = localStorage.getItem('token');
            const notifyResponse = await axios.post('/api/notifications', notification, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Kết quả gửi thông báo:', notifyResponse.data);
            return notifyResponse.data;
        } catch (error) {
            console.error('Lỗi khi gửi thông báo tới admin:', error);
            
            // Nếu lỗi là do mất kết nối, lưu vào localStorage
            if (!checkInternetConnection() || error.message.includes('Network Error')) {
                saveNotificationLocally(notification);
                
                if (isShowingSuccessMessage) {
                    // Thông báo cho người dùng
                    Swal.fire({
                        icon: 'info',
                        title: 'Lưu thông báo offline',
                        text: 'Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
                        confirmButtonText: 'Đã hiểu'
                    });
                }
                
                return { success: true, offline: true, message: 'Thông báo đã được lưu offline' };
            }
            
            throw error;
        }
    } else {
        // Không có kết nối internet
        saveNotificationLocally(notification);
        
        if (isShowingSuccessMessage) {
            // Thông báo cho người dùng
            Swal.fire({
                icon: 'info',
                title: 'Lưu thông báo offline',
                text: 'Không có kết nối internet. Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
                confirmButtonText: 'Đã hiểu'
            });
        }
        
        return { success: true, offline: true, message: 'Thông báo đã được lưu offline' };
    }
}

// Lắng nghe sự kiện online/offline
window.addEventListener('online', async () => {
    console.log('Đã kết nối lại internet, bắt đầu đồng bộ thông báo...');
    await syncPendingNotifications();
});

// Kiểm tra và hiển thị số lượng thông báo chưa đồng bộ khi tải trang
document.addEventListener('DOMContentLoaded', function() {
    const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    if (pendingNotifications.length > 0) {
        console.log(`Có ${pendingNotifications.length} thông báo đang chờ đồng bộ`);
        
        // Có thể hiển thị thông báo cho người dùng nếu cần
        if (checkInternetConnection()) {
            syncPendingNotifications();
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
