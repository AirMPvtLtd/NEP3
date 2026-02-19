/**
 * SUBSCRIPTION ROUTES
 * /api/subscription/...
 */

const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All subscription routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/status', subscriptionController.getStatus);
router.get('/plans',  subscriptionController.getPlans);

module.exports = router;
