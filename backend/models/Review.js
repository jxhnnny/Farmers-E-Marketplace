const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  reviewType: {
    type: String,
    enum: ['product', 'farmer', 'transaction'],
    default: 'product'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  flaggedReasons: [String],
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ farmer: 1, createdAt: -1 });
reviewSchema.index({ buyer: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Ensure one review per buyer per order
reviewSchema.index({ buyer: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);