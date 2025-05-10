// Hàm kiểm tra kết nối internet
function checkInternetConnection() {
    return navigator.onLine;
}

// Định kỳ kiểm tra kết nối internet và hiển thị thông báo
function startConnectionMonitoring() {
    // Kiểm tra ban đầu
    updateConnectionStatus();
    
    // Cài đặt interval để kiểm tra liên tục
    setInterval(updateConnectionStatus, 10000); // Kiểm tra mỗi 10 giây
}

// Hiển thị trạng thái kết nối
function updateConnectionStatus() {
    const isOnline = checkInternetConnection();
    const statusIndicator = document.getElementById('connection-status');
    
    if (statusIndicator) {
        if (isOnline) {
            statusIndicator.textContent = 'Online';
            statusIndicator.style.color = '#10b981';
            statusIndicator.style.backgroundColor = '#ecfdf5';
        } else {
            statusIndicator.textContent = 'Offline';
            statusIndicator.style.color = '#ef4444';
            statusIndicator.style.backgroundColor = '#fef2f2';
        }
    }
}

// Khi tải trang, thêm indicator trạng thái kết nối
document.addEventListener('DOMContentLoaded', function() {
    // Tạo phần tử hiển thị trạng thái kết nối
    const connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.style.position = 'fixed';
    connectionStatus.style.top = '10px';
    connectionStatus.style.right = '10px';
    connectionStatus.style.padding = '5px 10px';
    connectionStatus.style.borderRadius = '4px';
    connectionStatus.style.fontSize = '12px';
    connectionStatus.style.fontWeight = 'bold';
    connectionStatus.style.zIndex = '9999';
    document.body.appendChild(connectionStatus);
    
    // Bắt đầu giám sát kết nối
    startConnectionMonitoring();
    
    // Thêm listeners cho sự kiện online/offline
    window.addEventListener('online', function() {
        updateConnectionStatus();
        
        // Hiển thị thông báo đã kết nối lại
        Swal.fire({
            icon: 'success',
            title: 'Đã kết nối lại internet',
            text: 'Hệ thống sẽ tự động đồng bộ các thông báo đang chờ.',
            timer: 3000,
            showConfirmButton: false
        });
        
        // Đồng bộ thông báo đang chờ
        syncPendingNotifications();
    });
    
    window.addEventListener('offline', function() {
        updateConnectionStatus();
        
        // Hiển thị thông báo mất kết nối
        Swal.fire({
            icon: 'warning',
            title: 'Mất kết nối internet',
            text: 'Các thao tác vẫn hoạt động và sẽ được đồng bộ khi có kết nối.',
            timer: 3000,
            showConfirmButton: false
        });
    });
});
