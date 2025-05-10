// Quản lý thông báo
const notifications = {
    // Khởi tạo và gắn các sự kiện
    init: function() {
        this.loadNotifications();
        this.setupEventListeners();
    },

    // Gắn sự kiện cho các phần tử
    setupEventListeners: function() {
        const notificationIcon = document.getElementById('notification-icon');
        const closeNotificationBtn = document.getElementById('close-notification-btn');
        
        if (notificationIcon) {
            notificationIcon.addEventListener('click', function() {
                const notificationPanel = document.getElementById('notification-panel');
                if (notificationPanel) {
                    notificationPanel.classList.toggle('show');
                    if (notificationPanel.classList.contains('show')) {
                        notifications.loadNotifications();
                    }
                }
            });
        }
        
        if (closeNotificationBtn) {
            closeNotificationBtn.addEventListener('click', function() {
                const notificationPanel = document.getElementById('notification-panel');
                if (notificationPanel) {
                    notificationPanel.classList.remove('show');
                }
            });
        }

        // Sự kiện để đánh dấu tất cả thông báo đã đọc
        const markAllReadBtn = document.getElementById('mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', notifications.markAllAsRead);
        }

        // Các sự kiện khác được gắn động khi tải thông báo
    },

    // Tải danh sách thông báo
    loadNotifications: async function() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Chưa đăng nhập');
                return;
            }

            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            const endpoint = isAdmin ? '/api/notifications/admin' : '/api/notifications/user';

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayNotifications(result.data);
                this.updateNotificationCount(result.data);
            } else {
                console.error('Lỗi khi tải thông báo:', result.message);
            }
        } catch (error) {
            console.error('Lỗi khi tải thông báo:', error);
        }
    },

    // Hiển thị thông báo trong panel
    displayNotifications: function(notificationsList) {
        const notificationContainer = document.getElementById('notification-list');
        if (!notificationContainer) return;

        // Xóa nội dung cũ
        notificationContainer.innerHTML = '';

        if (notificationsList.length === 0) {
            notificationContainer.innerHTML = '<div class="empty-notification">Không có thông báo nào</div>';
            return;
        }

        // Thêm các thông báo mới
        notificationsList.forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.className = `notification-item ${notification.da_doc ? 'read' : 'unread'}`;
            notificationElement.dataset.id = notification.id;

            const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = new Date(notification.ngay_tao).toLocaleDateString('vi-VN', dateOptions);

            notificationElement.innerHTML = `
                <div class="notification-header">
                    <h4>${notification.tieu_de}</h4>
                    <span class="notification-date">${formattedDate}</span>
                </div>
                <div class="notification-content">${notification.noi_dung}</div>
                <div class="notification-actions">
                    <button class="mark-read-btn" data-id="${notification.id}">
                        ${notification.da_doc ? 'Đã đọc' : 'Đánh dấu đã đọc'}
                    </button>
                    <button class="delete-notification-btn" data-id="${notification.id}">Xóa</button>
                </div>
            `;

            notificationContainer.appendChild(notificationElement);

            // Gắn sự kiện cho nút đánh dấu đã đọc
            const markReadBtn = notificationElement.querySelector('.mark-read-btn');
            if (markReadBtn) {
                markReadBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const notificationId = this.dataset.id;
                    notifications.markAsRead(notificationId);
                });
            }

            // Gắn sự kiện cho nút xóa thông báo
            const deleteBtn = notificationElement.querySelector('.delete-notification-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const notificationId = this.dataset.id;
                    notifications.deleteNotification(notificationId);
                });
            }

            // Khi click vào thông báo thì đánh dấu đã đọc
            notificationElement.addEventListener('click', function() {
                const notificationId = this.dataset.id;
                if (!notification.da_doc) {
                    notifications.markAsRead(notificationId);
                }
                
                // Xử lý chuyển hướng nếu có
                if (notification.loai_thong_bao === 'car_approval' || notification.loai_thong_bao === 'car_rejection') {
                    window.location.href = `/mycars.html?id=${notification.tham_chieu_id}`;
                } else if (notification.loai_thong_bao === 'booking_request') {
                    window.location.href = `/bookings.html?id=${notification.tham_chieu_id}`;
                }
            });
        });
    },

    // Cập nhật số thông báo chưa đọc
    updateNotificationCount: function(notificationsList) {
        const notificationBadge = document.getElementById('notification-count');
        if (!notificationBadge) return;

        const unreadCount = notificationsList.filter(notification => !notification.da_doc).length;
        
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    },

    // Đánh dấu đã đọc một thông báo
    markAsRead: async function(notificationId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Chưa đăng nhập');
                return;
            }

            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Cập nhật UI
                const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
                if (notificationElement) {
                    notificationElement.classList.remove('unread');
                    notificationElement.classList.add('read');
                    
                    const markReadBtn = notificationElement.querySelector('.mark-read-btn');
                    if (markReadBtn) {
                        markReadBtn.textContent = 'Đã đọc';
                    }
                }
                
                // Cập nhật lại số lượng thông báo chưa đọc
                notifications.loadNotifications();
            } else {
                console.error('Lỗi khi đánh dấu đã đọc:', result.message);
            }
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
        }
    },

    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async function() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Chưa đăng nhập');
                return;
            }

            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Cập nhật UI
                document.querySelectorAll('.notification-item.unread').forEach(item => {
                    item.classList.remove('unread');
                    item.classList.add('read');
                    
                    const markReadBtn = item.querySelector('.mark-read-btn');
                    if (markReadBtn) {
                        markReadBtn.textContent = 'Đã đọc';
                    }
                });
                
                // Cập nhật số lượng thông báo
                const notificationBadge = document.getElementById('notification-count');
                if (notificationBadge) {
                    notificationBadge.style.display = 'none';
                }
            } else {
                console.error('Lỗi khi đánh dấu tất cả đã đọc:', result.message);
            }
        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
        }
    },

    // Xóa một thông báo
    deleteNotification: async function(notificationId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Chưa đăng nhập');
                return;
            }

            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Xóa thông báo khỏi UI
                const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
                if (notificationElement) {
                    notificationElement.remove();
                }
                
                // Cập nhật lại danh sách và số lượng
                notifications.loadNotifications();
            } else {
                console.error('Lỗi khi xóa thông báo:', result.message);
            }
        } catch (error) {
            console.error('Lỗi khi xóa thông báo:', error);
        }
    }
};

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập trước khi khởi tạo
    const token = localStorage.getItem('token');
    if (token) {
        notifications.init();
    }
});