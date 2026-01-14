// middleware/cors.middleware.js
/**
 * CORS MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Cross-Origin Resource Sharing configuration
 * 
 * @module middleware/cors.middleware
 */

const cors = require('cors');

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * Allowed origins for different environments
 */
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return [
      process.env.FRONTEND_URL || 'https://nep-workbench.com',
      process.env.ADMIN_URL || 'https://admin.nep-workbench.com',
      process.env.TEACHER_URL || 'https://teacher.nep-workbench.com',
      process.env.STUDENT_URL || 'https://student.nep-workbench.com',
      process.env.PARENT_URL || 'https://parent.nep-workbench.com'
    ].filter(Boolean);
  }
  
  if (env === 'staging') {
    return [
      'https://staging.nep-workbench.com',
      'https://staging-admin.nep-workbench.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
  }
  
  // Development - allow all localhost ports
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
};

/**
 * Default CORS options
 */
const defaultCorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  credentials: true,
  
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key',
    'X-Device-ID',
    'X-Platform'
  ],
  
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time',
    'X-Request-ID'
  ],
  
  maxAge: 86400, // 24 hours
  
  preflightContinue: false,
  
  optionsSuccessStatus: 204
};

/**
 * Strict CORS options (production)
 */
const strictCorsOptions = {
  ...defaultCorsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // In production, don't allow requests with no origin
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Origin required'));
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

/**
 * Permissive CORS options (development)
 */
const permissiveCorsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  maxAge: 86400
};

/**
 * Public API CORS options (no credentials)
 */
const publicApiCorsOptions = {
  ...defaultCorsOptions,
  credentials: false,
  origin: '*'
};

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================

/**
 * Default CORS middleware
 */
const corsMiddleware = cors(defaultCorsOptions);

/**
 * Strict CORS middleware
 */
const strictCors = cors(strictCorsOptions);

/**
 * Permissive CORS middleware
 */
const permissiveCors = cors(permissiveCorsOptions);

/**
 * Public API CORS middleware
 */
const publicApiCors = cors(publicApiCorsOptions);

// ============================================================================
// DYNAMIC CORS
// ============================================================================

/**
 * Dynamic CORS based on environment
 */
const dynamicCors = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return strictCors;
  } else if (env === 'staging') {
    return corsMiddleware;
  } else {
    return permissiveCors;
  }
};

// ============================================================================
// CUSTOM CORS VALIDATORS
// ============================================================================

/**
 * Validate origin against whitelist
 * @param {String} origin - Origin to validate
 * @returns {Boolean}
 */
const isOriginAllowed = (origin) => {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Pattern match for subdomains
  const allowedPatterns = [
    /^https?:\/\/.*\.nep-workbench\.com$/,
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ];
  
  return allowedPatterns.some(pattern => pattern.test(origin));
};

/**
 * Custom CORS handler
 * @param {Object} options - CORS options
 */
const customCors = (options = {}) => {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (options.validateOrigin && !isOriginAllowed(origin)) {
      return res.status(403).json({
        success: false,
        message: 'Origin not allowed'
      });
    }
    
    // Set CORS headers
    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    
    res.setHeader('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Key'
    );
    
    res.setHeader('Access-Control-Expose-Headers',
      'Content-Length, X-RateLimit-Limit, X-RateLimit-Remaining, X-Response-Time'
    );
    
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
};

// ============================================================================
// ROLE-BASED CORS
// ============================================================================

/**
 * CORS for admin panel
 */
const adminCors = cors({
  origin: (origin, callback) => {
    const adminOrigins = [
      process.env.ADMIN_URL || 'https://admin.nep-workbench.com',
      'http://localhost:3001'
    ];
    
    if (!origin || adminOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

/**
 * CORS for teacher portal
 */
const teacherCors = cors({
  origin: (origin, callback) => {
    const teacherOrigins = [
      process.env.TEACHER_URL || 'https://teacher.nep-workbench.com',
      'http://localhost:3002'
    ];
    
    if (!origin || teacherOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

/**
 * CORS for student portal
 */
const studentCors = cors({
  origin: (origin, callback) => {
    const studentOrigins = [
      process.env.STUDENT_URL || 'https://student.nep-workbench.com',
      'http://localhost:3000'
    ];
    
    if (!origin || studentOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

/**
 * CORS for parent portal
 */
const parentCors = cors({
  origin: (origin, callback) => {
    const parentOrigins = [
      process.env.PARENT_URL || 'https://parent.nep-workbench.com',
      'http://localhost:3003'
    ];
    
    if (!origin || parentOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});

// ============================================================================
// PREFLIGHT HANDLER
// ============================================================================

/**
 * Handle preflight requests
 */
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, X-Requested-With, Accept, Origin'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      
      return res.status(204).end();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed'
    });
  }
  
  next();
};

// ============================================================================
// CORS ERROR HANDLER
// ============================================================================

/**
 * Handle CORS errors
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    console.error(`CORS Error: ${err.message} - Origin: ${req.headers.origin}`);
    
    return res.status(403).json({
      success: false,
      error: 'CORS_ERROR',
      message: 'Cross-Origin Request Blocked',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  next(err);
};

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Add security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  
  // Strict Transport Security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// ============================================================================
// ORIGIN LOGGER
// ============================================================================

/**
 * Log CORS requests
 */
const logCorsRequest = (req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    const allowed = isOriginAllowed(origin);
    const status = allowed ? '✅' : '❌';
    
    console.log(`${status} CORS Request from: ${origin} - ${req.method} ${req.path}`);
  }
  
  next();
};

// ============================================================================
// WHITELIST MANAGEMENT
// ============================================================================

/**
 * Add origin to whitelist (runtime)
 */
const whitelistOrigin = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
    console.log(`Added origin to whitelist: ${origin}`);
  }
};

/**
 * Remove origin from whitelist
 */
const removeOriginFromWhitelist = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  const index = allowedOrigins.indexOf(origin);
  
  if (index > -1) {
    allowedOrigins.splice(index, 1);
    console.log(`Removed origin from whitelist: ${origin}`);
  }
};

/**
 * Get current whitelist
 */
const getWhitelist = () => {
  return getAllowedOrigins();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Default middleware
  corsMiddleware,
  
  // Specialized CORS
  strictCors,
  permissiveCors,
  publicApiCors,
  dynamicCors,
  customCors,
  
  // Role-based CORS
  adminCors,
  teacherCors,
  studentCors,
  parentCors,
  
  // Handlers
  handlePreflight,
  corsErrorHandler,
  securityHeaders,
  
  // Utilities
  isOriginAllowed,
  logCorsRequest,
  whitelistOrigin,
  removeOriginFromWhitelist,
  getWhitelist,
  getAllowedOrigins,
  
  // Options
  defaultCorsOptions,
  strictCorsOptions,
  permissiveCorsOptions,
  publicApiCorsOptions
};