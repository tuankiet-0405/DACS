const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/BookingController_fixed');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes cho admin quản lý đơn đặt xe
router.get('/bookings', authMiddleware.verifyToken, authMiddleware.isAdmin, bookingController.getAllBookings);
router.get('/bookings/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, bookingController.getBookingsStats);
router.get('/bookings/status/:status', authMiddleware.verifyToken, authMiddleware.isAdmin, bookingController.getBookingsByStatus);
router.get('/bookings/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, bookingController.getBookingDetail);
router.patch('/bookings/:id/status', authMiddleware.verifyToken, authMiddleware.isAdmin, bookingController.updateBookingStatus);

module.exports = router;
