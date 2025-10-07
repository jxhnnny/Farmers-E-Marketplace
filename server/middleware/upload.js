const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories
const subDirs = ['profiles', 'crops', 'documents'];
subDirs.forEach(dir => {
    const dirPath = path.join(uploadDir, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = uploadDir;
        
        // Determine upload path based on file type or request path
        if (req.path.includes('/profile')) {
            uploadPath = path.join(uploadDir, 'profiles');
        } else if (req.path.includes('/crops')) {
            uploadPath = path.join(uploadDir, 'crops');
        } else if (req.path.includes('/documents')) {
            uploadPath = path.join(uploadDir, 'documents');
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        
        // Clean filename
        const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
        const filename = `${cleanBaseName}-${uniqueSuffix}${extension}`;
        
        cb(null, filename);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = {
        images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const allAllowedTypes = [...allowedTypes.images, ...allowedTypes.documents];
    
    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allAllowedTypes.join(', ')}`), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    }
});

// Specific upload configurations
const uploadSingle = (fieldName) => upload.single(fieldName);
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

// Profile image upload
const uploadProfileImage = uploadSingle('profileImage');

// Crop images upload (multiple)
const uploadCropImages = uploadMultiple('images', 5);

// Document upload
const uploadDocument = uploadSingle('document');

// Mixed upload for crops (images + documents)
const uploadCropFiles = uploadFields([
    { name: 'images', maxCount: 5 },
    { name: 'documents', maxCount: 3 }
]);

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 10 files.'
            });
        }
        
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name in file upload.'
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
};

// Utility function to delete file
const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

// Utility function to get file URL
const getFileUrl = (req, filePath) => {
    if (!filePath) return null;
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = filePath.replace(path.join(__dirname, '../'), '');
    return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
};

// Middleware to process uploaded files and add URLs
const processUploadedFiles = (req, res, next) => {
    if (req.file) {
        req.file.url = getFileUrl(req, req.file.path);
    }
    
    if (req.files) {
        if (Array.isArray(req.files)) {
            req.files.forEach(file => {
                file.url = getFileUrl(req, file.path);
            });
        } else {
            // Handle multiple field uploads
            Object.keys(req.files).forEach(fieldName => {
                req.files[fieldName].forEach(file => {
                    file.url = getFileUrl(req, file.path);
                });
            });
        }
    }
    
    next();
};

// Image optimization middleware (basic)
const optimizeImages = async (req, res, next) => {
    // This is a placeholder for image optimization
    // In a production environment, you might use libraries like sharp
    // to resize and optimize images
    next();
};

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadFields,
    uploadProfileImage,
    uploadCropImages,
    uploadDocument,
    uploadCropFiles,
    handleUploadError,
    processUploadedFiles,
    optimizeImages,
    deleteFile,
    getFileUrl
};