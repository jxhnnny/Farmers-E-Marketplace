const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[\+]?[0-9\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    userType: {
        type: String,
        required: [true, 'User type is required'],
        enum: ['farmer', 'buyer', 'admin'],
        default: 'buyer'
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    profileImage: {
        type: String,
        default: null
    },
    
    // Farmer-specific fields
    farmName: {
        type: String,
        trim: true,
        maxlength: [100, 'Farm name cannot exceed 100 characters']
    },
    region: {
        type: String,
        enum: ['khomas', 'erongo', 'otjozondjupa', 'omaheke', 'hardap', 'karas', 'kunene', 'ohangwena', 'omusati', 'oshana', 'oshikoto', 'zambezi']
    },
    farmLocation: {
        type: String,
        trim: true,
        maxlength: [200, 'Farm location cannot exceed 200 characters']
    },
    farmingExperience: {
        type: Number,
        min: [0, 'Farming experience cannot be negative']
    },
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date
    }],
    
    // Buyer-specific fields
    buyerType: {
        type: String,
        enum: ['individual', 'retailer', 'restaurant', 'wholesaler']
    },
    businessName: {
        type: String,
        trim: true,
        maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    businessLicense: {
        type: String,
        trim: true
    },
    
    // Common location fields
    address: {
        street: String,
        city: String,
        region: String,
        postalCode: String
    },
    
    // Activity tracking
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
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
    
    // Chat-related fields
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        default: null
    },
    chatSettings: {
        allowMessagesFrom: {
            type: String,
            enum: ['everyone', 'farmers-only', 'buyers-only', 'contacts-only'],
            default: 'everyone'
        },
        messageNotifications: {
            type: Boolean,
            default: true
        },
        onlineStatus: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

// Index for search optimization
userSchema.index({ email: 1 });
userSchema.index({ userType: 1, status: 1 });
userSchema.index({ region: 1, userType: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
    const user = this.toObject();
    delete user.password;
    delete user.emailVerificationToken;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    return user;
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    const { street, city, region, postalCode } = this.address;
    return [street, city, region, postalCode].filter(Boolean).join(', ');
});

// Chat-related methods
userSchema.methods.setOnline = function(socketId) {
    this.isOnline = true;
    this.socketId = socketId;
    this.lastSeen = new Date();
    return this.save();
};

userSchema.methods.setOffline = function() {
    this.isOnline = false;
    this.socketId = null;
    this.lastSeen = new Date();
    return this.save();
};

userSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    return this.save();
};

// Static method to get online users
userSchema.statics.getOnlineUsers = function() {
    return this.find({ isOnline: true }).select('fullName email userType profileImage');
};

// Method to check if user can receive messages from another user
userSchema.methods.canReceiveMessageFrom = function(senderUserType) {
    const { allowMessagesFrom } = this.chatSettings || {};
    
    switch (allowMessagesFrom) {
        case 'farmers-only':
            return senderUserType === 'farmer';
        case 'buyers-only':
            return senderUserType === 'buyer';
        case 'contacts-only':
            // For future implementation with contact lists
            return false;
        default:
            return true;
    }
};

module.exports = mongoose.model('User', userSchema);