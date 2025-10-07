const Order = require('../models/Order');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, quantity, deliveryMethod, deliveryAddress, meetingPoint, buyerNote } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isAvailable || product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    const totalPrice = product.price * quantity;

    const order = await Order.create({
      product: productId,
      buyer: req.user.userId,
      farmer: product.farmer,
      quantity,
      totalPrice,
      deliveryMethod,
      deliveryAddress,
      meetingPoint,
      buyerNote
    });

    // Update product quantity
    product.quantity -= quantity;
    if (product.quantity === 0) {
      product.isAvailable = false;
    }
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { role } = req.user;
    let query = {};

    if (role === 'buyer') {
      query.buyer = req.user.userId;
    } else if (role === 'farmer') {
      query.farmer = req.user.userId;
    }

    const orders = await Order.find(query)
      .populate('product', 'name price images')
      .populate('buyer', 'name phone location')
      .populate('farmer', 'name phone farmLocation')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, farmerNote } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.farmer.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    order.status = status;
    if (farmerNote) order.farmerNote = farmerNote;

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, review } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (order.buyer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this order'
      });
    }

    // Check if order is fulfilled
    if (order.status !== 'fulfilled') {
      return res.status(400).json({
        success: false,
        message: 'Can only review fulfilled orders'
      });
    }

    order.rating = rating;
    order.review = review;
    await order.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message
    });
  }
};