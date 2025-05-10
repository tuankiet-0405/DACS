const db = require('../data/db');

// Controller xử lý thông báo
const NotificationController = {
    // Tạo thông báo mới
    createNotification: async (req, res) => {
        try {
            const { tieu_de, noi_dung, loai_thong_bao, lien_ket, nguoi_nhan_id } = req.body;
            
            // Kiểm tra dữ liệu đầu vào
            if (!tieu_de || !noi_dung) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin thông báo'
                });
            }

            // Lấy ID của người gửi (người dùng hiện tại)
            const nguoi_gui_id = req.user ? req.user.id : null;

            console.log(`Tạo thông báo: ${tieu_de} - ${loai_thong_bao}`);
            console.log(`Người gửi: ${nguoi_gui_id}, Người nhận: ${nguoi_nhan_id || 'Admin'}`);

            // Nếu loại thông báo là thông báo cho admin và không có người nhận cụ thể
            if ((loai_thong_bao === 'car_approval' || loai_thong_bao === 'car_registration') && !nguoi_nhan_id) {
                // Gửi thông báo cho tất cả admin
                try {
                    // Lấy danh sách admin
                    const [admins] = await db.execute(
                        'SELECT id FROM nguoi_dung WHERE loai_tai_khoan = ? AND trang_thai = ?',
                        ['admin', 'active']
                    );
                    
                    console.log(`Tìm thấy ${admins.length} admin để gửi thông báo về ${loai_thong_bao}`);

                    if (admins.length === 0) {
                        console.log('Không tìm thấy admin nào trong hệ thống');
                        return res.status(200).json({
                            success: false,
                            message: 'Không tìm thấy admin nào để gửi thông báo'
                        });
                    }

                    // Gửi thông báo cho mỗi admin
                    let notificationCount = 0;
                    for (const admin of admins) {
                        console.log(`Đang gửi thông báo ${loai_thong_bao} đến admin ID: ${admin.id}`);
                        const [insertResult] = await db.execute(`
                            INSERT INTO thong_bao 
                            (nguoi_gui_id, nguoi_nhan_id, tieu_de, noi_dung, loai_thong_bao, lien_ket, da_doc, ngay_tao)
                            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                        `, [nguoi_gui_id, admin.id, tieu_de, noi_dung, loai_thong_bao, lien_ket, 0]);
                        
                        if (insertResult.affectedRows > 0) {
                            notificationCount++;
                        }
                    }

                    return res.status(201).json({
                        success: true,
                        message: `Đã tạo thông báo cho ${notificationCount} admin`
                    });
                } catch (error) {
                    console.error('Lỗi khi tạo thông báo cho admin:', error);
                    throw error;
                }
            } else {
                // Tạo thông báo thông thường cho một người nhận cụ thể
                const [result] = await db.execute(`
                    INSERT INTO thong_bao 
                    (nguoi_gui_id, nguoi_nhan_id, tieu_de, noi_dung, loai_thong_bao, lien_ket, da_doc, ngay_tao)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `, [nguoi_gui_id, nguoi_nhan_id, tieu_de, noi_dung, loai_thong_bao, lien_ket, 0]);

                return res.status(201).json({
                    success: true,
                    data: { id: result.insertId },
                    message: 'Đã tạo thông báo thành công'
                });
            }
        } catch (error) {
            console.error('Lỗi khi tạo thông báo:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tạo thông báo',
                error: error.message
            });
        }
    },

    // Lấy tất cả thông báo của admin
    getAdminNotifications: async (req, res) => {
        try {
            // Kiểm tra xem người dùng có phải admin không
            if (req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập'
                });
            }

            // Lấy thông báo cho admin từ database
            const [notifications] = await db.execute(`
                SELECT t.*, u.ho_ten, u.email, u.so_dien_thoai
                FROM thong_bao t
                LEFT JOIN nguoi_dung u ON t.nguoi_gui_id = u.id
                WHERE t.nguoi_nhan_id = ? 
                   OR t.loai_thong_bao = 'car_approval' 
                   OR t.loai_thong_bao = 'car_registration'
                ORDER BY t.ngay_tao DESC
                LIMIT 50
            `, [req.user.id]);

            return res.status(200).json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông báo admin:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông báo',
                error: error.message
            });
        }
    },

    // Lấy tất cả thông báo của một người dùng
    getUserNotifications: async (req, res) => {
        try {
            // Lấy thông báo từ database
            const [notifications] = await db.execute(`
                SELECT *
                FROM thong_bao
                WHERE nguoi_nhan_id = ?
                ORDER BY ngay_tao DESC
                LIMIT 50
            `, [req.user.id]);

            return res.status(200).json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông báo người dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông báo',
                error: error.message
            });
        }
    },

    // Đánh dấu đã đọc một thông báo
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;

            // Cập nhật trạng thái đã đọc
            const [result] = await db.execute(`
                UPDATE thong_bao
                SET da_doc = 1
                WHERE id = ? AND (nguoi_nhan_id = ? OR ? = 1)
            `, [id, req.user.id, req.user.loai_tai_khoan === 'admin']);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông báo hoặc bạn không có quyền'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Đã đánh dấu thông báo là đã đọc'
            });
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc thông báo:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông báo',
                error: error.message
            });
        }
    },

    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async (req, res) => {
        try {
            // Cập nhật tất cả thông báo chưa đọc của người dùng
            let result;
            if (req.user.loai_tai_khoan === 'admin') {
                [result] = await db.execute(`
                    UPDATE thong_bao
                    SET da_doc = 1
                    WHERE nguoi_nhan_id = ? AND da_doc = 0
                `, [req.user.id]);
            } else {
                [result] = await db.execute(`
                    UPDATE thong_bao
                    SET da_doc = 1
                    WHERE nguoi_nhan_id = ? AND da_doc = 0
                `, [req.user.id]);
            }

            return res.status(200).json({
                success: true,
                message: `Đã đánh dấu đọc ${result.affectedRows} thông báo`,
                count: result.affectedRows
            });
        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông báo',
                error: error.message
            });
        }
    },

    // Xóa một thông báo
    deleteNotification: async (req, res) => {
        try {
            const { id } = req.params;

            // Xóa thông báo
            const [result] = await db.execute(`
                DELETE FROM thong_bao
                WHERE id = ? AND (nguoi_nhan_id = ? OR ? = 1)
            `, [id, req.user.id, req.user.loai_tai_khoan === 'admin']);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông báo hoặc bạn không có quyền'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Đã xóa thông báo thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa thông báo:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa thông báo',
                error: error.message
            });
        }
    },

    // Lấy số lượng thông báo chưa đọc
    getUnreadCount: async (req, res) => {
        try {
            // Lấy số lượng thông báo chưa đọc
            const [result] = await db.execute(`
                SELECT COUNT(*) as count
                FROM thong_bao
                WHERE nguoi_nhan_id = ? AND da_doc = 0
            `, [req.user.id]);

            return res.status(200).json({
                success: true,
                count: result[0].count
            });
        } catch (error) {
            console.error('Lỗi khi lấy số lượng thông báo chưa đọc:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy số lượng thông báo',
                error: error.message
            });
        }
    }
};

module.exports = NotificationController;