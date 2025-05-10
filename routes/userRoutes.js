const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Import middleware
const { verifyToken, isAdmin, canEditUserInfo } = authMiddleware;

// Routes quản lý người dùng (với các cấp quyền phân quyền khác nhau)
// Routes chỉ dành cho admin
router.get('/users', verifyToken, isAdmin, userController.getAllUsers);
router.get('/users/stats', verifyToken, isAdmin, userController.getUserStats);
router.post('/users', verifyToken, isAdmin, userController.createUser);
router.delete('/users/:id', verifyToken, isAdmin, userController.deleteUser);

// Routes cho phép người dùng xem thông tin của mình, admin xem thông tin của tất cả
router.get('/users/:id', verifyToken, canEditUserInfo, userController.getUserById);

// Routes cho phép người dùng cập nhật thông tin của mình, admin cập nhật thông tin của tất cả
router.put('/users/:id', verifyToken, canEditUserInfo, userController.updateUser);

// Routes cho phép đổi mật khẩu (người dùng đổi của mình, admin đổi của tất cả)
router.patch('/users/:id/password', verifyToken, canEditUserInfo, userController.changeUserPassword);

module.exports = router;