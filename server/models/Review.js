const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // Who is being reviewed
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    revieweeType: {
        type: String,
        enum: ['farmer', 'buyer'],
        required: true
    },
    
    // Who is writing the review
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewerType: {
        type: String,
        enum: ['farmer', 'buyer'],
        required: true
    },
    
    // Related order
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    
    // Related crop (optional, for crop-specific reviews)
    crop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Crop'
    },
    
    // Review content
    rating: {
        type: Number,
        required: true,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Review title cannot exceed 100 characters']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },
    
    // Review categories (for detailed feedback)
    categories: {
        quality: {
            type: Number,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            min: 1,
            max: 5
        },
        timeliness: {
            type: Number,
            min: 1,
            max: 5
        },
        packaging: {
            type: Number,
            min: 1,
            max: 5
        },
        value: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Review status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending'
    },
    
    // Moderation
    moderationNotes: String,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    
    // Interaction
    helpfulVotes: {
        type: Number,
        default: 0
    },
    reportCount: {
        type: Number,
        default: 0
    },
    
    // Response from reviewee
    response: {
        comment: String,
        respondedAt: Date
    }
}, {
    timestamps: true
});

// Indexes
reviewSchema.index({ reviewee: 1, status: 1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ crop: 1, status: 1 });
reviewSchema.index({ rating: 1, status: 1 });
reviewSchema.index({ createdAt: -1 });

// Ensure one review per order per reviewer
reviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });

// Virtual for overall category rating
reviewSchema.virtual('categoryAverage').get(function() {
    const categories = this.categories;
    if (!categories) return null;
    
    const ratings = Object.values(categories).filter(rating => rating !== undefined);
    if (ratings.length === 0) return null;
    
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Method to calculate helpful percentage
reviewSchema.methods.getHelpfulPercentage = function() {
    const totalVotes = this.helpfulVotes + this.reportCount;
    if (totalVotes === 0) return 0;
    return Math.round((this.helpfulVotes / totalVotes) * 100);
};

// Static method to calculate user's average rating
reviewSchema.statics.calculateUserRating = async function(userId) {
    const result = await this.aggregate([
        {
            $match: {
                reviewee: mongoose.Types.ObjectId(userId),
                status: 'approved'
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                ratingBreakdown: {
                    $push: '$rating'
                }
            }
        }
    ]);
    
    if (result.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }
    
    const data = result[0];
    
    // Calculate rating breakdown
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.ratingBreakdown.forEach(rating => {
        breakdown[rating] = (breakdown[rating] || 0) + 1;
    });
    
    return {
        averageRating: Math.round(data.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: data.totalReviews,
        ratingBreakdown: breakdown
    };
};

// Static method to get crop reviews
reviewSchema.statics.getCropReviews = function(cropId, options = {}) {
    const query = {
        crop: cropId,
        status: 'approved'
    };
    
    let result = this.find(query)
        .populate('reviewer', 'fullName userType profileImage')
        .sort({ createdAt: -1 });
    
    if (options.limit) {
        result = result.limit(options.limit);
    }
    
    if (options.skip) {
        result = result.skip(options.skip);
    }
    
    return result;
};

module.exports = mongoose.model('Review', reviewSchema);