const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    
    // Parties involved
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
    
    // Order items
    items: [{
        crop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Crop',
            required: true
        },
        cropName: String, // Snapshot for historical purposes
        quantity: {
            type: Number,
            required: true,
            min: [0, 'Quantity must be positive']
        },
        unit: {
            type: String,
            default: 'kg'
        },
        pricePerUnit: {
            type: Number,
            required: true,
            min: [0, 'Price must be positive']
        },
        totalPrice: {
            type: Number,
            required: true,
            min: [0, 'Total price must be positive']
        }
    }],
    
    // Pricing
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal must be positive']
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: [0, 'Delivery fee cannot be negative']
    },
    platformFee: {
        type: Number,
        default: 0,
        min: [0, 'Platform fee cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount must be positive']
    },
    currency: {
        type: String,
        default: 'NAD',
        enum: ['NAD', 'USD', 'ZAR']
    },
    
    // Order status
    status: {
        type: String,
        enum: [
            'pending',           // Order placed, awaiting farmer confirmation
            'confirmed',         // Farmer confirmed the order
            'preparing',         // Farmer is preparing the order
            'ready',            // Order is ready for pickup/delivery
            'in-transit',       // Order is being delivered
            'delivered',        // Order has been delivered
            'completed',        // Order completed and payment processed
            'cancelled',        // Order was cancelled
            'disputed',         // There's a dispute
            'refunded'          // Order was refunded
        ],
        default: 'pending'
    },
    
    // Delivery information
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'delivery', 'farmer-delivery'],
        required: true
    },
    deliveryAddress: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    deliveryDate: Date,
    deliveryTime: String,
    
    // Payment information
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank-transfer', 'mobile-money', 'card'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'disputed'],
        default: 'pending'
    },
    paymentDate: Date,
    transactionId: String,
    
    // Communication and notes
    buyerNotes: String,
    farmerNotes: String,
    adminNotes: String,
    
    // Tracking
    trackingUpdates: [{
        status: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Dates
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    
    // Rating and feedback
    buyerRating: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: Date
    },
    farmerRating: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: Date
    },
    
    // Dispute handling
    dispute: {
        isDisputed: {
            type: Boolean,
            default: false
        },
        reason: String,
        description: String,
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        raisedAt: Date,
        status: {
            type: String,
            enum: ['open', 'investigating', 'resolved', 'closed'],
            default: 'open'
        },
        resolution: String,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date
    }
}, {
    timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'dispute.isDisputed': 1, 'dispute.status': 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Find the last order number for today
        const prefix = `ORD-${year}${month}${day}`;
        const lastOrder = await this.constructor.findOne({
            orderNumber: { $regex: `^${prefix}` }
        }).sort({ orderNumber: -1 });
        
        let sequence = 1;
        if (lastOrder) {
            const lastSequence = parseInt(lastOrder.orderNumber.split('-')[1].slice(8));
            sequence = lastSequence + 1;
        }
        
        this.orderNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});

// Method to add tracking update
orderSchema.methods.addTrackingUpdate = function(status, message, updatedBy) {
    this.trackingUpdates.push({
        status,
        message,
        updatedBy,
        timestamp: new Date()
    });
    this.status = status;
    return this.save();
};

// Method to calculate total
orderSchema.methods.calculateTotal = function() {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal + this.deliveryFee + this.platformFee;
    return this;
};

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
    const now = new Date();
    const orderDate = this.createdAt;
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for delivery address string
orderSchema.virtual('deliveryAddressString').get(function() {
    if (!this.deliveryAddress) return '';
    const { street, city, region, postalCode } = this.deliveryAddress;
    return [street, city, region, postalCode].filter(Boolean).join(', ');
});

// Static method to get order statistics
orderSchema.statics.getOrderStats = async function(filters = {}) {
    const match = {};
    
    if (filters.dateRange) {
        match.createdAt = {
            $gte: new Date(filters.dateRange.start),
            $lte: new Date(filters.dateRange.end)
        };
    }
    
    if (filters.farmer) {
        match.farmer = mongoose.Types.ObjectId(filters.farmer);
    }
    
    if (filters.buyer) {
        match.buyer = mongoose.Types.ObjectId(filters.buyer);
    }
    
    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                averageOrderValue: { $avg: '$totalAmount' },
                completedOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                pendingOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                cancelledOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0
    };
};

module.exports = mongoose.model('Order', orderSchema);