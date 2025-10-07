const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getMe,
    updateProfile,
    changePassword,
    verifyEmail
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordReset, validateProfileUpdate, validatePasswordChange } = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', validatePasswordReset, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(authenticateToken); // Apply protection to all routes below

router.post('/logout', logout);
router.get('/me', getMe);
router.get('/profile', getMe);
router.patch('/profile', validateProfileUpdate, updateProfile);
router.patch('/change-password', validatePasswordChange, changePassword);
// router.post('/resend-verification', resendVerificationEmail); // TODO: Implement this function

module.exports = router;