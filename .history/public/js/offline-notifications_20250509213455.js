// Hàm xử lý thông báo ngoại tuyến
const handleOfflineNotifications = async (notification) => {
    try {
        // Lưu trữ thông báo vào localStorage khi không có kết nối
        const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        pendingNotifications.push(notification);
        localStorage.setItem('pendingNotifications', JSON.stringify(pendingNotifications));

        // Kiểm tra và đăng ký service worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            registration.sync.register('sync-notifications');
        }
    } catch (error) {
        console.error('Lỗi khi xử lý thông báo offline:', error);
    }
};

// Gửi lại các thông báo khi có kết nối
const resendPendingNotifications = async () => {
    try {
        const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        if (pendingNotifications.length === 0) return;

        // Gửi lại từng thông báo
        for (const notification of pendingNotifications) {
            try {
                await axios.post('/api/notifications/resend', notification);
            } catch (err) {
                console.error('Lỗi khi gửi lại thông báo:', err);
            }
        }

        // Xóa các thông báo đã gửi
        localStorage.removeItem('pendingNotifications');
        
    } catch (error) {
        console.error('Lỗi khi gửi lại thông báo:', error);
    }
};

// Theo dõi trạng thái kết nối
window.addEventListener('online', () => {
    console.log('Đã kết nối lại. Đang gửi lại các thông báo...');
    resendPendingNotifications();
});

// Lưu thông báo khi offline
window.addEventListener('offline', () => {
    console.log('Mất kết nối. Thông báo sẽ được lưu và gửi lại sau.');
});
