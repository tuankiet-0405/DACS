const db = require('../data/db');

const carController = {
    // Lấy tất cả xe
    getAllCars: async (req, res) => {
        try {
            // Lấy danh sách xe
            const [rows] = await db.execute(`
                SELECT x.*, 
                       COALESCE(AVG(d.so_sao), 0) as danh_gia, 
                       COUNT(DISTINCT d.id) as so_danh_gia,
                       COUNT(DISTINCT dx.id) as so_chuyen
                FROM xe x
                LEFT JOIN danh_gia d ON x.id = d.xe_id
                LEFT JOIN dat_xe dx ON x.id = dx.xe_id
                WHERE x.tinh_trang IN ('san_sang', 'dang_thue', 'bao_tri')
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
            const carsWithImages = rows.map(car => {
                return {
                    ...car,
                    hinh_anh: carImageMap[car.id] || null,
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
    },

    // Tạo xe mới
    createCar: async (req, res) => {
        try {
            // Lấy dữ liệu từ form
            const { 
                brand, model, year, seats, transmission, fuel,
                license_plate, price_per_day, deposit, km_limit,
                location, description, type, features
            } = req.body;
            
            // Chuyển đổi features từ chuỗi JSON thành object nếu cần
            let featuresArray = [];
            try {
                if (features && typeof features === 'string') {
                    featuresArray = JSON.parse(features);
                } else if (Array.isArray(features)) {
                    featuresArray = features;
                }
            } catch (error) {
                console.error('Lỗi khi parse tính năng xe:', error);
            }
            
            // ID của người dùng đăng nhập (từ token)
            const chu_xe_id = req.user.id;
            
            // Kiểm tra các trường bắt buộc
            if (!brand || !model || !year || !seats || !transmission || !fuel || 
                !license_plate || !price_per_day || !location) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }
            
            // Tạo tên xe từ brand và model
            const ten_xe = `${brand} ${model}`;
            
            // Đặt các giá trị mặc định nếu cần
            const realDeposit = deposit || 0;
            const realKmLimit = km_limit || 0;
            
            // Tạo mô tả chi tiết kết hợp features
            let detailedDescription = description || '';
            if (featuresArray.length > 0) {
                detailedDescription += "\n\nTính năng:\n" + featuresArray.join(", ");
            }
            
            // Thêm xe vào database
            const [result] = await db.execute(`
                INSERT INTO xe (
                    chu_xe_id, ten_xe, hang_xe, loai_xe, bien_so, 
                    nam_san_xuat, so_cho, hop_so, 
                    nhien_lieu, gia_thue, dat_coc, gioi_han_km,
                    mo_ta, tinh_trang, loai_dich_vu, 
                    dia_chi_xe, ngay_tao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                chu_xe_id, ten_xe, brand, 'Xe hơi', license_plate, 
                year, seats, transmission, 
                fuel, price_per_day, realDeposit, realKmLimit,
                detailedDescription, 'cho_duyet', type, 
                location
            ]);
            
            const xe_id = result.insertId;
            
            // Xử lý tải lên hình ảnh xe
            const uploadDirectory = './public/uploads/cars/';
            const uploadPromises = [];
            
            // Đảm bảo thư mục upload tồn tại
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(uploadDirectory)) {
                fs.mkdirSync(uploadDirectory, { recursive: true });
            }
            
            // Xử lý các file ảnh được tải lên
            if (req.files && req.files.car_images) {
                const carImages = Array.isArray(req.files.car_images) 
                    ? req.files.car_images 
                    : [req.files.car_images];
                
                // Lưu các hình ảnh của xe
                for (let i = 0; i < carImages.length; i++) {
                    const file = carImages[i];
                    const fileName = `car-${xe_id}-${Date.now()}-${i}-${file.name}`;
                    const filePath = path.join(uploadDirectory, fileName);
                    
                    // Đợi ghi file xong
                    await new Promise((resolve, reject) => {
                        file.mv(filePath, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    // Lưu thông tin ảnh vào database
                    const isMainImage = i === 0; // Ảnh đầu tiên là ảnh chính
                    const imageUrl = `/public/uploads/cars/${fileName}`;
                    
                    await db.execute(`
                        INSERT INTO hinh_anh_xe (xe_id, url_hinh_anh, la_hinh_chinh, ngay_tao)
                        VALUES (?, ?, ?, NOW())
                    `, [xe_id, imageUrl, isMainImage ? 1 : 0]);
                }
            }
            
            // Xử lý giấy tờ xe
            if (req.files) {
                // Xử lý đăng ký xe
                if (req.files.registration_image) {
                    const file = req.files.registration_image;
                    const fileName = `registration-${xe_id}-${Date.now()}-${file.name}`;
                    const filePath = path.join(uploadDirectory, fileName);
                    
                    await new Promise((resolve, reject) => {
                        file.mv(filePath, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    // Lưu thông tin giấy tờ vào database
                    const imageUrl = `/public/uploads/cars/${fileName}`;
                    
                    await db.execute(`
                        INSERT INTO giay_to_xe (xe_id, loai_giay_to, url_hinh_anh, ngay_tao)
                        VALUES (?, ?, ?, NOW())
                    `, [xe_id, 'dang_ky', imageUrl]);
                }
                
                // Xử lý bảo hiểm xe
                if (req.files.insurance_image) {
                    const file = req.files.insurance_image;
                    const fileName = `insurance-${xe_id}-${Date.now()}-${file.name}`;
                    const filePath = path.join(uploadDirectory, fileName);
                    
                    await new Promise((resolve, reject) => {
                        file.mv(filePath, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    // Lưu thông tin giấy tờ vào database
                    const imageUrl = `/public/uploads/cars/${fileName}`;
                    
                    await db.execute(`
                        INSERT INTO giay_to_xe (xe_id, loai_giay_to, url_hinh_anh, ngay_tao)
                        VALUES (?, ?, ?, NOW())
                    `, [xe_id, 'bao_hiem', imageUrl]);
                }
            }
            
            // Gửi email thông báo cho admin
            try {
                const { sendEmail } = require('../utils/mailer');
                await sendEmail(
                    process.env.ADMIN_EMAIL || 'admin@tkdk.com',
                    'Đăng ký xe mới cần xét duyệt',
                    `Có một xe mới vừa được đăng ký và đang chờ xét duyệt.<br>
                    <b>Thông tin xe:</b><br>
                    Tên xe: ${ten_xe}<br>
                    Biển số: ${license_plate}<br>
                    Loại xe: ${seats} chỗ<br>
                    Vui lòng truy cập vào trang quản trị để xem chi tiết và xét duyệt.`
                );
            } catch (emailError) {
                console.error('Lỗi khi gửi email thông báo:', emailError);
                // Không để lỗi gửi email ảnh hưởng đến quá trình đăng ký
            }
            
            // Kết quả trả về
            res.status(201).json({
                success: true,
                message: 'Đăng ký xe mới thành công. Xe của bạn đang chờ xét duyệt.',
                data: {
                    id: xe_id,
                    ten_xe,
                    hang_xe: brand,
                    bien_so: license_plate,
                    tinh_trang: 'cho_duyet'
                }
            });
        } catch (error) {
            console.error('Lỗi khi tạo xe mới:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng ký xe mới',
                error: error.message
            });
        }
    },

    // Cập nhật thông tin xe
    updateCar: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Các field cần cập nhật
            const { 
                ten_xe, hang_xe, loai_xe, bien_so, nam_san_xuat, 
                mau_xe, so_cho, hop_so, nhien_lieu, gia_thue, 
                mo_ta, tinh_trang, loai_dich_vu, dia_chi_xe
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
            }
            
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
            `, [
                ten_xe, hang_xe, loai_xe, bien_so, nam_san_xuat,
                mau_xe, so_cho, hop_so, nhien_lieu, gia_thue,
                mo_ta, tinh_trang, loai_dich_vu, dia_chi_xe, id
            ]);
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật xe thành công',
                data: {
                    id: parseInt(id),
                    ...req.body
                }
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
    },

    // Duyệt xe
    approveCar: async (req, res) => {
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
            
            // Kiểm tra quyền (chỉ admin mới được duyệt xe)
            if (req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền duyệt xe'
                });
            }
            
            // Kiểm tra xem xe đã được duyệt hay chưa
            if (existingCar[0].tinh_trang !== 'cho_duyet') {
                return res.status(400).json({
                    success: false,
                    message: 'Xe này không ở trạng thái chờ duyệt'
                });
            }
            
            // Cập nhật trạng thái xe thành "sẵn sàng"
            await db.execute(
                'UPDATE xe SET tinh_trang = ?, ngay_duyet = NOW() WHERE id = ?', 
                ['san_sang', id]
            );
            
            // Lấy thông tin chủ xe
            const [owner] = await db.execute(
                'SELECT id, ho_ten, email FROM nguoi_dung WHERE id = ?',
                [existingCar[0].chu_xe_id]
            );
            
            // Tạo thông báo cho chủ xe
            if (owner.length > 0) {
                await db.execute(`
                    INSERT INTO thong_bao (
                        nguoi_dung_id, tieu_de, noi_dung, loai_thong_bao, 
                        tham_chieu_id, ngay_tao, da_doc
                    ) VALUES (?, ?, ?, ?, ?, NOW(), 0)
                `, [
                    owner[0].id,
                    'Xe của bạn đã được duyệt',
                    `Xe ${existingCar[0].ten_xe} (${existingCar[0].bien_so}) đã được chấp nhận và sẵn sàng cho thuê.`,
                    'car_approval',
                    id
                ]);
                
                // Gửi email thông báo cho chủ xe (nếu có module gửi email)
                try {
                    const { sendEmail } = require('../utils/mailer');
                    await sendEmail(
                        owner[0].email,
                        'Xe của bạn đã được duyệt',
                        `Xe ${existingCar[0].ten_xe} (${existingCar[0].bien_so}) đã được chấp nhận và sẵn sàng cho thuê. 
                        Xe của bạn bây giờ đã có trong danh sách xe cho thuê và khách hàng có thể đặt xe của bạn.
                        <br><br>
                        Trân trọng,<br>
                        TKĐK Carental`
                    );
                } catch (emailError) {
                    console.error('Lỗi khi gửi email thông báo:', emailError);
                    // Không để lỗi gửi email ảnh hưởng đến quá trình duyệt xe
                }
            }
            
            res.status(200).json({
                success: true,
                message: 'Duyệt xe thành công',
                data: {
                    id: parseInt(id),
                    tinh_trang: 'san_sang',
                    ngay_duyet: new Date()
                }
            });
        } catch (error) {
            console.error('Lỗi khi duyệt xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi duyệt xe',
                error: error.message
            });
        }
    },

    // Từ chối xe
    rejectCar: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            
            // Kiểm tra xe tồn tại
            const [existingCar] = await db.execute('SELECT * FROM xe WHERE id = ?', [id]);
            
            if (!existingCar.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }
            
            // Kiểm tra quyền (chỉ admin mới được từ chối xe)
            if (req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền từ chối xe'
                });
            }
            
            // Kiểm tra xem xe đã được duyệt hay chưa
            if (existingCar[0].tinh_trang !== 'cho_duyet') {
                return res.status(400).json({
                    success: false,
                    message: 'Xe này không ở trạng thái chờ duyệt'
                });
            }
            
            // Yêu cầu lý do từ chối
            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp lý do từ chối'
                });
            }
            
            // Cập nhật trạng thái xe thành "bị từ chối"
            await db.execute(
                'UPDATE xe SET tinh_trang = ?, ly_do_tu_choi = ?, ngay_duyet = NOW() WHERE id = ?', 
                ['bi_tu_choi', reason, id]
            );
            
            // Lấy thông tin chủ xe
            const [owner] = await db.execute(
                'SELECT id, ho_ten, email FROM nguoi_dung WHERE id = ?',
                [existingCar[0].chu_xe_id]
            );
            
            // Tạo thông báo cho chủ xe
            if (owner.length > 0) {
                await db.execute(`
                    INSERT INTO thong_bao (
                        nguoi_dung_id, tieu_de, noi_dung, loai_thong_bao, 
                        tham_chieu_id, ngay_tao, da_doc
                    ) VALUES (?, ?, ?, ?, ?, NOW(), 0)
                `, [
                    owner[0].id,
                    'Xe của bạn không được duyệt',
                    `Xe ${existingCar[0].ten_xe} (${existingCar[0].bien_so}) đã bị từ chối. Lý do: ${reason}`,
                    'car_rejection',
                    id
                ]);
                
                // Gửi email thông báo cho chủ xe (nếu có module gửi email)
                try {
                    const { sendEmail } = require('../utils/mailer');
                    await sendEmail(
                        owner[0].email,
                        'Xe của bạn không được duyệt',
                        `Xe ${existingCar[0].ten_xe} (${existingCar[0].bien_so}) đã bị từ chối.
                        <br><br>
                        <b>Lý do từ chối:</b><br>
                        ${reason}
                        <br><br>
                        Bạn có thể chỉnh sửa thông tin xe và gửi lại yêu cầu.
                        <br><br>
                        Trân trọng,<br>
                        TKĐK Carental`
                    );
                } catch (emailError) {
                    console.error('Lỗi khi gửi email thông báo:', emailError);
                    // Không để lỗi gửi email ảnh hưởng đến quá trình từ chối xe
                }
            }
            
            res.status(200).json({
                success: true,
                message: 'Từ chối xe thành công',
                data: {
                    id: parseInt(id),
                    tinh_trang: 'bi_tu_choi',
                    ly_do_tu_choi: reason,
                    ngay_duyet: new Date()
                }
            });
        } catch (error) {
            console.error('Lỗi khi từ chối xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi từ chối xe',
                error: error.message
            });
        }
    }
};

module.exports = carController;