const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy tất cả thông báo của admin
router.get('/admin', authMiddleware.verifyToken, (req, res) => {
    NotificationController.getAdminNotifications(req, res);
});

// Lấy tất cả thông báo của người dùng đăng nhập
router.get('/user', authMiddleware.verifyToken, (req, res) => {
    NotificationController.getUserNotifications(req, res);
});

// Route mặc định cho đường dẫn gốc
router.get('/', authMiddleware.verifyToken, (req, res) => {
    NotificationController.getUserNotifications(req, res);
});

// Đánh dấu một thông báo đã đọc
router.put('/:id/read', authMiddleware.verifyToken, (req, res) => {
    NotificationController.markAsRead(req, res);
});

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', authMiddleware.verifyToken, (req, res) => {
    NotificationController.markAllAsRead(req, res);
});

// Xóa một thông báo
router.delete('/:id', authMiddleware.verifyToken, (req, res) => {
    NotificationController.deleteNotification(req, res);
});

module.exports = router;