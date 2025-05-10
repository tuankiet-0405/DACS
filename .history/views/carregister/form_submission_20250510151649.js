// Form submission handler for car registration

/**
 * Submits the car registration form with progress tracking
 * @param {FormData} formData - The form data to submit
 * @param {string} token - Authentication token
 * @returns {Promise} - Promise resolving to the submission result
 */
async function submitCarRegistration(formData, token) {
    // Show submission progress
    Swal.fire({
        title: 'Đang xử lý...',
        html: `
            <div class="upload-progress">
                <p class="progress-status" id="uploadStatus">Đang chuẩn bị dữ liệu...</p>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="uploadProgressBar" style="width: 0%;"></div>
                </div>
                <p class="progress-percentage" id="uploadPercentage">0%</p>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            simulateUploadProgress();
        }
    });    try {
        // Debug: Log form data fields being sent
        console.log('FormData fields being sent to server:');
        let missingRequiredFields = [];
        const requiredFields = ['brand', 'model', 'year', 'seats', 'transmission', 'fuel', 
                              'license_plate', 'price_per_day', 'location'];
        
        // Check all required fields
        for (const field of requiredFields) {
            let hasField = false;
            for (let [key, value] of formData.entries()) {
                if (key === field) {
                    hasField = true;
                    if (!value || value.trim() === '') {
                        console.warn(`Required field ${field} has empty value`);
                        missingRequiredFields.push(field);
                    } else {
                        console.log(`${key}: ${value}`);
                    }
                    break;
                }
            }
            if (!hasField) {
                console.warn(`Required field ${field} is missing`);
                missingRequiredFields.push(field);
            }
        }
        
        // Log all other fields
        for (let [key, value] of formData.entries()) {
            if (!requiredFields.includes(key)) {
                if (value instanceof File) {
                    console.log(`${key}: File - ${value.name} (${value.size} bytes)`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
        }
        
        // Show warning if missing required fields
        if (missingRequiredFields.length > 0) {
            console.error('Missing required fields:', missingRequiredFields);
            updateProgress(0, 'Thiếu thông tin bắt buộc');
            throw new Error(`Thiếu thông tin bắt buộc: ${missingRequiredFields.join(', ')}`);
        }

        // Submit the form
        const response = await axios.post('/api/cars', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });        // Update to 100% when completed
        updateProgress(100, 'Hoàn tất!');

        // Return the response
        return response.data;
    } catch (error) {
        console.error('Error submitting form:', error);
        
        // Enhanced error reporting
        let errorMessage = 'Có lỗi xảy ra khi gửi form';
        let errorDetails = '';
        
        if (error.response) {
            // Server responded with an error status
            console.error('Server error response:', error.response.data);
            errorMessage = error.response.data.message || errorMessage;
            errorDetails = `Status: ${error.response.status} ${error.response.statusText}\n`;
            
            // Log submitted form data for debugging
            console.log('Form data sent (that caused error):');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`${key}: File - ${value.name}`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
            
            // Update progress UI to show error
            updateProgress(0, `Lỗi: ${errorMessage}`);
        } else if (error.request) {
            // Request was made but no response received
            errorMessage = 'Không thể kết nối đến máy chủ';
            errorDetails = 'Vui lòng kiểm tra kết nối mạng và thử lại.';
            updateProgress(0, 'Lỗi kết nối');
        } else {
            // Something else caused the error
            errorMessage = error.message;
            updateProgress(0, 'Lỗi');
        }
        
        throw error;
    }
}

/**
 * Simulate progress updates for better UX
 */
function simulateUploadProgress() {
    const milestones = [
        { progress: 15, message: 'Đang tải lên hình ảnh xe...', time: 1000 },
        { progress: 40, message: 'Đang xử lý hình ảnh...', time: 2000 },
        { progress: 65, message: 'Đang tải lên giấy tờ xe...', time: 3000 },
        { progress: 85, message: 'Đang lưu thông tin xe...', time: 4000 },
        { progress: 95, message: 'Đang hoàn tất...', time: 5000 }
    ];

    milestones.forEach(milestone => {
        setTimeout(() => {
            updateProgress(milestone.progress, milestone.message);
        }, milestone.time);
    });
}

/**
 * Update the progress UI
 * @param {number} percent - Progress percentage
 * @param {string} message - Status message
 */
function updateProgress(percent, message) {
    const progressBar = document.getElementById('uploadProgressBar');
    const progressPercentage = document.getElementById('uploadPercentage');
    const progressStatus = document.getElementById('uploadStatus');
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercentage) progressPercentage.textContent = `${percent}%`;
    if (progressStatus && message) progressStatus.textContent = message;
}

/**
 * Creates a notification for the admin about a new car registration
 * @param {object} carData - Car data
 * @param {object} userData - User data
 * @param {string} newCarId - ID of the newly created car
 * @returns {object} Notification object
 */
function createAdminNotification(carData, userData, newCarId) {
    // Format car details for notification
    const brand = carData.hang_xe;
    const model = carData.model || '';
    const licensePlate = carData.bien_so?.toUpperCase();
    const carColor = carData.mau_xe;
    
    // Format for fuel type
    const fuelType = carData.nhien_lieu;
    const fuelText = fuelType === 'xang' ? 'Xăng' : 
                     fuelType === 'dau' ? 'Dầu' : 
                     fuelType === 'dien' ? 'Điện' : 'Hybrid';
    
    // Format for transmission type
    const transmissionType = carData.hop_so;
    const transmissionText = transmissionType === 'so_san' ? 'Số sàn' : 'Số tự động';
    
    // Create detailed car info
    const carDetails = `${carData.nam_san_xuat}, ${carData.so_cho} chỗ, ${fuelText}, ${transmissionText}`;
    const pricePerDay = formatCurrency(carData.gia_thue);
    
    // Create notification object
    return {
        tieu_de: 'Xe mới cần duyệt',
        noi_dung: `Người dùng ${userData.ten_nguoi_dung || userData.ho_ten || 'Người dùng'} (ID: ${userData.id || ''}) vừa đăng ký xe ${brand} ${model} màu ${carColor} với biển số ${licensePlate}. Thông tin xe: ${carDetails}. Giá thuê: ${pricePerDay} VND/ngày.`,
        loai: 'admin',
        trang_thai: 'chua_doc',
        loai_thong_bao: 'dang_ky_xe',
        lien_ket: `/admin/cars/view/${newCarId}`,
        du_lieu: {
            loai_thong_bao: 'dang_ky_xe',
            id_xe: newCarId,
            id_nguoi_dung: userData.id,
            thong_tin_xe: {
                hang_xe: brand,
                model: model,
                nam_san_xuat: carData.nam_san_xuat,
                bien_so: licensePlate,
                mau_xe: carColor,
                so_cho: carData.so_cho,
                hop_so: transmissionText,
                nhien_lieu: fuelText,
                gia_thue: carData.gia_thue
            },
            thoi_gian: new Date().toISOString()
        }
    };
}

/**
 * Helper function to format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Export functions for use in the main form
window.formSubmission = {
    submitCarRegistration,
    createAdminNotification,
    formatCurrency
};
