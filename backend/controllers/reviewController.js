const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { product, order, rating, comment, reviewType } = req.body;

    // Verify the order exists and belongs to the user
    const orderDoc = await Order.findOne({
      _id: order,
      buyer: req.user.id,
      status: 'fulfilled'
    }).populate('product farmer');

    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for review'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      buyer: req.user.id,
      order: order
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this order'
      });
    }

    const review = new Review({
      product: orderDoc.product._id,
      buyer: req.user.id,
      farmer: orderDoc.farmer._id,
      order: order,
      rating,
      comment,
      reviewType: reviewType || 'product',
      isVerified: true
    });

    await review.save();

    // Update farmer's rating
    const farmerReviews = await Review.find({ farmer: orderDoc.farmer._id });
    const avgRating = farmerReviews.reduce((sum, rev) => sum + rev.rating, 0) / farmerReviews.length;
    
    await User.findByIdAndUpdate(orderDoc.farmer._id, {
      rating: avgRating,
      totalRatings: farmerReviews.length
    });

    await review.populate(['buyer', 'farmer', 'product']);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews for a specific product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isVisible: true
    })
    .populate('buyer', 'name')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews for a specific farmer
// @route   GET /api/reviews/farmer/:farmerId
// @access  Public
const getFarmerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      farmer: req.params.farmerId,
      isVisible: true
    })
    .populate('buyer', 'name')
    .populate('product', 'name')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get farmer reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews by a specific user
// @route   GET /api/reviews/user/:userId
// @access  Private
const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      buyer: req.params.userId
    })
    .populate('farmer', 'name')
    .populate('product', 'name')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findOne({
      _id: req.params.id,
      buyer: req.user.id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    await review.populate(['buyer', 'farmer', 'product']);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      buyer: req.user.id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.deleteOne();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getFarmerReviews,
  getUserReviews,
  updateReview,
  deleteReview
};