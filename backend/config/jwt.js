// config/jwt.js
/**
 * JWT CONFIGURATION
 * JSON Web Token Setup for Authentication
 * 
 * Features:
 * - Access token generation (short-lived)
 * - Refresh token generation (long-lived)
 * - Token verification
 * - Token blacklisting
 * - Role-based payload
 * 
 * @module config/jwt
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// ============================================================================
// JWT CONFIGURATION
// ============================================================================

const JWT_CONFIG = {
  // Access Token (short-lived)
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h',
    issuer: process.env.JWT_ISSUER || 'nep-workbench',
    audience: process.env.JWT_AUDIENCE || 'nep-users'
  },
  
  // Refresh Token (long-lived)
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: process.env.JWT_ISSUER || 'nep-workbench',
    audience: process.env.JWT_AUDIENCE || 'nep-users'
  }
};

// Validate JWT secrets on startup
if (!JWT_CONFIG.accessToken.secret || JWT_CONFIG.accessToken.secret.length < 32) {
  logger.error('❌ JWT_SECRET is not defined or too short (min 32 characters)');
  logger.error('Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate Access Token
 * Short-lived token for API authentication
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID (studentId, teacherId, etc.)
 * @param {string} payload.role - User role (student, teacher, parent, admin)
 * @param {string} payload.schoolId - School ID
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  try {
    // Validate required fields
    if (!payload.userId || !payload.role) {
      throw new Error('userId and role are required in token payload');
    }
    
    // Create token payload
    const tokenPayload = {
      userId: payload.userId,
      role: payload.role,
      schoolId: payload.schoolId,
      email: payload.email,
      name: payload.name,
      type: 'access'
    };
    
    // Sign token
    const token = jwt.sign(
      tokenPayload,
      JWT_CONFIG.accessToken.secret,
      {
        expiresIn: JWT_CONFIG.accessToken.expiresIn,
        issuer: JWT_CONFIG.accessToken.issuer,
        audience: JWT_CONFIG.accessToken.audience,
        algorithm: 'HS256'
      }
    );
    
    logger.debug(`Access token generated for ${payload.role}: ${payload.userId}`);
    
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error.message);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate Refresh Token
 * Long-lived token for obtaining new access tokens
 * 
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    // Validate required fields
    if (!payload.userId || !payload.role) {
      throw new Error('userId and role are required in token payload');
    }
    
    // Create token payload (minimal for refresh tokens)
    const tokenPayload = {
      userId: payload.userId,
      role: payload.role,
      type: 'refresh',
      tokenId: require('crypto').randomBytes(16).toString('hex') // Unique token ID
    };
    
    // Sign token
    const token = jwt.sign(
      tokenPayload,
      JWT_CONFIG.refreshToken.secret,
      {
        expiresIn: JWT_CONFIG.refreshToken.expiresIn,
        issuer: JWT_CONFIG.refreshToken.issuer,
        audience: JWT_CONFIG.refreshToken.audience,
        algorithm: 'HS256'
      }
    );
    
    logger.debug(`Refresh token generated for ${payload.role}: ${payload.userId}`);
    
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error.message);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate Token Pair
 * Generates both access and refresh tokens
 * 
 * @param {Object} payload - Token payload
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify Access Token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      JWT_CONFIG.accessToken.secret,
      {
        issuer: JWT_CONFIG.accessToken.issuer,
        audience: JWT_CONFIG.accessToken.audience,
        algorithms: ['HS256']
      }
    );
    
    // Check if token type is correct
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    }
    throw error;
  }
};

/**
 * Verify Refresh Token
 * 
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      JWT_CONFIG.refreshToken.secret,
      {
        issuer: JWT_CONFIG.refreshToken.issuer,
        audience: JWT_CONFIG.refreshToken.audience,
        algorithms: ['HS256']
      }
    );
    
    // Check if token type is correct
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Decode Token (without verification)
 * Use for extracting payload without validating signature
 * 
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error.message);
    return null;
  }
};

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh Access Token
 * Generate new access token using valid refresh token
 * 
 * @param {string} refreshToken - Valid refresh token
 * @returns {Object} { accessToken, refreshToken }
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if refresh token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(decoded.tokenId);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      role: decoded.role
    });
    
    logger.info(`Access token refreshed for ${decoded.role}: ${decoded.userId}`);
    
    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken // Return same refresh token
    };
  } catch (error) {
    logger.error('Error refreshing access token:', error.message);
    throw error;
  }
};

// ============================================================================
// TOKEN BLACKLIST (In-Memory - Use Redis in Production)
// ============================================================================

// In-memory blacklist (use Redis in production)
const tokenBlacklist = new Set();

/**
 * Add Token to Blacklist
 * Used for logout and token revocation
 * 
 * @param {string} tokenId - Unique token identifier
 * @param {number} expiresIn - Time until token naturally expires (seconds)
 */
const blacklistToken = async (tokenId, expiresIn) => {
  try {
    tokenBlacklist.add(tokenId);
    
    // Auto-remove from blacklist after expiry
    setTimeout(() => {
      tokenBlacklist.delete(tokenId);
    }, expiresIn * 1000);
    
    logger.debug(`Token blacklisted: ${tokenId}`);
  } catch (error) {
    logger.error('Error blacklisting token:', error.message);
  }
};

/**
 * Check if Token is Blacklisted
 * 
 * @param {string} tokenId - Token identifier
 * @returns {Promise<boolean>} True if blacklisted
 */
const isTokenBlacklisted = async (tokenId) => {
  return tokenBlacklist.has(tokenId);
};

/**
 * Clear Token Blacklist
 * Use for testing or maintenance
 */
const clearBlacklist = () => {
  tokenBlacklist.clear();
  logger.info('Token blacklist cleared');
};

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Get Token Expiration Time
 * 
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Get Time Until Token Expires
 * 
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration, or -1 if expired/invalid
 */
const getTokenTimeRemaining = (token) => {
  try {
    const expiration = getTokenExpiration(token);
    if (!expiration) return -1;
    
    const now = new Date();
    const remaining = Math.floor((expiration - now) / 1000);
    
    return Math.max(0, remaining);
  } catch (error) {
    return -1;
  }
};

/**
 * Check if Token is Expired
 * 
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
const isTokenExpired = (token) => {
  return getTokenTimeRemaining(token) === 0;
};

/**
 * Extract User ID from Token
 * 
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null
 */
const getUserIdFromToken = (token) => {
  try {
    const decoded = decodeToken(token);
    return decoded?.userId || null;
  } catch (error) {
    return null;
  }
};

/**
 * Extract Role from Token
 * 
 * @param {string} token - JWT token
 * @returns {string|null} User role or null
 */
const getRoleFromToken = (token) => {
  try {
    const decoded = decodeToken(token);
    return decoded?.role || null;
  } catch (error) {
    return null;
  }
};

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Validate Token Format
 * Check if string is valid JWT format
 * 
 * @param {string} token - Token string
 * @returns {boolean} True if valid format
 */
const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT format: header.payload.signature
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Extract Token from Authorization Header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  JWT_CONFIG,
  
  // Token Generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  
  // Token Verification
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  
  // Token Refresh
  refreshAccessToken,
  
  // Token Blacklist
  blacklistToken,
  isTokenBlacklisted,
  clearBlacklist,
  
  // Token Utilities
  getTokenExpiration,
  getTokenTimeRemaining,
  isTokenExpired,
  getUserIdFromToken,
  getRoleFromToken,
  
  // Token Validation
  isValidTokenFormat,
  extractTokenFromHeader
};