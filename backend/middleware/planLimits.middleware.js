/**
 * middleware/planLimits.middleware.js
 *
 * Feature-gate middleware — blocks requests from schools whose plan
 * does not include the required feature.
 *
 * Usage:
 *   router.get('/export', authenticate, requireFeature('analyticsAdvanced'), handler)
 */

'use strict';

const { School } = require('../models');
const { plans, PLAN_ORDER } = require('../config/plans');
const logger = require('../utils/logger');

// ── Internal helpers ──────────────────────────────────────────────────────────

function getSchoolPlan(school) {
  return school.subscriptionPlan || 'free';
}

function minPlanForFeature(featureName) {
  return PLAN_ORDER.find(tier => plans[tier]?.features?.[featureName] === true) || 'enterprise';
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * requireFeature(featureName)
 *
 * Returns Express middleware that:
 *   1. Looks up the authenticated school's plan
 *   2. Checks whether that plan includes featureName
 *   3. Returns HTTP 402 with upgrade info if not
 *
 * @param {string} featureName  Key from plans[tier].features
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const school = await School.findOne({ schoolId }).select('subscriptionPlan limits').lean();
      if (!school) {
        return res.status(404).json({ success: false, message: 'School not found.' });
      }

      const planKey = getSchoolPlan(school);
      const planConfig = plans[planKey] || plans.free;

      if (!planConfig.features?.[featureName]) {
        const upgradeTo = minPlanForFeature(featureName);
        const upgradeConfig = plans[upgradeTo];

        logger.warn('[planLimits] Feature blocked', { schoolId, planKey, featureName, upgradeTo });

        return res.status(402).json({
          success: false,
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `"${featureName}" requires the ${upgradeConfig.label} plan or higher.`,
          currentPlan: planKey,
          currentPlanLabel: planConfig.label,
          requiredPlan: upgradeTo,
          requiredPlanLabel: upgradeConfig.label,
          pricing: upgradeConfig.priceMonthly
            ? `₹${upgradeConfig.priceMonthly}/month`
            : 'Custom pricing',
          upgradeUrl: '/api/subscription/upgrade-request',
          planComparisonUrl: '/api/subscription/plans',
        });
      }

      // Attach school to request for downstream use
      req.schoolDoc = school;
      next();
    } catch (err) {
      logger.error('[planLimits] Error checking feature:', err);
      next(err);
    }
  };
}

/**
 * requirePlan(minPlan)
 *
 * Simpler version — requires a minimum plan tier regardless of specific feature.
 * @param {'free'|'basic'|'premium'|'enterprise'} minPlan
 */
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const school = await School.findOne({ schoolId }).select('subscriptionPlan').lean();
      if (!school) {
        return res.status(404).json({ success: false, message: 'School not found.' });
      }

      const planKey = getSchoolPlan(school);
      const schoolPlanIndex = PLAN_ORDER.indexOf(planKey);
      const requiredPlanIndex = PLAN_ORDER.indexOf(minPlan);

      if (schoolPlanIndex < requiredPlanIndex) {
        return res.status(402).json({
          success: false,
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `This endpoint requires the ${plans[minPlan].label} plan or higher.`,
          currentPlan: planKey,
          requiredPlan: minPlan,
          upgradeUrl: '/api/subscription/upgrade-request',
        });
      }

      req.schoolDoc = school;
      next();
    } catch (err) {
      logger.error('[planLimits] Error checking plan:', err);
      next(err);
    }
  };
}

module.exports = { requireFeature, requirePlan };
