/**
 * KPI ROUTES — Platform Key Performance Indicators
 * /api/kpi/...
 *
 * Access: super-admin only (platform operations team — NOT school admins).
 * All endpoints require JWT + 'superadmin' role.
 *
 * Endpoints:
 *   GET /api/kpi/summary       — all KPIs in one call (dashboard widget)
 *   GET /api/kpi/platform      — school/user counts, growth
 *   GET /api/kpi/learning      — SPI, challenge stats, competency mastery
 *   GET /api/kpi/engagement    — DAU, MAU, activity heatmap
 *   GET /api/kpi/revenue       — plan distribution, MRR, ARPU
 *   GET /api/kpi/ai            — AI operations, tokens, cost
 *   GET /api/kpi/reports       — NEP report generation + verification
 */

'use strict';

const express = require('express');
const router  = express.Router();

const kpiController = require('../controllers/kpi.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { trackUsage } = require('../middleware/usageTracker.middleware');

// All KPI routes require authenticated superadmin
router.use(authenticate);
router.use(authorize('superadmin'));
router.use(trackUsage);

// ── Summary (single-call dashboard widget) ─────────────────────────────────────

/**
 * @route GET /api/kpi/summary
 * @desc  All KPI categories in a single parallel query — for the ops dashboard
 */
router.get('/summary', kpiController.getKPISummary);

// ── Granular KPI categories ────────────────────────────────────────────────────

/**
 * @route GET /api/kpi/platform
 * @desc  Total schools, students, teachers; new registrations (30d / 7d)
 */
router.get('/platform', kpiController.getPlatformKPIs);

/**
 * @route GET /api/kpi/learning
 * @desc  Platform average SPI, challenge completion/pass rates, competency mastery
 */
router.get('/learning', kpiController.getLearningKPIs);

/**
 * @route GET /api/kpi/engagement
 * @desc  DAU, WAU, MAU; DAU/MAU ratio; 7-day challenge activity heatmap
 */
router.get('/engagement', kpiController.getEngagementKPIs);

/**
 * @route GET /api/kpi/revenue
 * @desc  Plan distribution, estimated MRR & ARR, ARPU, conversion rate free→paid
 */
router.get('/revenue', kpiController.getRevenueKPIs);

/**
 * @route GET /api/kpi/ai
 * @desc  AI operations, token usage, cost breakdown by operation type (30d / 7d)
 */
router.get('/ai', kpiController.getAIKPIs);

/**
 * @route GET /api/kpi/reports
 * @desc  NEP reports generated, verification rate, status breakdown
 */
router.get('/reports', kpiController.getReportKPIs);

/**
 * @route GET /api/kpi/traffic
 * @desc  Web traffic: API call volume, unique IPs, login counts, top routes, error rate
 */
router.get('/traffic', kpiController.getTrafficKPIs);

module.exports = router;
