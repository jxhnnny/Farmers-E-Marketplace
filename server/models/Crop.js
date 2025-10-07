const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Crop name is required'],
        trim: true,
        maxlength: [100, 'Crop name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Crop description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Crop category is required'],
        enum: ['vegetables', 'fruits', 'grains', 'legumes', 'herbs', 'other'],
        lowercase: true
    },
    subcategory: {
        type: String,
        trim: true,
        maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },
    
    // Farmer information
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmName: {
        type: String,
        trim: true
    },
    
    // Pricing and quantity
    pricePerKg: {
        type: Number,
        required: [true, 'Price per kg is required'],
        min: [0, 'Price cannot be negative']
    },
    currency: {
        type: String,
        default: 'NAD',
        enum: ['NAD', 'USD', 'ZAR']
    },
    quantityAvailable: {
        type: Number,
        required: [true, 'Quantity available is required'],
        min: [0, 'Quantity cannot be negative']
    },
    unit: {
        type: String,
        default: 'kg',
        enum: ['kg', 'tons', 'bags', 'boxes', 'pieces']
    },
    minimumOrderQuantity: {
        type: Number,
        default: 1,
        min: [0, 'Minimum order quantity cannot be negative']
    },
    
    // Images
    images: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    
    // Location
    location: {
        region: {
            type: String,
            required: [true, 'Region is required'],
            enum: ['khomas', 'erongo', 'otjozondjupa', 'omaheke', 'hardap', 'karas', 'kunene', 'ohangwena', 'omusati', 'oshana', 'oshikoto', 'zambezi']
        },
        city: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    
    // Quality and certifications
    isOrganic: {
        type: Boolean,
        default: false
    },
    certifications: [{
        name: String,
        issuedBy: String,
        certificateNumber: String,
        issuedDate: Date,
        expiryDate: Date
    }],
    
    // Harvest information
    harvestDate: {
        type: Date,
        required: [true, 'Harvest date is required']
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    
    // Availability
    status: {
        type: String,
        enum: ['available', 'sold-out', 'reserved', 'expired', 'pending-approval', 'rejected'],
        default: 'pending-approval'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Ratings and reviews
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    
    // Moderation
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending'
    },
    moderationNotes: String,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    
    // Analytics
    views: {
        type: Number,
        default: 0
    },
    inquiries: {
        type: Number,
        default: 0
    },
    
    // SEO and search
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Seasonal information
    seasonality: {
        bestMonths: [{
            type: String,
            enum: ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december']
        }]
    }
}, {
    timestamps: true
});

// Indexes for search optimization
cropSchema.index({ name: 'text', description: 'text', tags: 'text' });
cropSchema.index({ category: 1, status: 1 });
cropSchema.index({ 'location.region': 1, status: 1 });
cropSchema.index({ farmer: 1, status: 1 });
cropSchema.index({ pricePerKg: 1, status: 1 });
cropSchema.index({ createdAt: -1 });
cropSchema.index({ averageRating: -1 });

// Virtual for primary image
cropSchema.virtual('primaryImage').get(function() {
    const primary = this.images.find(img => img.isPrimary);
    return primary || (this.images.length > 0 ? this.images[0] : null);
});

// Virtual for availability status
cropSchema.virtual('isAvailable').get(function() {
    return this.status === 'available' && 
           this.isActive && 
           this.quantityAvailable > 0 && 
           new Date(this.expiryDate) > new Date();
});

// Method to increment views
cropSchema.methods.incrementViews = function() {
    this.views += 1;
    return this.save();
};

// Method to increment inquiries
cropSchema.methods.incrementInquiries = function() {
    this.inquiries += 1;
    return this.save();
};

// Pre-save middleware to update status based on expiry
cropSchema.pre('save', function(next) {
    if (new Date(this.expiryDate) <= new Date() && this.status === 'available') {
        this.status = 'expired';
    }
    
    if (this.quantityAvailable <= 0 && this.status === 'available') {
        this.status = 'sold-out';
    }
    
    next();
});

// Static method to find available crops
cropSchema.statics.findAvailable = function() {
    return this.find({
        status: 'available',
        isActive: true,
        quantityAvailable: { $gt: 0 },
        expiryDate: { $gt: new Date() }
    });
};

// Static method for search
cropSchema.statics.search = function(query, filters = {}) {
    const searchQuery = {};
    
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    if (filters.category) {
        searchQuery.category = filters.category;
    }
    
    if (filters.region) {
        searchQuery['location.region'] = filters.region;
    }
    
    if (filters.priceRange) {
        const { min, max } = filters.priceRange;
        searchQuery.pricePerKg = {};
        if (min !== undefined) searchQuery.pricePerKg.$gte = min;
        if (max !== undefined) searchQuery.pricePerKg.$lte = max;
    }
    
    if (filters.organic !== undefined) {
        searchQuery.isOrganic = filters.organic;
    }
    
    // Only show available crops by default
    searchQuery.status = 'available';
    searchQuery.isActive = true;
    searchQuery.quantityAvailable = { $gt: 0 };
    searchQuery.expiryDate = { $gt: new Date() };
    
    return this.find(searchQuery);
};

module.exports = mongoose.model('Crop', cropSchema);