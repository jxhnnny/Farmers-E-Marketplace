const { body, validationResult, param, query } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Authentication validation
const validateRegistration = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2-100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('userType')
        .isIn(['farmer', 'buyer'])
        .withMessage('User type must be either farmer or buyer'),
    body('phone')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('region')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Region is required'),
    // Conditional validations for farmer
    body('farmName')
        .if(body('userType').equals('farmer'))
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Farm name is required for farmers'),
    body('farmSize')
        .if(body('userType').equals('farmer'))
        .isNumeric()
        .withMessage('Farm size must be a number'),
    body('farmingExperience')
        .if(body('userType').equals('farmer'))
        .isInt({ min: 0 })
        .withMessage('Farming experience must be a positive number'),
    // Conditional validations for buyer
    body('businessName')
        .if(body('userType').equals('buyer'))
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2-100 characters'),
    handleValidationErrors
];

const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const validatePasswordReset = [
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    handleValidationErrors
];

const validateProfileUpdate = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2-100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('region')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Region must be between 2-50 characters'),
    body('farmName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Farm name must be between 2-100 characters'),
    body('farmSize')
        .optional()
        .isNumeric()
        .withMessage('Farm size must be a number'),
    body('farmingExperience')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Farming experience must be a positive number'),
    body('businessName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2-100 characters'),
    handleValidationErrors
];

const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    handleValidationErrors
];

// Crop validation
const validateCrop = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Crop name must be between 2-100 characters'),
    body('category')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category is required'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10-1000 characters'),
    body('pricePerKg')
        .isFloat({ min: 0.01 })
        .withMessage('Price per kg must be a positive number'),
    body('quantityAvailable')
        .isFloat({ min: 0.1 })
        .withMessage('Quantity available must be at least 0.1 kg'),
    body('unit')
        .isIn(['kg', 'tons', 'bags', 'pieces'])
        .withMessage('Unit must be kg, tons, bags, or pieces'),
    body('harvestDate')
        .isISO8601()
        .withMessage('Please provide a valid harvest date'),
    body('expiryDate')
        .isISO8601()
        .withMessage('Please provide a valid expiry date')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.harvestDate)) {
                throw new Error('Expiry date must be after harvest date');
            }
            return true;
        }),
    body('organicCertified')
        .isBoolean()
        .withMessage('Organic certification must be true or false'),
    body('location.address')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Address must be between 10-200 characters'),
    body('location.city')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City is required'),
    body('location.region')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Region is required'),
    handleValidationErrors
];

const validateCropUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Crop name must be between 2-100 characters'),
    body('category')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2-50 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10-1000 characters'),
    body('pricePerKg')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Price per kg must be a positive number'),
    body('quantityAvailable')
        .optional()
        .isFloat({ min: 0.1 })
        .withMessage('Quantity available must be at least 0.1 kg'),
    body('unit')
        .optional()
        .isIn(['kg', 'tons', 'bags', 'pieces'])
        .withMessage('Unit must be kg, tons, bags, or pieces'),
    body('harvestDate')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid harvest date'),
    body('expiryDate')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid expiry date'),
    body('organicCertified')
        .optional()
        .isBoolean()
        .withMessage('Organic certification must be true or false'),
    body('location.address')
        .optional()
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Address must be between 10-200 characters'),
    body('location.city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2-50 characters'),
    body('location.region')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Region must be between 2-50 characters'),
    handleValidationErrors
];

// Admin validation
const validateUserStatusUpdate = [
    body('status')
        .isIn(['active', 'suspended', 'pending'])
        .withMessage('Status must be active, suspended, or pending'),
    handleValidationErrors
];

const validateCropModeration = [
    body('action')
        .isIn(['approve', 'reject', 'flag'])
        .withMessage('Action must be approve, reject, or flag'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters'),
    handleValidationErrors
];

// Query parameter validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

const validateCropFilters = [
    query('category')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2-50 characters'),
    query('region')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Region must be between 2-50 characters'),
    query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be a positive number'),
    query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be a positive number'),
    query('organicOnly')
        .optional()
        .isBoolean()
        .withMessage('Organic only must be true or false'),
    query('sortBy')
        .optional()
        .isIn(['createdAt', 'pricePerKg', 'name', 'harvestDate'])
        .withMessage('Sort by must be createdAt, pricePerKg, name, or harvestDate'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    handleValidationErrors
];

// ID parameter validation
const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID format'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validatePasswordReset,
    validateProfileUpdate,
    validatePasswordChange,
    validateCrop,
    validateCropUpdate,
    validateUserStatusUpdate,
    validateCropModeration,
    validatePagination,
    validateCropFilters,
    validateObjectId,
    handleValidationErrors
};