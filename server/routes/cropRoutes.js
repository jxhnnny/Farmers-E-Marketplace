const express = require('express');
const router = express.Router();
const {
    getCrops,
    getCrop,
    createCrop,
    updateCrop,
    deleteCrop,
    getFarmerCrops,
    searchCrops,
    getCropCategories,
    toggleCropStatus
} = require('../controllers/cropController');
const { authenticateToken, requireFarmer } = require('../middleware/auth');
const { uploadCropImages } = require('../middleware/upload');
const { validateCrop, validateCropUpdate } = require('../middleware/validation');

// Public routes
router.get('/', getCrops);
router.get('/search', searchCrops);
router.get('/categories', getCropCategories);
router.get('/:id', getCrop);

// Protected routes
router.use(authenticateToken);

// Farmer-specific routes
router.post('/', requireFarmer, uploadCropImages, validateCrop, createCrop);
router.get('/farmer/my-crops', requireFarmer, getFarmerCrops);
router.patch('/:id', requireFarmer, uploadCropImages, validateCropUpdate, updateCrop);
router.delete('/:id', requireFarmer, deleteCrop);
router.patch('/:id/toggle-status', requireFarmer, toggleCropStatus);

module.exports = router;