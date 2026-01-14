// utils/fileUtils.js
/**
 * FILE UTILS - COMPLETE PRODUCTION VERSION
 * File operations, validation, and processing utilities
 * 
 * @module utils/fileUtils
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// FILE CONFIGURATION
// ============================================================================

const FILE_CONFIG = {
  // Allowed MIME types
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    text: ['text/plain', 'text/csv', 'text/markdown'],
    archives: ['application/zip', 'application/x-rar-compressed']
  },
  
  // Max file sizes (in bytes)
  maxSizes: {
    image: 5 * 1024 * 1024,      // 5 MB
    document: 10 * 1024 * 1024,  // 10 MB
    video: 100 * 1024 * 1024,    // 100 MB
    default: 5 * 1024 * 1024     // 5 MB
  },
  
  // File extensions
  extensions: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
    text: ['.txt', '.csv', '.md']
  }
};

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Validate file type
 * @param {String} mimetype - MIME type
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Boolean} Is valid
 */
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Validate file size
 * @param {Number} size - File size in bytes
 * @param {Number} maxSize - Maximum size in bytes
 * @returns {Boolean} Is valid
 */
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

/**
 * Validate file extension
 * @param {String} filename - Filename
 * @param {Array} allowedExtensions - Allowed extensions
 * @returns {Boolean} Is valid
 */
const isValidExtension = (filename, allowedExtensions) => {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
};

/**
 * Check if file is image
 * @param {String} mimetype - MIME type
 * @returns {Boolean} Is image
 */
const isImage = (mimetype) => {
  return FILE_CONFIG.allowedMimeTypes.images.includes(mimetype);
};

/**
 * Check if file is document
 * @param {String} mimetype - MIME type
 * @returns {Boolean} Is document
 */
const isDocument = (mimetype) => {
  return FILE_CONFIG.allowedMimeTypes.documents.includes(mimetype);
};

/**
 * Validate uploaded file
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateFile = (file, options = {}) => {
  const errors = [];
  
  const {
    allowedTypes = [],
    maxSize = FILE_CONFIG.maxSizes.default,
    allowedExtensions = []
  } = options;
  
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      errors: ['No file provided']
    };
  }
  
  // Validate type
  if (allowedTypes.length > 0 && !isValidFileType(file.mimetype, allowedTypes)) {
    errors.push(`Invalid file type: ${file.mimetype}`);
  }
  
  // Validate size
  if (!isValidFileSize(file.size, maxSize)) {
    errors.push(`File too large: ${formatFileSize(file.size)} (max: ${formatFileSize(maxSize)})`);
  }
  
  // Validate extension
  if (allowedExtensions.length > 0 && !isValidExtension(file.originalname, allowedExtensions)) {
    errors.push(`Invalid file extension: ${path.extname(file.originalname)}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Check if file exists
 * @param {String} filepath - File path
 * @returns {Promise<Boolean>} Exists
 */
const fileExists = async (filepath) => {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read file content
 * @param {String} filepath - File path
 * @param {String} encoding - File encoding
 * @returns {Promise<String|Buffer>} File content
 */
const readFile = async (filepath, encoding = 'utf8') => {
  return await fs.readFile(filepath, encoding);
};

/**
 * Write file content
 * @param {String} filepath - File path
 * @param {String|Buffer} content - Content to write
 * @param {Object} options - Write options
 * @returns {Promise}
 */
const writeFile = async (filepath, content, options = {}) => {
  // Ensure directory exists
  await ensureDirectory(path.dirname(filepath));
  return await fs.writeFile(filepath, content, options);
};

/**
 * Append to file
 * @param {String} filepath - File path
 * @param {String|Buffer} content - Content to append
 * @returns {Promise}
 */
const appendFile = async (filepath, content) => {
  return await fs.appendFile(filepath, content);
};

/**
 * Delete file
 * @param {String} filepath - File path
 * @returns {Promise}
 */
const deleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Copy file
 * @param {String} source - Source path
 * @param {String} destination - Destination path
 * @returns {Promise}
 */
const copyFile = async (source, destination) => {
  await ensureDirectory(path.dirname(destination));
  return await fs.copyFile(source, destination);
};

/**
 * Move file
 * @param {String} source - Source path
 * @param {String} destination - Destination path
 * @returns {Promise}
 */
const moveFile = async (source, destination) => {
  await ensureDirectory(path.dirname(destination));
  return await fs.rename(source, destination);
};

/**
 * Get file stats
 * @param {String} filepath - File path
 * @returns {Promise<Object>} File stats
 */
const getFileStats = async (filepath) => {
  return await fs.stat(filepath);
};

/**
 * Get file size
 * @param {String} filepath - File path
 * @returns {Promise<Number>} File size in bytes
 */
const getFileSize = async (filepath) => {
  const stats = await getFileStats(filepath);
  return stats.size;
};

// ============================================================================
// DIRECTORY OPERATIONS
// ============================================================================

/**
 * Ensure directory exists
 * @param {String} dirpath - Directory path
 * @returns {Promise}
 */
const ensureDirectory = async (dirpath) => {
  try {
    await fs.mkdir(dirpath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Read directory contents
 * @param {String} dirpath - Directory path
 * @returns {Promise<Array>} File names
 */
const readDirectory = async (dirpath) => {
  return await fs.readdir(dirpath);
};

/**
 * Delete directory recursively
 * @param {String} dirpath - Directory path
 * @returns {Promise}
 */
const deleteDirectory = async (dirpath) => {
  return await fs.rm(dirpath, { recursive: true, force: true });
};

/**
 * List files in directory
 * @param {String} dirpath - Directory path
 * @param {Object} options - List options
 * @returns {Promise<Array>} File list
 */
const listFiles = async (dirpath, options = {}) => {
  const {
    recursive = false,
    extensions = null
  } = options;
  
  const files = [];
  const items = await fs.readdir(dirpath, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dirpath, item.name);
    
    if (item.isDirectory() && recursive) {
      const subFiles = await listFiles(fullPath, options);
      files.push(...subFiles);
    } else if (item.isFile()) {
      if (!extensions || extensions.includes(path.extname(item.name))) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
};

// ============================================================================
// FILE NAMING
// ============================================================================

/**
 * Generate unique filename
 * @param {String} originalName - Original filename
 * @param {String} prefix - Filename prefix
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  
  return `${prefix}${name}-${timestamp}-${random}${ext}`;
};

/**
 * Sanitize filename
 * @param {String} filename - Filename
 * @returns {String} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Get safe filename
 * @param {String} filename - Filename
 * @returns {String} Safe filename
 */
const getSafeFilename = (filename) => {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const sanitized = sanitizeFilename(name);
  return `${sanitized}${ext}`;
};

// ============================================================================
// FILE FORMATTING
// ============================================================================

/**
 * Format file size to human-readable string
 * @param {Number} bytes - Size in bytes
 * @returns {String} Formatted size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension
 * @param {String} filename - Filename
 * @returns {String} Extension
 */
const getExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Get filename without extension
 * @param {String} filename - Filename
 * @returns {String} Filename without extension
 */
const getBasename = (filename) => {
  return path.basename(filename, path.extname(filename));
};

/**
 * Change file extension
 * @param {String} filename - Filename
 * @param {String} newExt - New extension
 * @returns {String} New filename
 */
const changeExtension = (filename, newExt) => {
  const base = getBasename(filename);
  return base + (newExt.startsWith('.') ? newExt : '.' + newExt);
};

// ============================================================================
// FILE HASHING
// ============================================================================

/**
 * Calculate file hash
 * @param {String} filepath - File path
 * @param {String} algorithm - Hash algorithm
 * @returns {Promise<String>} File hash
 */
const calculateFileHash = async (filepath, algorithm = 'md5') => {
  const content = await readFile(filepath);
  return crypto.createHash(algorithm).update(content).digest('hex');
};

/**
 * Compare file hashes
 * @param {String} file1 - First file path
 * @param {String} file2 - Second file path
 * @returns {Promise<Boolean>} Files are identical
 */
const compareFiles = async (file1, file2) => {
  const hash1 = await calculateFileHash(file1);
  const hash2 = await calculateFileHash(file2);
  return hash1 === hash2;
};

// ============================================================================
// FILE METADATA
// ============================================================================

/**
 * Get file metadata
 * @param {String} filepath - File path
 * @returns {Promise<Object>} File metadata
 */
const getFileMetadata = async (filepath) => {
  const stats = await getFileStats(filepath);
  
  return {
    name: path.basename(filepath),
    path: filepath,
    extension: getExtension(filepath),
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory()
  };
};

/**
 * Get file info
 * @param {Object} file - Multer file object
 * @returns {Object} File info
 */
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    path: file.path,
    destination: file.destination
  };
};

// ============================================================================
// FILE CLEANUP
// ============================================================================

/**
 * Delete old files in directory
 * @param {String} dirpath - Directory path
 * @param {Number} maxAge - Max age in milliseconds
 * @returns {Promise<Number>} Number of deleted files
 */
const deleteOldFiles = async (dirpath, maxAge) => {
  const files = await listFiles(dirpath);
  const now = Date.now();
  let deletedCount = 0;
  
  for (const filepath of files) {
    const stats = await getFileStats(filepath);
    const age = now - stats.mtime.getTime();
    
    if (age > maxAge) {
      await deleteFile(filepath);
      deletedCount++;
    }
  }
  
  return deletedCount;
};

/**
 * Clean temp files
 * @param {String} tempDir - Temp directory
 * @param {Number} maxAge - Max age in hours
 * @returns {Promise<Number>} Deleted count
 */
const cleanTempFiles = async (tempDir, maxAge = 24) => {
  const maxAgeMs = maxAge * 60 * 60 * 1000;
  return await deleteOldFiles(tempDir, maxAgeMs);
};

// ============================================================================
// FILE READING UTILITIES
// ============================================================================

/**
 * Read JSON file
 * @param {String} filepath - File path
 * @returns {Promise<Object>} Parsed JSON
 */
const readJSON = async (filepath) => {
  const content = await readFile(filepath, 'utf8');
  return JSON.parse(content);
};

/**
 * Write JSON file
 * @param {String} filepath - File path
 * @param {Object} data - Data to write
 * @returns {Promise}
 */
const writeJSON = async (filepath, data) => {
  const content = JSON.stringify(data, null, 2);
  return await writeFile(filepath, content);
};

/**
 * Read CSV file
 * @param {String} filepath - File path
 * @returns {Promise<Array>} CSV rows
 */
const readCSV = async (filepath) => {
  const content = await readFile(filepath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    return line.split(',').map(cell => cell.trim());
  });
};

/**
 * Read file lines
 * @param {String} filepath - File path
 * @returns {Promise<Array>} Lines
 */
const readLines = async (filepath) => {
  const content = await readFile(filepath, 'utf8');
  return content.split('\n');
};

// ============================================================================
// FILE STREAMING
// ============================================================================

/**
 * Create read stream
 * @param {String} filepath - File path
 * @param {Object} options - Stream options
 * @returns {ReadStream} Read stream
 */
const createReadStream = (filepath, options = {}) => {
  const fs = require('fs');
  return fs.createReadStream(filepath, options);
};

/**
 * Create write stream
 * @param {String} filepath - File path
 * @param {Object} options - Stream options
 * @returns {WriteStream} Write stream
 */
const createWriteStream = (filepath, options = {}) => {
  const fs = require('fs');
  return fs.createWriteStream(filepath, options);
};

// ============================================================================
// MIME TYPE DETECTION
// ============================================================================

/**
 * Get MIME type from extension
 * @param {String} filename - Filename
 * @returns {String} MIME type
 */
const getMimeType = (filename) => {
  const ext = getExtension(filename);
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.zip': 'application/zip'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Validation
  isValidFileType,
  isValidFileSize,
  isValidExtension,
  isImage,
  isDocument,
  validateFile,
  
  // File operations
  fileExists,
  readFile,
  writeFile,
  appendFile,
  deleteFile,
  copyFile,
  moveFile,
  getFileStats,
  getFileSize,
  
  // Directory operations
  ensureDirectory,
  readDirectory,
  deleteDirectory,
  listFiles,
  
  // File naming
  generateUniqueFilename,
  sanitizeFilename,
  getSafeFilename,
  
  // Formatting
  formatFileSize,
  getExtension,
  getBasename,
  changeExtension,
  
  // Hashing
  calculateFileHash,
  compareFiles,
  
  // Metadata
  getFileMetadata,
  getFileInfo,
  
  // Cleanup
  deleteOldFiles,
  cleanTempFiles,
  
  // Reading utilities
  readJSON,
  writeJSON,
  readCSV,
  readLines,
  
  // Streaming
  createReadStream,
  createWriteStream,
  
  // MIME types
  getMimeType,
  
  // Configuration
  FILE_CONFIG
};