const express = require('express');
const { body } = require('express-validator');
const {
  createReview,
  getProductReviews,
  getFarmerReviews,
  getUserReviews,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('product').isMongoId().withMessage('Valid product ID is required'),
  body('order').isMongoId().withMessage('Valid order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
];

// Routes
router.get('/product/:productId', getProductReviews);
router.get('/farmer/:farmerId', getFarmerReviews);
router.get('/user/:userId', auth, getUserReviews);
router.post('/', auth, reviewValidation, createReview);
router.put('/:id', auth, updateReview);
router.delete('/:id', auth, deleteReview);

module.exports = router;