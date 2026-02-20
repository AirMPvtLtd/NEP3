/**
 * ANALYTICS ROUTES v2
 *
 * All routes require JWT authentication.
 * Advanced endpoints require a paid plan (plan-gated via planLimits middleware).
 *
 * Tiers:
 *   Basic+    — student / class / school overview, SPI, CPI, AI usage
 *   Premium+  — export, AI cost projection, simulation deep-dive
 */

'use strict';

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/planLimits.middleware');
const { trackUsage } = require('../middleware/usageTracker.middleware');

// Apply usage tracking to all analytics routes
router.use(trackUsage);

// All routes require a valid JWT
router.use(authenticate);

// ============================================================================
// STUDENT ANALYTICS  (Basic+ plan)
// ============================================================================

/**
 * @route GET /api/analytics/student/:studentId/overview
 * @desc  Student CPI, competencies, Kalman estimate, learning state
 * @plan  basic+
 * @roles student (own), teacher, admin, parent
 */
router.get(
  '/student/:studentId/overview',
  requireFeature('analyticsBasic'),
  analyticsController.getStudentAnalytics
);

/**
 * @route GET /api/analytics/student/:studentId/cpi
 * @desc  Dedicated CPI score endpoint (lightweight)
 * @plan  basic+
 */
router.get(
  '/student/:studentId/cpi',
  requireFeature('analyticsBasic'),
  analyticsController.getStudentCPI
);

/**
 * @route GET /api/analytics/student/:studentId/trends
 * @desc  Time-series competency trends (30 / 90 / 180 day window)
 * @plan  basic+
 */
router.get(
  '/student/:studentId/trends',
  requireFeature('analyticsBasic'),
  analyticsController.getStudentTrends
);

// ============================================================================
// CLASS ANALYTICS  (Basic+ plan)
// ============================================================================

/**
 * @route GET /api/analytics/class/:classNum/:section
 * @desc  Class-level CPI, per-student breakdown, class average
 * @plan  basic+
 * @roles teacher, admin
 */
router.get(
  '/class/:classNum/:section',
  authorize('teacher', 'admin'),
  requireFeature('analyticsBasic'),
  analyticsController.getClassAnalytics
);

// ============================================================================
// SCHOOL ANALYTICS  (Basic+ plan)
// ============================================================================

/**
 * @route GET /api/analytics/school/:schoolId/overview
 * @desc  School-wide CPI, engagement, active students
 * @plan  basic+
 * @roles admin
 */
router.get(
  '/school/:schoolId/overview',
  authorize('admin'),
  requireFeature('analyticsBasic'),
  analyticsController.getSchoolAnalytics
);

// ============================================================================
// AI USAGE  (Basic+ plan)
// ============================================================================

/**
 * @route GET /api/analytics/ai-usage
 * @desc  AI operation counts, token usage, estimated cost
 * @plan  basic+
 * @roles admin
 */
router.get(
  '/ai-usage',
  authorize('admin'),
  requireFeature('analyticsBasic'),
  analyticsController.getAIUsageStatistics
);

// ============================================================================
// ADVANCED ANALYTICS  (Premium+ plan)
// ============================================================================

/**
 * @route GET /api/analytics/ai-usage/projection
 * @desc  Monthly AI cost projection based on usage trend
 * @plan  premium+
 * @roles admin
 */
router.get(
  '/ai-usage/projection',
  authorize('admin'),
  requireFeature('analyticsAdvanced'),
  analyticsController.getAICostProjection
);

/**
 * @route GET /api/analytics/export
 * @desc  Export school analytics to CSV (streamed)
 * @plan  premium+
 * @roles admin
 */
router.get(
  '/export',
  authorize('admin'),
  requireFeature('analyticsAdvanced'),
  analyticsController.exportAnalytics
);

/**
 * @route POST /api/analytics/custom-report
 * @desc  Generate a custom analytics report with date range + filters
 * @plan  premium+
 * @roles admin
 */
router.post(
  '/custom-report',
  authorize('admin'),
  requireFeature('analyticsAdvanced'),
  analyticsController.getCustomReport
);

module.exports = router;
