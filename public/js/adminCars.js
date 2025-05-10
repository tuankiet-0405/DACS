// Quản lý xe cho admin
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập và phân quyền
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const userRole = localStorage.getItem('adminUser') ? JSON.parse(localStorage.getItem('adminUser')).loai_tai_khoan : null;

    if (!token || userRole !== 'admin') {
        window.location.href = '/views/login.html';
        return;
    }

    // Khởi tạo trạng thái ban đầu
    let currentFilter = 'all';
    let carsData = [];

    // Lấy các element
    const tableBody = document.querySelector('.car-table tbody');
    const filterButtons = document.querySelectorAll('.filter-item');
    const searchInput = document.getElementById('searchInput');
    const addCarBtn = document.getElementById('addCarBtn');
    const modal = document.getElementById('carModal');
    const carForm = document.getElementById('carForm');
    const carCountElement = document.querySelector('.header1 h2 span');
    const modalTitle = document.querySelector('.modal-header h3');
    
    // Các trường form
    const carFields = {
        id: null,
        imageInput: document.getElementById('imageInput'),
        imagePreview: document.getElementById('imagePreview'),
        tenXe: carForm.querySelector('input[name="tenXe"]'),
        bienSo: carForm.querySelector('input[name="bienSo"]'),
        giaThue: carForm.querySelector('input[name="giaThue"]'),
        soCho: carForm.querySelector('select[name="soCho"]'),
        tinhTrang: carForm.querySelector('select[name="tinhTrang"]'),
        hangXe: carForm.querySelector('select[name="hangXe"]'),
        loaiXe: carForm.querySelector('select[name="loaiXe"]'),
        hopSo: carForm.querySelector('select[name="hopSo"]'),
        nhienLieu: carForm.querySelector('select[name="nhienLieu"]'),
        namSanXuat: carForm.querySelector('input[name="namSanXuat"]'),
        mauXe: carForm.querySelector('input[name="mauXe"]'),
        moTa: carForm.querySelector('textarea[name="moTa"]'),
        diaChiXe: carForm.querySelector('input[name="diaChiXe"]')
    };

    // Lấy dữ liệu thống kê
    fetchCarStats();

    // Lấy tất cả xe
    fetchCars('all');

    // Xử lý sự kiện lọc
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterType = button.getAttribute('data-type');
            currentFilter = filterType;
            
            // Cập nhật giao diện nút lọc
            document.querySelector('.filter-item.active').classList.remove('active');
            button.classList.add('active');
            
            // Lấy dữ liệu theo loại xe
            if (filterType === 'all') {
                fetchCars('all');
            } else {
                fetchCarsBySeats(filterType);
            }
        });
    });

    // Xử lý tìm kiếm
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        filterCarsBySearch(searchTerm);
    });

    // Xử lý thêm xe mới
    addCarBtn.addEventListener('click', () => {
        resetCarForm();
        modalTitle.textContent = 'Thêm xe mới';
        carFields.id = null;
        openModal();
    });

    // Xử lý submit form
    carForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitCarForm();
    });    // Hàm lấy danh sách xe
    function fetchCars(type) {
        // Thêm debug cho vấn đề hiển thị
        console.log("Fetching cars with type:", type);
        
        fetch('/api/admin/cars', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log("API response status:", response.status);
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu xe');
            }
            return response.json();
        })
        .then(data => {
            console.log("API data received:", data);
            if (data.success) {
                carsData = data.data;
                console.log("Cars data length:", carsData.length);
                renderCarsTable(carsData);
                updateCarCount(carsData.length);
            } else {
                console.error("API returned success=false:", data.message);
                alert(`Lỗi từ server: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error fetching cars:', error);
            alert('Đã xảy ra lỗi khi lấy danh sách xe: ' + error.message);
        });
    }

    // Hàm lấy xe theo số chỗ
    function fetchCarsBySeats(seats) {
        fetch(`/api/admin/cars/seats/${seats}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Không thể lấy dữ liệu xe ${seats} chỗ`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                carsData = data.data;
                renderCarsTable(carsData);
                updateCarCount(carsData.length);
            }
        })
        .catch(error => {
            console.error('Error fetching cars by seats:', error);
            alert(`Đã xảy ra lỗi khi lấy danh sách xe ${seats} chỗ`);
        });
    }

    // Hàm lấy thống kê xe
    function fetchCarStats() {
        fetch('/api/admin/cars/stats', {
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
                // Cập nhật số lượng trên các button filter
                updateFilterCounts(data.data);
            }
        })
        .catch(error => {
            console.error('Error fetching car stats:', error);
            alert('Đã xảy ra lỗi khi lấy thông tin thống kê xe');
        });
    }

    // Cập nhật số lượng trên các button filter
    function updateFilterCounts(stats) {
        // Cập nhật số lượng trong các nút lọc nếu cần
        document.querySelector('.filter-item[data-type="all"]').textContent = `Tất cả (${stats.totalCars})`;
        document.querySelector('.filter-item[data-type="4"]').textContent = `4 chỗ (${stats.cars4Seats})`;
        document.querySelector('.filter-item[data-type="7"]').textContent = `7 chỗ (${stats.cars7Seats})`;
        document.querySelector('.filter-item[data-type="16"]').textContent = `16 chỗ (${stats.cars16Seats})`;
        document.querySelector('.filter-item[data-type="24"]').textContent = `24 chỗ (${stats.cars24Seats})`;
    }

    // Cập nhật số lượng xe hiển thị
    function updateCarCount(count) {
        carCountElement.textContent = `(${count} xe)`;
    }    // Render bảng xe
    function renderCarsTable(cars) {
        if (!tableBody) {
            console.error("Element tableBody not found!");
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (!cars || cars.length === 0) {
            console.log("No cars data to display");
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Không có dữ liệu xe</td></tr>';
            return;
        }
        
        console.log(`Rendering ${cars.length} cars`);
        cars.forEach((car, index) => {
            const statusClass = getStatusClass(car.tinh_trang);
            const statusText = getStatusText(car.tinh_trang);
            
            console.log(`Car ${index+1}:`, car.ten_xe, "Image:", car.hinh_anh);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><img src="${car.hinh_anh || '/public/image/lazy.svg'}" alt="${car.ten_xe}" class="car-img" onerror="this.src='/public/image/lazy.svg'"></td>
                <td><a href="#" class="car-name">${car.ten_xe}</a></td>
                <td>${car.bien_so}</td>
                <td class="car-price">${formatCurrency(car.gia_thue)}</td>
                <td>${car.so_cho} chỗ</td>
                <td><span class="car-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="car-actions">
                        <button class="btn-action btn-edit" title="Chỉnh sửa" data-id="${car.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Xóa" data-id="${car.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Thêm event listeners cho các nút
        addTableEventListeners();
    }

    // Hàm lấy trạng thái hiển thị
    function getStatusText(status) {
        switch (status) {
            case 'san_sang':
                return 'Sẵn sàng';
            case 'dang_thue':
                return 'Đang thuê';
            case 'bao_tri':
                return 'Bảo trì';
            default:
                return 'Không xác định';
        }
    }

    // Hàm lấy class cho trạng thái
    function getStatusClass(status) {
        switch (status) {
            case 'san_sang':
                return 'status-active';
            case 'dang_thue':
                return 'status-renting';
            case 'bao_tri':
                return 'status-maintenance';
            default:
                return '';
        }
    }

    // Thêm event listeners cho các nút trong bảng
    function addTableEventListeners() {
        // Nút sửa
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-id');
                fetchCarDetails(carId);
            });
        });
        
        // Nút xóa
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const carId = btn.getAttribute('data-id');
                confirmDeleteCar(carId);
            });
        });
    }

    // Lấy thông tin chi tiết xe
    function fetchCarDetails(carId) {
        fetch(`/api/admin/cars/${carId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin chi tiết xe');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                fillCarForm(data.data);
                modalTitle.textContent = 'Chỉnh sửa thông tin xe';
                openModal();
            }
        })
        .catch(error => {
            console.error('Error fetching car details:', error);
            alert('Đã xảy ra lỗi khi lấy thông tin chi tiết xe');
        });
    }

    // Điền thông tin vào form
    function fillCarForm(car) {
        carFields.id = car.id;
        carFields.tenXe.value = car.ten_xe;
        carFields.bienSo.value = car.bien_so;
        carFields.giaThue.value = car.gia_thue;
        carFields.soCho.value = car.so_cho;
        carFields.tinhTrang.value = car.tinh_trang;
        carFields.hangXe.value = car.hang_xe;
        carFields.loaiXe.value = car.loai_xe;
        carFields.hopSo.value = car.hop_so;
        carFields.nhienLieu.value = car.nhien_lieu;
        carFields.namSanXuat.value = car.nam_san_xuat;
        carFields.mauXe.value = car.mau_xe;
        carFields.moTa.value = car.mo_ta || '';
        carFields.diaChiXe.value = car.dia_chi_xe || '';
          // Hiển thị hình ảnh
        if (car.hinh_anh && car.hinh_anh.length > 0) {
            carFields.imagePreview.innerHTML = `<img src="${car.hinh_anh}" alt="${car.ten_xe}">`;
            // Xóa dữ liệu imageUrl cũ trong dataset khi load hình ảnh từ server
            carFields.imagePreview.dataset.imageUrl = '';
        }
    }    // Reset form
    function resetCarForm() {
        carForm.reset();
        carFields.id = null;
        carFields.imagePreview.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click để tải ảnh lên</p>
        `;
        // Xóa dữ liệu hình ảnh đã lưu
        carFields.imagePreview.dataset.imageUrl = '';
    }// Submit form
    function submitCarForm() {
        // Lấy dữ liệu từ form
        // Xử lý giá trị loai_xe để đảm bảo phù hợp với ENUM trong database
        let processedLoaiXe = carFields.loaiXe.value;
        const validLoaiXeValues = ['4_cho', '7_cho', '16_cho', '29_cho'];
        if (!validLoaiXeValues.includes(processedLoaiXe)) {
            // Nếu giá trị không hợp lệ, thử chuyển đổi
            if (processedLoaiXe.includes('4')) processedLoaiXe = '4_cho';
            else if (processedLoaiXe.includes('7')) processedLoaiXe = '7_cho';
            else if (processedLoaiXe.includes('16')) processedLoaiXe = '16_cho';
            else if (processedLoaiXe.includes('29')) processedLoaiXe = '29_cho';
            else processedLoaiXe = '4_cho'; // Giá trị mặc định
            console.log(`Chuyển đổi loại xe: ${carFields.loaiXe.value} -> ${processedLoaiXe}`);
        }
        
        // Xử lý giá trị hop_so để đảm bảo phù hợp với ENUM ('tu_dong', 'so_san')
        let processedHopSo = carFields.hopSo.value;
        const validHopSoValues = ['tu_dong', 'so_san'];
        if (!validHopSoValues.includes(processedHopSo)) {
            // Nếu giá trị không hợp lệ, thử chuyển đổi
            if (processedHopSo.toLowerCase().includes('tự') || 
                processedHopSo.toLowerCase().includes('tu') || 
                processedHopSo.toLowerCase().includes('auto')) {
                processedHopSo = 'tu_dong';
            } else {
                processedHopSo = 'so_san';
            }
            console.log(`Chuyển đổi hộp số: ${carFields.hopSo.value} -> ${processedHopSo}`);
        }
        
        // Xử lý giá trị nhien_lieu để đảm bảo phù hợp với ENUM ('xang', 'dau', 'dien', 'hybrid')
        let processedNhienLieu = carFields.nhienLieu.value;
        const validNhienLieuValues = ['xang', 'dau', 'dien', 'hybrid'];
        if (!validNhienLieuValues.includes(processedNhienLieu)) {
            // Nếu giá trị không hợp lệ, thử chuyển đổi
            if (processedNhienLieu.toLowerCase().includes('xăng') || processedNhienLieu.toLowerCase().includes('xang')) {
                processedNhienLieu = 'xang';
            } else if (processedNhienLieu.toLowerCase().includes('dầu') || processedNhienLieu.toLowerCase().includes('dau')) {
                processedNhienLieu = 'dau';
            } else if (processedNhienLieu.toLowerCase().includes('điện') || processedNhienLieu.toLowerCase().includes('dien')) {
                processedNhienLieu = 'dien';
            } else if (processedNhienLieu.toLowerCase().includes('hybrid')) {
                processedNhienLieu = 'hybrid';
            } else {
                processedNhienLieu = 'xang';
            }
            console.log(`Chuyển đổi nhiên liệu: ${carFields.nhienLieu.value} -> ${processedNhienLieu}`);
        }
        
        // Xử lý giá trị tinh_trang để đảm bảo phù hợp với ENUM
        let processedTinhTrang = carFields.tinhTrang.value;
        const validTinhTrangValues = ['san_sang', 'dang_thue', 'bao_tri', 'ngung_hoat_dong'];
        if (!validTinhTrangValues.includes(processedTinhTrang)) {
            // Mặc định là 'san_sang' nếu không hợp lệ
            processedTinhTrang = 'san_sang';
            console.log(`Chuyển đổi tình trạng: ${carFields.tinhTrang.value} -> ${processedTinhTrang}`);
        }
          // Lấy hình ảnh từ imagePreview nếu có
        let imageUrl = null;
        if (carFields.imagePreview.querySelector('img')) {
            // Ưu tiên lấy từ dataset.imageUrl nếu có (khi người dùng đã upload ảnh mới)
            imageUrl = carFields.imagePreview.dataset.imageUrl || '';
            
            // Nếu không có dữ liệu trong dataset, lấy từ src hình ảnh hiện tại
            if (!imageUrl && carFields.imagePreview.querySelector('img').src) {
                const imgSrc = carFields.imagePreview.querySelector('img').src;
                // Kiểm tra xem đây có phải là đường dẫn tương đối hay URL đầy đủ
                if (imgSrc.startsWith('data:')) {
                    // Nếu là data URL, lấy phần base64 để giảm kích thước
                    imageUrl = imgSrc.split(';base64,').pop();
                    // Giới hạn độ dài
                    if (imageUrl.length > 60000) {
                        imageUrl = imageUrl.substring(0, 60000);
                    }
                } else {
                    // Nếu là URL thông thường, giữ nguyên
                    imageUrl = imgSrc;
                }
            }
        }
        
        const carData = {
            ten_xe: carFields.tenXe.value,
            bien_so: carFields.bienSo.value,
            gia_thue: carFields.giaThue.value,
            so_cho: carFields.soCho.value,
            tinh_trang: processedTinhTrang,
            hang_xe: carFields.hangXe.value,
            loai_xe: processedLoaiXe,
            hop_so: processedHopSo,
            nhien_lieu: processedNhienLieu,
            nam_san_xuat: carFields.namSanXuat.value,
            mau_xe: carFields.mauXe.value.substring(0, 30),   // Giới hạn độ dài trường mau_xe
            mo_ta: carFields.moTa.value,
            dia_chi_xe: carFields.diaChiXe.value,
            hinh_anh: imageUrl  // Thêm URL hình ảnh vào data gửi lên server
        };
        
        // Thêm loading state
        const submitBtn = carForm.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        
        // Gọi API tương ứng (thêm mới hoặc cập nhật)
        const url = carFields.id ? `/api/admin/cars/${carFields.id}` : '/api/admin/cars';
        const method = carFields.id ? 'PUT' : 'POST';
        
        fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(carData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể lưu thông tin xe');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Đã lưu';
                setTimeout(() => {
                    closeModal();
                    // Refresh danh sách xe
                    fetchCars('all');
                    // Refresh thống kê
                    fetchCarStats();
                    
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Lưu';
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Error saving car:', error);
            alert('Đã xảy ra lỗi khi lưu thông tin xe');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Lưu';
        });
    }

    // Xác nhận xóa xe
    function confirmDeleteCar(carId) {
        if (confirm('Bạn có chắc muốn xóa xe này?')) {
            deleteCar(carId);
        }
    }

    // Xóa xe
    function deleteCar(carId) {
        fetch(`/api/admin/cars/${carId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể xóa xe');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Xóa xe thành công');
                // Refresh danh sách xe
                fetchCars('all');
                // Refresh thống kê
                fetchCarStats();
            }
        })
        .catch(error => {
            console.error('Error deleting car:', error);
            alert('Đã xảy ra lỗi khi xóa xe');
        });
    }

    // Tìm kiếm xe
    function filterCarsBySearch(searchTerm) {
        if (!searchTerm) {
            renderCarsTable(carsData);
            return;
        }
        
        const filteredCars = carsData.filter(car => {
            return (
                car.ten_xe.toLowerCase().includes(searchTerm) ||
                car.bien_so.toLowerCase().includes(searchTerm) ||
                car.hang_xe.toLowerCase().includes(searchTerm) ||
                car.loai_xe.toLowerCase().includes(searchTerm)
            );
        });
        
        renderCarsTable(filteredCars);
        updateCarCount(filteredCars.length);
    }

    // Format tiền tệ
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
            .format(amount)
            .replace(/\s₫/, 'đ');
    }

    // Modal handling
    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Đóng modal khi click vào nút đóng
    document.querySelector('.btn-close').addEventListener('click', closeModal);
    // Đóng modal khi click vào nút hủy
    document.querySelector('.btn-secondary').addEventListener('click', closeModal);
    // Đóng modal khi click ra ngoài
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Xử lý upload hình ảnh
    carFields.imagePreview.addEventListener('click', () => {
        carFields.imageInput.click();
    });

    carFields.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Kiểm tra kích thước file (giới hạn 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Hình ảnh không được vượt quá 5MB');
                return;
            }
            
            // Kiểm tra loại file
            if (!file.type.match('image.*')) {
                alert('Vui lòng chọn file hình ảnh');
                return;
            }

            // Sử dụng canvas để nén hình ảnh trước khi chuyển đổi sang base64
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Tạo canvas để nén hình ảnh
                    const canvas = document.createElement('canvas');
                    
                    // Giới hạn kích thước tối đa của hình ảnh - giảm kích thước xuống để giảm kích thước file
                    const MAX_WIDTH = 400;  // Giảm từ 800 xuống 400
                    const MAX_HEIGHT = 300; // Giảm từ 600 xuống 300
                    
                    let width = img.width;
                    let height = img.height;
                    
                    // Thay đổi kích thước nếu cần
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    // Đặt kích thước canvas
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Vẽ hình ảnh lên canvas với kích thước mới
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Lấy dữ liệu đã nén với chất lượng 0.4 (40%) - giảm từ 0.7 xuống 0.4 để nén mạnh hơn
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
                    
                    // Đổi cách lưu hình ảnh - tách phần base64 ra khỏi data URL để giảm kích thước
                    // Format của data URL: data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
                    // Chúng ta chỉ lưu phần sau "base64,"
                    const base64Data = compressedDataUrl.split(';base64,').pop();
                    // Tái tạo URL với định dạng ngắn hơn
                    const processedUrl = base64Data.length > 60000 
                        ? base64Data.substring(0, 60000) // Giới hạn độ dài tối đa
                        : base64Data;
                    
                    // Lưu lại dạng đầy đủ để hiển thị
                    const displayUrl = 'data:image/jpeg;base64,' + processedUrl;
                    
                    // Hiển thị hình ảnh đã nén
                    carFields.imagePreview.innerHTML = `<img src="${displayUrl}" alt="Preview">`;
                    // Lưu URL đã xử lý (phiên bản ngắn) vào dataset
                    carFields.imagePreview.dataset.imageUrl = processedUrl;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});
