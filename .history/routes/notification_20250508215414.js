const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/NotificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy tất cả thông báo của admin
router.get('/admin', authMiddleware.verifyToken, authMiddleware.isAdmin, notificationController.getAdminNotifications);

// Lấy tất cả thông báo của một người dùng
router.get('/user', authMiddleware.verifyToken, notificationController.getUserNotifications);

// Đánh dấu đã đọc một thông báo
router.put('/:id/read', authMiddleware.verifyToken, notificationController.markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', authMiddleware.verifyToken, notificationController.markAllAsRead);

// Xóa một thông báo
router.delete('/:id', authMiddleware.verifyToken, notificationController.deleteNotification);

module.exports = router;