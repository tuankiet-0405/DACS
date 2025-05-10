const db = require('../data/db');
const { saveBase64Image } = require('../utils/imageUtils');

// Hàm chuẩn hóa đường dẫn hình ảnh
const normalizeImageUrl = (url) => {
    if (!url) return null;
    
    // Nếu đường dẫn đã là URL đầy đủ hoặc đường dẫn tương đối, trả về nguyên vẹn
    if (url.startsWith('http') || url.startsWith('/')) {
        return url;
    }
    
    // Nếu là đường dẫn tương đối không bắt đầu bằng "/"
    return '/' + url;
};

const carController = {
    // Lấy thống kê xe
    getCarStats: async (req, res) => {
        try {
            // Lấy tổng số xe
            const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM xe');
            
            // Lấy số xe đang sẵn sàng
            const [availableResult] = await db.execute(`
                SELECT COUNT(*) as available 
                FROM xe 
                WHERE tinh_trang = 'san_sang'
            `);
            
            // Lấy số xe đang cho thuê
            const [rentedResult] = await db.execute(`
                SELECT COUNT(*) as rented 
                FROM xe 
                WHERE tinh_trang = 'dang_thue'
            `);
            
            // Lấy số xe đang bảo trì
            const [maintenanceResult] = await db.execute(`
                SELECT COUNT(*) as maintenance 
                FROM xe 
                WHERE tinh_trang = 'bao_tri'
            `);
            
            // Lấy số xe đã ngừng hoạt động
            const [inactiveResult] = await db.execute(`
                SELECT COUNT(*) as inactive 
                FROM xe 
                WHERE tinh_trang = 'ngung_hoat_dong'
            `);
            
            // Lấy số lượng xe theo loại
            const [carTypeResult] = await db.execute(`
                SELECT loai_xe, COUNT(*) as count
                FROM xe
                GROUP BY loai_xe
            `);
            
            // Lấy 5 xe được thuê nhiều nhất
            const [topRentedCars] = await db.execute(`
                SELECT x.id, x.ten_xe, x.hang_xe, COUNT(dx.id) as total_bookings
                FROM xe x
                JOIN dat_xe dx ON x.id = dx.xe_id
                GROUP BY x.id, x.ten_xe, x.hang_xe
                ORDER BY total_bookings DESC
                LIMIT 5
            `);
            
            res.status(200).json({
                success: true,
                message: 'Lấy thống kê xe thành công',
                stats: {
                    totalCars: totalResult[0].total || 0,
                    availableCars: availableResult[0].available || 0,
                    rentedCars: rentedResult[0].rented || 0,
                    maintenanceCars: maintenanceResult[0].maintenance || 0,
                    inactiveCars: inactiveResult[0].inactive || 0,
                    carsByType: carTypeResult,
                    topRentedCars: topRentedCars
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thống kê xe',
                error: error.message
            });
        }
    },
    
    // Lấy tất cả xe
    getAllCars: async (req, res) => {
        try {
            // Xác định nếu request đến từ admin hoặc client
            const isAdmin = req.user && req.user.loai_tai_khoan === 'admin';
            
            // Nếu là admin, không cần lọc theo tinh_trang
            const statusFilter = isAdmin ? '' : "WHERE x.tinh_trang IN ('san_sang', 'dang_thue', 'bao_tri')";
            
            console.log("User role:", req.user ? req.user.loai_tai_khoan : 'not authenticated');
            console.log("Using filter for status:", statusFilter);
            
            // Lấy danh sách xe
            const [rows] = await db.execute(`
                SELECT x.*, 
                       COALESCE(AVG(d.so_sao), 0) as danh_gia, 
                       COUNT(DISTINCT d.id) as so_danh_gia,
                       COUNT(DISTINCT dx.id) as so_chuyen
                FROM xe x
                LEFT JOIN danh_gia d ON x.id = d.xe_id
                LEFT JOIN dat_xe dx ON x.id = dx.xe_id
                ${statusFilter}
                GROUP BY x.id
                ORDER BY x.ngay_tao DESC
            `);
            
            // Lấy ID của tất cả các xe
            const carIds = rows.map(car => car.id);
            
            // Nếu không có xe nào, trả về mảng rỗng
            if (carIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Không có xe nào',
                    data: []
                });
            }
            
            // Lấy hình ảnh chính của các xe từ bảng hinh_anh_xe
            let carImages = [];
            if (carIds.length > 0) {
                const inPlaceholders = carIds.map(() => '?').join(',');
                [carImages] = await db.execute(`
                    SELECT xe_id, url_hinh_anh, la_hinh_chinh
                    FROM hinh_anh_xe 
                    WHERE xe_id IN (${inPlaceholders})
                    ORDER BY la_hinh_chinh DESC
                `, carIds);
            }
            
            // Tạo map để lưu trữ hình ảnh theo id xe
            const carImageMap = {};
            carImages.forEach(img => {
                if (!carImageMap[img.xe_id] || img.la_hinh_chinh) {
                    carImageMap[img.xe_id] = img.url_hinh_anh;
                }
            });
            
            // Thêm thông tin hình ảnh vào dữ liệu xe
            const carsWithImages = rows.map(car => {                return {
                    ...car,
                    hinh_anh: normalizeImageUrl(carImageMap[car.id]) || null,
                    danh_gia: parseFloat(car.danh_gia).toFixed(1)
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách xe thành công',
                data: carsWithImages
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách xe',
                error: error.message
            });
        }
    },

    // Lấy xe nổi bật
    getFeaturedCars: async (req, res) => {
        try {
            // Lấy danh sách xe nổi bật
            const [rows] = await db.execute(`
                SELECT x.*, 
                       COALESCE(AVG(d.so_sao), 0) as danh_gia, 
                       COUNT(DISTINCT d.id) as so_danh_gia,
                       COUNT(DISTINCT dx.id) as so_chuyen
                FROM xe x
                LEFT JOIN danh_gia d ON x.id = d.xe_id
                LEFT JOIN dat_xe dx ON x.id = dx.xe_id
                WHERE x.tinh_trang = 'san_sang'
                GROUP BY x.id
                ORDER BY x.id ASC
                LIMIT 4
            `);
            
            // Nếu không có xe nào, trả về mảng rỗng
            if (!rows.length) {
                return res.status(200).json({
                    success: true,
                    message: 'Không có xe nổi bật',
                    data: []
                });
            }
            
            // Lấy danh sách ID của các xe nổi bật
            const carIds = rows.map(car => car.id);
            
            // Lấy hình ảnh cho các xe nổi bật
            let carImages = [];
            try {
                if (carIds.length > 0) {
                    const inPlaceholders = carIds.map(() => '?').join(',');
                    const query = `
                        SELECT xe_id, url_hinh_anh, la_hinh_chinh
                        FROM hinh_anh_xe 
                        WHERE xe_id IN (${inPlaceholders})
                    `;
                    [carImages] = await db.execute(query, carIds);
                }
            } catch (error) {
                console.error('Lỗi khi truy vấn hình ảnh xe:', error);
            }
            
            // Tạo map để lưu trữ hình ảnh theo id xe
            const carImageMap = {};
            carImages.forEach(img => {
                if (!carImageMap[img.xe_id] || img.la_hinh_chinh) {
                    carImageMap[img.xe_id] = img.url_hinh_anh;
                }
            });
            
            // Tính toán giá gốc và % giảm giá (giả lập)
            const featuredCars = rows.map(car => {
                // Giả lập giảm giá (từ 5% đến 25%)
                const discountPercent = Math.floor(Math.random() * 21) + 5;
                const originalPrice = Math.round(car.gia_thue * (100 / (100 - discountPercent)));
                
                return {
                    ...car,
                    hinh_anh: carImageMap[car.id] || '', // Sử dụng đường dẫn hình ảnh từ bảng hinh_anh_xe
                    giam_gia: discountPercent,
                    gia_goc: originalPrice,
                    so_chuyen: car.so_chuyen || 0,
                    danh_gia: parseFloat(car.danh_gia).toFixed(1) || 5.0
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách xe nổi bật thành công',
                data: featuredCars
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách xe nổi bật:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách xe nổi bật',
                error: error.message
            });
        }
    },

    // Lấy xe theo ID
    getCarById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const [rows] = await db.execute(`
                SELECT x.*, 
                       COALESCE(AVG(d.so_sao), 0) as danh_gia, 
                       COUNT(DISTINCT d.id) as so_danh_gia,
                       COUNT(DISTINCT dx.id) as so_chuyen,
                       nd.ho_ten as ten_chu_xe,
                       nd.so_dien_thoai as lien_he_chu_xe
                FROM xe x
                LEFT JOIN danh_gia d ON x.id = d.xe_id
                LEFT JOIN dat_xe dx ON x.id = dx.xe_id
                LEFT JOIN nguoi_dung nd ON x.chu_xe_id = nd.id
                WHERE x.id = ?
                GROUP BY x.id
            `, [id]);
            
            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }
            
            // Lấy các hình ảnh của xe
            const [images] = await db.execute(`
                SELECT * FROM hinh_anh_xe
                WHERE xe_id = ?
                ORDER BY la_hinh_chinh DESC
            `, [id]);
            
            const car = {
                ...rows[0],
                hinh_anh: images.map(img => img.url_hinh_anh),
                danh_gia: parseFloat(rows[0].danh_gia).toFixed(1)
            };
            
            res.status(200).json({
                success: true,
                message: 'Lấy thông tin xe thành công',
                data: car
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông tin xe',
                error: error.message
            });
        }
    },    // Tạo xe mới
    createCar: async (req, res) => {
        try {
            // Các field từ form tạo xe
            const { 
                ten_xe, hang_xe, loai_xe, bien_so, nam_san_xuat, 
                mau_xe, so_cho, hop_so, nhien_lieu, gia_thue, 
                mo_ta, loai_dich_vu, dia_chi_xe, hinh_anh
            } = req.body;
            
            // ID của người dùng đăng nhập (từ token)
            const chu_xe_id = req.user.id;
              // Kiểm tra các trường bắt buộc
            if (!ten_xe || !hang_xe || !loai_xe || !bien_so || !nam_san_xuat || !so_cho || !hop_so || !nhien_lieu || !gia_thue || !loai_dich_vu || !dia_chi_xe) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }            // Xử lý giá trị loai_xe để đảm bảo phù hợp với ENUM trong DB
            let validated_loai_xe = loai_xe;
            
            // Đảm bảo loai_xe là một trong những giá trị ENUM hợp lệ ('4_cho', '7_cho', '16_cho', '29_cho')
            if (validated_loai_xe) {
                const validEnumValues = ['4_cho', '7_cho', '16_cho', '29_cho'];
                if (!validEnumValues.includes(validated_loai_xe)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (validated_loai_xe.includes('4')) validated_loai_xe = '4_cho';
                    else if (validated_loai_xe.includes('7')) validated_loai_xe = '7_cho';
                    else if (validated_loai_xe.includes('16')) validated_loai_xe = '16_cho';
                    else if (validated_loai_xe.includes('29')) validated_loai_xe = '29_cho';
                    else validated_loai_xe = '4_cho'; // Giá trị mặc định nếu không thể xác định
                    
                    console.log(`Đã chuyển đổi giá trị loai_xe: "${loai_xe}" -> "${validated_loai_xe}"`);
                }
            }
            
            // Xử lý các trường text khác để tránh lỗi data truncation
            let validated_mau_xe = mau_xe;
            if (mau_xe && mau_xe.length > 30) {  // Giả sử giới hạn là 30 ký tự
                validated_mau_xe = mau_xe.substring(0, 30);
            }
              let validated_hop_so = hop_so;
            if (validated_hop_so) {
                // Đảm bảo hop_so là một trong những giá trị ENUM hợp lệ ('tu_dong', 'so_san')
                const validHopSoValues = ['tu_dong', 'so_san'];
                if (!validHopSoValues.includes(validated_hop_so)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (validated_hop_so.toLowerCase().includes('tự') || 
                        validated_hop_so.toLowerCase().includes('tu') || 
                        validated_hop_so.toLowerCase().includes('auto')) {
                        validated_hop_so = 'tu_dong';
                    } else {
                        validated_hop_so = 'so_san'; // Giá trị mặc định nếu không thể xác định
                    }
                    console.log(`Đã chuyển đổi giá trị hop_so: "${hop_so}" -> "${validated_hop_so}"`);
                }
            }
              let validated_nhien_lieu = nhien_lieu;
            if (validated_nhien_lieu) {
                // Đảm bảo nhien_lieu là một trong những giá trị ENUM hợp lệ ('xang', 'dau', 'dien', 'hybrid')
                const validNhienLieuValues = ['xang', 'dau', 'dien', 'hybrid'];
                if (!validNhienLieuValues.includes(validated_nhien_lieu)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (validated_nhien_lieu.toLowerCase().includes('xăng') || validated_nhien_lieu.toLowerCase().includes('xang')) {
                        validated_nhien_lieu = 'xang';
                    } else if (validated_nhien_lieu.toLowerCase().includes('dầu') || validated_nhien_lieu.toLowerCase().includes('dau')) {
                        validated_nhien_lieu = 'dau';
                    } else if (validated_nhien_lieu.toLowerCase().includes('điện') || validated_nhien_lieu.toLowerCase().includes('dien')) {
                        validated_nhien_lieu = 'dien';
                    } else if (validated_nhien_lieu.toLowerCase().includes('hybrid')) {
                        validated_nhien_lieu = 'hybrid';
                    } else {
                        validated_nhien_lieu = 'xang'; // Giá trị mặc định nếu không thể xác định
                    }
                    console.log(`Đã chuyển đổi giá trị nhien_lieu: "${nhien_lieu}" -> "${validated_nhien_lieu}"`);
                }
            }
            
            // Thêm xe vào database
            const [result] = await db.execute(`
                INSERT INTO xe (                chu_xe_id, ten_xe, hang_xe, loai_xe, bien_so, 
                    nam_san_xuat, mau_xe, so_cho, hop_so, 
                    nhien_lieu, gia_thue, mo_ta, tinh_trang, 
                    loai_dich_vu, dia_chi_xe
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [                chu_xe_id, ten_xe, hang_xe, validated_loai_xe, bien_so, 
                nam_san_xuat, validated_mau_xe, so_cho, validated_hop_so, 
                validated_nhien_lieu, gia_thue, mo_ta, 'san_sang', 
                loai_dich_vu, dia_chi_xe
            ]);              // Nếu có hình ảnh, xử lý và thêm vào bảng hinh_anh_xe
            if (hinh_anh) {
                let imageUrl = hinh_anh;
                
                // Kiểm tra nếu là dữ liệu base64 thì lưu thành file
                if (hinh_anh.startsWith('data:') || hinh_anh.length > 255) {
                    try {
                        // Lưu hình ảnh và lấy đường dẫn file
                        imageUrl = saveBase64Image(hinh_anh, 'car-' + result.insertId);
                        console.log('Đã lưu hình ảnh:', imageUrl);
                    } catch (error) {
                        console.error('Lỗi khi lưu hình ảnh:', error);
                        // Nếu lỗi khi lưu, bỏ qua việc thêm hình ảnh
                        imageUrl = null;
                    }
                }

                // Nếu xử lý hình ảnh thành công, lưu vào database
                if (imageUrl) {
                    await db.execute(
                        'INSERT INTO hinh_anh_xe (xe_id, url_hinh_anh, la_hinh_chinh) VALUES (?, ?, TRUE)',
                        [result.insertId, imageUrl]
                    );
                }
            }
              // Đọc lại thông tin xe sau khi tạo để có dữ liệu đầy đủ
            const [newCarInfo] = await db.execute(`
                SELECT x.*, 
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = x.id AND la_hinh_chinh = TRUE LIMIT 1) as hinh_anh
                FROM xe x
                WHERE x.id = ?
            `, [result.insertId]);

            res.status(201).json({
                success: true,
                message: 'Tạo xe mới thành công',
                data: newCarInfo[0]
            });
        } catch (error) {
            console.error('Lỗi khi tạo xe mới:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tạo xe mới',
                error: error.message
            });
        }
    },    // Cập nhật thông tin xe
    updateCar: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Các field cần cập nhật
            const { 
                ten_xe, hang_xe, loai_xe, bien_so, nam_san_xuat, 
                mau_xe, so_cho, hop_so, nhien_lieu, gia_thue, 
                mo_ta, tinh_trang, loai_dich_vu, dia_chi_xe, hinh_anh
            } = req.body;
            
            // Kiểm tra xe tồn tại
            const [existingCar] = await db.execute('SELECT * FROM xe WHERE id = ?', [id]);
            
            if (!existingCar.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }
            
            // Kiểm tra quyền (chỉ chủ xe hoặc admin mới được cập nhật)
            if (req.user.id !== existingCar[0].chu_xe_id && req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền cập nhật xe này'
                });
            }// Xử lý các giá trị undefined - thay bằng null để MySQL hiểu
            // Kiểm tra và xử lý giá trị loai_xe để đảm bảo phù hợp với ENUM trong DB
            let processed_loai_xe = loai_xe;
            
            // Đảm bảo loai_xe là một trong những giá trị ENUM hợp lệ ('4_cho', '7_cho', '16_cho', '29_cho')
            if (processed_loai_xe) {
                const validEnumValues = ['4_cho', '7_cho', '16_cho', '29_cho'];
                if (!validEnumValues.includes(processed_loai_xe)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (processed_loai_xe.includes('4')) processed_loai_xe = '4_cho';
                    else if (processed_loai_xe.includes('7')) processed_loai_xe = '7_cho';
                    else if (processed_loai_xe.includes('16')) processed_loai_xe = '16_cho';
                    else if (processed_loai_xe.includes('29')) processed_loai_xe = '29_cho';
                    else processed_loai_xe = '4_cho'; // Giá trị mặc định nếu không thể xác định
                    
                    console.log(`Đã chuyển đổi giá trị loai_xe: "${loai_xe}" -> "${processed_loai_xe}"`);
                }
            }
            
            // Xử lý các trường text khác để tránh lỗi data truncation
            let processed_mau_xe = mau_xe;
            if (mau_xe && mau_xe.length > 30) {  // Giả sử giới hạn là 30 ký tự
                processed_mau_xe = mau_xe.substring(0, 30);
            }
              let processed_hop_so = hop_so;
            if (processed_hop_so) {
                // Đảm bảo hop_so là một trong những giá trị ENUM hợp lệ ('tu_dong', 'so_san')
                const validHopSoValues = ['tu_dong', 'so_san'];
                if (!validHopSoValues.includes(processed_hop_so)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (processed_hop_so.toLowerCase().includes('tự') || 
                        processed_hop_so.toLowerCase().includes('tu') || 
                        processed_hop_so.toLowerCase().includes('auto')) {
                        processed_hop_so = 'tu_dong';
                    } else {
                        processed_hop_so = 'so_san'; // Giá trị mặc định nếu không thể xác định
                    }
                    console.log(`Đã chuyển đổi giá trị hop_so: "${hop_so}" -> "${processed_hop_so}"`);
                }
            }
              let processed_nhien_lieu = nhien_lieu;
            if (processed_nhien_lieu) {
                // Đảm bảo nhien_lieu là một trong những giá trị ENUM hợp lệ ('xang', 'dau', 'dien', 'hybrid')
                const validNhienLieuValues = ['xang', 'dau', 'dien', 'hybrid'];
                if (!validNhienLieuValues.includes(processed_nhien_lieu)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (processed_nhien_lieu.toLowerCase().includes('xăng') || processed_nhien_lieu.toLowerCase().includes('xang')) {
                        processed_nhien_lieu = 'xang';
                    } else if (processed_nhien_lieu.toLowerCase().includes('dầu') || processed_nhien_lieu.toLowerCase().includes('dau')) {
                        processed_nhien_lieu = 'dau';
                    } else if (processed_nhien_lieu.toLowerCase().includes('điện') || processed_nhien_lieu.toLowerCase().includes('dien')) {
                        processed_nhien_lieu = 'dien';
                    } else if (processed_nhien_lieu.toLowerCase().includes('hybrid')) {
                        processed_nhien_lieu = 'hybrid';
                    } else {
                        processed_nhien_lieu = 'xang'; // Giá trị mặc định nếu không thể xác định
                    }
                    console.log(`Đã chuyển đổi giá trị nhien_lieu: "${nhien_lieu}" -> "${processed_nhien_lieu}"`);
                }
            }
            
            let processed_tinh_trang = tinh_trang;
            if (processed_tinh_trang) {
                // Đảm bảo tinh_trang là một trong những giá trị ENUM hợp lệ ('san_sang', 'dang_thue', 'bao_tri', 'ngung_hoat_dong')
                const validTinhTrangValues = ['san_sang', 'dang_thue', 'bao_tri', 'ngung_hoat_dong'];
                if (!validTinhTrangValues.includes(processed_tinh_trang)) {
                    // Nếu giá trị không hợp lệ, thử chuyển đổi thành giá trị đúng định dạng
                    if (processed_tinh_trang.toLowerCase().includes('sẵn') || processed_tinh_trang.toLowerCase().includes('san')) {
                        processed_tinh_trang = 'san_sang';
                    } else if (processed_tinh_trang.toLowerCase().includes('thuê') || processed_tinh_trang.toLowerCase().includes('thue')) {
                        processed_tinh_trang = 'dang_thue';
                    } else if (processed_tinh_trang.toLowerCase().includes('bảo') || processed_tinh_trang.toLowerCase().includes('bao')) {
                        processed_tinh_trang = 'bao_tri';
                    } else if (processed_tinh_trang.toLowerCase().includes('ngừng') || processed_tinh_trang.toLowerCase().includes('ngung')) {
                        processed_tinh_trang = 'ngung_hoat_dong';
                    } else {
                        processed_tinh_trang = 'san_sang'; // Giá trị mặc định nếu không thể xác định
                    }
                    console.log(`Đã chuyển đổi giá trị tinh_trang: "${tinh_trang}" -> "${processed_tinh_trang}"`);
                }
            }const params = [
                ten_xe === undefined ? null : ten_xe,
                hang_xe === undefined ? null : hang_xe,
                processed_loai_xe === undefined ? null : processed_loai_xe, // Sử dụng biến đã được xử lý
                bien_so === undefined ? null : bien_so,
                nam_san_xuat === undefined ? null : nam_san_xuat,
                processed_mau_xe === undefined ? null : processed_mau_xe,
                so_cho === undefined ? null : so_cho,
                processed_hop_so === undefined ? null : processed_hop_so,
                processed_nhien_lieu === undefined ? null : processed_nhien_lieu,
                gia_thue === undefined ? null : gia_thue,
                mo_ta === undefined ? null : mo_ta,
                processed_tinh_trang === undefined ? null : processed_tinh_trang,
                loai_dich_vu === undefined ? null : loai_dich_vu,
                dia_chi_xe === undefined ? null : dia_chi_xe,
                id
            ];
              // Cập nhật thông tin xe
            await db.execute(`
                UPDATE xe SET
                    ten_xe = COALESCE(?, ten_xe),
                    hang_xe = COALESCE(?, hang_xe),
                    loai_xe = COALESCE(?, loai_xe),
                    bien_so = COALESCE(?, bien_so),
                    nam_san_xuat = COALESCE(?, nam_san_xuat),
                    mau_xe = COALESCE(?, mau_xe),
                    so_cho = COALESCE(?, so_cho),
                    hop_so = COALESCE(?, hop_so),
                    nhien_lieu = COALESCE(?, nhien_lieu),
                    gia_thue = COALESCE(?, gia_thue),
                    mo_ta = COALESCE(?, mo_ta),
                    tinh_trang = COALESCE(?, tinh_trang),
                    loai_dich_vu = COALESCE(?, loai_dich_vu),
                    dia_chi_xe = COALESCE(?, dia_chi_xe)
                WHERE id = ?
            `, params);
              // Xử lý hình ảnh nếu có
            if (hinh_anh) {
                let imageUrl = hinh_anh;
                
                // Kiểm tra nếu là dữ liệu base64 thì lưu thành file
                if (hinh_anh.startsWith('data:') || hinh_anh.length > 255) {
                    try {
                        // Lưu hình ảnh và lấy đường dẫn file
                        imageUrl = saveBase64Image(hinh_anh, 'car-' + id);
                        console.log('Đã lưu hình ảnh:', imageUrl);
                    } catch (error) {
                        console.error('Lỗi khi lưu hình ảnh:', error);
                        // Nếu lỗi khi lưu, bỏ qua việc cập nhật hình ảnh
                        imageUrl = null;
                    }
                }

                // Nếu xử lý hình ảnh thành công, cập nhật vào database
                if (imageUrl) {
                    // Kiểm tra xem đã có hình ảnh chính nào cho xe này chưa
                    const [existingImages] = await db.execute(
                        'SELECT * FROM hinh_anh_xe WHERE xe_id = ? AND la_hinh_chinh = TRUE', 
                        [id]
                    );
    
                    if (existingImages.length > 0) {
                        // Cập nhật hình ảnh hiện có
                        await db.execute(
                            'UPDATE hinh_anh_xe SET url_hinh_anh = ? WHERE xe_id = ? AND la_hinh_chinh = TRUE',
                            [imageUrl, id]
                        );
                    } else {
                        // Thêm hình ảnh mới
                        await db.execute(
                            'INSERT INTO hinh_anh_xe (xe_id, url_hinh_anh, la_hinh_chinh) VALUES (?, ?, TRUE)',
                            [id, imageUrl]
                        );
                    }
                }
            }
              // Đọc lại thông tin xe sau khi cập nhật để có dữ liệu mới nhất
            const [updatedCarInfo] = await db.execute(`
                SELECT x.*, 
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = x.id AND la_hinh_chinh = TRUE LIMIT 1) as hinh_anh
                FROM xe x
                WHERE x.id = ?
            `, [id]);

            // Tạo response object với dữ liệu đã cập nhật
            const responseData = {
                ...updatedCarInfo[0],
                id: parseInt(id)
            };

            res.status(200).json({
                success: true,
                message: 'Cập nhật xe thành công',
                data: responseData
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật xe',
                error: error.message
            });
        }
    },

    // Xóa xe
    deleteCar: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Kiểm tra xe tồn tại
            const [existingCar] = await db.execute('SELECT * FROM xe WHERE id = ?', [id]);
            
            if (!existingCar.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }
            
            // Kiểm tra quyền (chỉ chủ xe hoặc admin mới được xóa)
            if (req.user.id !== existingCar[0].chu_xe_id && req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa xe này'
                });
            }
            
            // Xóa xe
            await db.execute('DELETE FROM xe WHERE id = ?', [id]);
            
            res.status(200).json({
                success: true,
                message: 'Xóa xe thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa xe',
                error: error.message
            });
        }
    }
};

module.exports = carController;