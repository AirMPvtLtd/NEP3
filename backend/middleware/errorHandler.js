/**
 * ERROR HANDLER MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Global error handling and logging
 * 
 * @module middleware/errorHandler.middleware
 */

// ============================================================================
// IMPORT ALL ERROR CLASSES FROM AppError.js
// ============================================================================

const { 
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
} = require('../utils/AppError');

const { Activity } = require('../models');

// Note: All error classes are now imported from AppError.js
// We removed the duplicate class definitions that were here before

// ============================================================================
// ERROR LOGGER
// ============================================================================

/**
 * Log error to database
 * @param {Error} error - Error object
 * @param {Object} req - Request object
 */
const logError = async (error, req) => {
  try {
    const errorLog = {
      type: 'error',
      userId: req.user?.userId || 'anonymous',
      userType: req.user?.userType || 'anonymous',
      schoolId: req.user?.schoolId,
      action: `${req.method} ${req.originalUrl}`,
      details: {
        message: error.message,
        statusCode: error.statusCode || 500,
        errorCode: error.errorCode,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        body: req.body,
        params: req.params,
        query: req.query
      },
      metadata: {
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        timestamp: new Date()
      }
    };
    
    await Activity.create(errorLog);
    
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
};

/**
 * Log error to console
 * @param {Error} error - Error object
 * @param {Object} req - Request object
 */
const logErrorToConsole = (error, req) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const statusCode = error.statusCode || 500;
  
  console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ERROR OCCURRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Timestamp:     ${timestamp}
🌐 Endpoint:      ${method} ${url}
📊 Status Code:   ${statusCode}
🏷️  Error Code:    ${error.errorCode || 'UNKNOWN'}
💬 Message:       ${error.message}
👤 User:          ${req.user?.userId || 'anonymous'} (${req.user?.userType || 'anonymous'})
🔍 IP:            ${req.ip}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Stack Trace:
${error.stack}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
};

// ============================================================================
// ERROR PARSERS
// ============================================================================

/**
 * Parse MongoDB errors
 * @param {Error} error - MongoDB error
 * @returns {Object} Parsed error
 */
const parseMongoError = (error) => {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      statusCode: 409,
      errorCode: 'DUPLICATE_KEY',
      message: `${field} already exists`,
      field
    };
  }
  
  // Validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors
    };
  }
  
  // Cast error
  if (error.name === 'CastError') {
    return {
      statusCode: 400,
      errorCode: 'INVALID_DATA',
      message: `Invalid ${error.path}: ${error.value}`,
      field: error.path
    };
  }
  
  return null;
};

/**
 * Parse JWT errors
 * @param {Error} error - JWT error
 * @returns {Object} Parsed error
 */
const parseJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid token'
    };
  }
  
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      errorCode: 'TOKEN_EXPIRED',
      message: 'Token expired'
    };
  }
  
  return null;
};

/**
 * Parse Multer errors (file upload)
 * @param {Error} error - Multer error
 * @returns {Object} Parsed error
 */
const parseMulterError = (error) => {
  if (error.name === 'MulterError') {
    const errorMessages = {
      'LIMIT_FILE_SIZE': 'File too large',
      'LIMIT_FILE_COUNT': 'Too many files',
      'LIMIT_UNEXPECTED_FILE': 'Unexpected file field',
      'LIMIT_FIELD_KEY': 'Field name too long',
      'LIMIT_FIELD_VALUE': 'Field value too long',
      'LIMIT_FIELD_COUNT': 'Too many fields',
      'LIMIT_PART_COUNT': 'Too many parts'
    };
    
    return {
      statusCode: 400,
      errorCode: error.code,
      message: errorMessages[error.code] || error.message,
      field: error.field
    };
  }
  
  return null;
};

// ============================================================================
// NOT FOUND HANDLER
// ============================================================================

/**
 * Handle 404 not found
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  error.statusCode = 404;
  error.message = `Cannot ${req.method} ${req.originalUrl}`;
  next(error);
};

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

/**
 * Global error handler middleware
 */
const errorHandler = async (error, req, res, next) => {
  // Default error values
  let statusCode = error.statusCode || 500;
  let errorCode = error.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'Internal server error';
  let errors = error.errors || null;
  let field = error.field || null;
  
  // Parse specific error types
  const mongoError = parseMongoError(error);
  if (mongoError) {
    statusCode = mongoError.statusCode;
    errorCode = mongoError.errorCode;
    message = mongoError.message;
    errors = mongoError.errors;
    field = mongoError.field;
  }
  
  const jwtError = parseJWTError(error);
  if (jwtError) {
    statusCode = jwtError.statusCode;
    errorCode = jwtError.errorCode;
    message = jwtError.message;
  }
  
  const multerError = parseMulterError(error);
  if (multerError) {
    statusCode = multerError.statusCode;
    errorCode = multerError.errorCode;
    message = multerError.message;
    field = multerError.field;
  }
  
  // Log error
  if (statusCode >= 500) {
    logErrorToConsole(error, req);
    await logError(error, req);
  }
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: errorCode,
    message
  };
  
  // Add additional fields if present
  if (field) {
    errorResponse.field = field;
  }
  
  if (errors) {
    errorResponse.errors = errors;
  }
  
  if (error.retryAfter) {
    errorResponse.retryAfter = error.retryAfter;
    res.setHeader('Retry-After', error.retryAfter);
  }
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      isOperational: error.isOperational
    };
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wrap multiple async handlers
 * @param {Array} handlers - Array of handlers
 * @returns {Array} Wrapped handlers
 */
const asyncHandlers = (...handlers) => {
  return handlers.map(handler => asyncHandler(handler));
};

// ============================================================================
// UNHANDLED REJECTION HANDLER
// ============================================================================

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🔴 UNHANDLED PROMISE REJECTION');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⏰ Timestamp:', new Date().toISOString());
    console.error('💬 Reason:', reason);
    console.error('📍 Promise:', promise);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // In production, log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Log to external service (e.g., Sentry, LogRocket)
    }
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🔴 UNCAUGHT EXCEPTION');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⏰ Timestamp:', new Date().toISOString());
    console.error('💬 Error:', error.message);
    console.error('📚 Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Exit process on uncaught exception
    process.exit(1);
  });
};

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Send success response
 * @param {Object} res - Response object
 * @param {Object} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - Status code
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Response object
 * @param {String} message - Error message
 * @param {Number} statusCode - Status code
 * @param {String} errorCode - Error code
 */
const sendError = (res, message, statusCode = 500, errorCode = 'ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message
  });
};

/**
 * Send validation error response
 * @param {Object} res - Response object
 * @param {Array} errors - Validation errors
 */
const sendValidationError = (res, errors) => {
  res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors
  });
};

/**
 * Send paginated response
 * @param {Object} res - Response object
 * @param {Array} data - Data array
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 */
const sendPaginatedResponse = (res, data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
};

// ============================================================================
// ERROR BOUNDARY FOR ROUTES
// ============================================================================

/**
 * Create error boundary for route groups
 * @param {Function} routerFn - Router function
 * @returns {Function} Wrapped router
 */
const errorBoundary = (routerFn) => {
  return (req, res, next) => {
    try {
      routerFn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// SAFE JSON RESPONSE
// ============================================================================

/**
 * Safe JSON stringify (handles circular references)
 * @param {*} obj - Object to stringify
 * @returns {String} JSON string
 */
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
};

/**
 * Send safe JSON response
 * @param {Object} res - Response object
 * @param {*} data - Data to send
 * @param {Number} statusCode - Status code
 */
const sendSafeJSON = (res, data, statusCode = 200) => {
  try {
    res.status(statusCode).json(data);
  } catch (error) {
    // Handle circular reference or other JSON errors
    res.status(statusCode).send(safeStringify(data));
  }
};

// ============================================================================
// INITIALIZE ERROR HANDLERS
// ============================================================================

/**
 * Initialize all error handlers
 */
const initializeErrorHandlers = () => {
  handleUnhandledRejection();
  handleUncaughtException();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Error Classes (all imported from AppError.js)
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  
  // Async Helpers
  asyncHandler,
  asyncHandlers,
  
  // Response Helpers
  sendSuccess,
  sendError,
  sendValidationError,
  sendPaginatedResponse,
  sendSafeJSON,
  
  // Utilities
  errorBoundary,
  initializeErrorHandlers,
  logError,
  safeStringify
};