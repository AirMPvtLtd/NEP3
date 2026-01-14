// routes/health.routes.js
/**
 * HEALTH CHECK ROUTES
 * System health monitoring
 * 
 * @module routes/health
 */

const express = require('express');
const router = express.Router();

const healthController = require('../controllers/healthController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// ============================================================================
// PUBLIC HEALTH CHECKS
// ============================================================================

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthController.basicHealthCheck);

/**
 * @route   GET /api/health/ping
 * @desc    Simple ping endpoint
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// DETAILED HEALTH CHECKS (Protected)
// ============================================================================

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check
 * @access  Private (Admin)
 */
router.get(
  '/detailed',
  authenticate,
  authorize('admin'),
  healthController.detailedHealthCheck
);

/**
 * @route   GET /api/health/database
 * @desc    Database health check
 * @access  Private (Admin)
 */
router.get(
  '/database',
  authenticate,
  authorize('admin'),
  healthController.databaseHealthCheck
);

/**
 * @route   GET /api/health/redis
 * @desc    Redis health check
 * @access  Private (Admin)
 */
router.get(
  '/redis',
  authenticate,
  authorize('admin'),
  healthController.redisHealthCheck
);

/**
 * @route   GET /api/health/ai
 * @desc    AI service health check
 * @access  Private (Admin)
 */
router.get(
  '/ai',
  authenticate,
  authorize('admin'),
  healthController.aiServiceHealthCheck
);

/**
 * @route   GET /api/health/email
 * @desc    Email service health check
 * @access  Private (Admin)
 */
router.get(
  '/email',
  authenticate,
  authorize('admin'),
  healthController.emailServiceHealthCheck
);

// ============================================================================
// SYSTEM METRICS
// ============================================================================

/**
 * @route   GET /api/health/metrics
 * @desc    Get system metrics
 * @access  Private (Admin)
 */
router.get(
  '/metrics',
  authenticate,
  authorize('admin'),
  healthController.getSystemMetrics
);

/**
 * @route   GET /api/health/stats
 * @desc    Get system statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  healthController.getSystemStats
);

/**
 * @route   GET /api/health/uptime
 * @desc    Get system uptime
 * @access  Public
 */
router.get('/uptime', healthController.getUptime);

// ============================================================================
// READINESS & LIVENESS
// ============================================================================

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe (Kubernetes)
 * @access  Public
 */
router.get('/ready', healthController.readinessProbe);

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe (Kubernetes)
 * @access  Public
 */
router.get('/live', healthController.livenessProbe);

module.exports = router;