const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    icon: {
        type: String,
        trim: true
    },
    image: {
        filename: String,
        path: String,
        mimetype: String
    },
    
    // Hierarchy
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    
    // SEO
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    
    // Statistics
    cropCount: {
        type: Number,
        default: 0
    },
    
    // Seasonal information
    seasonal: {
        isSeasonalCategory: {
            type: Boolean,
            default: false
        },
        peakMonths: [{
            type: String,
            enum: ['january', 'february', 'march', 'april', 'may', 'june',
                   'july', 'august', 'september', 'october', 'november', 'december']
        }]
    }
}, {
    timestamps: true
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ sortOrder: 1, name: 1 });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .trim();
    }
    next();
});

// Virtual for hierarchy level
categorySchema.virtual('level').get(function() {
    let level = 0;
    let current = this;
    
    while (current.parentCategory) {
        level++;
        current = current.parentCategory;
        if (level > 5) break; // Prevent infinite loop
    }
    
    return level;
});

// Method to get full category path
categorySchema.methods.getFullPath = async function() {
    const path = [this.name];
    let current = this;
    
    while (current.parentCategory) {
        await current.populate('parentCategory');
        current = current.parentCategory;
        path.unshift(current.name);
    }
    
    return path.join(' > ');
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
    const categories = await this.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 });
    
    const categoryMap = new Map();
    const rootCategories = [];
    
    // First, create a map of all categories
    categories.forEach(category => {
        categoryMap.set(category._id.toString(), {
            ...category.toObject(),
            children: []
        });
    });
    
    // Then, build the tree
    categories.forEach(category => {
        const categoryObj = categoryMap.get(category._id.toString());
        
        if (category.parentCategory) {
            const parent = categoryMap.get(category.parentCategory.toString());
            if (parent) {
                parent.children.push(categoryObj);
            }
        } else {
            rootCategories.push(categoryObj);
        }
    });
    
    return rootCategories;
};

// Static method to update crop counts
categorySchema.statics.updateCropCounts = async function() {
    const Crop = require('./Crop');
    
    const categoryCounts = await Crop.aggregate([
        {
            $match: {
                status: 'available',
                isActive: true
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        }
    ]);
    
    // Reset all counts to 0
    await this.updateMany({}, { cropCount: 0 });
    
    // Update counts based on aggregation
    for (const item of categoryCounts) {
        await this.updateOne(
            { slug: item._id },
            { cropCount: item.count }
        );
    }
};

module.exports = mongoose.model('Category', categorySchema);