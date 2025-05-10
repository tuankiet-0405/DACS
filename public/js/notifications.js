// Notification handling script
class NotificationManager {
    constructor() {
        this.notificationsContainer = null;
        this.notificationsIcon = null;
        this.notificationsCount = null;
        this.notificationsDropdown = null;
        this.notificationsList = null;
        this.unreadCount = 0;
        this.notifications = [];
        this.isInitialized = false;
        this.isLoading = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        // Tạo container cho thông báo trong DOM nếu chưa tồn tại
        this.createNotificationElements();
        
        // Thêm các sự kiện lắng nghe
        this.addEventListeners();
        
        // Tải thông báo từ server
        await this.fetchNotifications();
        
        this.isInitialized = true;
    }

    createNotificationElements() {
        // Tìm phần tử navbar để thêm container thông báo
        const navbar = document.querySelector('.navbar__nav');
        if (!navbar) return;

        // Tạo các phần tử HTML cho container thông báo
        const notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        
        notificationsContainer.innerHTML = `
            <div class="notifications-icon">
                <i class="fas fa-bell"></i>
                <span class="notifications-count">0</span>
            </div>
            <div class="notifications-dropdown">
                <div class="notifications-header">
                    <h3>Thông báo</h3>
                    <div class="notifications-actions">
                        <button class="mark-all-read-btn">Đánh dấu đã đọc tất cả</button>
                    </div>
                </div>
                <ul class="notifications-list"></ul>
                <div class="notifications-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>Không có thông báo nào</p>
                </div>
                <div class="notifications-footer">
                    <a href="#" class="view-all-notifications">Xem tất cả</a>
                </div>
            </div>
        `;
        
        // Chèn container thông báo vào navbar
        const userActions = navbar.querySelector('.navbar__actions');
        if (userActions) {
            userActions.insertBefore(notificationsContainer, userActions.firstChild);
        } else {
            navbar.appendChild(notificationsContainer);
        }
        
        // Lưu tham chiếu đến các phần tử DOM
        this.notificationsContainer = notificationsContainer;
        this.notificationsIcon = notificationsContainer.querySelector('.notifications-icon');
        this.notificationsCount = notificationsContainer.querySelector('.notifications-count');
        this.notificationsDropdown = notificationsContainer.querySelector('.notifications-dropdown');
        this.notificationsList = notificationsContainer.querySelector('.notifications-list');
        this.notificationsEmpty = notificationsContainer.querySelector('.notifications-empty');
    }

    addEventListeners() {
        if (!this.notificationsIcon || !this.notificationsDropdown) return;
        
        // Sự kiện mở/đóng dropdown khi click vào icon
        this.notificationsIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (this.notificationsDropdown && this.notificationsDropdown.classList.contains('show') && 
                !this.notificationsContainer.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Xử lý sự kiện đánh dấu đã đọc tất cả
        const markAllReadBtn = this.notificationsContainer.querySelector('.mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }
        
        // Xử lý sự kiện xem tất cả thông báo
        const viewAllBtn = this.notificationsContainer.querySelector('.view-all-notifications');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                // Có thể chuyển hướng đến trang tất cả thông báo (nếu có)
                // window.location.href = '/notifications';
                e.preventDefault();
            });
        }
    }

    async fetchNotifications() {
        try {
            this.isLoading = true;
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            
            const data = await response.json();
            this.notifications = data.notifications || [];
            this.renderNotifications();
            this.updateUnreadCount();
            
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            this.isLoading = false;
        }
    }

    renderNotifications() {
        if (!this.notificationsList) return;
        
        // Xóa tất cả thông báo hiện tại
        this.notificationsList.innerHTML = '';
        
        if (this.notifications.length === 0) {
            this.notificationsEmpty.style.display = 'block';
            return;
        }
        
        this.notificationsEmpty.style.display = 'none';
        
        // Render tối đa 5 thông báo gần nhất
        const recentNotifications = this.notifications.slice(0, 5);
        
        recentNotifications.forEach(notification => {
            const li = document.createElement('li');
            li.className = `notification-item ${notification.read ? '' : 'unread'}`;
            li.setAttribute('data-id', notification._id);
            
            // Xác định icon class dựa vào loại thông báo
            let iconClass = 'fa-info-circle';
            let iconCategory = '';
            
            switch (notification.type) {
                case 'booking':
                    iconClass = 'fa-calendar-check';
                    iconCategory = 'booking';
                    break;
                case 'payment':
                    iconClass = 'fa-credit-card';
                    iconCategory = 'payment';
                    break;
                case 'system':
                    iconClass = 'fa-cog';
                    break;
                case 'alert':
                    iconClass = 'fa-exclamation-triangle';
                    iconCategory = 'alert';
                    break;
            }
            
            li.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon ${iconCategory}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="notification-info">
                        <h4 class="notification-title">${notification.title}</h4>
                        <p class="notification-message">${notification.message}</p>
                        <span class="notification-time">${this.formatDateTime(notification.createdAt)}</span>
                        <div class="notification-actions">
                            <button class="mark-read-btn" data-id="${notification._id}" ${notification.read ? 'style="display:none"' : ''}>
                                Đánh dấu đã đọc
                            </button>
                        </div>
                    </div>
                </div>
                ${notification.read ? '' : '<span class="notification-mark"></span>'}
            `;
            
            // Thêm sự kiện click để xem chi tiết thông báo
            li.addEventListener('click', (e) => {
                // Không trigger khi click vào nút hành động
                if (e.target.closest('.notification-actions')) return;
                
                this.viewNotificationDetails(notification);
            });
            
            // Thêm sự kiện cho nút đánh dấu đã đọc
            const markReadBtn = li.querySelector('.mark-read-btn');
            if (markReadBtn) {
                markReadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.markAsRead(notification._id);
                });
            }
            
            this.notificationsList.appendChild(li);
        });
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (!this.notificationsCount) return;
        
        this.notificationsCount.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        this.notificationsCount.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }

    toggleDropdown() {
        if (!this.notificationsDropdown) return;
        this.notificationsDropdown.classList.toggle('show');
    }

    closeDropdown() {
        if (!this.notificationsDropdown) return;
        this.notificationsDropdown.classList.remove('show');
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
            
            // Cập nhật state
            this.notifications = this.notifications.map(n => {
                if (n._id === notificationId) {
                    return { ...n, read: true };
                }
                return n;
            });
            
            // Cập nhật giao diện
            this.renderNotifications();
            this.updateUnreadCount();
            
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }
            
            // Cập nhật state
            this.notifications = this.notifications.map(n => ({ ...n, read: true }));
            
            // Cập nhật giao diện
            this.renderNotifications();
            this.updateUnreadCount();
            
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    viewNotificationDetails(notification) {
        // Nếu thông báo chưa đọc, đánh dấu đã đọc
        if (!notification.read) {
            this.markAsRead(notification._id);
        }
        
        // Xử lý chuyển hướng nếu có URL
        if (notification.url) {
            window.location.href = notification.url;
            return;
        }
        
        // Hiển thị modal chi tiết thông báo nếu cần
        // Ví dụ: sử dụng SweetAlert2 để hiển thị chi tiết
        Swal.fire({
            title: notification.title,
            html: notification.message,
            icon: 'info',
            confirmButtonText: 'Đóng',
            confirmButtonColor: '#10b981'
        });
    }

    formatDateTime(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Vừa xong';
        }
        
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} phút trước`;
        }
        
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} giờ trước`;
        }
        
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ngày trước`;
        }
        
        // Format: DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
    window.notificationManager.init();
});

// Thêm WebSocket hoặc Server-Sent Events cho real-time notifications (nếu có)
function setupRealtimeNotifications() {
    // Chỉ thiết lập nếu user đã đăng nhập
    const userToken = localStorage.getItem('userToken');
    if (!userToken) return;
    
    try {
        // WebSocket connection
        const ws = new WebSocket(`ws://${window.location.host}/notifications`);
        
        ws.onopen = () => {
            console.log('WebSocket connection established');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
                // Thêm thông báo mới vào đầu danh sách
                window.notificationManager.notifications.unshift(data.notification);
                window.notificationManager.renderNotifications();
                window.notificationManager.updateUnreadCount();
                
                // Hiển thị thông báo nhỏ
                showNotificationToast(data.notification);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Thử kết nối lại sau 5 giây
            setTimeout(setupRealtimeNotifications, 5000);
        };
    } catch (error) {
        console.error('Error setting up real-time notifications:', error);
    }
}

function showNotificationToast(notification) {
    // Sử dụng SweetAlert2 để hiển thị toast notification
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
            toast.addEventListener('click', () => {
                Swal.close();
                window.notificationManager.viewNotificationDetails(notification);
            });
        }
    });
    
    Toast.fire({
        icon: 'info',
        title: notification.title,
        text: notification.message
    });
}

// Thiết lập notifications realtime nếu cần
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ thiết lập nếu user đã đăng nhập
    if (localStorage.getItem('userToken')) {
        setupRealtimeNotifications();
    }
});