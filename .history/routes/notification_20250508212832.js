const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

// Controller sẽ tạo sau
const notificationController = {
    // Gửi thông báo cho admin
    createNotification: async (req, res) => {
        try {
            const { title, message, type, carId } = req.body;
            const userId = req.user.id;
            
            // Kết nối đến db
            const db = require('../data/db');
            
            // Tạo thông báo mới
            const [result] = await db.execute(`
                INSERT INTO thong_bao (
                    nguoi_gui_id, 
                    loai_thong_bao, 
                    tieu_de, 
                    noi_dung, 
                    tham_chieu_id, 
                    ngay_tao, 
                    da_doc
                ) VALUES (?, ?, ?, ?, ?, NOW(), 0)
            `, [userId, type, title, message, carId || null]);
            
            res.status(201).json({
                success: true,
                message: 'Thông báo đã được gửi',
                data: {
                    id: result.insertId
                }
            });
        } catch (error) {
            console.error('Lỗi khi tạo thông báo:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi gửi thông báo',
                error: error.message
            });
        }
    },
    
    // Lấy danh sách thông báo cho admin
    getAdminNotifications: async (req, res) => {
        try {
            // Kiểm tra quyền admin
            if (req.user.loai_tai_khoan !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập'
                });
            }
            
            const db = require('../data/db');
            
            // Lấy danh sách thông báo gần đây nhất cho admin
            const [notifications] = await db.execute(`
                SELECT tb.*, nd.ho_ten, nd.avatar_url
                FROM thong_bao tb
                LEFT JOIN nguoi_dung nd ON tb.nguoi_gui_id = nd.id
                WHERE tb.loai_thong_bao IN ('car_approval', 'system', 'report')
                ORDER BY tb.ngay_tao DESC
                LIMIT 20
            `);
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách thông báo thành công',
                data: notifications
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách thông báo:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách thông báo',
                error: error.message
            });
        }
    },
    
    // Đánh dấu thông báo đã đọc
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;
            
            const db = require('../data/db');
            
            // Cập nhật trạng thái đã đọc
            await db.execute(`
                UPDATE thong_bao 
                SET da_doc = 1, 
                    ngay_doc = NOW()
                WHERE id = ?
            `, [id]);
            
            res.status(200).json({
                success: true,
                message: 'Đã đánh dấu thông báo là đã đọc'
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái thông báo:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật trạng thái thông báo',
                error: error.message
            });
        }
    }
};

// Tạo thông báo mới (yêu cầu đăng nhập)
router.post('/', authMiddleware.verifyToken, notificationController.createNotification);

// Lấy danh sách thông báo cho admin (yêu cầu quyền admin)
router.get('/admin', authMiddleware.verifyToken, notificationController.getAdminNotifications);

// Đánh dấu thông báo đã đọc
router.put('/:id/read', authMiddleware.verifyToken, notificationController.markAsRead);

module.exports = router;