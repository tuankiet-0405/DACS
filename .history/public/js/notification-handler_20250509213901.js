// Service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/public/js/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker đăng ký thành công:', registration.scope);
            })
            .catch(err => {
                console.log('Đăng ký ServiceWorker thất bại:', err);
            });
    });
}

// Hàm xử lý notification offline
function handleOfflineNotification(notification) {
    const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    pendingNotifications.push(notification);
    localStorage.setItem('pendingNotifications', JSON.stringify(pendingNotifications));
}

// Gửi thông báo tới admin
async function sendAdminNotification(data) {
    try {
        if (!navigator.onLine) {
            // Nếu offline, lưu thông báo vào localStorage
            handleOfflineNotification(data);
            return {
                success: true,
                offline: true,
                message: 'Thông báo sẽ được gửi khi có kết nối mạng'
            };
        }

        const token = localStorage.getItem('token');
        // Gửi thông báo qua API
        const response = await axios.post('/api/notifications/admin', data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
        
    } catch (error) {
        if (!navigator.onLine) {
            handleOfflineNotification(data);
            return {
                success: true,
                offline: true,
                message: 'Thông báo sẽ được gửi khi có kết nối mạng'
            };
        }
        throw error;
    }
}

// Gửi lại thông báo khi có mạng
window.addEventListener('online', async () => {
    try {
        const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        if (pendingNotifications.length === 0) return;

        console.log('Đang gửi lại', pendingNotifications.length, 'thông báo...');

        for (const notification of pendingNotifications) {
            try {
                await sendAdminNotification(notification);
            } catch (err) {
                console.error('Lỗi khi gửi lại thông báo:', err);
            }
        }

        localStorage.removeItem('pendingNotifications');
    } catch (error) {
        console.error('Lỗi khi xử lý thông báo offline:', error);
    }
});

// Hàm gửi thông báo với hỗ trợ offline cho form đăng ký xe
async function sendCarRegistrationNotification(carData) {
    try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('Không tìm thấy token đăng nhập');
            return false;
        }

        const notification = {
            tieu_de: 'Xe mới cần duyệt',
            noi_dung: `Người dùng ${userData.ho_ten} đã đăng ký xe mới.\n`+
                      `Biển số: ${carData.bien_so}\n`+ 
                      `Hãng xe: ${carData.hang_xe}\n`+
                      `Model: ${carData.model}\n`+
                      `Giá thuê: ${carData.gia_thue}VND/ngày`,
            loai_thong_bao: 'car_registration',
            do_uu_tien: 'cao',
            han_xu_ly: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        if (!checkInternetConnection()) {
            // Lưu thông báo offline
            saveNotificationLocally(notification);
            return {
                success: true,
                offline: true,
                message: 'Thông báo đã được lưu offline'
            };
        }

        // Gửi thông báo online
        const response = await axios.post('/api/notifications/admin', notification, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return {
            success: true,
            data: response.data
        };

    } catch (error) {
        console.error('Lỗi khi gửi thông báo đăng ký xe:', error);
        
        // Nếu lỗi mạng, lưu offline
        if (!checkInternetConnection() || error.message.includes('Network Error')) {
            saveNotificationLocally(notification);
            return {
                success: true,
                offline: true,
                message: 'Thông báo đã được lưu offline'
            };
        }
        
        throw error;
    }
}
