// middleware/sanitization.middleware.js
/**
 * SANITIZATION MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Comprehensive input sanitization and security hardening
 * 
 * @module middleware/sanitization.middleware
 */

const validator = require('validator');
const xss = require('xss');
const mongoSanitize = require('express-mongo-sanitize');

// ============================================================================
// XSS PROTECTION
// ============================================================================

/**
 * XSS configuration options
 */
const xssOptions = {
  whiteList: {
    // Allow basic formatting
    b: [],
    i: [],
    u: [],
    strong: [],
    em: [],
    p: [],
    br: [],
    // Allow links with specific attributes
    a: ['href', 'title', 'target'],
    // Allow lists
    ul: [],
    ol: [],
    li: [],
    // Allow code blocks
    code: ['class'],
    pre: ['class']
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};

/**
 * Custom XSS filter
 */
const xssFilter = new xss.FilterXSS(xssOptions);

/**
 * Sanitize string from XSS attacks
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const sanitizeXSS = (input) => {
  if (typeof input !== 'string') return input;
  return xssFilter.process(input);
};

/**
 * Deep sanitize object from XSS
 * @param {Object} obj - Input object
 * @returns {Object} Sanitized object
 */
const deepSanitizeXSS = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeXSS(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeXSS(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitizeXSS(value);
    }
    return sanitized;
  }
  
  return obj;
};

// ============================================================================
// SQL INJECTION PROTECTION
// ============================================================================

/**
 * Check for SQL injection patterns
 * @param {String} input - Input string
 * @returns {Boolean}
 */
const hasSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(;|\-\-|\/\*|\*\/)/g,
    /(\b(OR|AND)\b.*=.*)/gi,
    /('|(\\'))/g
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize SQL injection attempts
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const sanitizeSQL = (input) => {
  if (typeof input !== 'string') return input;
  
  if (hasSQLInjection(input)) {
    // Replace dangerous characters
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }
  
  return input;
};

// ============================================================================
// NOSQL INJECTION PROTECTION
// ============================================================================

/**
 * Sanitize NoSQL injection attempts
 * @param {*} input - Input
 * @returns {*} Sanitized input
 */
const sanitizeNoSQL = (input) => {
  if (typeof input === 'string') {
    // Check for MongoDB operators
    if (input.startsWith('$')) {
      return input.substring(1);
    }
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeNoSQL(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      // Remove keys starting with $
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeNoSQL(value);
      }
    }
    return sanitized;
  }
  
  return input;
};

// ============================================================================
// HTML SANITIZATION
// ============================================================================

/**
 * Strip all HTML tags
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const stripHTML = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize HTML (allow safe tags)
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return input;
  return validator.stripLow(input);
};

// ============================================================================
// SPECIAL CHARACTER SANITIZATION
// ============================================================================

/**
 * Remove control characters
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const removeControlCharacters = (input) => {
  if (typeof input !== 'string') return input;
  // Remove ASCII control characters (0-31, 127)
  return input.replace(/[\x00-\x1F\x7F]/g, '');
};

/**
 * Remove null bytes
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const removeNullBytes = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/\0/g, '');
};

/**
 * Normalize whitespace
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const normalizeWhitespace = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/\s+/g, ' ').trim();
};

/**
 * Remove invisible characters
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const removeInvisibleCharacters = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u2028\u2029]/g, ''); // Line/paragraph separators
};

// ============================================================================
// PATH TRAVERSAL PROTECTION
// ============================================================================

/**
 * Check for path traversal attempts
 * @param {String} input - Input string
 * @returns {Boolean}
 */
const hasPathTraversal = (input) => {
  if (typeof input !== 'string') return false;
  
  const pathPatterns = [
    /\.\./g,
    /\.\/|\.\\|\.\\\\/g,
    /~\//g,
    /%2e%2e/gi,
    /%252e/gi
  ];
  
  return pathPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize path traversal attempts
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const sanitizePath = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/\.\./g, '')
    .replace(/\/\//g, '/')
    .replace(/\\/g, '/');
};

// ============================================================================
// COMMAND INJECTION PROTECTION
// ============================================================================

/**
 * Check for command injection attempts
 * @param {String} input - Input string
 * @returns {Boolean}
 */
const hasCommandInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const cmdPatterns = [
    /[;&|`$(){}[\]<>]/g,
    /\$\(/g,
    /`.*`/g,
    /\|\|/g,
    /&&/g
  ];
  
  return cmdPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize command injection attempts
 * @param {String} input - Input string
 * @returns {String} Sanitized string
 */
const sanitizeCommand = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[;&|`$(){}[\]<>]/g, '')
    .replace(/\$\(/g, '')
    .replace(/&&/g, '')
    .replace(/\|\|/g, '');
};

// ============================================================================
// EMAIL SANITIZATION
// ============================================================================

/**
 * Sanitize email address
 * @param {String} email - Email address
 * @returns {String} Sanitized email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  return validator.normalizeEmail(email.toLowerCase().trim());
};

// ============================================================================
// URL SANITIZATION
// ============================================================================

/**
 * Sanitize URL
 * @param {String} url - URL
 * @returns {String} Sanitized URL
 */
const sanitizeURL = (url) => {
  if (typeof url !== 'string') return url;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch (error) {
    return '';
  }
};

// ============================================================================
// COMPREHENSIVE SANITIZATION
// ============================================================================

/**
 * Apply all sanitization methods
 * @param {*} input - Input
 * @returns {*} Sanitized input
 */
const sanitizeAll = (input) => {
  if (typeof input === 'string') {
    let sanitized = input;
    sanitized = removeNullBytes(sanitized);
    sanitized = removeControlCharacters(sanitized);
    sanitized = removeInvisibleCharacters(sanitized);
    sanitized = sanitizeXSS(sanitized);
    sanitized = sanitizeSQL(sanitized);
    sanitized = sanitizePath(sanitized);
    sanitized = sanitizeCommand(sanitized);
    sanitized = normalizeWhitespace(sanitized);
    return sanitized;
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeAll(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeAll(value);
    }
    return sanitized;
  }
  
  return input;
};

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = deepSanitizeXSS(req.body);
    req.body = sanitizeNoSQL(req.body);
  }
  next();
};

/**
 * Sanitize query parameters
 */
const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    req.query = deepSanitizeXSS(req.query);
    req.query = sanitizeNoSQL(req.query);
  }
  next();
};

/**
 * Sanitize route parameters
 */
const sanitizeParams = (req, res, next) => {
  if (req.params) {
    req.params = deepSanitizeXSS(req.params);
  }
  next();
};

/**
 * Sanitize all request inputs
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeAll(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeAll(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeAll(req.params);
  }
  
  next();
};

/**
 * Strict sanitization (strips all HTML)
 */
const strictSanitize = (req, res, next) => {
  const sanitizeStrict = (obj) => {
    if (typeof obj === 'string') {
      let sanitized = stripHTML(obj);
      sanitized = removeNullBytes(sanitized);
      sanitized = removeControlCharacters(sanitized);
      sanitized = removeInvisibleCharacters(sanitized);
      return validator.escape(sanitized.trim());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeStrict(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeStrict(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeStrict(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeStrict(req.query);
  }
  
  next();
};

/**
 * Sanitize specific fields
 * @param {Array} fields - Fields to sanitize
 */
const sanitizeFields = (fields = []) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body && req.body[field] !== undefined) {
        req.body[field] = sanitizeAll(req.body[field]);
      }
      
      if (req.query && req.query[field] !== undefined) {
        req.query[field] = sanitizeAll(req.query[field]);
      }
    });
    
    next();
  };
};

/**
 * Content Security Policy headers
 */
const setSecurityHeaders = (req, res, next) => {
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  
  next();
};

/**
 * Remove dangerous file extensions from uploads
 */
const sanitizeFileUpload = (req, res, next) => {
  if (req.file || req.files) {
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx',
      '.jsp', '.jar', '.war', '.com', '.scr', '.vbs', '.js'
    ];
    
    const checkFile = (file) => {
      const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
      
      if (dangerousExtensions.includes(ext)) {
        throw new Error(`File type ${ext} is not allowed`);
      }
      
      // Sanitize filename
      file.originalname = sanitizePath(file.originalname);
      file.originalname = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
      
      return file;
    };
    
    try {
      if (req.file) {
        req.file = checkFile(req.file);
      }
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files = req.files.map(checkFile);
        } else {
          for (const key in req.files) {
            if (Array.isArray(req.files[key])) {
              req.files[key] = req.files[key].map(checkFile);
            } else {
              req.files[key] = checkFile(req.files[key]);
            }
          }
        }
      }
      
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  } else {
    next();
  }
};

/**
 * Block suspicious requests
 */
const blockSuspiciousRequests = (req, res, next) => {
  const input = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Check for various injection attempts
  if (hasSQLInjection(input)) {
    return res.status(400).json({
      success: false,
      message: 'Suspicious request detected',
      error: 'SECURITY_VIOLATION'
    });
  }
  
  if (hasPathTraversal(input)) {
    return res.status(400).json({
      success: false,
      message: 'Path traversal attempt detected',
      error: 'SECURITY_VIOLATION'
    });
  }
  
  if (hasCommandInjection(input)) {
    return res.status(400).json({
      success: false,
      message: 'Command injection attempt detected',
      error: 'SECURITY_VIOLATION'
    });
  }
  
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Sanitization functions
  sanitizeXSS,
  deepSanitizeXSS,
  sanitizeSQL,
  sanitizeNoSQL,
  stripHTML,
  sanitizeHTML,
  sanitizeEmail,
  sanitizeURL,
  sanitizePath,
  sanitizeCommand,
  sanitizeAll,
  
  // Character cleaning
  removeControlCharacters,
  removeNullBytes,
  removeInvisibleCharacters,
  normalizeWhitespace,
  
  // Detection functions
  hasSQLInjection,
  hasPathTraversal,
  hasCommandInjection,
  
  // Middleware
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeRequest,
  strictSanitize,
  sanitizeFields,
  sanitizeFileUpload,
  setSecurityHeaders,
  blockSuspiciousRequests,
  
  // Express-mongo-sanitize
  mongoSanitize: mongoSanitize()
};