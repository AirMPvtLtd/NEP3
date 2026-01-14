// middleware/auth.middleware.js
/**
 * AUTHENTICATION MIDDLEWARE - UPDATED VERSION
 * JWT verification and role-based access control
 * Fixed: Added protect middleware, role/userType compatibility, proper model imports
 * 
 * @module middleware/auth.middleware
 */

const jwt = require('jsonwebtoken');
const { Student, Teacher, School, Parent } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';

// ============================================================================
// JWT VERIFICATION - MAIN PROTECT MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware (protect)
 * Verifies JWT token and attaches user to request
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }
    
    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request with BOTH role and userType for compatibility
    req.user = {
      userId: decoded.userId,
      // Support both 'role' and 'userType' field names
      role: decoded.role || decoded.userType,
      userType: decoded.userType || decoded.role,
      schoolId: decoded.schoolId,
      email: decoded.email,
      studentId: decoded.studentId,
      teacherId: decoded.teacherId,
      tokenId: decoded.tokenId
    };
    
    // Store token for potential refresh
    req.token = token;
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
    
    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

/**
 * Alias for protect (backward compatibility)
 */
const verifyToken = protect;
const authenticate = protect;

/**
 * Authorize specific role(s) - factory function
 * @param {...String} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role || req.user.userType;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Verify refresh token
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Attach user info to request with both role and userType
    req.user = {
      userId: decoded.userId,
      role: decoded.role || decoded.userType,
      userType: decoded.userType || decoded.role,
      schoolId: decoded.schoolId,
      email: decoded.email
    };
    
    req.refreshToken = refreshToken;
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
        error: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// ============================================================================
// OPTIONAL AUTHENTICATION
// ============================================================================

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = {
      userId: decoded.userId,
      role: decoded.role || decoded.userType,
      userType: decoded.userType || decoded.role,
      schoolId: decoded.schoolId,
      email: decoded.email,
      studentId: decoded.studentId,
      teacherId: decoded.teacherId,
      tokenId: decoded.tokenId
    };
    
    req.token = token;
    next();
    
  } catch (error) {
    // Invalid token - continue without auth
    next();
  }
};

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Check if user is a student
 */
const isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'student') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Student role required.'
  });
};

/**
 * Check if user is a teacher
 */
const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'teacher') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Teacher role required.'
  });
};

/**
 * Check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};

/**
 * Check if user is a parent
 */
const isParent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'parent') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Parent role required.'
  });
};

/**
 * Check if user is teacher or admin
 */
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'teacher' || userRole === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Teacher or Admin role required.'
  });
};

/**
 * Check if user is admin or parent
 */
const isAdminOrParent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const userRole = req.user.role || req.user.userType;
  
  if (userRole === 'admin' || userRole === 'parent') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin or Parent role required.'
  });
};

/**
 * Allow multiple roles
 * @param {...String} roles - Allowed roles
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role || req.user.userType;
    
    if (roles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${roles.join(', ')}`
    });
  };
};

// ============================================================================
// SCHOOL-LEVEL ACCESS CONTROL
// ============================================================================

/**
 * Check if user belongs to the same school
 * @param {String} schoolIdParam - Request parameter containing schoolId
 */
const checkSchoolAccess = (schoolIdParam = 'schoolId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userRole = req.user.role || req.user.userType;
      
      // Admin has access to all schools
      if (userRole === 'admin') {
        return next();
      }
      
      const requestedSchoolId = req.params[schoolIdParam] || req.body[schoolIdParam] || req.query[schoolIdParam];
      
      // If no school ID in request, allow (will be filtered by user's school)
      if (!requestedSchoolId) {
        return next();
      }
      
      // Check if user's school matches requested school
      if (req.user.schoolId !== requestedSchoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access resources from your school.'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('School access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking school access'
      });
    }
  };
};

// ============================================================================
// RESOURCE OWNERSHIP
// ============================================================================

/**
 * Check if user owns the resource
 * @param {Function} getResourceOwner - Function to get resource owner
 */
const checkResourceOwnership = (getResourceOwner) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const userRole = req.user.role || req.user.userType;
      
      // Admin and teacher bypass ownership check
      if (userRole === 'admin' || userRole === 'teacher') {
        return next();
      }
      
      const ownerId = await getResourceOwner(req);
      
      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }
      
      if (ownerId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

/**
 * Check if student owns the challenge
 */
const checkChallengeOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userRole = req.user.role || req.user.userType;
    
    // Admin and teacher bypass ownership check
    if (userRole === 'admin' || userRole === 'teacher') {
      return next();
    }
    
    const { challengeId } = req.params;
    const Challenge = require('../models/Challenge');
    
    const challenge = await Challenge.findOne({ challengeId });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.studentId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own challenges.'
      });
    }
    
    req.challenge = challenge;
    next();
    
  } catch (error) {
    console.error('Challenge ownership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking challenge ownership'
    });
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Check if user's email is verified
 */
const isEmailVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { userId } = req.user;
    const userRole = req.user.role || req.user.userType;
    
    let Model;
    
    switch (userRole) {
      case 'student': Model = Student; break;
      case 'teacher': Model = Teacher; break;
      case 'admin': Model = School; break;
      case 'parent': Model = Parent; break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const user = await Model.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.emailVerified && !user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email to continue.',
        error: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking email verification'
    });
  }
};

// ============================================================================
// ACCOUNT STATUS
// ============================================================================

/**
 * Check if user account is active
 */
const isAccountActive = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { userId } = req.user;
    const userRole = req.user.role || req.user.userType;
    
    let Model;
    
    switch (userRole) {
      case 'student': Model = Student; break;
      case 'teacher': Model = Teacher; break;
      case 'admin': Model = School; break;
      case 'parent': Model = Parent; break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
    }
    
    const user = await Model.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check various status fields
    if (user.status && user.status !== 'active' && user.status !== 'approved' && user.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
        error: 'ACCOUNT_INACTIVE',
        status: user.status
      });
    }
    
    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        error: 'ACCOUNT_INACTIVE'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Account status check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking account status'
    });
  }
};

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

/**
 * Simple in-memory rate limiter
 * @param {Number} maxRequests - Max requests per window
 * @param {Number} windowMs - Time window in milliseconds
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60000);
  
  return (req, res, next) => {
    const key = req.user?.userId || req.ip;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const data = requests.get(key);
    
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }
    
    if (data.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }
    
    data.count++;
    next();
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main authentication middleware
  protect,
  verifyToken,
  authenticate,
  authorize,
  verifyRefreshToken,
  optionalAuth,
  
  // Role Checks
  isStudent,
  isTeacher,
  isAdmin,
  isParent,
  isTeacherOrAdmin,
  isAdminOrParent,
  hasRole,
  
  // School Access
  checkSchoolAccess,
  
  // Resource Ownership
  checkResourceOwnership,
  checkChallengeOwnership,
  
  // Email & Account
  isEmailVerified,
  isAccountActive,
  
  // Rate Limiting
  rateLimit
};