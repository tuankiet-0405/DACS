const express = require('express');
const router = express.Router();
const carController = require('../controllers/CarController');
const authMiddleware = require('../middlewares/authMiddleware');
const db = require('../data/db');

// Route lấy số lượng xe theo trạng thái
router.get('/cars/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_cars,
                SUM(CASE WHEN tinh_trang = 'san_sang' THEN 1 ELSE 0 END) as active_cars,
                SUM(CASE WHEN tinh_trang = 'dang_thue' THEN 1 ELSE 0 END) as rented_cars,
                SUM(CASE WHEN tinh_trang = 'bao_tri' THEN 1 ELSE 0 END) as maintenance_cars,
                SUM(CASE WHEN so_cho = 4 THEN 1 ELSE 0 END) as cars_4_seats,
                SUM(CASE WHEN so_cho = 7 THEN 1 ELSE 0 END) as cars_7_seats,
                SUM(CASE WHEN so_cho = 16 THEN 1 ELSE 0 END) as cars_16_seats,
                SUM(CASE WHEN so_cho = 24 THEN 1 ELSE 0 END) as cars_24_seats
            FROM xe
        `);
        
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin thống kê xe thành công',
            data: {
                totalCars: stats[0].total_cars || 0,
                activeCars: stats[0].active_cars || 0,
                rentedCars: stats[0].rented_cars || 0,
                maintenanceCars: stats[0].maintenance_cars || 0,
                cars4Seats: stats[0].cars_4_seats || 0,
                cars7Seats: stats[0].cars_7_seats || 0,
                cars16Seats: stats[0].cars_16_seats || 0,
                cars24Seats: stats[0].cars_24_seats || 0
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê xe:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thống kê xe',
            error: error.message
        });
    }
});

// Route lấy xe theo loại (số chỗ)
router.get('/cars/seats/:seats', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
    try {
        const { seats } = req.params;
        
        // Truy vấn danh sách xe theo số chỗ
        const [rows] = await db.execute(`
            SELECT x.*, 
                   COALESCE(AVG(d.so_sao), 0) as danh_gia, 
                   COUNT(DISTINCT d.id) as so_danh_gia,
                   COUNT(DISTINCT dx.id) as so_chuyen
            FROM xe x
            LEFT JOIN danh_gia d ON x.id = d.xe_id
            LEFT JOIN dat_xe dx ON x.id = dx.xe_id
            WHERE x.tinh_trang IN ('san_sang', 'dang_thue', 'bao_tri')
            AND x.so_cho = ?
            GROUP BY x.id
            ORDER BY x.ngay_tao DESC
        `, [seats]);
        
        // Lấy ID của tất cả các xe
        const carIds = rows.map(car => car.id);
        
        // Nếu không có xe nào, trả về mảng rỗng
        if (carIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: `Không có xe ${seats} chỗ`,
                data: []
            });
        }
        
        // Lấy hình ảnh chính của các xe từ bảng hinh_anh_xe
        let carImages = [];
        if (carIds.length > 0) {
            const inPlaceholders = carIds.map(() => '?').join(',');
            [carImages] = await db.execute(`
                SELECT xe_id, url_hinh_anh, la_hinh_chinh
                FROM hinh_anh_xe 
                WHERE xe_id IN (${inPlaceholders})
                ORDER BY la_hinh_chinh DESC
            `, carIds);
        }
        
        // Tạo map để lưu trữ hình ảnh theo id xe
        const carImageMap = {};
        carImages.forEach(img => {
            if (!carImageMap[img.xe_id] || img.la_hinh_chinh) {
                carImageMap[img.xe_id] = img.url_hinh_anh;
            }
        });
        
        // Thêm thông tin hình ảnh vào dữ liệu xe
        const carsWithImages = rows.map(car => {
            return {
                ...car,
                hinh_anh: carImageMap[car.id] || null,
                danh_gia: parseFloat(car.danh_gia).toFixed(1)
            };
        });
        
        res.status(200).json({
            success: true,
            message: `Lấy danh sách xe ${seats} chỗ thành công`,
            data: carsWithImages
        });
    } catch (error) {
        console.error(`Lỗi khi lấy danh sách xe ${seats} chỗ:`, error);
        res.status(500).json({
            success: false,
            message: `Đã xảy ra lỗi khi lấy danh sách xe ${seats} chỗ`,
            error: error.message
        });
    }
});

// Routes cho admin quản lý xe
router.get('/cars', authMiddleware.verifyToken, authMiddleware.isAdmin, carController.getAllCars);
router.post('/cars', authMiddleware.verifyToken, authMiddleware.isAdmin, carController.createCar);
router.get('/cars/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, carController.getCarById);
router.put('/cars/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, carController.updateCar);
router.delete('/cars/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, carController.deleteCar);

module.exports = router;
