const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const db = require('../data/db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Cấu hình storage cho multer (upload avatar)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/avatars');
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

// Kiểm tra file upload
const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận các file ảnh
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh'), false);
    }
};

// Khởi tạo middleware upload
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
    fileFilter: fileFilter
});

// Tạo JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id,  // Đảm bảo luôn sử dụng id, không phải userId 
            email: user.email, 
            loai_tai_khoan: user.loai_tai_khoan 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const authController = {
    // Xử lý đăng ký
    register: async (req, res) => {
        try {
            const { ho_ten, email, mat_khau, xac_nhan_mat_khau, so_dien_thoai, gioi_tinh } = req.body;

            // Kiểm tra các trường bắt buộc
            if (!ho_ten || !email || !mat_khau || !xac_nhan_mat_khau) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }

            // Kiểm tra mật khẩu xác nhận
            if (mat_khau !== xac_nhan_mat_khau) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu xác nhận không khớp'
                });
            }

            // Kiểm tra email đã tồn tại chưa
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng'
                });
            }

            // Tạo người dùng mới
            const newUser = await User.create({
                ho_ten,
                email,
                mat_khau,
                so_dien_thoai,
                gioi_tinh
            });

            // Tạo token
            const token = generateToken(newUser);

            // Gửi phản hồi thành công
            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công',
                user: {
                    id: newUser.id,
                    ho_ten: newUser.ho_ten,
                    email: newUser.email
                },
                token
            });
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng ký',
                error: error.message
            });
        }
    },

    // Xử lý đăng nhập
    login: async (req, res) => {
        try {
            const { email, mat_khau, remember } = req.body;

            // Kiểm tra thông tin đăng nhập
            if (!email || !mat_khau) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
            }

            // Xác thực người dùng
            const user = await User.authenticate(email, mat_khau);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không chính xác'
                });
            }

            // Kiểm tra trạng thái tài khoản
            if (user.trang_thai !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị vô hiệu hóa'
                });
            }

            // Tạo token
            const token = generateToken(user);

            // Gửi phản hồi thành công
            res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công',
                user: {
                    id: user.id,
                    ho_ten: user.ho_ten,
                    email: user.email,
                    loai_tai_khoan: user.loai_tai_khoan
                },
                token,
                remember
            });
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng nhập',
                error: error.message
            });
        }
    },

    // Xử lý đăng xuất
    logout: async (req, res) => {
        try {
            // Đơn giản chỉ trả về thành công, xử lý token sẽ được thực hiện ở phía client
            res.status(200).json({
                success: true,
                message: 'Đăng xuất thành công'
            });
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đăng xuất',
                error: error.message
            });
        }
    },

    // Lấy thông tin người dùng hiện tại
    getCurrentUser: async (req, res) => {
        try {
            // req.user được set từ middleware xác thực
            const userId = req.user.id;
            
            // Thực hiện truy vấn để lấy thông tin người dùng
            const [rows] = await db.execute(
                'SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, anh_dai_dien, dia_chi, loai_tai_khoan, trang_thai, ngay_tao FROM nguoi_dung WHERE id = ?',
                [userId]
            );

            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                user: rows[0]
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error.message);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông tin người dùng',
                error: error.message
            });
        }
    },
    
    // Cập nhật thông tin người dùng
    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { ho_ten, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi } = req.body;
            
            // Kiểm tra các trường bắt buộc
            if (!ho_ten || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Họ tên và email là bắt buộc'
                });
            }
            
            // Kiểm tra email đã tồn tại với người dùng khác chưa
            const [existingUsers] = await db.execute(
                'SELECT id FROM nguoi_dung WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng bởi tài khoản khác'
                });
            }
            
            // Cập nhật thông tin người dùng
            await db.execute(
                `UPDATE nguoi_dung SET 
                ho_ten = ?, 
                email = ?, 
                so_dien_thoai = ?, 
                ngay_sinh = ?, 
                gioi_tinh = ?, 
                dia_chi = ?,
                ngay_cap_nhat = NOW()
                WHERE id = ?`,
                [ho_ten, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi, userId]
            );
            
            // Lấy thông tin người dùng đã cập nhật
            const [updatedUser] = await db.execute(
                'SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, ngay_sinh, anh_dai_dien, dia_chi FROM nguoi_dung WHERE id = ?',
                [userId]
            );
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin thành công',
                user: updatedUser[0]
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông tin',
                error: error.message
            });
        }
    },
    
    // Upload avatar
    uploadAvatar: async (req, res) => {
        try {
            // Middleware upload.single('avatar') được sử dụng trước khi gọi hàm này
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được upload'
                });
            }
            
            const userId = req.user.id;
            const avatarPath = `/public/uploads/avatars/${req.file.filename}`;
            
            // Lấy thông tin avatar cũ trước khi cập nhật
            const [currentUser] = await db.execute(
                'SELECT anh_dai_dien FROM nguoi_dung WHERE id = ?',
                [userId]
            );
            
            const oldAvatarPath = currentUser[0].anh_dai_dien;
            
            // Cập nhật đường dẫn avatar mới vào database
            await db.execute(
                'UPDATE nguoi_dung SET anh_dai_dien = ?, ngay_cap_nhat = NOW() WHERE id = ?',
                [avatarPath, userId]
            );
            
            // Xóa avatar cũ nếu không phải avatar mặc định
            if (oldAvatarPath && !oldAvatarPath.includes('default-avatar') && fs.existsSync(path.join(__dirname, '..', oldAvatarPath))) {
                fs.unlinkSync(path.join(__dirname, '..', oldAvatarPath));
            }
            
            res.status(200).json({
                success: true,
                message: 'Upload avatar thành công',
                avatarPath: avatarPath
            });
        } catch (error) {
            console.error('Lỗi khi upload avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi upload avatar',
                error: error.message
            });
        }
    },
    
    // Lấy thông tin GPLX của người dùng
    getDriverLicense: async (req, res) => {
        try {
            // Kiểm tra xem bảng giay_phep_lai_xe có tồn tại không
            try {
                const [tableExistsCheck] = await db.execute(`
                    SELECT COUNT(*) as table_exists 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'giay_phep_lai_xe'
                `);
                
                const tableExists = tableExistsCheck[0].table_exists > 0;
                
                // Nếu bảng không tồn tại, trả về thông báo lỗi 404 một cách an toàn
                if (!tableExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy thông tin GPLX - Bảng dữ liệu chưa được tạo'
                    });
                }
            } catch (error) {
                console.error('Lỗi khi kiểm tra bảng giay_phep_lai_xe:', error);
                return res.status(404).json({
                    success: false,
                    message: 'Không thể kiểm tra thông tin GPLX'
                });
            }
            
            const userId = req.user.id;
            
            // Lấy thông tin GPLX từ database
            const [license] = await db.execute(
                'SELECT * FROM giay_phep_lai_xe WHERE nguoi_dung_id = ?',
                [userId]
            );
            
            if (license.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông tin GPLX'
                });
            }
            
            res.status(200).json({
                success: true,
                license: license[0]
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin GPLX:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông tin GPLX',
                error: error.message
            });
        }
    },
    
    // Lấy thống kê người dùng
    getUserStats: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Lấy số chuyến đã đặt
            const [totalBookings] = await db.execute(
                'SELECT COUNT(*) as total FROM dat_xe WHERE khach_hang_id = ?',
                [userId]
            );
            
            // Lấy số chuyến đã hoàn thành
            const [completedBookings] = await db.execute(
                'SELECT COUNT(*) as completed FROM dat_xe WHERE khach_hang_id = ? AND trang_thai = "da_tra"',
                [userId]
            );
            
            // Tính tỷ lệ hoàn thành
            const total = totalBookings[0].total;
            const completed = completedBookings[0].completed;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            res.status(200).json({
                success: true,
                stats: {
                    totalBookings: total,
                    completedBookings: completed,
                    completionRate: completionRate
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thống kê người dùng',
                error: error.message
            });
        }
    },

    // Cập nhật thông tin GPLX
    updateDriverLicense: async (req, res) => {
        try {
            const userId = req.user.id;
            const { 
                so_gplx, 
                ho_ten, 
                ngay_sinh, 
                hang, 
                ngay_cap, 
                ngay_het_han, 
                noi_cap 
            } = req.body;
            
            // Kiểm tra các trường bắt buộc
            if (!so_gplx || !ho_ten || !hang || !ngay_cap || !ngay_het_han) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }
            
            console.log('Dữ liệu nhận được:', req.body);
            console.log('Files nhận được:', req.files);
            
            // Xử lý upload ảnh
            let anhMatTruoc = null;
            let anhMatSau = null;
            
            // Kiểm tra xem có file ảnh mặt trước được upload không
            if (req.files && req.files.anh_mat_truoc && req.files.anh_mat_truoc.length > 0) {
                const file = req.files.anh_mat_truoc[0];
                anhMatTruoc = `/public/uploads/licenses/${file.filename}`;
                console.log('Ảnh mặt trước:', anhMatTruoc);
            }
            
            // Kiểm tra xem có file ảnh mặt sau được upload không
            if (req.files && req.files.anh_mat_sau && req.files.anh_mat_sau.length > 0) {
                const file = req.files.anh_mat_sau[0];
                anhMatSau = `/public/uploads/licenses/${file.filename}`;
                console.log('Ảnh mặt sau:', anhMatSau);
            }
            
            // Kiểm tra xem người dùng đã có GPLX trong hệ thống chưa
            const [existingLicense] = await db.execute(
                'SELECT * FROM giay_phep_lai_xe WHERE nguoi_dung_id = ?',
                [userId]
            );
            
            // Lưu thông tin GPLX cũ nếu có
            let oldFrontImage = null;
            let oldBackImage = null;
            
            if (existingLicense.length > 0) {
                console.log('GPLX đã tồn tại, đang cập nhật...');
                oldFrontImage = existingLicense[0].anh_mat_truoc;
                oldBackImage = existingLicense[0].anh_mat_sau;
                
                // Nếu không upload ảnh mới, giữ lại ảnh cũ
                if (!anhMatTruoc && oldFrontImage) {
                    anhMatTruoc = oldFrontImage;
                }
                if (!anhMatSau && oldBackImage) {
                    anhMatSau = oldBackImage;
                }
                
                // Cập nhật thông tin GPLX
                let updateQuery = `
                    UPDATE giay_phep_lai_xe SET
                    so_gplx = ?,
                    ho_ten = ?,
                    ngay_sinh = ?,
                    hang = ?,
                    ngay_cap = ?,
                    ngay_het_han = ?,
                    noi_cap = ?,
                    da_xac_thuc = 0,
                    ngay_cap_nhat = NOW()
                `;
                
                // Tạo mảng tham số động dựa trên việc có cập nhật ảnh hay không
                const params = [
                    so_gplx, ho_ten, ngay_sinh, hang, ngay_cap, ngay_het_han, noi_cap
                ];
                
                // Thêm điều kiện cập nhật ảnh nếu có
                if (anhMatTruoc) {
                    updateQuery += ', anh_mat_truoc = ?';
                    params.push(anhMatTruoc);
                }
                
                if (anhMatSau) {
                    updateQuery += ', anh_mat_sau = ?';
                    params.push(anhMatSau);
                }
                
                // Thêm điều kiện WHERE
                updateQuery += ' WHERE nguoi_dung_id = ?';
                params.push(userId);
                
                console.log('Query cập nhật:', updateQuery);
                await db.execute(updateQuery, params);
            } else {
                console.log('Tạo mới GPLX...');
                // Tạo mới thông tin GPLX
                await db.execute(
                    `INSERT INTO giay_phep_lai_xe (
                        nguoi_dung_id, so_gplx, ho_ten, ngay_sinh, hang, 
                        ngay_cap, ngay_het_han, noi_cap, anh_mat_truoc, 
                        anh_mat_sau, da_xac_thuc, ngay_tao, ngay_cap_nhat
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                    [
                        userId, so_gplx, ho_ten, ngay_sinh, hang, 
                        ngay_cap, ngay_het_han, noi_cap, anhMatTruoc, anhMatSau
                    ]
                );
            }
            
            // Xóa ảnh cũ nếu có cập nhật ảnh mới
            if (anhMatTruoc && oldFrontImage && anhMatTruoc !== oldFrontImage) {
                const oldImagePath = path.join(__dirname, '..', oldFrontImage);
                console.log('Xóa ảnh cũ:', oldImagePath);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            if (anhMatSau && oldBackImage && anhMatSau !== oldBackImage) {
                const oldImagePath = path.join(__dirname, '..', oldBackImage);
                console.log('Xóa ảnh cũ:', oldImagePath);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            // Lấy thông tin GPLX đã cập nhật
            const [updatedLicense] = await db.execute(
                'SELECT * FROM giay_phep_lai_xe WHERE nguoi_dung_id = ?',
                [userId]
            );
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin GPLX thành công',
                license: updatedLicense[0]
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật GPLX:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông tin GPLX',
                error: error.message
            });
        }
    },

    // Xử lý quên mật khẩu
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email'
                });
            }
            
            // Kiểm tra email có tồn tại trong hệ thống không
            const [user] = await db.execute(
                'SELECT id, ho_ten FROM nguoi_dung WHERE email = ?',
                [email]
            );
            
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Email không tồn tại trong hệ thống'
                });
            }
            
            // Trong thực tế, cần tạo token reset mật khẩu và gửi email
            // Đây là phiên bản đơn giản cho demo
            const resetToken = jwt.sign(
                { id: user[0].id, email: email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            
            // Lưu token và thời gian hết hạn vào database
            await db.execute(
                'UPDATE nguoi_dung SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
                [resetToken, user[0].id]
            );
            
            // Trong thực tế, sẽ gửi email với link reset password
            // Nhưng ở đây chỉ trả về token để demo
            res.status(200).json({
                success: true,
                message: 'Kiểm tra email của bạn để lấy liên kết đặt lại mật khẩu',
                resetToken: resetToken // Trong thực tế không nên trả về token này
            });
        } catch (error) {
            console.error('Lỗi quên mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xử lý yêu cầu quên mật khẩu',
                error: error.message
            });
        }
    },
    
    // Xử lý reset mật khẩu
    resetPassword: async (req, res) => {
        try {
            const { token, newPassword, confirmPassword } = req.body;
            
            if (!token || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin'
                });
            }
            
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu xác nhận không khớp'
                });
            }
            
            // Xác thực token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn'
                });
            }
            
            // Kiểm tra người dùng và token trong database
            const [user] = await db.execute(
                'SELECT id FROM nguoi_dung WHERE id = ? AND reset_token = ? AND reset_token_expiry > NOW()',
                [decoded.id, token]
            );
            
            if (user.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
                });
            }
            
            // Cập nhật mật khẩu mới
            // Trong thực tế, cần mã hóa mật khẩu trước khi lưu
            const hashedPassword = await User.hashPassword(newPassword);
            
            await db.execute(
                'UPDATE nguoi_dung SET mat_khau = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
                [hashedPassword, decoded.id]
            );
            
            res.status(200).json({
                success: true,
                message: 'Mật khẩu đã được đặt lại thành công'
            });
        } catch (error) {
            console.error('Lỗi reset mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi đặt lại mật khẩu',
                error: error.message
            });
        }
    }
};

module.exports = authController;