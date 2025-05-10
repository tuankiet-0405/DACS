const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/TransactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// Routes cho admin quản lý giao dịch
router.get('/transactions', authMiddleware.verifyToken, authMiddleware.isAdmin, transactionController.getAllTransactions);
router.get('/transactions/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, transactionController.getTransactionStats);
router.get('/transactions/export', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateExportParams, transactionController.exportTransactions);
router.get('/transactions/status/:status', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateStatusParam, transactionController.getTransactionsByStatus);
router.get('/transactions/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, validationMiddleware.validateTransactionIdParam, transactionController.getTransactionById);

module.exports = router;
