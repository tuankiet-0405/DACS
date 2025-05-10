document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xác thực Admin khi trang được tải
    checkAdminAuth();
    
    // Khởi tạo trang
    initializeUsersPage();

    // Xử lý form thêm/sửa người dùng
    setupUserForm();

    // Xử lý các nút thao tác
    setupActionButtons();
});

// Hàm khởi tạo trang
async function initializeUsersPage() {
    try {
        // Lấy thống kê người dùng
        await fetchUserStats();
        
        // Lấy danh sách người dùng
        await fetchUsers();
    } catch (error) {
        console.error('Lỗi khi khởi tạo trang:', error);
        showToast('Đã xảy ra lỗi khi tải dữ liệu', 'error');
    }
}

// Lấy thống kê người dùng
async function fetchUserStats() {
    try {
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch('/api/admin/users/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStatsUI(data.data);
        } else {
            showToast(data.message || 'Không thể lấy thống kê người dùng', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi lấy thống kê:', error);
        showToast('Đã xảy ra lỗi khi lấy thống kê người dùng', 'error');
    }
}

// Cập nhật UI thống kê người dùng
function updateStatsUI(stats) {
    const totalUsersElement = document.querySelector('.stat-card:nth-child(1) p');
    const adminCountElement = document.querySelector('.stat-card:nth-child(2) p');
    const userCountElement = document.querySelector('.stat-card:nth-child(3) p');
    
    if (totalUsersElement) totalUsersElement.textContent = stats.totalUsers;
    if (adminCountElement) adminCountElement.textContent = stats.adminCount;
    if (userCountElement) userCountElement.textContent = stats.userCount;
}

// Lấy danh sách người dùng
async function fetchUsers() {
    try {
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Xóa dataTable hiện tại nếu có
            if ($.fn.DataTable.isDataTable('#userTable')) {
                $('#userTable').DataTable().destroy();
            }
            
            // Xóa dữ liệu cũ trong tbody
            $('#userTable tbody').empty();
            
            // Thêm dữ liệu mới
            populateUserTable(data.data);
            
            // Khởi tạo DataTable
            $('#userTable').DataTable({
                language: {
                    search: "Tìm kiếm:",
                    lengthMenu: "Hiển thị _MENU_ dòng",
                    zeroRecords: "Không tìm thấy kết quả nào",
                    info: "Hiển thị từ _START_ đến _END_ của _TOTAL_ mục",
                    infoEmpty: "Không có dữ liệu",
                    paginate: {
                        first: "Đầu",
                        last: "Cuối",
                        next: "Sau",
                        previous: "Trước"
                    }
                },
                order: [[0, 'asc']]
            });
        } else {
            showToast(data.message || 'Không thể lấy danh sách người dùng', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        showToast('Đã xảy ra lỗi khi lấy danh sách người dùng', 'error');
    }
}

// Hiển thị danh sách người dùng
function populateUserTable(users) {
    const tbody = document.querySelector('#userTable tbody');
    
    users.forEach((user, index) => {
        // Tạo avatar URL (sử dụng avatar từ DB hoặc placeholder)
        let avatarUrl = user.anh_dai_dien 
            ? user.anh_dai_dien 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.ho_ten)}&background=2563eb&color=fff`;
        
        // Tạo row HTML
        const row = `
            <tr data-id="${user.id}">
                <td>${index + 1}</td>
                <td>
                    <div class="user-info">
                        <img src="${avatarUrl}" alt="Avatar" class="avatar">
                        <div>
                            <p class="user-name">${user.ho_ten}</p>
                            <small class="user-id">ID: ${user.id}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.so_dien_thoai || '-'}</td>
                <td><span class="role-badge ${user.loai_tai_khoan === 'admin' ? 'admin' : 'user'}">${user.loai_tai_khoan === 'admin' ? 'Admin' : 'Người dùng'}</span></td>
                <td><span class="status-badge ${getStatusClass(user.trang_thai)}">${getStatusText(user.trang_thai)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-view" title="Xem chi tiết" data-id="${user.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" title="Chỉnh sửa" data-id="${user.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Xóa" data-id="${user.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        // Thêm row vào tbody
        tbody.insertAdjacentHTML('beforeend', row);
    });
    
    // Thêm event listeners cho các nút
    addActionButtonsEventListeners();
}

// Helper để lấy class CSS cho trạng thái
function getStatusClass(status) {
    switch(status) {
        case 'active':
            return 'active';
        case 'inactive':
            return 'inactive';
        case 'banned':
            return 'banned';
        default:
            return 'inactive';
    }
}

// Helper để hiển thị text trạng thái
function getStatusText(status) {
    switch(status) {
        case 'active':
            return 'Hoạt động';
        case 'inactive':
            return 'Không hoạt động';
        case 'banned':
            return 'Bị cấm';
        default:
            return 'Không xác định';
    }
}

// Thêm event listeners cho các nút thao tác
function addActionButtonsEventListeners() {
    // Nút xem chi tiết
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            viewUser(userId);
        });
    });
    
    // Nút chỉnh sửa
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });
    
    // Nút xóa
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            deleteUser(userId);
        });
    });
}

// Xử lý xem chi tiết người dùng
async function viewUser(userId) {
    try {
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            
            // Tạo avatar URL
            let avatarUrl = user.anh_dai_dien 
                ? user.anh_dai_dien 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.ho_ten)}&background=2563eb&color=fff`;
            
            // Cập nhật thông tin trong modal
            const viewModal = document.getElementById('viewUserModal');
            viewModal.querySelector('.profile-avatar').src = avatarUrl;
            viewModal.querySelector('h4').textContent = user.ho_ten;
            viewModal.querySelector('.role-badge').textContent = user.loai_tai_khoan === 'admin' ? 'Admin' : 'Người dùng';
            viewModal.querySelector('.role-badge').className = `role-badge ${user.loai_tai_khoan === 'admin' ? 'admin' : 'user'}`;
            
            const detailItems = viewModal.querySelectorAll('.detail-item');
            detailItems[0].querySelector('p').textContent = user.email;
            detailItems[1].querySelector('p').textContent = user.so_dien_thoai || 'Chưa cập nhật';
            
            // Format date to DD/MM/YYYY
            const createdDate = new Date(user.ngay_tao);
            const formattedDate = `${createdDate.getDate().toString().padStart(2, '0')}/${(createdDate.getMonth() + 1).toString().padStart(2, '0')}/${createdDate.getFullYear()}`;
            detailItems[2].querySelector('p').textContent = formattedDate;
            
            const statusBadge = detailItems[3].querySelector('.status-badge');
            statusBadge.textContent = getStatusText(user.trang_thai);
            statusBadge.className = `status-badge ${getStatusClass(user.trang_thai)}`;
            
            // Hiện modal
            viewModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            showToast(data.message || 'Không thể lấy thông tin người dùng', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        showToast('Đã xảy ra lỗi khi lấy thông tin người dùng', 'error');
    }
}

// Xử lý chỉnh sửa người dùng
async function editUser(userId) {
    try {
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            
            // Cập nhật tiêu đề modal
            const userModal = document.getElementById('userModal');
            userModal.querySelector('h3').textContent = 'Chỉnh sửa người dùng';
            
            // Ẩn trường mật khẩu khi chỉnh sửa
            const passwordFields = userModal.querySelectorAll('.form-group:nth-of-type(5), .form-group:nth-of-type(6)');
            passwordFields.forEach(field => field.style.display = 'none');
            
            // Fill form với thông tin người dùng
            const form = document.getElementById('userForm');
            form.setAttribute('data-mode', 'edit');
            form.setAttribute('data-id', userId);
            
            // Avatar
            const avatarPreview = document.getElementById('avatarPreview');
            if (user.anh_dai_dien) {
                avatarPreview.innerHTML = `<img src="${user.anh_dai_dien}" alt="Avatar">`;
            } else {
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.ho_ten)}&background=2563eb&color=fff`;
                avatarPreview.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
            }
            
            // Các trường thông tin
            form.querySelector('input[name="ho_ten"]').value = user.ho_ten;
            form.querySelector('input[name="email"]').value = user.email;
            form.querySelector('input[name="so_dien_thoai"]').value = user.so_dien_thoai || '';
            
            // Cài đặt giới tính
            const gioiTinhSelect = form.querySelector('select[name="gioi_tinh"]');
            if (gioiTinhSelect) {
                const option = Array.from(gioiTinhSelect.options).find(opt => opt.value === user.gioi_tinh);
                if (option) option.selected = true;
            }
            
            // Cài đặt quyền
            const quyenSelect = form.querySelector('select[name="loai_tai_khoan"]');
            if (quyenSelect) {
                const option = Array.from(quyenSelect.options).find(opt => opt.value === user.loai_tai_khoan);
                if (option) option.selected = true;
            }
            
            // Cài đặt trạng thái
            const trangThaiSelect = form.querySelector('select[name="trang_thai"]');
            if (trangThaiSelect) {
                const option = Array.from(trangThaiSelect.options).find(opt => opt.value === user.trang_thai);
                if (option) option.selected = true;
            }
            
            // Hiện modal
            userModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            showToast(data.message || 'Không thể lấy thông tin người dùng', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        showToast('Đã xảy ra lỗi khi lấy thông tin người dùng', 'error');
    }
}

// Xử lý xóa người dùng
async function deleteUser(userId) {
    try {
        // Hiển thị dialog xác nhận
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) {
            return;
        }
        
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Xóa người dùng thành công', 'success');
            
            // Refresh dữ liệu
            initializeUsersPage();
        } else {
            showToast(data.message || 'Không thể xóa người dùng', 'error');
        }
    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error);
        showToast('Đã xảy ra lỗi khi xóa người dùng', 'error');
    }
}

// Cài đặt form thêm/sửa người dùng
function setupUserForm() {
    const form = document.getElementById('userForm');
    if (!form) return;
    
    // Xử lý submit form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Lấy mode (thêm mới hoặc chỉnh sửa)
        const mode = form.getAttribute('data-mode');
        const userId = form.getAttribute('data-id');
        
        // Lấy dữ liệu form
        const formData = new FormData(form);
        const userData = {
            ho_ten: formData.get('ho_ten'),
            email: formData.get('email'),
            so_dien_thoai: formData.get('so_dien_thoai'),
            gioi_tinh: formData.get('gioi_tinh'),
            loai_tai_khoan: formData.get('loai_tai_khoan')
        };
        
        // Nếu là thêm mới, thêm mật khẩu
        if (mode !== 'edit') {
            userData.mat_khau = formData.get('mat_khau');
            userData.xac_nhan_mat_khau = formData.get('xac_nhan_mat_khau');
        }
        
        // Thêm trạng thái nếu có
        if (formData.has('trang_thai')) {
            userData.trang_thai = formData.get('trang_thai');
        }
        
        try {
            const token = localStorage.getItem('adminToken');
            let url, method;
            
            if (mode === 'edit') {
                url = `/api/admin/users/${userId}`;
                method = 'PUT';
            } else {
                url = '/api/admin/users';
                method = 'POST';
            }
            
            // Hiển thị loading
            const submitBtn = form.querySelector('[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Đã lưu';
                
                setTimeout(() => {
                    // Đóng modal
                    closeModal();
                    
                    // Reset form
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Lưu';
                    
                    // Hiển thị thông báo
                    showToast(mode === 'edit' ? 'Cập nhật người dùng thành công' : 'Thêm người dùng thành công', 'success');
                    
                    // Refresh dữ liệu
                    initializeUsersPage();
                }, 1000);
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Lưu';
                showToast(data.message || 'Có lỗi xảy ra', 'error');
            }
        } catch (error) {
            console.error('Lỗi khi lưu thông tin người dùng:', error);
            const submitBtn = form.querySelector('[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Lưu';
            showToast('Đã xảy ra lỗi khi lưu thông tin người dùng', 'error');
        }
    });
}

// Cài đặt các nút thao tác
function setupActionButtons() {
    // Nút thêm người dùng
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // Reset form
            const userForm = document.getElementById('userForm');
            if (userForm) userForm.reset();
            
            // Cập nhật tiêu đề modal
            const modal = document.getElementById('userModal');
            modal.querySelector('h3').textContent = 'Thêm người dùng mới';
            
            // Hiện các trường mật khẩu
            const passwordFields = modal.querySelectorAll('.form-group:nth-of-type(5), .form-group:nth-of-type(6)');
            passwordFields.forEach(field => field.style.display = 'block');
            
            // Đặt mode form là add
            userForm.setAttribute('data-mode', 'add');
            userForm.removeAttribute('data-id');
            
            // Reset avatar preview
            const avatarPreview = document.getElementById('avatarPreview');
            avatarPreview.innerHTML = `<i class="fas fa-user-circle"></i><p>Click để tải ảnh lên</p>`;
            
            // Hiện modal
            openModal();
        });
    }
    
    // Các nút đóng modal
    const closeBtns = document.querySelectorAll('.btn-close, .btn-secondary');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
}

// Mở modal
function openModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Đóng modal
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// Hiển thị thông báo toast
function showToast(message, type = 'info') {
    // Kiểm tra xem đã có container toast chưa
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Tạo toast mới
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    // Thêm toast vào container
    toastContainer.appendChild(toast);
    
    // Hiệu ứng hiện toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Tự động ẩn toast sau 3 giây
    const autoHideTimeout = setTimeout(() => {
        hideToast(toast);
    }, 3000);
    
    // Xử lý nút đóng
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoHideTimeout);
        hideToast(toast);
    });
}

// Ẩn thông báo toast
function hideToast(toast) {
    toast.classList.remove('show');
    
    // Xóa toast khỏi DOM sau khi animation kết thúc
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}
