const express = require('express');
const { body } = require('express-validator');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getMyProducts
} = require('../controllers/productController');
const auth = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('category').isIn(['vegetables', 'fruits', 'grains', 'herbs', 'dairy', 'meat']).withMessage('Valid category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required')
];

// Routes
router.get('/', getProducts);
router.get('/my-products', auth, getMyProducts);
router.get('/:id', getProduct);

// Create product with image upload
router.post('/', auth, (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
}, productValidation, createProduct);

// Update product with optional image upload
router.put('/:id', auth, (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
}, updateProduct);

router.delete('/:id', auth, deleteProduct);

module.exports = router;