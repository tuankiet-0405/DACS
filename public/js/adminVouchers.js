document.addEventListener('DOMContentLoaded', () => {
    // Biến toàn cục lưu trữ dữ liệu voucher
    let vouchersData = [];
    let editingVoucherId = null;
    
    // Kiểm tra đăng nhập admin
    checkAdminAuth();
    
    // Lấy dữ liệu voucher khi trang được tải
    fetchVouchers();
    
    // Lấy thông tin thống kê
    fetchVoucherStats();
    
    // Thiết lập các event listener
    setupEventListeners();
    
    // Hàm kiểm tra xác thực Admin
    async function checkAdminAuth() {
        try {
            const token = localStorage.getItem('adminToken');
            
            if (!token) {
                window.location.href = '/AdminLogin.html';
                return;
            }
            
            // Có thể thêm logic kiểm tra token hợp lệ nếu cần
        } catch (error) {
            console.error('Lỗi kiểm tra xác thực:', error);
            window.location.href = '/AdminLogin.html';
        }
    }
    
    // Hàm lấy dữ liệu voucher
    async function fetchVouchers(status = 'all') {
        try {
            const token = localStorage.getItem('adminToken');
            let url = '/api/admin/vouchers';
            
            if (status !== 'all') {
                url = `/api/admin/vouchers/status/${status}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                vouchersData = data.vouchers;
                renderVouchers(vouchersData);
            } else {
                showNotification('error', data.message || 'Lỗi lấy dữ liệu voucher');
            }
        } catch (error) {
            console.error('Lỗi lấy dữ liệu voucher:', error);
            showNotification('error', 'Đã xảy ra lỗi khi lấy dữ liệu voucher.');
        }
    }
    
    // Hàm lấy thông tin thống kê
    async function fetchVoucherStats() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/vouchers/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                updateStatCards(data.stats);
            } else {
                console.error('Lỗi lấy thông tin thống kê:', data.message);
            }
        } catch (error) {
            console.error('Lỗi lấy thông tin thống kê:', error);
        }
    }
    
    // Hàm cập nhật thẻ thống kê
    function updateStatCards(stats) {
        // Cập nhật tổng voucher
        document.querySelector('.stat-card:nth-child(1) p').textContent = stats.totalVouchers;
        
        // Cập nhật số voucher đang hoạt động
        document.querySelector('.stat-card:nth-child(2) p').textContent = stats.activeVouchers;
        
        // Cập nhật số voucher sắp hết hạn
        document.querySelector('.stat-card:nth-child(3) p').textContent = stats.expiringVouchers;
        
        // Cập nhật số lượng đã sử dụng
        document.querySelector('.stat-card:nth-child(4) p').textContent = stats.totalUsed;
    }
    
    // Hàm thiết lập các event listener
    function setupEventListeners() {
        // Xử lý lọc theo trạng thái
        document.querySelectorAll('.filter-item').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelector('.filter-item.active').classList.remove('active');
                filter.classList.add('active');
                const status = filter.getAttribute('data-status');
                fetchVouchers(status);
            });
        });
        
        // Xử lý tìm kiếm
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredVouchers = vouchersData.filter(voucher => {
                return voucher.code.toLowerCase().includes(searchTerm) || 
                       (voucher.description && voucher.description.toLowerCase().includes(searchTerm));
            });
            
            renderVouchers(filteredVouchers);
        });
        
        // Xử lý mở modal tạo voucher
        document.getElementById('addVoucherBtn').addEventListener('click', () => {
            resetVoucherForm();
            document.querySelector('#voucherModal .modal-header h3').textContent = 'Tạo voucher mới';
            openModal();
        });
        
        // Xử lý đóng modal
        document.querySelector('.btn-close').addEventListener('click', closeModal);
        
        // Xử lý nút hủy trong modal
        document.querySelector('.modal-footer .btn-secondary').addEventListener('click', closeModal);
        
        // Xử lý submit form
        document.getElementById('voucherForm').addEventListener('submit', handleFormSubmit);
        
        // Xử lý click button đăng xuất
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/AdminLogin.html';
        });
    }
    
    // Hàm xử lý submit form
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Lấy dữ liệu từ form
        const form = document.getElementById('voucherForm');
        const discountType = form.querySelector('input[name="discountType"]:checked').value;
        const code = form.querySelector('input[placeholder="Ví dụ: SUMMER2025"]').value;
        const value = Number(form.querySelector('input[placeholder="Nhập giá trị giảm"]').value);
        const minOrderValue = Number(form.querySelector('input[placeholder="Giá trị đơn hàng tối thiểu"]').value);
        const dateInputs = form.querySelectorAll('input[type="datetime-local"]');
        const startDate = dateInputs[0].value;
        const endDate = dateInputs[1].value;
        const quantity = Number(form.querySelector('input[placeholder="Số lượng voucher"]').value);
        const maxUsePerUser = Number(form.querySelector('input[placeholder="Số lần sử dụng tối đa"]').value);
        const description = form.querySelector('textarea').value;
        
        // Thêm loading state
        const submitBtn = form.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        
        try {
            const token = localStorage.getItem('adminToken');
            const url = editingVoucherId 
                ? `/api/admin/vouchers/${editingVoucherId}` 
                : '/api/admin/vouchers';
            const method = editingVoucherId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code,
                    description,
                    discountType,
                    value,
                    minOrderValue,
                    startDate,
                    endDate,
                    quantity,
                    maxUsePerUser
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('success', editingVoucherId 
                    ? 'Cập nhật voucher thành công' 
                    : 'Tạo voucher mới thành công');
                    
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Đã lưu';
                
                // Làm mới dữ liệu
                fetchVouchers();
                fetchVoucherStats();
                
                // Đóng modal sau khi lưu
                setTimeout(() => {
                    closeModal();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Lưu';
                }, 1000);
            } else {
                showNotification('error', result.message || 'Có lỗi xảy ra');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Lưu';
            }
        } catch (error) {
            console.error('Lỗi khi lưu voucher:', error);
            showNotification('error', 'Đã xảy ra lỗi khi lưu voucher');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Lưu';
        }
    }
    
    // Hàm hiển thị voucher lên grid
    function renderVouchers(vouchers) {
        const voucherGrid = document.querySelector('.voucher-grid');
        voucherGrid.innerHTML = '';
        
        if (vouchers.length === 0) {
            voucherGrid.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-ticket-alt"></i>
                    <p>Không có voucher nào</p>
                </div>
            `;
            return;
        }
        
        vouchers.forEach(voucher => {
            // Format dates nicely
            const startDate = new Date(voucher.startDate).toLocaleDateString('vi-VN');
            const endDate = new Date(voucher.endDate).toLocaleDateString('vi-VN');
            
            // Determine status class and text
            let statusClass = '';
            let statusText = '';
            
            switch (voucher.status) {
                case 'active':
                    statusClass = 'active';
                    statusText = 'Đang hoạt động';
                    break;
                case 'scheduled':
                    statusClass = 'scheduled';
                    statusText = 'Sắp diễn ra';
                    break;
                case 'expired':
                    statusClass = 'expired';
                    statusText = 'Đã hết hạn';
                    break;
                case 'sold_out':
                    statusClass = 'expired';
                    statusText = 'Đã hết lượt';
                    break;
                default:
                    statusClass = '';
                    statusText = voucher.status;
            }
            
            // Format value display
            const valueDisplay = voucher.discountType === 'percentage' 
                ? `${voucher.value}%` 
                : formatCurrency(voucher.value);
                
            // Format usage count
            const usageDisplay = voucher.quantity > 0 
                ? `${voucher.used}/${voucher.quantity}` 
                : 'Không giới hạn';
            
            const card = document.createElement('div');
            card.className = 'voucher-card';
            card.innerHTML = `
                <div class="voucher-header">
                    <div class="voucher-type">${voucher.discountType === 'percentage' ? 'Giảm giá phần trăm' : 'Giảm giá trực tiếp'}</div>
                    <div class="voucher-value">${valueDisplay}</div>
                    <div class="voucher-code" title="Click để sao chép" data-code="${voucher.code}">${voucher.code}</div>
                </div>
                <div class="voucher-body">
                    <div class="voucher-info">
                        <div class="info-item">
                            <span class="info-label">Điều kiện:</span>
                            <span class="info-value">${voucher.condition || 'Không có'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Thời gian:</span>
                            <span class="info-value">${startDate} - ${endDate}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Số lượng:</span>
                            <span class="info-value">${usageDisplay}</span>
                        </div>
                    </div>
                </div>
                <div class="voucher-footer">
                    <div class="voucher-status">
                        <span class="status-dot ${statusClass}"></span>
                        <span>${statusText}</span>
                    </div>
                    <div class="voucher-actions">
                        <button class="btn-action btn-edit" title="Chỉnh sửa" data-id="${voucher.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Xóa" data-id="${voucher.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            voucherGrid.appendChild(card);
        });
        
        // Add event listeners for buttons after rendering
        addVoucherCardEventListeners();
    }
    
    // Hàm thêm sự kiện cho các card voucher sau khi render
    function addVoucherCardEventListeners() {
        // Copy voucher code
        document.querySelectorAll('.voucher-code').forEach(codeElement => {
            codeElement.addEventListener('click', () => {
                const code = codeElement.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = codeElement.textContent;
                    codeElement.textContent = 'Đã sao chép!';
                    setTimeout(() => {
                        codeElement.textContent = originalText;
                    }, 1500);
                });
            });
        });
        
        // Edit voucher
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const voucherId = btn.getAttribute('data-id');
                await editVoucher(voucherId);
            });
        });
        
        // Delete voucher
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const voucherId = btn.getAttribute('data-id');
                confirmDeleteVoucher(voucherId);
            });
        });
    }
    
    // Hàm mở form chỉnh sửa voucher
    async function editVoucher(id) {
        try {
            editingVoucherId = id;
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/vouchers/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const voucher = data.voucher;
                populateVoucherForm(voucher);
                document.querySelector('#voucherModal .modal-header h3').textContent = 'Chỉnh sửa voucher';
                openModal();
            } else {
                showNotification('error', data.message || 'Không thể tải thông tin voucher');
            }
        } catch (error) {
            console.error('Lỗi khi tải thông tin voucher:', error);
            showNotification('error', 'Đã xảy ra lỗi khi tải thông tin voucher');
        }
    }
    
    // Hàm điền dữ liệu voucher vào form
    function populateVoucherForm(voucher) {
        const form = document.getElementById('voucherForm');
        
        // Set discount type
        const discountTypeInputs = form.querySelectorAll('input[name="discountType"]');
        discountTypeInputs.forEach(input => {
            input.checked = input.value === voucher.discountType;
        });
        
        // Set other fields
        form.querySelector('input[placeholder="Ví dụ: SUMMER2025"]').value = voucher.code;
        form.querySelector('input[placeholder="Nhập giá trị giảm"]').value = voucher.value;
        
        // Set minimum order value
        const conditionMatch = voucher.condition && voucher.condition.match(/Đơn hàng tối thiểu: (\d+,*\d*)đ/);
        form.querySelector('input[placeholder="Giá trị đơn hàng tối thiểu"]').value = 
            conditionMatch ? conditionMatch[1].replace(/,/g, '') : '';
        
        // Set dates
        const dateInputs = form.querySelectorAll('input[type="datetime-local"]');
        dateInputs[0].value = formatDateTimeForInput(voucher.startDate);
        dateInputs[1].value = formatDateTimeForInput(voucher.endDate);
        
        // Set quantity
        form.querySelector('input[placeholder="Số lượng voucher"]').value = voucher.quantity;
        
        // Set max use per user
        const maxUseMatch = voucher.condition && voucher.condition.match(/Giới hạn (\d+) lần\/người dùng/);
        form.querySelector('input[placeholder="Số lần sử dụng tối đa"]').value = 
            maxUseMatch ? maxUseMatch[1] : '1';
        
        // Set description
        form.querySelector('textarea').value = voucher.description;
        
        // Update placeholder for value input based on discount type
        const valueInput = form.querySelector('input[placeholder="Nhập giá trị giảm"]');
        if (voucher.discountType === 'percentage') {
            valueInput.setAttribute('max', '100');
            valueInput.setAttribute('placeholder', 'Nhập % giảm giá (1-100)');
        } else {
            valueInput.removeAttribute('max');
            valueInput.setAttribute('placeholder', 'Nhập giá trị giảm');
        }
    }
    
    // Hàm format date cho input datetime-local
    function formatDateTimeForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }
    
    // Hàm xác nhận xóa voucher
    function confirmDeleteVoucher(id) {
        if (confirm('Bạn có chắc muốn xóa voucher này?')) {
            deleteVoucher(id);
        }
    }
    
    // Hàm xóa voucher
    async function deleteVoucher(id) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/vouchers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('success', 'Xóa voucher thành công');
                // Refresh data
                fetchVouchers();
                fetchVoucherStats();
            } else {
                showNotification('error', data.message || 'Không thể xóa voucher');
            }
        } catch (error) {
            console.error('Lỗi khi xóa voucher:', error);
            showNotification('error', 'Đã xảy ra lỗi khi xóa voucher');
        }
    }
    
    // Hàm reset form
    function resetVoucherForm() {
        editingVoucherId = null;
        const form = document.getElementById('voucherForm');
        
        // Reset radio buttons
        form.querySelector('input[value="fixed"]').checked = true;
        
        // Reset text fields
        form.querySelector('input[placeholder="Ví dụ: SUMMER2025"]').value = '';
        form.querySelector('input[placeholder="Nhập giá trị giảm"]').value = '';
        form.querySelector('input[placeholder="Giá trị đơn hàng tối thiểu"]').value = '';
        
        // Reset date fields
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const dateInputs = form.querySelectorAll('input[type="datetime-local"]');
        dateInputs[0].value = formatDateTimeForInput(today);
        dateInputs[1].value = formatDateTimeForInput(nextWeek);
        
        // Reset quantity fields
        form.querySelector('input[placeholder="Số lượng voucher"]').value = '100';
        form.querySelector('input[placeholder="Số lần sử dụng tối đa"]').value = '1';
        
        // Reset description
        form.querySelector('textarea').value = '';
    }
    
    // Hàm mở modal
    function openModal() {
        document.getElementById('voucherModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Hàm đóng modal
    function closeModal() {
        document.getElementById('voucherModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Hàm định dạng tiền tệ
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(amount) + 'đ';
    }
    
    // Hiển thị thông báo
    function showNotification(type, message) {
        // Check if notifications container exists
        let container = document.querySelector('.notifications-container');
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add notification content
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            </div>
            <div class="notification-content">
                <h4>${type === 'success' ? 'Thành công' : 'Lỗi'}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        container.appendChild(notification);
        
        // Add event listener to close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('hiding');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('hiding');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
});
