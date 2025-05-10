// Quản lý khách hàng và đơn thuê xe
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập và phân quyền
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const userRole = localStorage.getItem('adminUser') ? JSON.parse(localStorage.getItem('adminUser')).loai_tai_khoan : null;

    if (!token || userRole !== 'admin') {
        window.location.href = '/views/login.html';
        return;
    }

    // Khởi tạo trạng thái ban đầu
    let currentStatus = 'all';
    let bookingsData = [];

    // Lấy các element
    const tableBody = document.querySelector('.rental-table tbody');
    const filterButtons = document.querySelectorAll('.filter-item');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportBtn');
    const statsElements = {
        totalBookings: document.querySelector('.stat-card:nth-child(1) p'),
        renting: document.querySelector('.stat-card:nth-child(2) p'),
        cancelled: document.querySelector('.stat-card:nth-child(3) p'),
        returned: document.querySelector('.stat-card:nth-child(4) p')
    };

    // Lấy dữ liệu thống kê
    fetchBookingStats();

    // Lấy tất cả đơn đặt xe
    fetchBookings('all');

    // Xử lý sự kiện lọc
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const status = button.getAttribute('data-status');
            currentStatus = status;
            
            // Cập nhật giao diện nút lọc
            document.querySelector('.filter-item.active').classList.remove('active');
            button.classList.add('active');
            
            // Lấy dữ liệu theo trạng thái
            fetchBookings(status);
        });
    });

    // Xử lý tìm kiếm
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        filterBookingsBySearch(searchTerm);
    });

    // Xử lý xuất Excel
    exportBtn.addEventListener('click', () => {
        exportToExcel();
    });    // Hàm lấy dữ liệu thống kê
    function fetchBookingStats() {
        fetch('/api/admin/bookings/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu thống kê');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateStatsDisplay(data.data);
            }
        })
        .catch(error => {
            console.error('Error fetching booking stats:', error);
            alert('Đã xảy ra lỗi khi lấy thông tin thống kê');
        });
    }

    // Cập nhật hiển thị thống kê
    function updateStatsDisplay(stats) {
        statsElements.totalBookings.textContent = stats.totalBookings;
        statsElements.renting.textContent = stats.renting;
        statsElements.cancelled.textContent = stats.cancelled;
        statsElements.returned.textContent = stats.returned;
    }

    // Hàm lấy danh sách đơn đặt xe theo trạng thái
    function fetchBookings(status) {
        const url = status === 'all' 
            ? '/api/admin/bookings' 
            : `/api/admin/bookings/status/${status}`;

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu đơn đặt xe');
            }
            return response.json();
        })        .then(data => {
            if (data.success) {
                bookingsData = data.bookings; // Đã sửa từ data.data sang data.bookings theo format mới
                renderBookingsTable(bookingsData);
            }
        })
        .catch(error => {
            console.error('Error fetching bookings:', error);
            alert('Đã xảy ra lỗi khi lấy danh sách đơn đặt xe');
        });
    }

    // Hiển thị dữ liệu lên bảng
    function renderBookingsTable(bookings) {
        tableBody.innerHTML = '';

        if (bookings.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="10" class="text-center">Không có dữ liệu</td>`;
            tableBody.appendChild(noDataRow);
            return;
        }

        bookings.forEach((booking, index) => {
            const row = document.createElement('tr');
            
            // Format tiền tệ
            const formattedPrice = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(booking.bookingDetails.totalPrice);
            
            // Format ngày thuê
            const startDate = new Date(booking.bookingDetails.startDate);
            const formattedDate = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`;
              // Xác định class cho trạng thái
            let statusClass = '';
            let statusText = '';
            
            switch (booking.bookingDetails.status) {
                case 'dang_thue':
                    statusClass = 'active';
                    statusText = 'Đang thuê';
                    break;
                case 'da_tra':
                    statusClass = 'completed';
                    statusText = 'Đã trả';
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
                    statusClass = 'approved';
                    statusText = 'Đã duyệt';
                    break;
                default:
                    statusClass = '';
                    statusText = booking.bookingDetails.status;
            }
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="customer-info">
                        <img src="${booking.customerInfo.avatar}" alt="Avatar" class="avatar">
                        <div>
                            <p class="customer-name">${booking.customerInfo.name}</p>
                            <small class="customer-id">KH${booking.customerInfo.id.toString().padStart(3, '0')}</small>
                        </div>
                    </div>
                </td>
                <td>${formattedDate}</td>
                <td>${booking.bookingDetails.duration}</td>
                <td>${booking.carInfo.name}</td>
                <td>${booking.bookingDetails.quantity}</td>
                <td>${booking.bookingDetails.voucher}</td>
                <td class="price">${formattedPrice}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action" title="Xem chi tiết" data-id="${booking.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });

        // Thêm event listener cho nút xem chi tiết
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.currentTarget.getAttribute('data-id');
                showBookingDetail(bookingId);
            });
        });
    }

    // Lọc đơn đặt xe theo tìm kiếm
    function filterBookingsBySearch(searchTerm) {
        if (!searchTerm) {
            renderBookingsTable(bookingsData);
            return;
        }

        const filteredBookings = bookingsData.filter(booking => {
            return booking.customerInfo.name.toLowerCase().includes(searchTerm) || 
                   `KH${booking.customerInfo.id.toString().padStart(3, '0')}`.toLowerCase().includes(searchTerm) ||
                   booking.carInfo.name.toLowerCase().includes(searchTerm);
        });

        renderBookingsTable(filteredBookings);
    }

    // Hiển thị chi tiết đơn đặt xe
    function showBookingDetail(bookingId) {
        fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể lấy chi tiết đơn đặt xe');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                populateModalWithBookingDetails(data.data);
                document.getElementById('orderModal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        })
        .catch(error => {
            console.error('Error fetching booking details:', error);
            alert('Đã xảy ra lỗi khi lấy chi tiết đơn đặt xe');
        });
    }

    // Điền dữ liệu vào modal
    function populateModalWithBookingDetails(booking) {
        // Thông tin khách hàng
        document.querySelector('.detail-item:nth-child(1) p').textContent = booking.customerInfo.name;
        document.querySelector('.detail-item:nth-child(2) p').textContent = booking.customerInfo.phone || 'Không có';
        document.querySelector('.detail-item:nth-child(3) p').textContent = booking.customerInfo.email;
        document.querySelector('.detail-item:nth-child(4) p').textContent = booking.customerInfo.idCard || 'Không có';

        // Thông tin thuê xe
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(1) p').textContent = booking.carInfo.name;
        
        // Format ngày
        const startDate = new Date(booking.bookingDetails.startDate);
        const endDate = new Date(booking.bookingDetails.endDate);
        const formattedStartDate = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`;
        const formattedEndDate = `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
        
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(2) p').textContent = formattedStartDate;
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(3) p').textContent = formattedEndDate;
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(4) p').textContent = `${booking.bookingDetails.quantity} xe`;
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(5) p').textContent = booking.bookingDetails.voucher !== '-' ? booking.bookingDetails.voucher : 'Không có';
        
        // Format tiền tệ
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(booking.bookingDetails.totalPrice);
        
        document.querySelector('.detail-section:nth-child(2) .detail-item:nth-child(6) p').textContent = formattedPrice;

        // Cập nhật timeline trạng thái
        const timelineContainer = document.querySelector('.status-timeline');
        timelineContainer.innerHTML = '';

        // Luôn có trạng thái đặt xe
        const bookingDate = new Date(booking.bookingDetails.createdAt);
        const formattedBookingDate = `${bookingDate.getDate()}/${bookingDate.getMonth() + 1}/${bookingDate.getFullYear()} ${bookingDate.getHours()}:${bookingDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Tạo item timeline cho trạng thái đặt xe
        const bookingTimeline = document.createElement('div');
        bookingTimeline.className = 'timeline-item active';
        bookingTimeline.innerHTML = `
            <div class="timeline-icon">
                <i class="fas fa-clipboard-check"></i>
            </div>
            <div class="timeline-content">
                <h5>Đặt xe</h5>
                <p>${formattedBookingDate}</p>
            </div>
        `;
        timelineContainer.appendChild(bookingTimeline);

        // Tạo timeline cho trạng thái hiện tại
        if (booking.bookingDetails.status === 'renting') {
            const rentingTimeline = document.createElement('div');
            rentingTimeline.className = 'timeline-item active';
            rentingTimeline.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-car"></i>
                </div>
                <div class="timeline-content">
                    <h5>Đang thuê</h5>
                    <p>${formattedStartDate}</p>
                </div>
            `;
            timelineContainer.appendChild(rentingTimeline);
        } else if (booking.bookingDetails.status === 'returned') {
            // Thêm cả đang thuê và đã trả
            const rentingTimeline = document.createElement('div');
            rentingTimeline.className = 'timeline-item active';
            rentingTimeline.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-car"></i>
                </div>
                <div class="timeline-content">
                    <h5>Đang thuê</h5>
                    <p>${formattedStartDate}</p>
                </div>
            `;
            timelineContainer.appendChild(rentingTimeline);

            const updatedDate = new Date(booking.bookingDetails.updatedAt);
            const formattedUpdatedDate = `${updatedDate.getDate()}/${updatedDate.getMonth() + 1}/${updatedDate.getFullYear()} ${updatedDate.getHours()}:${updatedDate.getMinutes().toString().padStart(2, '0')}`;
            
            const returnedTimeline = document.createElement('div');
            returnedTimeline.className = 'timeline-item active';
            returnedTimeline.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="timeline-content">
                    <h5>Đã trả</h5>
                    <p>${formattedUpdatedDate}</p>
                </div>
            `;
            timelineContainer.appendChild(returnedTimeline);
        } else if (booking.bookingDetails.status === 'cancelled') {
            const updatedDate = new Date(booking.bookingDetails.updatedAt);
            const formattedUpdatedDate = `${updatedDate.getDate()}/${updatedDate.getMonth() + 1}/${updatedDate.getFullYear()} ${updatedDate.getHours()}:${updatedDate.getMinutes().toString().padStart(2, '0')}`;
            
            const cancelledTimeline = document.createElement('div');
            cancelledTimeline.className = 'timeline-item active';
            cancelledTimeline.innerHTML = `
                <div class="timeline-icon">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="timeline-content">
                    <h5>Hủy đơn</h5>
                    <p>${formattedUpdatedDate}</p>
                </div>
            `;
            timelineContainer.appendChild(cancelledTimeline);
        }

        // Thêm nút để cập nhật trạng thái nếu chưa là đã trả hoặc đã hủy
        const modalFooter = document.querySelector('.modal-footer');
        modalFooter.innerHTML = '';

        if (booking.bookingDetails.status === 'renting') {
            const markReturnedBtn = document.createElement('button');
            markReturnedBtn.className = 'btn-primary';
            markReturnedBtn.textContent = 'Đánh dấu đã trả';
            markReturnedBtn.addEventListener('click', () => {
                updateBookingStatus(booking.id, 'returned');
            });
            modalFooter.appendChild(markReturnedBtn);

            const markCancelledBtn = document.createElement('button');
            markCancelledBtn.className = 'btn-danger';
            markCancelledBtn.textContent = 'Hủy đơn';
            markCancelledBtn.addEventListener('click', () => {
                updateBookingStatus(booking.id, 'cancelled');
            });
            modalFooter.appendChild(markCancelledBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-secondary';
        closeBtn.textContent = 'Đóng';
        closeBtn.addEventListener('click', closeModal);
        modalFooter.appendChild(closeBtn);
    }

    // Cập nhật trạng thái đơn đặt xe
    function updateBookingStatus(bookingId, newStatus) {
        fetch(`/api/admin/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể cập nhật trạng thái');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Cập nhật trạng thái thành công');
                closeModal();
                
                // Cập nhật lại dữ liệu
                fetchBookingStats();
                fetchBookings(currentStatus);
            }
        })
        .catch(error => {
            console.error('Error updating booking status:', error);
            alert('Đã xảy ra lỗi khi cập nhật trạng thái đơn đặt xe');
        });
    }

    // Đóng modal
    function closeModal() {
        document.getElementById('orderModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    // Hàm xuất Excel
    function exportToExcel() {
        // Tạo dữ liệu xuất Excel
        let dataToExport = [];
        
        bookingsData.forEach((booking, index) => {
            // Format ngày thuê
            const startDate = new Date(booking.bookingDetails.startDate);
            const formattedDate = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`;
            
            // Xác định trạng thái
            let statusText = '';
            switch (booking.bookingDetails.status) {
                case 'renting':
                    statusText = 'Đang thuê';
                    break;
                case 'returned':
                    statusText = 'Đã trả';
                    break;
                case 'cancelled':
                    statusText = 'Đã hủy';
                    break;
                default:
                    statusText = booking.bookingDetails.status;
            }
            
            dataToExport.push({
                'STT': index + 1,
                'Khách hàng': booking.customerInfo.name,
                'Mã KH': `KH${booking.customerInfo.id.toString().padStart(3, '0')}`,
                'Email': booking.customerInfo.email,
                'Ngày thuê': formattedDate,
                'Thời gian': booking.bookingDetails.duration,
                'Xe': booking.carInfo.name,
                'Số lượng': booking.bookingDetails.quantity,
                'Voucher': booking.bookingDetails.voucher,
                'Tổng tiền': booking.bookingDetails.totalPrice,
                'Trạng thái': statusText
            });
        });
        
        if (dataToExport.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }
        
        // Tạo workbook mới
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachDonThueXe');
        
        // Định dạng độ rộng cột
        const colWidths = [
            { wch: 5 },  // STT
            { wch: 20 }, // Khách hàng
            { wch: 10 }, // Mã KH
            { wch: 30 }, // Email
            { wch: 12 }, // Ngày thuê
            { wch: 12 }, // Thời gian
            { wch: 15 }, // Xe
            { wch: 10 }, // Số lượng
            { wch: 15 }, // Voucher
            { wch: 15 }, // Tổng tiền
            { wch: 15 }  // Trạng thái
        ];
        worksheet['!cols'] = colWidths;
        
        // Xuất file
        const now = new Date();
        const fileName = `DanhSachDonThueXe_${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }
});
