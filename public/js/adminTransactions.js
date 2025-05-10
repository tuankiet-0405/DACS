document.addEventListener('DOMContentLoaded', () => {
    // Biến toàn cục lưu trữ dữ liệu giao dịch
    let transactionsData = [];
    
    // Kiểm tra đăng nhập admin
    checkAdminAuth();
    
    // Lấy dữ liệu giao dịch khi trang được tải
    fetchTransactions();
    
    // Lấy thông tin thống kê
    fetchTransactionStats();
    
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
    
    // Hàm lấy dữ liệu giao dịch
    async function fetchTransactions(status = 'all') {
        try {
            const token = localStorage.getItem('adminToken');
            let url = '/api/admin/transactions';
            
            if (status !== 'all') {
                url = `/api/admin/transactions/status/${status}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                transactionsData = data.transactions;
                renderTransactions(transactionsData);
            } else {
                showNotification('error', data.message || 'Lỗi lấy dữ liệu giao dịch');
            }
        } catch (error) {
            console.error('Lỗi lấy dữ liệu giao dịch:', error);
            showNotification('error', 'Đã xảy ra lỗi khi lấy dữ liệu giao dịch.');
        }
    }
    
    // Hàm lấy thông tin thống kê
    async function fetchTransactionStats() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/transactions/stats', {
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
        // Cập nhật tổng doanh thu
        document.querySelector('.stat-card:nth-child(1) p').textContent = formatCurrency(stats.totalRevenue);
        
        // Cập nhật số giao dịch tháng này
        document.querySelector('.stat-card:nth-child(2) p').textContent = stats.monthlyTransactions;
        
        // Cập nhật tỷ lệ tăng trưởng
        const growthElement = document.querySelector('.stat-card:nth-child(3) p');
        growthElement.textContent = `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%`;
        
        // Cập nhật doanh thu tháng
        document.querySelector('.stat-card:nth-child(4) p').textContent = formatCurrency(stats.monthlyRevenue);
    }
    
    // Hàm thiết lập các event listener
    function setupEventListeners() {
        // Xử lý lọc theo trạng thái
        document.querySelectorAll('.filter-item').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelector('.filter-item.active').classList.remove('active');
                filter.classList.add('active');
                const status = filter.getAttribute('data-status');
                fetchTransactions(status);
            });
        });
        
        // Xử lý tìm kiếm
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredTransactions = transactionsData.filter(transaction => {
                const transactionId = transaction.transactionId.toLowerCase();
                const customerName = transaction.customerInfo.name.toLowerCase();
                const carName = transaction.carInfo.name.toLowerCase();
                
                return transactionId.includes(searchTerm) || 
                       customerName.includes(searchTerm) || 
                       carName.includes(searchTerm);
            });
            
            renderTransactions(filteredTransactions);
        });
        
        // Xử lý xuất báo cáo
        document.getElementById('exportBtn').addEventListener('click', exportTransactions);
        
        // Xử lý click button đăng xuất
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/AdminLogin.html';
        });
    }
    
    // Hàm xuất báo cáo giao dịch
    async function exportTransactions() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/transactions/export', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Tạo file Excel hoặc CSV từ dữ liệu
                exportToCSV(data.data, 'bao_cao_giao_dich.csv');
            } else {
                showNotification('error', data.message || 'Lỗi xuất báo cáo');
            }
        } catch (error) {
            console.error('Lỗi xuất báo cáo:', error);
            showNotification('error', 'Đã xảy ra lỗi khi xuất báo cáo.');
        }
    }
    
    // Hàm xuất ra file CSV
    function exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            showNotification('error', 'Không có dữ liệu để xuất');
            return;
        }
        
        // Lấy headers từ object đầu tiên
        const headers = Object.keys(data[0]);
        
        // Tạo nội dung CSV với các giá trị
        let csv = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    // Bọc các giá trị trong dấu ngoặc kép nếu chứa dấu phẩy
                    let cell = row[header] || '';
                    cell = cell.toString().replace(/"/g, '""'); // Escape double quotes
                    
                    if (cell.includes(',') || cell.includes('"') || cell.includes("'") || cell.includes('\n')) {
                        cell = `"${cell}"`;
                    }
                    return cell;
                }).join(',')
            )
        ].join('\n');
        
        // Xử lý để file download có thể chứa tiếng Việt
        const BOM = '\uFEFF'; // UTF-8 BOM
        csv = BOM + csv;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        showNotification('success', 'Xuất báo cáo thành công');
    }
    
    // Hàm hiển thị giao dịch lên bảng
    function renderTransactions(transactions) {
        const tableBody = document.querySelector('.transaction-table tbody');
        tableBody.innerHTML = '';
        
        if (transactions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">Không có dữ liệu giao dịch</td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const startDate = new Date(transaction.bookingDetails.startDate).toLocaleDateString('vi-VN');
            
            // Map trạng thái từ database sang hiển thị
            let statusClass = '';
            let statusText = '';
              switch (transaction.bookingDetails.status) {
                case 'dang_thue':
                    statusClass = 'pending';
                    statusText = 'Đang thuê';
                    break;
                case 'da_tra':
                    statusClass = 'completed';
                    statusText = 'Đã hoàn thành';
                    break;
                case 'da_huy':
                    statusClass = 'cancelled';
                    statusText = 'Đã hủy';
                    break;
                case 'cho_duyet':
                    statusClass = 'pending';
                    statusText = 'Chờ duyệt';
                    break;
                case 'da_duyet':
                    statusClass = 'pending';
                    statusText = 'Đã duyệt';
                    break;
                default:
                    statusClass = 'pending';
                    statusText = transaction.bookingDetails.status;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.transactionId}</td>
                <td>
                    <div class="customer-info">
                        <img src="${transaction.customerInfo.avatar}" alt="Avatar" class="avatar">
                        <div>
                            <p class="customer-name">${transaction.customerInfo.name}</p>
                            <small class="customer-id">${transaction.customerInfo.customerId}</small>
                        </div>
                    </div>
                </td>
                <td>${transaction.carInfo.name}</td>
                <td>${startDate}</td>
                <td>${transaction.bookingDetails.duration}</td>
                <td class="price">${formatCurrency(transaction.bookingDetails.totalPrice)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-view" data-id="${transaction.id}" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-print" data-id="${transaction.id}" title="In hóa đơn">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners for view and print buttons
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => viewTransactionDetail(btn.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.btn-print').forEach(btn => {
            btn.addEventListener('click', () => printInvoice(btn.getAttribute('data-id')));
        });
    }
    
    // Hàm xem chi tiết giao dịch
    async function viewTransactionDetail(id) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/transactions/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                populateTransactionModal(data.transaction);
                openModal();
            } else {
                showNotification('error', data.message || 'Lỗi lấy chi tiết giao dịch');
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết giao dịch:', error);
            showNotification('error', 'Đã xảy ra lỗi khi lấy chi tiết giao dịch.');
        }
    }
    
    // Hàm hiển thị modal chi tiết giao dịch
    function populateTransactionModal(transaction) {
        const modal = document.getElementById('transactionModal');
        
        // Cập nhật tiêu đề
        modal.querySelector('.modal-header h3').textContent = `Chi tiết giao dịch ${transaction.transactionId}`;
        
        // Cập nhật thông tin khách hàng
        const customerSection = modal.querySelector('.detail-section:nth-child(1) .detail-grid');
        customerSection.innerHTML = `
            <div class="detail-item">
                <label>Họ tên:</label>
                <p>${transaction.customerInfo.name}</p>
            </div>
            <div class="detail-item">
                <label>Số điện thoại:</label>
                <p>${transaction.customerInfo.phone}</p>
            </div>
            <div class="detail-item">
                <label>Email:</label>
                <p>${transaction.customerInfo.email}</p>
            </div>
            <div class="detail-item">
                <label>CMND/CCCD:</label>
                <p>${transaction.customerInfo.idCard || 'Chưa cập nhật'}</p>
            </div>
        `;
        
        // Cập nhật thông tin thuê xe
        const startDate = new Date(transaction.bookingDetails.startDate).toLocaleDateString('vi-VN');
        const endDate = new Date(transaction.bookingDetails.endDate).toLocaleDateString('vi-VN');
        const dailyPrice = Math.round(transaction.bookingDetails.totalPrice / transaction.bookingDetails.duration);
        
        const carSection = modal.querySelector('.detail-section:nth-child(2) .detail-grid');
        carSection.innerHTML = `
            <div class="detail-item">
                <label>Xe thuê:</label>
                <p>${transaction.carInfo.name}</p>
            </div>
            <div class="detail-item">
                <label>Biển số:</label>
                <p>${transaction.carInfo.licensePlate || 'N/A'}</p>
            </div>
            <div class="detail-item">
                <label>Ngày bắt đầu:</label>
                <p>${startDate}</p>
            </div>
            <div class="detail-item">
                <label>Ngày kết thúc:</label>
                <p>${endDate}</p>
            </div>
            <div class="detail-item">
                <label>Giá thuê/ngày:</label>
                <p>${formatCurrency(dailyPrice)}</p>
            </div>
            <div class="detail-item">
                <label>Tổng ngày thuê:</label>
                <p>${transaction.bookingDetails.duration}</p>
            </div>
        `;
        
        // Cập nhật chi tiết thanh toán
        const serviceFee = transaction.carInfo.serviceFee || 100000;
        const discount = 100000; // Giả sử giảm giá cố định, có thể điều chỉnh theo logic thực tế
        
        const paymentSection = modal.querySelector('.payment-details');
        paymentSection.innerHTML = `
            <div class="payment-item">
                <span>Giá thuê xe</span>
                <span>${formatCurrency(transaction.bookingDetails.totalPrice - serviceFee + discount)}</span>
            </div>
            <div class="payment-item">
                <span>Phí dịch vụ</span>
                <span>${formatCurrency(serviceFee)}</span>
            </div>
            <div class="payment-item">
                <span>Giảm giá</span>
                <span class="discount">-${formatCurrency(discount)}</span>
            </div>
            <div class="payment-item total">
                <span>Tổng thanh toán</span>
                <span>${formatCurrency(transaction.bookingDetails.totalPrice)}</span>
            </div>
        `;
        
        // Cập nhật lịch sử giao dịch
        renderTransactionTimeline(transaction.timeline);
    }
    
    // Hàm hiển thị timeline của giao dịch
    function renderTransactionTimeline(timeline) {
        const timelineContainer = document.querySelector('.transaction-timeline');
        timelineContainer.innerHTML = '';
        
        // Các trạng thái mặc định nếu không có dữ liệu timeline
        const defaultSteps = [
            { status: 'dat_xe', icon: 'clock', label: 'Đặt xe' },
            { status: 'thanh_toan', icon: 'credit-card', label: 'Thanh toán' },
            { status: 'dang_thue', icon: 'car', label: 'Nhận xe' },
            { status: 'da_tra', icon: 'check-circle', label: 'Hoàn thành' }
        ];
        
        // Sử dụng timeline từ API nếu có, nếu không thì dùng mặc định
        const steps = timeline && timeline.length > 0 ? timeline : defaultSteps;
        
        steps.forEach(step => {
            // Xác định xem bước này đã hoàn thành chưa
            const isActive = timeline && timeline.some(t => t.status === step.status);
            
            const stepIcon = step.icon || getIconForStatus(step.status);
            const stepLabel = step.label || getLabelForStatus(step.status);
            const timestamp = step.timestamp ? new Date(step.timestamp).toLocaleString('vi-VN') : '';
            
            const timelineItem = document.createElement('div');
            timelineItem.className = `timeline-item ${isActive ? 'active' : ''}`;
            timelineItem.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-${stepIcon}"></i>
                </div>
                <div class="timeline-content">
                    <h5>${stepLabel}</h5>
                    <p>${timestamp}</p>
                </div>
            `;
            
            timelineContainer.appendChild(timelineItem);
        });
    }
    
    // Hàm lấy icon cho trạng thái
    function getIconForStatus(status) {
        switch (status) {
            case 'dat_xe': return 'clock';
            case 'thanh_toan': return 'credit-card';
            case 'dang_thue': return 'car';
            case 'da_tra': return 'check-circle';
            case 'da_huy': return 'times-circle';
            default: return 'info-circle';
        }
    }
    
    // Hàm lấy label cho trạng thái
    function getLabelForStatus(status) {
        switch (status) {
            case 'dat_xe': return 'Đặt xe';
            case 'thanh_toan': return 'Thanh toán';
            case 'dang_thue': return 'Nhận xe';
            case 'da_tra': return 'Hoàn thành';
            case 'da_huy': return 'Đã hủy';
            default: return status;
        }
    }
    
    // Hàm in hóa đơn
    function printInvoice(id) {
        // Mở trang in hóa đơn trong cửa sổ mới
        window.open(`/HoaDon.html?id=${id}`, '_blank');
    }
    
    // Hàm mở modal
    function openModal() {
        const modal = document.getElementById('transactionModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Hàm định dạng tiền tệ
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(amount) + 'đ';
    }
    
    // Hàm hiển thị thông báo
    function showNotification(type, message) {
        // Kiểm tra xem đã có notification container chưa
        let notificationContainer = document.querySelector('.notification-container');
        
        // Tạo container nếu chưa có
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Tạo notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            </div>
            <div class="notification-content">${message}</div>
            <button class="notification-close">&times;</button>
        `;
        
        // Thêm vào container
        notificationContainer.appendChild(notification);
        
        // Xử lý nút đóng
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Tự động đóng sau 5 giây
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('hide');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
});
