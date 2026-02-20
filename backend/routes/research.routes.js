/**
 * RESEARCH API ROUTES
 * /api/research/...
 *
 * All routes use API key authentication (not session JWT).
 * Intended for external researchers, government bodies, and B2B partners.
 *
 * Auth:   X-Api-Key header  OR  ?api_key= query param
 * Model:  ResearchAPIKey (rsk_ prefix)
 *
 * Permission tiers:
 *   (none)                 — longitudinal, spi-timeline, competency-trends, challenge-stats
 *   canViewRawData         — schools (full names + cities)
 *   canExportFullDataset   — /export endpoint
 */

'use strict';

const express = require('express');
const router = express.Router();

const researchController = require('../controllers/research.controller');
const { authenticateApiKey, requirePermission } = require('../middleware/apiKey.middleware');
const { trackUsage } = require('../middleware/usageTracker.middleware');

// ── Auth + usage tracking on every research route ─────────────────────────────
router.use(authenticateApiKey);
router.use(trackUsage);

// ── Data endpoints ─────────────────────────────────────────────────────────────

/**
 * @route GET /api/research/longitudinal
 * @desc  Multi-year SPI trajectories for a school cohort
 * @perm  (any valid API key)
 * @query schoolId (required), classNum, from, to, page, limit
 */
router.get('/longitudinal', researchController.getLongitudinalData);

/**
 * @route GET /api/research/spi-timeline
 * @desc  SPI snapshots over time for a cohort
 * @perm  (any valid API key)
 * @query schoolId (required), classNum, from, to, page, limit
 */
router.get('/spi-timeline', researchController.getSPITimeline);

/**
 * @route GET /api/research/competency-trends
 * @desc  Aggregated Bayesian competency mastery + Kalman ability estimates
 * @perm  (any valid API key)
 * @query schoolId (required), classNum
 */
router.get('/competency-trends', researchController.getCompetencyTrends);

/**
 * @route GET /api/research/challenge-stats
 * @desc  Aggregate challenge performance statistics
 * @perm  (any valid API key)
 * @query schoolId (required), classNum, from, to
 */
router.get('/challenge-stats', researchController.getChallengeStats);

/**
 * @route GET /api/research/schools
 * @desc  List schools with anonymised metadata.
 *        Full names/cities only visible with canViewRawData permission.
 * @perm  (any valid API key — raw data gated inside controller)
 */
router.get('/schools', researchController.listSchools);

/**
 * @route GET /api/research/export
 * @desc  Full paginated dataset export (spi / longitudinal / challenges)
 * @perm  canExportFullDataset
 * @query collection (required), schoolId, from, to, page, limit
 */
router.get(
  '/export',
  requirePermission('canExportFullDataset'),
  researchController.exportDataset,
);

module.exports = router;
