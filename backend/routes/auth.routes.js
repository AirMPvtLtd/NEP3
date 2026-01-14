// routes/auth.routes.js
/**
 * AUTHENTICATION ROUTES - CORRECTED VERSION
 * Added authentication middleware to protected routes
 * Fixed rate limiting for test environment
 * 
 * @module routes/auth
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/auth.controller');

// Middleware
const { validateRequest } = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');

// Rate limiter - conditionally load based on environment
let loginRateLimit;
try {
  const rateLimiter = require('../middleware/rateLimiter');
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    loginRateLimit = (req, res, next) => next();
  } else {
    loginRateLimit = rateLimiter.loginRateLimit || rateLimiter.login || ((req, res, next) => next());
  }
} catch (error) {
  console.warn('Rate limiter not available, continuing without it');
  loginRateLimit = (req, res, next) => next();
}

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user (school admin, teacher, student, parent)
 * @access  Public
 */
router.post(
  '/signup',
  validateRequest('signup'),
  authController.signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginRateLimit,
  validateRequest('login'),
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh-token',
  authController.refreshToken
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  authController.resendVerification
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  validateRequest('resetPassword'),
  authController.resetPassword
);

// ============================================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  protect,
  authController.logout
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  '/change-password',
  protect,
  validateRequest('changePassword'),
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
  '/me',
  protect,
  authController.getCurrentUser
);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/update-profile',
  protect,
  validateRequest('updateProfile'),
  authController.updateProfile
);

module.exports = router;