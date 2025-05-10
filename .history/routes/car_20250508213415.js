const express = require('express');
const router = express.Router();
const carController = require('../controllers/CarController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all cars
router.get('/', carController.getAllCars);

// Get featured cars
router.get('/featured', carController.getFeaturedCars);

// Get a specific car by ID
router.get('/:id', carController.getCarById);

// Create a new car (requires authentication)
router.post('/', authMiddleware.verifyToken, carController.createCar);

// Update a car (requires authentication)
router.put('/:id', authMiddleware.verifyToken, carController.updateCar);

// Delete a car (requires authentication)
router.delete('/:id', authMiddleware.verifyToken, carController.deleteCar);

// Duyệt xe (yêu cầu quyền admin)
router.put('/:id/approve', authMiddleware.verifyToken, carController.approveCar);

// Từ chối xe (yêu cầu quyền admin)
router.put('/:id/reject', authMiddleware.verifyToken, carController.rejectCar);

module.exports = router;