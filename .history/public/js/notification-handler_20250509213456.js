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
