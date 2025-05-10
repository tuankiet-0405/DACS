const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Route mặc định cho đường dẫn gốc
router.get('/', authenticateToken, NotificationController.getUserNotifications);

// Lấy tất cả thông báo của admin
router.get('/admin', authenticateToken, NotificationController.getAdminNotifications);

// Lấy tất cả thông báo của người dùng đăng nhập
router.get('/user', authenticateToken, NotificationController.getUserNotifications);

// Đánh dấu một thông báo đã đọc
router.put('/:id/read', authenticateToken, NotificationController.markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', authenticateToken, NotificationController.markAllAsRead);

// Xóa một thông báo
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);

module.exports = router;