const db = require('../data/db');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const path = require('path');
const fs = require('fs');

const userController = {
    // Lấy danh sách người dùng (Admin)
    getAllUsers: async (req, res) => {
        try {
            const [users] = await db.execute(`
                SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, ngay_sinh, 
                       anh_dai_dien, dia_chi, loai_tai_khoan, trang_thai, ngay_tao
                FROM nguoi_dung
                ORDER BY ngay_tao DESC
            `);

            res.status(200).json({
                success: true,
                message: 'Lấy danh sách người dùng thành công',
                data: users
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
                error: error.message
            });
        }
    },

    // Lấy thông tin chi tiết người dùng (Admin)
    getUserById: async (req, res) => {
        try {
            const userId = req.params.id;

            const [user] = await db.execute(`
                SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, ngay_sinh, 
                       anh_dai_dien, dia_chi, loai_tai_khoan, trang_thai, ngay_tao
                FROM nguoi_dung
                WHERE id = ?
            `, [userId]);

            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Lấy thông tin người dùng thành công',
                data: user[0]
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông tin người dùng',
                error: error.message
            });
        }
    },

    // Thêm người dùng mới (Admin)
    createUser: async (req, res) => {
        try {
            const { ho_ten, email, mat_khau, xac_nhan_mat_khau, so_dien_thoai, gioi_tinh, loai_tai_khoan } = req.body;

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

            // Mã hóa mật khẩu
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(mat_khau, salt);

            // Thêm người dùng mới
            const [result] = await db.execute(`
                INSERT INTO nguoi_dung (ho_ten, email, mat_khau, so_dien_thoai, gioi_tinh, loai_tai_khoan)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [ho_ten, email, hashedPassword, so_dien_thoai, gioi_tinh, loai_tai_khoan || 'user']);

            // Lấy thông tin người dùng mới thêm
            const [newUser] = await db.execute(`
                SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, loai_tai_khoan, trang_thai
                FROM nguoi_dung
                WHERE id = ?
            `, [result.insertId]);

            res.status(201).json({
                success: true,
                message: 'Thêm người dùng thành công',
                data: newUser[0]
            });
        } catch (error) {
            console.error('Lỗi khi thêm người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi thêm người dùng',
                error: error.message
            });
        }
    },    // Cập nhật thông tin người dùng (Admin hoặc người dùng tự cập nhật thông tin của mình)
    updateUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const currentUserId = req.user.id;
            const isAdmin = req.user.loai_tai_khoan === 'admin' || req.user.loaiTaiKhoan === 'admin';
            
            // Lấy thông tin từ request
            const { ho_ten, email, so_dien_thoai, gioi_tinh, dia_chi, loai_tai_khoan, trang_thai } = req.body;

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

            let queryParams = [];
            let queryFields = '';
            
            // Phân quyền: Người dùng thường chỉ cập nhật thông tin cá nhân
            if (!isAdmin && userId.toString() === currentUserId.toString()) {
                // Người dùng thường chỉ được cập nhật thông tin cá nhân, không được cập nhật loại tài khoản và trạng thái
                queryFields = `
                    UPDATE nguoi_dung SET 
                    ho_ten = ?, 
                    email = ?, 
                    so_dien_thoai = ?, 
                    gioi_tinh = ?, 
                    dia_chi = ?,
                    ngay_cap_nhat = NOW()
                    WHERE id = ?
                `;
                
                queryParams = [
                    ho_ten || null,
                    email || null,
                    so_dien_thoai === undefined ? null : so_dien_thoai,
                    gioi_tinh === undefined ? null : gioi_tinh,
                    dia_chi === undefined ? null : dia_chi,
                    userId
                ];
            } 
            // Admin có thể cập nhật tất cả thông tin
            else if (isAdmin) {
                queryFields = `
                    UPDATE nguoi_dung SET 
                    ho_ten = ?, 
                    email = ?, 
                    so_dien_thoai = ?, 
                    gioi_tinh = ?, 
                    dia_chi = ?,
                    loai_tai_khoan = ?,
                    trang_thai = ?,
                    ngay_cap_nhat = NOW()
                    WHERE id = ?
                `;
                
                queryParams = [
                    ho_ten || null,
                    email || null,
                    so_dien_thoai === undefined ? null : so_dien_thoai,
                    gioi_tinh === undefined ? null : gioi_tinh,
                    dia_chi === undefined ? null : dia_chi,
                    loai_tai_khoan === undefined ? null : loai_tai_khoan,
                    trang_thai === undefined ? null : trang_thai,
                    userId
                ];
            } else {
                // Trường hợp này không nên xảy ra vì đã có middleware canEditUserInfo
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền cập nhật thông tin của người dùng này'
                });
            }            // Cập nhật thông tin người dùng
            await db.execute(queryFields, queryParams);

            // Lấy thông tin người dùng đã cập nhật
            const [updatedUser] = await db.execute(`
                SELECT id, ho_ten, email, so_dien_thoai, gioi_tinh, 
                       anh_dai_dien, dia_chi, loai_tai_khoan, trang_thai
                FROM nguoi_dung
                WHERE id = ?
            `, [userId]);

            res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin người dùng thành công',
                data: updatedUser[0]
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng',
                error: error.message
            });
        }
    },    // Thay đổi mật khẩu người dùng (Admin hoặc người dùng tự đổi mật khẩu của mình)
    changeUserPassword: async (req, res) => {
        try {
            const userId = req.params.id;
            const currentUserId = req.user.id;
            const isAdmin = req.user.loai_tai_khoan === 'admin' || req.user.loaiTaiKhoan === 'admin';
            
            // Người dùng thường phải cung cấp mật khẩu hiện tại khi đổi mật khẩu
            // Admin không cần mật khẩu hiện tại khi đổi mật khẩu cho người dùng khác
            const { mat_khau_cu, mat_khau, xac_nhan_mat_khau } = req.body;
            
            // Kiểm tra nếu người dùng đang đổi mật khẩu của chính mình (không phải admin)
            if (!isAdmin && userId.toString() === currentUserId.toString() && !mat_khau_cu) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mật khẩu hiện tại'
                });
            }

            // Kiểm tra các trường bắt buộc
            if (!mat_khau || !xac_nhan_mat_khau) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mật khẩu mới và xác nhận mật khẩu'
                });
            }

            // Kiểm tra mật khẩu xác nhận
            if (mat_khau !== xac_nhan_mat_khau) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu xác nhận không khớp'
                });
            }
            
            // Nếu là người dùng thường đổi mật khẩu của chính mình, kiểm tra mật khẩu hiện tại
            if (!isAdmin && userId.toString() === currentUserId.toString()) {
                // Lấy thông tin người dùng
                const [user] = await db.execute(
                    'SELECT mat_khau FROM nguoi_dung WHERE id = ?',
                    [userId]
                );
                
                if (user.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy người dùng'
                    });
                }
                
                // Kiểm tra mật khẩu hiện tại
                const isMatch = await bcrypt.compare(mat_khau_cu, user[0].mat_khau);
                if (!isMatch) {
                    return res.status(400).json({
                        success: false,
                        message: 'Mật khẩu hiện tại không chính xác'
                    });
                }
            }

            // Mã hóa mật khẩu mới
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(mat_khau, salt);

            // Cập nhật mật khẩu
            await db.execute(`
                UPDATE nguoi_dung SET 
                mat_khau = ?,
                ngay_cap_nhat = NOW()
                WHERE id = ?
            `, [hashedPassword, userId]);

            res.status(200).json({
                success: true,
                message: 'Cập nhật mật khẩu thành công'
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật mật khẩu',
                error: error.message
            });
        }
    },    // Xóa người dùng (Admin)
    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            
            // Kiểm tra xem người dùng có tồn tại không
            const [user] = await db.execute('SELECT * FROM nguoi_dung WHERE id = ?', [userId]);
            
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }
            
            // Kiểm tra xem người dùng có xe nào không
            const [userCars] = await db.execute('SELECT id FROM xe WHERE chu_xe_id = ?', [userId]);
            
            if (userCars.length > 0) {
                // Set NULL cho tất cả các xe của người dùng này
                await db.execute('UPDATE xe SET chu_xe_id = NULL WHERE chu_xe_id = ?', [userId]);
            }
            
            // Kiểm tra và cập nhật các bảng liên quan khác
            // Cần xử lý các liên kết khóa ngoại khác nếu có
              // Kiểm tra đánh giá
            await db.execute('UPDATE danh_gia SET nguoi_dung_id = NULL WHERE nguoi_dung_id = ?', [userId]);
            
            // Kiểm tra đặt xe - chỉ đặt trạng thái hủy cho các đơn đặt chưa hoàn thành
            await db.execute('UPDATE dat_xe SET trang_thai = "da_huy" WHERE khach_hang_id = ? AND trang_thai NOT IN ("da_tra", "da_huy")', [userId]);
            
            // Cuối cùng, xóa người dùng
            await db.execute('DELETE FROM nguoi_dung WHERE id = ?', [userId]);
            
            res.status(200).json({
                success: true,
                message: 'Xóa người dùng thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa người dùng',
                error: error.message
            });
        }
    },

    // Lấy thống kê người dùng
    getUserStats: async (req, res) => {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN loai_tai_khoan = 'admin' THEN 1 ELSE 0 END) as admin_count,
                    SUM(CASE WHEN loai_tai_khoan = 'user' THEN 1 ELSE 0 END) as user_count,
                    SUM(CASE WHEN trang_thai = 'active' THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN trang_thai = 'inactive' THEN 1 ELSE 0 END) as inactive_count,
                    SUM(CASE WHEN trang_thai = 'banned' THEN 1 ELSE 0 END) as banned_count
                FROM nguoi_dung
            `);

            res.status(200).json({
                success: true,
                message: 'Lấy thống kê người dùng thành công',
                data: {
                    totalUsers: stats[0].total_users || 0,
                    adminCount: stats[0].admin_count || 0,
                    userCount: stats[0].user_count || 0,
                    activeCount: stats[0].active_count || 0,
                    inactiveCount: stats[0].inactive_count || 0,
                    bannedCount: stats[0].banned_count || 0
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
    }
};

module.exports = userController;