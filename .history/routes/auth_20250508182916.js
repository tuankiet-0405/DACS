const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
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

// Routes công khai
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Routes yêu cầu xác thực
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);
router.put('/profile', authMiddleware.verifyToken, authController.updateProfile);
router.post('/avatar', authMiddleware.verifyToken, upload.single('avatar'), authController.uploadAvatar);
router.get('/driver-license', authMiddleware.verifyToken, authController.getDriverLicense);
router.post('/driver-license', authMiddleware.verifyToken, upload.fields([
    { name: 'anh_mat_truoc', maxCount: 1 },
    { name: 'anh_mat_sau', maxCount: 1 }
]), authController.updateDriverLicense);
router.get('/stats', authMiddleware.verifyToken, authController.getUserStats);

module.exports = router;
