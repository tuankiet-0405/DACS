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
    });

    try {
        // Log form data fields being sent
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
        
        // If any required fields are missing, show error
        if (missingRequiredFields.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Thông tin không đầy đủ',
                html: `
                    <p>Vui lòng điền đầy đủ các trường sau:</p>
                    <ul style="text-align: left; margin-top: 1rem;">
                        ${missingRequiredFields.map(field => `<li>${getFieldLabel(field)}</li>`).join('')}
                    </ul>
                `,
                confirmButtonColor: '#10b981'
            });
            return { success: false, message: 'Missing required fields' };
        }

        // Make API request to register car
        const response = await fetch('/api/cars/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // Parse response
        const result = await response.json();
        
        // Update progress to complete
        updateUploadProgress(100, 'Hoàn thành', 'Đã hoàn thành');
        
        // Close progress dialog after a short delay
        setTimeout(() => {
            Swal.close();
            
            // Show success or error message
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Đăng ký thành công!',
                    html: `
                        <p>${result.message || 'Xe của bạn đã được đăng ký thành công và đang chờ duyệt.'}</p>
                        <p class="mt-4 text-sm text-gray-500">Mã đăng ký: <strong>${result.data?.id || 'N/A'}</strong></p>
                    `,
                    confirmButtonColor: '#10b981',
                    confirmButtonText: 'Xem xe của tôi',
                    showCancelButton: true,
                    cancelButtonText: 'Đăng ký xe khác'
                }).then((action) => {
                    if (action.isConfirmed) {
                        // Redirect to my cars page
                        window.location.href = '/views/mycars.html';
                    } else {
                        // Reload current page to register another car
                        window.location.reload();
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Đăng ký thất bại',
                    html: `
                        <p>${result.message || 'Đã xảy ra lỗi khi đăng ký xe. Vui lòng thử lại sau.'}</p>
                    `,
                    confirmButtonColor: '#10b981'
                });
            }
        }, 1000);
        
        return result;
    } catch (error) {
        console.error('Error submitting form:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi kết nối',
            text: 'Đã xảy ra lỗi khi gửi form. Vui lòng kiểm tra kết nối internet và thử lại.',
            confirmButtonColor: '#10b981'
        });
        
        return { success: false, message: error.message };
    }
}

/**
 * Simulates upload progress for better UX
 */
function simulateUploadProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        // Increment progress
        progress += Math.random() * 5;
        if (progress > 90) {
            clearInterval(interval);
            return;
        }
        
        // Update progress bar and text
        updateUploadProgress(progress, 'Đang tải lên...', 'Đang xử lý...');
    }, 300);
}

/**
 * Updates the upload progress UI
 * @param {number} progress - Current progress percentage
 * @param {string} status - Status text to display
 * @param {string} description - Detailed status description
 */
function updateUploadProgress(progress, status, description) {
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadPercentage');
    const statusText = document.getElementById('uploadStatus');
    
    if (progressBar && progressText && statusText) {
        const roundedProgress = Math.min(Math.round(progress), 100);
        progressBar.style.width = `${roundedProgress}%`;
        progressText.textContent = `${roundedProgress}%`;
        statusText.textContent = description || status;
    }
}

/**
 * Gets a readable label for a form field
 * @param {string} fieldName - The field name
 * @returns {string} - Human-readable field label
 */
function getFieldLabel(fieldName) {
    const labels = {
        'brand': 'Hãng xe',
        'model': 'Mẫu xe',
        'year': 'Năm sản xuất',
        'seats': 'Số chỗ ngồi',
        'transmission': 'Hộp số',
        'fuel': 'Nhiên liệu',
        'license_plate': 'Biển số xe',
        'price_per_day': 'Giá thuê/ngày',
        'location': 'Địa chỉ xe'
    };
    
    return labels[fieldName] || fieldName;
}

/**
 * Formats a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Export functions for use in other files
window.formSubmission = {
    submitCarRegistration,
    formatCurrency,
    updateUploadProgress
};
