const express = require('express');
const router = express.Router();
// Sửa đường dẫn import cho đúng
const carController = require('../controllers/CarController.js');
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

module.exports = router;