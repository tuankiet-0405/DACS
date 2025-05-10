const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/VoucherController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// Routes cho admin quản lý voucher
router.get('/vouchers', authMiddleware.verifyToken, authMiddleware.isAdmin, voucherController.getAllVouchers);
router.get('/vouchers/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, voucherController.getVoucherStats);
router.get('/vouchers/status/:status', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateVoucherStatusParam, voucherController.getVouchersByStatus);
router.get('/vouchers/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateVoucherIdParam, voucherController.getVoucherById);
router.post('/vouchers', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateVoucherData, voucherController.createVoucher);
router.put('/vouchers/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateVoucherIdParam, validationMiddleware.validateVoucherData, voucherController.updateVoucher);
router.delete('/vouchers/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateVoucherIdParam, voucherController.deleteVoucher);

module.exports = router;
