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

// Rate limiters
let loginRateLimit, forgotPasswordLimit, signupLimit;
try {
  const rateLimiter = require('../middleware/rateLimiter');
  const rateLimit   = require('express-rate-limit');
  loginRateLimit      = rateLimiter.loginRateLimit || ((req, res, next) => next());
  forgotPasswordLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many password reset requests, please try again in an hour' },
  });
  signupLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many registrations from this IP, please try again later' },
  });
} catch (error) {
  const logger = require('../utils/logger');
  logger.warn('Rate limiter not available, continuing without it');
  loginRateLimit = forgotPasswordLimit = signupLimit = (req, res, next) => next();
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
  signupLimit,
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
  forgotPasswordLimit,
  authController.resendVerification
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordLimit,
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