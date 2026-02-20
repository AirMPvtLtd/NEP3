/**
 * SUBSCRIPTION ROUTES
 * /api/subscription/...
 *
 * All routes require admin JWT authentication.
 */

'use strict';

const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All subscription routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// ── Plan management ────────────────────────────────────────────────────────────

/**
 * @route GET /api/subscription/status
 * @desc  Current plan + seat usage + upgrade hint for the authenticated school
 */
router.get('/status', subscriptionController.getStatus);

/**
 * @route GET /api/subscription/plans
 * @desc  Full plan comparison table with features, limits, and pricing
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @route POST /api/subscription/upgrade-request
 * @desc  Submit a plan upgrade request (triggers sales notification)
 * @body  { targetPlan: 'basic'|'premium'|'enterprise', notes?: string }
 */
router.post('/upgrade-request', subscriptionController.requestUpgrade);

// ── Usage & API access ─────────────────────────────────────────────────────────

/**
 * @route GET /api/subscription/usage
 * @desc  Today's API call count vs daily limit
 */
router.get('/usage', subscriptionController.getUsage);

/**
 * @route GET /api/subscription/api-keys/info
 * @desc  Explain research API key access and eligibility
 */
router.get('/api-keys/info', subscriptionController.getApiKeyInfo);

module.exports = router;
