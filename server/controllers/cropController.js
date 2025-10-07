const { validationResult } = require('express-validator');
const Crop = require('../models/Crop');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { deleteFile } = require('../middleware/upload');

// @desc    Get all crops (with filters and pagination)
// @route   GET /api/crops
// @access  Public
const getCrops = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 12,
        category,
        region,
        minPrice,
        maxPrice,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        organic,
        farmer
    } = req.query;

    // Build filter object
    const filters = {
        status: 'available',
        isActive: true,
        quantityAvailable: { $gt: 0 },
        expiryDate: { $gt: new Date() }
    };

    if (category) filters.category = category;
    if (region) filters['location.region'] = region;
    if (organic !== undefined) filters.isOrganic = organic === 'true';
    if (farmer) filters.farmer = farmer;

    if (minPrice || maxPrice) {
        filters.pricePerKg = {};
        if (minPrice) filters.pricePerKg.$gte = parseFloat(minPrice);
        if (maxPrice) filters.pricePerKg.$lte = parseFloat(maxPrice);
    }

    if (search) {
        filters.$text = { $search: search };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const crops = await Crop.find(filters)
        .populate('farmer', 'fullName farmName averageRating totalReviews profileImage')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    // Get total count for pagination
    const totalCrops = await Crop.countDocuments(filters);
    const totalPages = Math.ceil(totalCrops / limit);

    // Process crops to add image URLs
    const processedCrops = crops.map(crop => ({
        ...crop,
        primaryImageUrl: crop.images && crop.images.length > 0 
            ? `/uploads/crops/${crop.images[0].filename}`
            : null
    }));

    res.status(200).json({
        success: true,
        data: {
            crops: processedCrops,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCrops,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }
    });
});

// @desc    Get single crop by ID
// @route   GET /api/crops/:id
// @access  Public
const getCrop = asyncHandler(async (req, res) => {
    const crop = await Crop.findById(req.params.id)
        .populate('farmer', 'fullName farmName averageRating totalReviews profileImage phone region')
        .lean();

    if (!crop) {
        return res.status(404).json({
            success: false,
            message: 'Crop not found'
        });
    }

    // Increment views (async, don't wait)
    Crop.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    // Process images
    const processedCrop = {
        ...crop,
        imageUrls: crop.images.map(img => `/uploads/crops/${img.filename}`)
    };

    res.status(200).json({
        success: true,
        data: { crop: processedCrop }
    });
});

// @desc    Create new crop listing
// @route   POST /api/crops
// @access  Private (Farmers only)
const createCrop = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
            images.push({
                filename: file.filename,
                originalName: file.originalname,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
                isPrimary: index === 0 // First image is primary
            });
        });
    }

    const cropData = {
        ...req.body,
        farmer: req.user._id,
        farmName: req.user.farmName,
        location: {
            region: req.body.region || req.user.region,
            city: req.body.city
        },
        images,
        moderationStatus: 'pending'
    };

    const crop = await Crop.create(cropData);

    const populatedCrop = await Crop.findById(crop._id)
        .populate('farmer', 'fullName farmName')
        .lean();

    res.status(201).json({
        success: true,
        message: 'Crop listing created successfully',
        data: { crop: populatedCrop }
    });
});

// @desc    Update crop listing
// @route   PUT /api/crops/:id
// @access  Private (Owner or Admin)
const updateCrop = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    let crop = await Crop.findById(req.params.id);

    if (!crop) {
        return res.status(404).json({
            success: false,
            message: 'Crop not found'
        });
    }

    // Check ownership (farmer can only update their own crops)
    if (req.user.userType !== 'admin' && crop.farmer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update this crop'
        });
    }

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file, index) => ({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            isPrimary: crop.images.length === 0 && index === 0 // Set as primary if no existing images
        }));

        req.body.images = [...crop.images, ...newImages];
    }

    // If farmer updates crop, reset moderation status
    if (req.user.userType === 'farmer') {
        req.body.moderationStatus = 'pending';
    }

    crop = await Crop.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('farmer', 'fullName farmName');

    res.status(200).json({
        success: true,
        message: 'Crop updated successfully',
        data: { crop }
    });
});

// @desc    Delete crop listing
// @route   DELETE /api/crops/:id
// @access  Private (Owner or Admin)
const deleteCrop = asyncHandler(async (req, res) => {
    const crop = await Crop.findById(req.params.id);

    if (!crop) {
        return res.status(404).json({
            success: false,
            message: 'Crop not found'
        });
    }

    // Check ownership
    if (req.user.userType !== 'admin' && crop.farmer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this crop'
        });
    }

    // Delete associated images
    if (crop.images && crop.images.length > 0) {
        crop.images.forEach(image => {
            deleteFile(image.path);
        });
    }

    await crop.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Crop deleted successfully'
    });
});

// @desc    Get farmer's crops
// @route   GET /api/crops/farmer/:farmerId
// @access  Public
const getFarmerCrops = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, status } = req.query;

    const filters = { farmer: req.params.farmerId };
    
    if (status) {
        filters.status = status;
    } else {
        // Default to available crops for public view
        filters.status = 'available';
        filters.isActive = true;
    }

    const crops = await Crop.find(filters)
        .populate('farmer', 'fullName farmName averageRating')
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

// @desc    Search crops
// @route   GET /api/crops/search
// @access  Public
const searchCrops = asyncHandler(async (req, res) => {
    const { q: query, category, region, page = 1, limit = 12 } = req.query;

    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const searchFilters = {
        $text: { $search: query },
        status: 'available',
        isActive: true,
        quantityAvailable: { $gt: 0 },
        expiryDate: { $gt: new Date() }
    };

    if (category) searchFilters.category = category;
    if (region) searchFilters['location.region'] = region;

    const crops = await Crop.find(searchFilters, { score: { $meta: 'textScore' } })
        .populate('farmer', 'fullName farmName averageRating')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const totalCrops = await Crop.countDocuments(searchFilters);

    res.status(200).json({
        success: true,
        data: {
            crops,
            query,
            totalResults: totalCrops,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCrops / limit),
                totalCrops
            }
        }
    });
});

// @desc    Get crop categories with counts
// @route   GET /api/crops/categories
// @access  Public
const getCropCategories = asyncHandler(async (req, res) => {
    const categories = await Crop.aggregate([
        {
            $match: {
                status: 'available',
                isActive: true,
                quantityAvailable: { $gt: 0 },
                expiryDate: { $gt: new Date() }
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                averagePrice: { $avg: '$pricePerKg' },
                totalQuantity: { $sum: '$quantityAvailable' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.status(200).json({
        success: true,
        data: { categories }
    });
});

// @desc    Toggle crop status (activate/deactivate)
// @route   PATCH /api/crops/:id/toggle-status
// @access  Private (Owner or Admin)
const toggleCropStatus = asyncHandler(async (req, res) => {
    const crop = await Crop.findById(req.params.id);

    if (!crop) {
        return res.status(404).json({
            success: false,
            message: 'Crop not found'
        });
    }

    // Check ownership
    if (req.user.userType !== 'admin' && crop.farmer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to modify this crop'
        });
    }

    crop.isActive = !crop.isActive;
    await crop.save();

    res.status(200).json({
        success: true,
        message: `Crop ${crop.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { crop }
    });
});

module.exports = {
    getCrops,
    getCrop,
    createCrop,
    updateCrop,
    deleteCrop,
    getFarmerCrops,
    searchCrops,
    getCropCategories,
    toggleCropStatus
};