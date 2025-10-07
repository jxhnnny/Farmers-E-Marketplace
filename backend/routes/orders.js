const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// Create a new order
router.post('/', auth, orderController.createOrder);

// Get user's orders (buyer or farmer)
router.get('/my-orders', auth, orderController.getUserOrders);

// Get specific order by ID
router.get('/:id', auth, orderController.getOrderById);

// Update order status (farmer only)
router.put('/:id/status', auth, orderController.updateOrderStatus);

// Accept order (farmer only)
router.put('/:id/accept', auth, orderController.acceptOrder);

// Reject order (farmer only)
router.put('/:id/reject', auth, orderController.rejectOrder);

// Mark order as fulfilled (farmer only)
router.put('/:id/fulfill', auth, orderController.fulfillOrder);

// Cancel order (buyer only, if pending)
router.put('/:id/cancel', auth, orderController.cancelOrder);

// Add review to order (buyer only, after fulfilled)
router.put('/:id/review', auth, orderController.addReview);

// Get order statistics (for analytics)
router.get('/stats/summary', auth, orderController.getOrderStats);

module.exports = router;