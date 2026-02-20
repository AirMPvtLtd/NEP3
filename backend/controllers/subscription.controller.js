/**
 * SUBSCRIPTION CONTROLLER
 *
 * Endpoints for plan status, plan comparison, upgrade requests, and API key info.
 * Stub-ready for Razorpay/Stripe payment integration.
 *
 * All routes: admin-only (enforced by subscription.routes.js)
 */

'use strict';

const { School } = require('../models');
const { plans, PLAN_ORDER } = require('../config/plans');
const logger = require('../utils/logger');

// ── Helpers ────────────────────────────────────────────────────────────────────

function safePlanConfig(planKey) {
  return plans[planKey] || plans.free;
}

// Infinity can't be JSON-serialised — replace with null to signal "unlimited"
function limitOrNull(val) {
  return !val || val >= Infinity ? null : val;
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/subscription/status
 * Current plan + usage counters for the authenticated school.
 */
exports.getStatus = async (req, res) => {
  try {
    const school = await School.findOne({ schoolId: req.user.schoolId })
      .select('subscriptionPlan stats limits subscriptionExpiresAt')
      .lean();

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    const planKey    = school.subscriptionPlan || 'free';
    const planConfig = safePlanConfig(planKey);

    const studentUsed  = school.stats?.totalStudents || 0;
    const teacherUsed  = school.stats?.totalTeachers || 0;
    const studentLimit = limitOrNull(school.limits?.maxStudents);
    const teacherLimit = limitOrNull(school.limits?.maxTeachers);

    const studentPct = studentLimit === null ? 0 : Math.round((studentUsed / studentLimit) * 100);
    const teacherPct = teacherLimit === null ? 0 : Math.round((teacherUsed / teacherLimit) * 100);

    // Next tier info
    const currentIdx = PLAN_ORDER.indexOf(planKey);
    const nextTier   = currentIdx < PLAN_ORDER.length - 1 ? PLAN_ORDER[currentIdx + 1] : null;
    const nextConfig = nextTier ? plans[nextTier] : null;

    return res.json({
      success: true,
      data: {
        plan: planKey,
        label: planConfig.label,
        features: planConfig.features,
        subscriptionExpiresAt: school.subscriptionExpiresAt || null,
        students: {
          used:        studentUsed,
          limit:       studentLimit,
          remaining:   studentLimit === null ? null : Math.max(0, studentLimit - studentUsed),
          percentUsed: studentPct,
          atLimit:     studentLimit !== null && studentUsed >= studentLimit,
        },
        teachers: {
          used:        teacherUsed,
          limit:       teacherLimit,
          remaining:   teacherLimit === null ? null : Math.max(0, teacherLimit - teacherUsed),
          percentUsed: teacherPct,
          atLimit:     teacherLimit !== null && teacherUsed >= teacherLimit,
        },
        upgrade: nextTier ? {
          plan:         nextTier,
          label:        nextConfig.label,
          priceMonthly: nextConfig.priceMonthly
            ? `₹${nextConfig.priceMonthly}/month`
            : 'Custom pricing',
          upgradeUrl: '/api/subscription/upgrade-request',
        } : null,
      },
    });
  } catch (err) {
    logger.error('[subscription] getStatus error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching subscription status.' });
  }
};

/**
 * GET /api/subscription/plans
 * Full plan comparison table including features and pricing.
 */
exports.getPlans = async (req, res) => {
  try {
    const planList = PLAN_ORDER.map(key => {
      const cfg = plans[key];
      return {
        id:            key,
        label:         cfg.label,
        priceMonthly:  cfg.priceMonthly !== null ? `₹${cfg.priceMonthly}/month` : 'Custom',
        priceAnnual:   cfg.priceAnnual  !== null ? `₹${cfg.priceAnnual}/year`   : 'Custom',
        maxStudents:   limitOrNull(cfg.maxStudents),
        maxTeachers:   limitOrNull(cfg.maxTeachers),
        apiCallsPerDay: cfg.apiCallsPerDay || null,
        features:      cfg.features,
        popular:       key === 'premium',
        contactSales:  cfg.priceMonthly === null,
        upgradeUrl:    cfg.priceMonthly !== null
          ? '/api/subscription/upgrade-request'
          : 'mailto:sales@tryspyral.com',
      };
    });

    return res.json({ success: true, data: { plans: planList } });
  } catch (err) {
    logger.error('[subscription] getPlans error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching plans.' });
  }
};

/**
 * POST /api/subscription/upgrade-request
 * School admin requests a plan upgrade.
 * Currently logs + stores in Activity; payment integration is a future stub.
 *
 * Body: { targetPlan: 'basic'|'premium'|'enterprise', notes?: string }
 */
exports.requestUpgrade = async (req, res) => {
  try {
    const { targetPlan, notes } = req.body;

    if (!targetPlan || !PLAN_ORDER.includes(targetPlan)) {
      return res.status(400).json({
        success: false,
        message: `targetPlan must be one of: ${PLAN_ORDER.join(', ')}.`,
      });
    }

    const school = await School.findOne({ schoolId: req.user.schoolId })
      .select('subscriptionPlan schoolId name')
      .lean();

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    const currentPlanIdx = PLAN_ORDER.indexOf(school.subscriptionPlan || 'free');
    const targetPlanIdx  = PLAN_ORDER.indexOf(targetPlan);

    if (targetPlanIdx <= currentPlanIdx) {
      return res.status(400).json({
        success: false,
        message: `Cannot downgrade. Current plan is "${school.subscriptionPlan || 'free'}".`,
      });
    }

    const targetConfig = plans[targetPlan];

    logger.info('[subscription] Upgrade requested', {
      schoolId: school.schoolId,
      from:     school.subscriptionPlan || 'free',
      to:       targetPlan,
      notes:    notes || null,
    });

    // TODO: persist to UpgradeRequest collection + send email to sales
    // For now: return acknowledgment with payment details

    return res.json({
      success: true,
      message: 'Upgrade request received. Our team will contact you within 24 hours.',
      data: {
        schoolId:      school.schoolId,
        currentPlan:   school.subscriptionPlan || 'free',
        requestedPlan: targetPlan,
        pricing:       targetConfig.priceMonthly
          ? {
              monthly: `₹${targetConfig.priceMonthly}/month`,
              annual:  `₹${targetConfig.priceAnnual}/year (save ₹${(targetConfig.priceMonthly * 12) - targetConfig.priceAnnual}/year)`,
            }
          : { note: 'Custom enterprise pricing — sales team will reach out.' },
        contactEmail:  'sales@tryspyral.com',
        expectedSla:   '24 business hours',
      },
    });
  } catch (err) {
    logger.error('[subscription] requestUpgrade error:', err);
    return res.status(500).json({ success: false, message: 'Error submitting upgrade request.' });
  }
};

/**
 * GET /api/subscription/api-keys/info
 * Explain what research API keys are and how to get one.
 * Full CRUD is internal-only (managed by NEP staff).
 */
exports.getApiKeyInfo = async (req, res) => {
  try {
    const school = await School.findOne({ schoolId: req.user.schoolId })
      .select('subscriptionPlan')
      .lean();

    const planKey    = school?.subscriptionPlan || 'free';
    const planConfig = safePlanConfig(planKey);
    const hasAccess  = planConfig.features?.researchApi === true;

    return res.json({
      success: true,
      data: {
        researchApiAvailable: hasAccess,
        currentPlan:          planKey,
        minimumPlan:          'enterprise',
        description:
          'Research API keys grant programmatic access to longitudinal SPI data, ' +
          'competency trends, and challenge statistics for external researchers and B2B integrations.',
        endpoints: [
          'GET /api/research/longitudinal',
          'GET /api/research/spi-timeline',
          'GET /api/research/competency-trends',
          'GET /api/research/challenge-stats',
          'GET /api/research/schools',
          'GET /api/research/export  (requires canExportFullDataset permission)',
        ],
        authentication: 'X-Api-Key header  OR  ?api_key= query parameter',
        howToGet: hasAccess
          ? 'Contact your account manager or email research@tryspyral.com to receive your API key.'
          : `Research API access requires the Enterprise plan. You are on "${planKey}". ` +
            'Request an upgrade at POST /api/subscription/upgrade-request.',
        upgradeUrl: hasAccess ? null : '/api/subscription/upgrade-request',
      },
    });
  } catch (err) {
    logger.error('[subscription] getApiKeyInfo error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching API key info.' });
  }
};

/**
 * GET /api/subscription/usage
 * Today's API call count vs daily limit for the school.
 */
exports.getUsage = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const school = await School.findOne({ schoolId: req.user.schoolId })
      .select('subscriptionPlan')
      .lean();

    const planKey    = school?.subscriptionPlan || 'free';
    const planConfig = safePlanConfig(planKey);
    const dailyLimit = planConfig.apiCallsPerDay;   // null = unlimited

    // Count API calls logged today for this school
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let todayCount = 0;
    if (db) {
      todayCount = await db.collection('activities').countDocuments({
        schoolId:    req.user.schoolId,
        activityType: 'api_call',
        timestamp:  { $gte: startOfDay },
      });
    }

    return res.json({
      success: true,
      data: {
        date:      startOfDay.toISOString().slice(0, 10),
        plan:      planKey,
        apiCalls: {
          today:     todayCount,
          dailyLimit: dailyLimit,
          remaining:  dailyLimit === null ? null : Math.max(0, dailyLimit - todayCount),
          percentUsed: dailyLimit ? Math.round((todayCount / dailyLimit) * 100) : 0,
          unlimited:  dailyLimit === null,
        },
      },
    });
  } catch (err) {
    logger.error('[subscription] getUsage error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching usage stats.' });
  }
};
