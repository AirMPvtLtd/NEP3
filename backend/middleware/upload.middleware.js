// middleware/upload.middleware.js
/**
 * UPLOAD MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * File upload handling with validation and security
 * 
 * @module middleware/upload.middleware
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// ============================================================================
// UPLOAD DIRECTORIES
// ============================================================================

const uploadDirs = {
  temp: path.join(__dirname, '../uploads/temp'),
  images: path.join(__dirname, '../uploads/images'),
  documents: path.join(__dirname, '../uploads/documents'),
  avatars: path.join(__dirname, '../uploads/avatars'),
  exports: path.join(__dirname, '../uploads/exports'),
  reports: path.join(__dirname, '../uploads/reports')
};

// Create upload directories if they don't exist
Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// FILE TYPE VALIDATION
// ============================================================================

const allowedMimeTypes = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ],
  all: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
};

const allowedExtensions = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
  all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv']
};

const dangerousExtensions = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx',
  '.jsp', '.jar', '.war', '.com', '.scr', '.vbs', '.js',
  '.msi', '.dll', '.sys', '.bin'
];

// ============================================================================
// FILE FILTER
// ============================================================================

/**
 * Create file filter
 * @param {String} type - File type (images, documents, all)
 * @returns {Function} Filter function
 */
const createFileFilter = (type = 'all') => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    // Check for dangerous extensions
    if (dangerousExtensions.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
    }
    
    // Check extension
    const allowedExts = allowedExtensions[type] || allowedExtensions.all;
    if (!allowedExts.includes(ext)) {
      return cb(new Error(`File extension ${ext} not allowed. Allowed: ${allowedExts.join(', ')}`), false);
    }
    
    // Check MIME type
    const allowedMimes = allowedMimeTypes[type] || allowedMimeTypes.all;
    if (!allowedMimes.includes(mimeType)) {
      return cb(new Error(`File type ${mimeType} not allowed. Allowed: ${allowedMimes.join(', ')}`), false);
    }
    
    cb(null, true);
  };
};

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/**
 * Disk storage configuration
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.uploadType || 'temp';
    const destination = uploadDirs[uploadType] || uploadDirs.temp;
    cb(null, destination);
  },
  
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 50);
    
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

/**
 * Memory storage configuration
 */
const memoryStorage = multer.memoryStorage();

// ============================================================================
// UPLOAD CONFIGURATIONS
// ============================================================================

/**
 * General file upload (disk storage)
 */
const uploadFile = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('all'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

/**
 * Multiple files upload
 */
const uploadMultipleFiles = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('all'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10
  }
});

/**
 * Image upload
 */
const uploadImage = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('images'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

/**
 * Multiple images upload
 */
const uploadMultipleImages = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('images'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 5
  }
});

/**
 * Avatar upload
 */
const uploadAvatar = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('images'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
});

/**
 * Document upload
 */
const uploadDocument = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('documents'),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1
  }
});

/**
 * Multiple documents upload
 */
const uploadMultipleDocuments = multer({
  storage: diskStorage,
  fileFilter: createFileFilter('documents'),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per document
    files: 5
  }
});

/**
 * CSV upload
 */
const uploadCSV = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    if (ext !== '.csv' && mimeType !== 'text/csv') {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

/**
 * Memory upload (for processing without saving to disk)
 */
const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter('all'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// ============================================================================
// CUSTOM UPLOAD MIDDLEWARE
// ============================================================================

/**
 * Create custom upload middleware
 * @param {Object} options - Upload options
 */
const createUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024,
    maxFiles = 1,
    fileType = 'all',
    destination = 'temp',
    useMemory = false
  } = options;
  
  return multer({
    storage: useMemory ? memoryStorage : diskStorage,
    fileFilter: createFileFilter(fileType),
    limits: {
      fileSize: maxSize,
      files: maxFiles
    }
  });
};

// ============================================================================
// FILE VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate uploaded file
 */
const validateUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  next();
};

/**
 * Validate file size
 * @param {Number} maxSize - Max size in bytes
 */
const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    const file = req.file || (req.files && req.files[0]);
    
    if (file && file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
      });
    }
    
    next();
  };
};

/**
 * Validate file type
 * @param {Array} allowedTypes - Allowed MIME types
 */
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    const file = req.file || (req.files && req.files[0]);
    
    if (file && !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (req, res, next) => {
  if (req.file) {
    req.file.originalname = req.file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/\.+/g, '.')
      .replace(/-+/g, '-');
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.originalname = file.originalname
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/\.+/g, '.')
          .replace(/-+/g, '-');
      });
    } else {
      Object.keys(req.files).forEach(key => {
        if (Array.isArray(req.files[key])) {
          req.files[key].forEach(file => {
            file.originalname = file.originalname
              .replace(/[^a-zA-Z0-9._-]/g, '-')
              .replace(/\.+/g, '.')
              .replace(/-+/g, '-');
          });
        }
      });
    }
  }
  
  next();
};

// ============================================================================
// FILE PROCESSING
// ============================================================================

/**
 * Process uploaded file
 */
const processUpload = async (req, res, next) => {
  if (req.file) {
    req.file.url = `/uploads/${req.uploadType || 'temp'}/${req.file.filename}`;
    req.file.uploadedAt = new Date();
    req.file.uploadedBy = req.user?.userId;
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.url = `/uploads/${req.uploadType || 'temp'}/${file.filename}`;
        file.uploadedAt = new Date();
        file.uploadedBy = req.user?.userId;
      });
    }
  }
  
  next();
};

/**
 * Set upload type
 * @param {String} type - Upload type
 */
const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// ============================================================================
// FILE CLEANUP
// ============================================================================

/**
 * Delete uploaded file
 * @param {String} filePath - File path
 */
const deleteFile = async (filePath) => {
  try {
    await unlinkAsync(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Delete multiple files
 * @param {Array} filePaths - Array of file paths
 */
const deleteFiles = async (filePaths) => {
  const results = await Promise.all(
    filePaths.map(filePath => deleteFile(filePath))
  );
  return results.every(result => result === true);
};

/**
 * Clean up uploaded files on error
 */
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode >= 400) {
      // Error response, cleanup uploaded files
      if (req.file) {
        deleteFile(req.file.path).catch(console.error);
      }
      
      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files.forEach(file => {
          deleteFile(file.path).catch(console.error);
        });
      }
    }
    
    originalSend.apply(res, arguments);
  };
  
  next();
};

/**
 * Clean up old temporary files
 * @param {Number} maxAge - Max age in milliseconds
 */
const cleanupTempFiles = async (maxAge = 24 * 60 * 60 * 1000) => {
  try {
    const files = fs.readdirSync(uploadDirs.temp);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(uploadDirs.temp, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await deleteFile(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

/**
 * Schedule cleanup
 */
const scheduleCleanup = () => {
  // Run cleanup every hour
  setInterval(() => {
    cleanupTempFiles().catch(console.error);
  }, 60 * 60 * 1000);
  
  console.log('File cleanup scheduled');
};

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Get file extension
 * @param {String} filename - Filename
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Get file size in human readable format
 * @param {Number} bytes - File size in bytes
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file exists
 * @param {String} filePath - File path
 */
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Get file info
 * @param {String} filePath - File path
 */
const getFileInfo = (filePath) => {
  if (!fileExists(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  
  return {
    path: filePath,
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    created: stats.birthtime,
    modified: stats.mtime,
    extension: getFileExtension(filePath)
  };
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const errorMessages = {
      'LIMIT_FILE_SIZE': 'File size too large',
      'LIMIT_FILE_COUNT': 'Too many files',
      'LIMIT_UNEXPECTED_FILE': 'Unexpected file field',
      'LIMIT_FIELD_KEY': 'Field name too long',
      'LIMIT_FIELD_VALUE': 'Field value too long',
      'LIMIT_FIELD_COUNT': 'Too many fields',
      'LIMIT_PART_COUNT': 'Too many parts'
    };
    
    return res.status(400).json({
      success: false,
      error: err.code,
      message: errorMessages[err.code] || err.message,
      field: err.field
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Upload middleware
  uploadFile,
  uploadMultipleFiles,
  uploadImage,
  uploadMultipleImages,
  uploadAvatar,
  uploadDocument,
  uploadMultipleDocuments,
  uploadCSV,
  uploadToMemory,
  createUpload,
  
  // Validation
  validateUpload,
  validateFileSize,
  validateFileType,
  sanitizeFilename,
  
  // Processing
  processUpload,
  setUploadType,
  
  // Cleanup
  deleteFile,
  deleteFiles,
  cleanupOnError,
  cleanupTempFiles,
  scheduleCleanup,
  
  // Utilities
  getFileExtension,
  formatFileSize,
  fileExists,
  getFileInfo,
  
  // Error handling
  handleUploadError,
  
  // Configuration
  uploadDirs,
  allowedMimeTypes,
  allowedExtensions,
  dangerousExtensions
};