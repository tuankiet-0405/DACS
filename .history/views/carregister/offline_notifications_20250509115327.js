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

// Hàm lưu thông báo vào localStorage khi không có internet
function saveNotificationLocally(notification) {
    try {
        const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        localNotifications.push({
            ...notification, 
            createdAt: new Date().toISOString(),
            status: 'pending'
        });
        localStorage.setItem('pendingNotifications', JSON.stringify(localNotifications));
        
        console.log('Đã lưu thông báo cục bộ:', notification);
        return true;
    } catch (error) {
        console.error('Lỗi khi lưu thông báo cục bộ:', error);
        return false;
    }
}

// Hàm đồng bộ thông báo với server khi có internet
async function syncPendingNotifications() {
    if (!checkInternetConnection()) return false;
    
    const localNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
    if (localNotifications.length === 0) return true;
    
    let syncedCount = 0;
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('Không có token để đồng bộ thông báo');
        return false;
    }
    
    console.log(`Bắt đầu đồng bộ ${localNotifications.length} thông báo đang chờ`);
    
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
                console.log(`Đã đồng bộ thông báo ${syncedCount}/${localNotifications.length}`);
            } else {
                console.error('Lỗi khi đồng bộ thông báo:', response.data.message);
                break;
            }
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
    try {
        if (checkInternetConnection()) {
            try {
                // Thử đồng bộ các thông báo đang chờ
                await syncPendingNotifications();
                
                // Gửi thông báo hiện tại
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Không tìm thấy token xác thực');
                }
                
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
                    const saved = saveNotificationLocally(notification);
                    
                    if (saved) {
                        // Thông báo cho người dùng
                        Swal.fire({
                            icon: 'info',
                            title: 'Lưu thông báo offline',
                            text: 'Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
                            confirmButtonText: 'Đã hiểu'
                        });
                        
                        return { success: true, offline: true, message: 'Thông báo đã được lưu offline' };
                    } else {
                        throw new Error('Không thể lưu thông báo offline');
                    }
                }
                
                throw error;
            }
        } else {
            // Không có kết nối internet
            const saved = saveNotificationLocally(notification);
            
            if (saved) {
                // Thông báo cho người dùng
                Swal.fire({
                    icon: 'info',
                    title: 'Lưu thông báo offline',
                    text: 'Không có kết nối internet. Thông báo đăng ký xe đã được lưu offline và sẽ tự động gửi khi có kết nối internet.',
                    confirmButtonText: 'Đã hiểu'
                });
                
                return { success: true, offline: true, message: 'Thông báo đã được lưu offline' };
            } else {
                throw new Error('Không thể lưu thông báo offline');
            }
        }
    } catch (error) {
        console.error('Lỗi trong quá trình xử lý thông báo:', error);
        return { success: false, message: error.message || 'Lỗi không xác định khi gửi thông báo' };
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
