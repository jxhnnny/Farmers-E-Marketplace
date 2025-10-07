const User = require('../models/User');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin only)
const getDashboardStats = asyncHandler(async (req, res) => {
    // Get user statistics
    const userStats = await User.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                totalFarmers: { 
                    $sum: { $cond: [{ $eq: ['$userType', 'farmer'] }, 1, 0] }
                },
                totalBuyers: { 
                    $sum: { $cond: [{ $eq: ['$userType', 'buyer'] }, 1, 0] }
                },
                activeUsers: { 
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                suspendedUsers: { 
                    $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
                }
            }
        }
    ]);

    // Get crop statistics
    const cropStats = await Crop.aggregate([
        {
            $group: {
                _id: null,
                totalCrops: { $sum: 1 },
                availableCrops: {
                    $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
                },
                pendingApproval: {
                    $sum: { $cond: [{ $eq: ['$moderationStatus', 'pending'] }, 1, 0] }
                },
                flaggedCrops: {
                    $sum: { $cond: [{ $eq: ['$moderationStatus', 'flagged'] }, 1, 0] }
                }
            }
        }
    ]);

    // Get order statistics for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orderStats = await Order.getOrderStats({
        dateRange: { start: thirtyDaysAgo, end: new Date() }
    });

    // Get recent activity
    const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName userType createdAt status');

    const recentCrops = await Crop.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('farmer', 'fullName farmName')
        .select('name category moderationStatus createdAt');

    res.status(200).json({
        success: true,
        data: {
            users: userStats[0] || {
                totalUsers: 0,
                totalFarmers: 0,
                totalBuyers: 0,
                activeUsers: 0,
                suspendedUsers: 0
            },
            crops: cropStats[0] || {
                totalCrops: 0,
                availableCrops: 0,
                pendingApproval: 0,
                flaggedCrops: 0
            },
            orders: orderStats,
            recentActivity: {
                users: recentUsers,
                crops: recentCrops
            }
        }
    });
});

// @desc    Get all users with filters and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        userType,
        status,
        region,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filters = {};
    if (userType) filters.userType = userType;
    if (status) filters.status = status;
    if (region) filters.region = region;

    if (search) {
        filters.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { farmName: { $regex: search, $options: 'i' } },
            { businessName: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filters)
        .select('-password -emailVerificationToken -passwordResetToken')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
        success: true,
        data: {
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalUsers,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
const getUserDetails = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select('-password -emailVerificationToken -passwordResetToken')
        .lean();

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Get user's additional data
    let additionalData = {};

    if (user.userType === 'farmer') {
        const cropCount = await Crop.countDocuments({ farmer: user._id });
        const crops = await Crop.find({ farmer: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name status quantityAvailable pricePerKg createdAt');
        
        additionalData.cropCount = cropCount;
        additionalData.recentCrops = crops;
    }

    if (user.userType === 'buyer') {
        const orderCount = await Order.countDocuments({ buyer: user._id });
        const orders = await Order.find({ buyer: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderNumber status totalAmount createdAt');
        
        additionalData.orderCount = orderCount;
        additionalData.recentOrders = orders;
    }

    res.status(200).json({
        success: true,
        data: {
            user: { ...user, ...additionalData }
        }
    });
});

// @desc    Update user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status value'
        });
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    ).select('-password');

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        data: { user }
    });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Don't allow deletion of admin users
    if (user.userType === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Cannot delete admin users'
        });
    }

    // Soft delete approach - update status instead of actual deletion
    user.status = 'deleted';
    await user.save();

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});

// @desc    Get crops for moderation
// @route   GET /api/admin/crops/moderation
// @access  Private (Admin only)
const getCropsForModeration = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status = 'pending',
        category,
        region
    } = req.query;

    const filters = { moderationStatus: status };
    if (category) filters.category = category;
    if (region) filters['location.region'] = region;

    const crops = await Crop.find(filters)
        .populate('farmer', 'fullName farmName email phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const totalCrops = await Crop.countDocuments(filters);

    res.status(200).json({
        success: true,
        data: {
            crops,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCrops / limit),
                totalCrops
            }
        }
    });
});

// @desc    Moderate crop (approve/reject/flag)
// @route   PATCH /api/admin/crops/:id/moderate
// @access  Private (Admin only)
const moderateCrop = asyncHandler(async (req, res) => {
    const { action, notes } = req.body;

    if (!['approve', 'reject', 'flag'].includes(action)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid moderation action'
        });
    }

    const crop = await Crop.findById(req.params.id);

    if (!crop) {
        return res.status(404).json({
            success: false,
            message: 'Crop not found'
        });
    }

    // Update moderation status
    if (action === 'approve') {
        crop.moderationStatus = 'approved';
        crop.status = 'available';
    } else if (action === 'reject') {
        crop.moderationStatus = 'rejected';
        crop.status = 'rejected';
    } else if (action === 'flag') {
        crop.moderationStatus = 'flagged';
    }

    crop.moderationNotes = notes;
    crop.moderatedBy = req.user._id;
    crop.moderatedAt = new Date();

    await crop.save();

    res.status(200).json({
        success: true,
        message: `Crop ${action}ed successfully`,
        data: { crop }
    });
});

// @desc    Get system logs (placeholder)
// @route   GET /api/admin/logs
// @access  Private (Admin only)
const getSystemLogs = asyncHandler(async (req, res) => {
    // This is a placeholder for system logging
    // In production, you'd integrate with a proper logging system
    
    const logs = [
        {
            id: 1,
            timestamp: new Date(),
            level: 'info',
            message: 'User logged in',
            userId: req.user._id,
            ip: req.ip
        }
    ];

    res.status(200).json({
        success: true,
        data: { logs }
    });
});

// @desc    Get reports data
// @route   GET /api/admin/reports/:type
// @access  Private (Admin only)
const getReport = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let reportData = {};

    switch (type) {
        case 'users':
            reportData = await User.aggregate([
                ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            userType: '$userType'
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.date': 1 } }
            ]);
            break;

        case 'crops':
            reportData = await Crop.aggregate([
                ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            category: '$category'
                        },
                        count: { $sum: 1 },
                        totalValue: { $sum: { $multiply: ['$pricePerKg', '$quantityAvailable'] } }
                    }
                },
                { $sort: { '_id.date': 1 } }
            ]);
            break;

        case 'orders':
            reportData = await Order.aggregate([
                ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                        averageOrderValue: { $avg: '$totalAmount' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);
            break;

        default:
            return res.status(400).json({
                success: false,
                message: 'Invalid report type'
            });
    }

    res.status(200).json({
        success: true,
        data: {
            type,
            period: { startDate, endDate },
            data: reportData
        }
    });
});

module.exports = {
    getDashboardStats,
    getUsers,
    getUserDetails,
    updateUserStatus,
    deleteUser,
    getCropsForModeration,
    moderateCrop,
    getSystemLogs,
    getReport
};