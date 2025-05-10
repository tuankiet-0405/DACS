const db = require('../data/db');

// Controller xử lý thông báo
const NotificationController = {
    // Lấy tất cả thông báo của admin
    getAdminNotifications: async (req, res) => {
        try {
            // Kiểm tra xem người dùng có phải admin không
            if (!req.user.is_admin) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập'
                });
            }

            // Lấy thông báo cho admin từ database
            const notifications = await db.query(
                `SELECT n.*, u.ho_ten, u.email, u.so_dien_thoai
                FROM thong_bao n
                LEFT JOIN nguoi_dung u ON n.nguoi_dung_id = u.id
                WHERE n.nguoi_nhan_id IS NULL OR n.nguoi_nhan_id = $1
                ORDER BY n.ngay_tao DESC
                LIMIT 50`,
                [req.user.id]
            );

            return res.status(200).json({
                success: true,
                data: notifications.rows
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông báo admin:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông báo'
            });
        }
    },

    // Lấy tất cả thông báo của một người dùng
    getUserNotifications: async (req, res) => {
        try {
            // Lấy thông báo từ database
            const notifications = await db.query(
                `SELECT *
                FROM thong_bao
                WHERE nguoi_nhan_id = $1
                ORDER BY ngay_tao DESC
                LIMIT 50`,
                [req.user.id]
            );

            return res.status(200).json({
                success: true,
                data: notifications.rows
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông báo người dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thông báo'
            });
        }
    },

    // Đánh dấu đã đọc một thông báo
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;

            // Cập nhật trạng thái đã đọc
            const updatedNotification = await db.query(
                `UPDATE thong_bao
                SET da_doc = true
                WHERE id = $1 AND (nguoi_nhan_id = $2 OR $3 = true)
                RETURNING *`,
                [id, req.user.id, req.user.is_admin]
            );

            if (updatedNotification.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông báo'
                });
            }

            return res.status(200).json({
                success: true,
                data: updatedNotification.rows[0]
            });
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc thông báo:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông báo'
            });
        }
    },

    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async (req, res) => {
        try {
            // Cập nhật tất cả thông báo chưa đọc của người dùng
            let result;
            if (req.user.is_admin) {
                result = await db.query(
                    `UPDATE thong_bao
                    SET da_doc = true
                    WHERE (nguoi_nhan_id IS NULL OR nguoi_nhan_id = $1) AND da_doc = false
                    RETURNING id`,
                    [req.user.id]
                );
            } else {
                result = await db.query(
                    `UPDATE thong_bao
                    SET da_doc = true
                    WHERE nguoi_nhan_id = $1 AND da_doc = false
                    RETURNING id`,
                    [req.user.id]
                );
            }

            return res.status(200).json({
                success: true,
                message: `Đã đánh dấu đọc ${result.rows.length} thông báo`,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật thông báo'
            });
        }
    },

    // Xóa một thông báo
    deleteNotification: async (req, res) => {
        try {
            const { id } = req.params;

            // Xóa thông báo
            const deletedNotification = await db.query(
                `DELETE FROM thong_bao
                WHERE id = $1 AND (nguoi_nhan_id = $2 OR $3 = true)
                RETURNING id`,
                [id, req.user.id, req.user.is_admin]
            );

            if (deletedNotification.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông báo'
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
                message: 'Đã xảy ra lỗi khi xóa thông báo'
            });
        }
    }
};

module.exports = NotificationController;