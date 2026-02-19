// utils/tokenUtils.js
/**
 * TOKEN UTILS - COMPLETE PRODUCTION VERSION
 * JWT token generation, validation, and management utilities
 * 
 * @module utils/tokenUtils
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

const TOKEN_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  
  // Token expiry
  accessTokenExpiry: '15m',      // 15 minutes
  refreshTokenExpiry: '7d',      // 7 days
  verificationTokenExpiry: '24h', // 24 hours
  resetTokenExpiry: '1h',        // 1 hour
  
  // Token issuer
  issuer: 'nep-workbench',
  
  // Token audience
  audience: 'nep-users',
  
  // Algorithm
  algorithm: 'HS256'
};

// ============================================================================
// JWT TOKEN GENERATION
// ============================================================================

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {String} Access token
 */
const generateAccessToken = (payload, options = {}) => {
  const tokenPayload = {
    userId: payload.userId,
    userType: payload.userType,
    email: payload.email,
    type: 'access'
  };
  
  const tokenOptions = {
    expiresIn: options.expiresIn || TOKEN_CONFIG.accessTokenExpiry,
    issuer: TOKEN_CONFIG.issuer,
    audience: TOKEN_CONFIG.audience,
    algorithm: TOKEN_CONFIG.algorithm
  };
  
  return jwt.sign(tokenPayload, TOKEN_CONFIG.accessTokenSecret, tokenOptions);
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload, options = {}) => {
  const tokenPayload = {
    userId: payload.userId,
    userType: payload.userType,
    type: 'refresh',
    jti: crypto.randomBytes(16).toString('hex') // JWT ID for revocation
  };
  
  const tokenOptions = {
    expiresIn: options.expiresIn || TOKEN_CONFIG.refreshTokenExpiry,
    issuer: TOKEN_CONFIG.issuer,
    audience: TOKEN_CONFIG.audience,
    algorithm: TOKEN_CONFIG.algorithm
  };
  
  return jwt.sign(tokenPayload, TOKEN_CONFIG.refreshTokenSecret, tokenOptions);
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - Token payload
 * @returns {Object} Token pair
 */
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: parseExpiry(TOKEN_CONFIG.accessTokenExpiry)
  };
};

/**
 * Generate verification token
 * @param {Object} payload - Token payload
 * @returns {String} Verification token
 */
const generateVerificationToken = (payload) => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    type: 'verification'
  };
  
  const tokenOptions = {
    expiresIn: TOKEN_CONFIG.verificationTokenExpiry,
    issuer: TOKEN_CONFIG.issuer,
    algorithm: TOKEN_CONFIG.algorithm
  };
  
  return jwt.sign(tokenPayload, TOKEN_CONFIG.accessTokenSecret, tokenOptions);
};

/**
 * Generate password reset token
 * @param {Object} payload - Token payload
 * @returns {String} Reset token
 */
const generateResetToken = (payload) => {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    type: 'reset'
  };
  
  const tokenOptions = {
    expiresIn: TOKEN_CONFIG.resetTokenExpiry,
    issuer: TOKEN_CONFIG.issuer,
    algorithm: TOKEN_CONFIG.algorithm
  };
  
  return jwt.sign(tokenPayload, TOKEN_CONFIG.accessTokenSecret, tokenOptions);
};

/**
 * Generate API token
 * @param {Object} payload - Token payload
 * @param {String} expiry - Token expiry
 * @returns {String} API token
 */
const generateApiToken = (payload, expiry = '1y') => {
  const tokenPayload = {
    userId: payload.userId,
    userType: payload.userType,
    apiKey: payload.apiKey,
    type: 'api',
    permissions: payload.permissions || []
  };
  
  const tokenOptions = {
    expiresIn: expiry,
    issuer: TOKEN_CONFIG.issuer,
    algorithm: TOKEN_CONFIG.algorithm
  };
  
  return jwt.sign(tokenPayload, TOKEN_CONFIG.accessTokenSecret, tokenOptions);
};

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify access token
 * @param {String} token - Access token
 * @returns {Object} Decoded payload
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.accessTokenSecret, {
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithms: [TOKEN_CONFIG.algorithm]
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token
 * @returns {Object} Decoded payload
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.refreshTokenSecret, {
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithms: [TOKEN_CONFIG.algorithm]
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Verify verification token
 * @param {String} token - Verification token
 * @returns {Object} Decoded payload
 */
const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.accessTokenSecret, {
      issuer: TOKEN_CONFIG.issuer,
      algorithms: [TOKEN_CONFIG.algorithm]
    });
    
    if (decoded.type !== 'verification') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Verify reset token
 * @param {String} token - Reset token
 * @returns {Object} Decoded payload
 */
const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, TOKEN_CONFIG.accessTokenSecret, {
      issuer: TOKEN_CONFIG.issuer,
      algorithms: [TOKEN_CONFIG.algorithm]
    });
    
    if (decoded.type !== 'reset') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Verify any token (without type checking)
 * @param {String} token - JWT token
 * @param {String} secret - Secret key
 * @returns {Object} Decoded payload
 */
const verifyToken = (token, secret = TOKEN_CONFIG.accessTokenSecret) => {
  try {
    return jwt.verify(token, secret, {
      algorithms: [TOKEN_CONFIG.algorithm]
    });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// ============================================================================
// TOKEN DECODING
// ============================================================================

/**
 * Decode token without verification
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error(`Token decoding failed: ${error.message}`);
  }
};

/**
 * Get token payload without verification
 * @param {String} token - JWT token
 * @returns {Object} Token payload
 */
const getTokenPayload = (token) => {
  const decoded = decodeToken(token);
  return decoded ? decoded.payload : null;
};

/**
 * Get token header without verification
 * @param {String} token - JWT token
 * @returns {Object} Token header
 */
const getTokenHeader = (token) => {
  const decoded = decodeToken(token);
  return decoded ? decoded.header : null;
};

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Check if token is expired
 * @param {String} token - JWT token
 * @returns {Boolean} Is expired
 */
const isTokenExpired = (token) => {
  try {
    const payload = getTokenPayload(token);
    
    if (!payload || !payload.exp) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiry time
 * @param {String} token - JWT token
 * @returns {Date} Expiry date
 */
const getTokenExpiry = (token) => {
  const payload = getTokenPayload(token);
  
  if (!payload || !payload.exp) {
    return null;
  }
  
  return new Date(payload.exp * 1000);
};

/**
 * Get remaining token lifetime
 * @param {String} token - JWT token
 * @returns {Number} Seconds remaining
 */
const getTokenLifetime = (token) => {
  const payload = getTokenPayload(token);
  
  if (!payload || !payload.exp) {
    return 0;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
};

/**
 * Check if token needs refresh
 * @param {String} token - JWT token
 * @param {Number} threshold - Threshold in seconds
 * @returns {Boolean} Needs refresh
 */
const needsRefresh = (token, threshold = 300) => {
  const lifetime = getTokenLifetime(token);
  return lifetime > 0 && lifetime < threshold;
};

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh access token using refresh token
 * @param {String} refreshToken - Refresh token
 * @returns {Object} New token pair
 */
const refreshAccessToken = (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  
  const payload = {
    userId: decoded.userId,
    userType: decoded.userType,
    email: decoded.email
  };
  
  const accessToken = generateAccessToken(payload);
  
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: parseExpiry(TOKEN_CONFIG.accessTokenExpiry)
  };
};

/**
 * Rotate refresh token
 * @param {String} oldRefreshToken - Old refresh token
 * @returns {Object} New token pair
 */
const rotateRefreshToken = (oldRefreshToken) => {
  const decoded = verifyRefreshToken(oldRefreshToken);
  
  const payload = {
    userId: decoded.userId,
    userType: decoded.userType,
    email: decoded.email
  };
  
  return generateTokenPair(payload);
};

// ============================================================================
// TOKEN EXTRACTION
// ============================================================================

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header
 * @returns {String} Token
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {String} Token
 */
const extractTokenFromRequest = (req) => {
  // Check Authorization header
  if (req.headers.authorization) {
    return extractTokenFromHeader(req.headers.authorization);
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check query parameter
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

// ============================================================================
// TOKEN BLACKLISTING
// ============================================================================

// In-memory blacklist (use Redis in production)
const tokenBlacklist = new Set();

/**
 * Blacklist token
 * @param {String} token - Token to blacklist
 * @param {Number} ttl - Time to live in seconds
 */
const blacklistToken = (token, ttl = null) => {
  tokenBlacklist.add(token);
  
  // Auto-remove after expiry if TTL provided
  if (ttl) {
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, ttl * 1000);
  }
};

/**
 * Check if token is blacklisted
 * @param {String} token - Token to check
 * @returns {Boolean} Is blacklisted
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Remove token from blacklist
 * @param {String} token - Token to remove
 */
const removeFromBlacklist = (token) => {
  tokenBlacklist.delete(token);
};

/**
 * Clear all blacklisted tokens
 */
const clearBlacklist = () => {
  tokenBlacklist.clear();
};

// ============================================================================
// TOKEN FINGERPRINTING
// ============================================================================

/**
 * Generate token fingerprint
 * @param {Object} req - Express request
 * @returns {String} Fingerprint
 */
const generateTokenFingerprint = (req) => {
  const components = [
    req.headers['user-agent'] || '',
    req.ip || '',
    req.headers['accept-language'] || ''
  ];
  
  const fingerprint = components.join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
};

/**
 * Verify token fingerprint
 * @param {String} token - JWT token
 * @param {Object} req - Express request
 * @returns {Boolean} Fingerprint matches
 */
const verifyTokenFingerprint = (token, req) => {
  const payload = getTokenPayload(token);
  
  if (!payload || !payload.fingerprint) {
    return true; // No fingerprint to verify
  }
  
  const currentFingerprint = generateTokenFingerprint(req);
  return payload.fingerprint === currentFingerprint;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse expiry string to seconds
 * @param {String} expiry - Expiry string (e.g., '15m', '7d')
 * @returns {Number} Seconds
 */
const parseExpiry = (expiry) => {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000
  };
  
  const match = expiry.match(/^(\d+)([smhdwy])$/);
  
  if (!match) {
    return 0;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * (units[unit] || 1);
};

/**
 * Format expiry seconds to human-readable string
 * @param {Number} seconds - Seconds
 * @returns {String} Formatted string
 */
const formatExpiry = (seconds) => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours`;
  } else {
    return `${Math.floor(seconds / 86400)} days`;
  }
};

/**
 * Create token metadata
 * @param {String} token - JWT token
 * @returns {Object} Token metadata
 */
const getTokenMetadata = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded) {
    return null;
  }
  
  const { payload, header } = decoded;
  
  return {
    type: payload.type || 'unknown',
    userId: payload.userId,
    userType: payload.userType,
    algorithm: header.alg,
    issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
    expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
    issuer: payload.iss,
    audience: payload.aud,
    isExpired: isTokenExpired(token),
    lifetime: getTokenLifetime(token)
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  generateVerificationToken,
  generateResetToken,
  generateApiToken,
  
  // Verification
  verifyAccessToken,
  verifyRefreshToken,
  verifyVerificationToken,
  verifyResetToken,
  verifyToken,
  
  // Decoding
  decodeToken,
  getTokenPayload,
  getTokenHeader,
  
  // Validation
  isTokenExpired,
  getTokenExpiry,
  getTokenLifetime,
  needsRefresh,
  
  // Refresh
  refreshAccessToken,
  rotateRefreshToken,
  
  // Extraction
  extractTokenFromHeader,
  extractTokenFromRequest,
  
  // Blacklisting
  blacklistToken,
  isTokenBlacklisted,
  removeFromBlacklist,
  clearBlacklist,
  
  // Fingerprinting
  generateTokenFingerprint,
  verifyTokenFingerprint,
  
  // Utilities
  parseExpiry,
  formatExpiry,
  getTokenMetadata,
  
  // Configuration
  TOKEN_CONFIG
};