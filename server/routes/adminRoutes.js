const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getUsers,
    getUserDetails,
    updateUserStatus,
    deleteUser,
    getCropsForModeration,
    moderateCrop,
    getSystemLogs,
    getReport
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateUserStatusUpdate, validateCropModeration } = require('../middleware/validation');

// All admin routes require admin authorization
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/logs', getSystemLogs);
router.get('/reports/:type', getReport);

// User management routes
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/status', validateUserStatusUpdate, updateUserStatus);
router.delete('/users/:id', deleteUser);

// Crop moderation routes
router.get('/crops/moderation', getCropsForModeration);
router.patch('/crops/:id/moderate', validateCropModeration, moderateCrop);

module.exports = router;