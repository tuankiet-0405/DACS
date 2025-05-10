const prepareFormData = () => {
    // Đảm bảo tất cả trường bắt buộc đã được điền
    const formData = new FormData(document.getElementById('carRegisterForm'));
    
    // Log dữ liệu trước khi gửi để debug
    console.log('=== FORM DATA LOG ===');
    const requiredFields = ['brand', 'model', 'year', 'seats', 'transmission', 'fuel', 
        'license_plate', 'price_per_day', 'location'];
    
    requiredFields.forEach(field => {
        const value = formData.get(field);
        console.log(`${field}: ${value || 'MISSING'}`);
        
        // Nếu giá trị trống hoặc chỉ có khoảng trắng
        if (!value || value.toString().trim() === '') {
            // Thử lấy giá trị trực tiếp từ element
            const element = document.getElementById(field);
            if (element) {
                const directValue = element.value;
                console.log(`${field} (từ element trực tiếp): ${directValue || 'MISSING'}`);
                
                // Cố gắng gán lại giá trị
                if (directValue && directValue.trim() !== '') {
                    formData.set(field, directValue);
                    console.log(`${field}: Đã sửa lại thành ${directValue}`);
                }
            }
        }
    });
    
    // Đảm bảo giá trị price_per_day là số hợp lệ và >= 100000
    const price = formData.get('price_per_day');
    if (!price || isNaN(parseInt(price)) || parseInt(price) < 100000) {
        // Đặt giá mặc định nếu không hợp lệ
        const defaultPrice = 100000;
        console.log(`price_per_day không hợp lệ. Đặt lại thành ${defaultPrice}`);
        formData.set('price_per_day', defaultPrice);
    }
    
    console.log('=== END FORM DATA LOG ===');
    
    return formData;
};

// Hàm kiểm tra kết nối internet
function checkInternetConnection() {
    return navigator.onLine;
}

// Hàm lưu thông báo cục bộ khi không có kết nối
function saveNotificationLocally(notification) {
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    localNotifications.push({
        ...notification, 
        createdAt: new Date().toISOString(),
        status: 'pending'
    });
    localStorage.setItem('pendingNotifications', JSON.stringify(localNotifications));
    
    console.log('Đã lưu thông báo cục bộ:', notification);
    return true;
}

// Hàm đồng bộ các thông báo đã lưu cục bộ
async function syncPendingNotifications() {
    if (!checkInternetConnection()) {
        console.log('Không có kết nối internet, không thể đồng bộ thông báo');
        return false;
    }
    
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    
    if (localNotifications.length === 0) {
        console.log('Không có thông báo nào cần đồng bộ');
        return true;
    }
    
    console.log(`Đang đồng bộ ${localNotifications.length} thông báo...`);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Không có token, không thể đồng bộ');
        return false;
    }
    
    let syncedCount = 0;
    const remainingNotifications = [];
    
    for (const notification of localNotifications) {
        try {
            const response = await axios.post('/api/notifications', notification, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                syncedCount++;
            } else {
                remainingNotifications.push(notification);
            }
        } catch (error) {
            console.error('Lỗi khi đồng bộ thông báo:', error);
            remainingNotifications.push(notification);
        }
    }
    
    localStorage.setItem('pendingNotifications', JSON.stringify(remainingNotifications));
    console.log(`Đã đồng bộ ${syncedCount}/${localNotifications.length} thông báo`);
    
    return syncedCount === localNotifications.length;
}

// Hàm gửi thông báo với hỗ trợ offline
async function sendNotificationWithOfflineSupport(notification) {
    if (!checkInternetConnection()) {
        console.log('Không có kết nối internet, lưu thông báo cục bộ');
        return saveNotificationLocally(notification);
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Không có token, không thể gửi thông báo');
        return false;
    }
    
    try {
        const response = await axios.post('/api/notifications', notification, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.success;
    } catch (error) {
        console.error('Lỗi khi gửi thông báo, lưu cục bộ:', error);
        return saveNotificationLocally(notification);
    }
}

// Kiểm tra và đồng bộ các thông báo khi kết nối trở lại
window.addEventListener('online', function() {
    console.log('Kết nối internet đã trở lại, đang đồng bộ thông báo...');
    syncPendingNotifications();
});
