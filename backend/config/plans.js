/**
 * PLAN TIER DEFINITIONS
 * Single source of truth for all subscription limits, feature flags, and pricing.
 * Used by: subscription.controller, planLimits.middleware, subscription.middleware
 */

'use strict';

// Plan hierarchy — used by planLimits.middleware for upgrade comparisons
const PLAN_ORDER = ['free', 'basic', 'premium', 'enterprise'];

const plans = {

  // ─── Free ──────────────────────────────────────────────────────────────────
  free: {
    label: 'Free',
    priceMonthly: 0,              // ₹/month
    priceAnnual: 0,

    // Seat limits
    maxStudents: 50,
    maxTeachers: 5,

    // API call limits (per school per day)
    apiCallsPerDay: 100,

    // Feature flags
    features: {
      dashboard: true,
      challenges: true,           // basic rule-based challenges
      aiChallenges: false,        // AI-generated adaptive challenges
      spiTracking: false,         // SPI + Kalman/HMM/Bayesian stack
      analyticsBasic: false,      // class & school analytics
      analyticsAdvanced: false,   // export, AI usage, projections
      nepReports: false,          // NEP 2020 report generation
      batchReports: false,        // batch report generation
      researchApi: false,         // programmatic research API access
      parentPortal: true,
      helpDesk: true,
      leaderboard: false,
    },

    contactForUpgrade: true,
  },

  // ─── Basic ────────────────────────────────────────────────────────────────
  basic: {
    label: 'Basic',
    priceMonthly: 2999,
    priceAnnual: 29990,           // ~2 months free

    maxStudents: 500,
    maxTeachers: 50,
    apiCallsPerDay: 1000,

    features: {
      dashboard: true,
      challenges: true,
      aiChallenges: true,
      spiTracking: true,
      analyticsBasic: true,
      analyticsAdvanced: false,
      nepReports: true,
      batchReports: false,
      researchApi: false,
      parentPortal: true,
      helpDesk: true,
      leaderboard: true,
    },

    contactForUpgrade: false,
  },

  // ─── Premium ──────────────────────────────────────────────────────────────
  premium: {
    label: 'Premium',
    priceMonthly: 9999,
    priceAnnual: 99990,

    maxStudents: 2000,
    maxTeachers: 200,
    apiCallsPerDay: 10000,

    features: {
      dashboard: true,
      challenges: true,
      aiChallenges: true,
      spiTracking: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      nepReports: true,
      batchReports: true,
      researchApi: false,
      parentPortal: true,
      helpDesk: true,
      leaderboard: true,
    },

    contactForUpgrade: false,
  },

  // ─── Enterprise ───────────────────────────────────────────────────────────
  enterprise: {
    label: 'Enterprise',
    priceMonthly: null,           // custom pricing
    priceAnnual: null,

    maxStudents: Infinity,
    maxTeachers: 999,
    apiCallsPerDay: null,         // unlimited

    features: {
      dashboard: true,
      challenges: true,
      aiChallenges: true,
      spiTracking: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      nepReports: true,
      batchReports: true,
      researchApi: true,          // programmatic research API
      parentPortal: true,
      helpDesk: true,
      leaderboard: true,
    },

    contactForUpgrade: false,
  },
};

module.exports = { plans, PLAN_ORDER };
