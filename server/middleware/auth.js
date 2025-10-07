const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is suspended or inactive'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};

// Middleware to check if user is farmer
const requireFarmer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.userType !== 'farmer') {
        return res.status(403).json({
            success: false,
            message: 'Farmer access required'
        });
    }

    next();
};

// Middleware to check if user is buyer
const requireBuyer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.userType !== 'buyer') {
        return res.status(403).json({
            success: false,
            message: 'Buyer access required'
        });
    }

    next();
};

// Middleware to check if user is farmer or admin
const requireFarmerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.userType !== 'farmer' && req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Farmer or admin access required'
        });
    }

    next();
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can access anything
        if (req.user.userType === 'admin') {
            return next();
        }

        // Check ownership
        const resourceUserId = req.params[resourceField] || req.body[resourceField] || req.query[resourceField];
        
        if (req.user._id.toString() !== resourceUserId) {
            return res.status(403).json({
                success: false,
                message: 'You can only access your own resources'
            });
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.status === 'active') {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // If there's an error with the token, just continue without authentication
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireFarmer,
    requireBuyer,
    requireFarmerOrAdmin,
    requireOwnershipOrAdmin,
    optionalAuth
};