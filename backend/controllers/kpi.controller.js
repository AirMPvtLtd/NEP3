/**
 * KPI CONTROLLER — Platform Key Performance Indicators
 *
 * Internal platform-level metrics for the NEP Workbench operations team.
 * All endpoints require super-admin role (platform staff, not school admins).
 *
 * KPI categories:
 *   /api/kpi/platform    — schools, users, growth
 *   /api/kpi/learning    — SPI, challenges, competency mastery
 *   /api/kpi/engagement  — DAU, MAU, retention
 *   /api/kpi/revenue     — plan distribution, MRR, ARPU
 *   /api/kpi/ai          — AI operations, tokens, cost
 *   /api/kpi/reports     — NEP reports generated, verified
 *   /api/kpi/summary     — all KPIs in one call (dashboard widget)
 */

'use strict';

const mongoose  = require('mongoose');
const logger    = require('../utils/logger');
const { plans, PLAN_ORDER } = require('../config/plans');

const {
  School,
  Student,
  Teacher,
  Parent,
  Challenge,
  Activity,
  AILog,
  SPIRecord,
  NEPReport,
  BayesianNetwork,
  SimulationSession,
} = require('../models');

// ── Shared helpers ─────────────────────────────────────────────────────────────

function since(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function pct(num, den) {
  if (!den) return 0;
  return parseFloat(((num / den) * 100).toFixed(1));
}

function round2(n) {
  return parseFloat((n || 0).toFixed(2));
}

/**
 * Estimated Monthly Recurring Revenue from active paid schools.
 * Enterprise plans counted at ₹0 (custom pricing — excluded from estimate).
 */
function estimateMRR(planDist) {
  return Object.entries(planDist).reduce((sum, [tier, count]) => {
    const price = plans[tier]?.priceMonthly || 0;
    return sum + price * count;
  }, 0);
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/kpi/platform
 * Platform-level user and school counts.
 */
exports.getPlatformKPIs = async (req, res) => {
  try {
    const now      = new Date();
    const day30ago = since(30);
    const day7ago  = since(7);

    const [
      totalSchools,
      activeSchools,
      newSchools30d,
      totalStudents,
      totalTeachers,
      totalParents,
      newStudents30d,
      newStudents7d,
    ] = await Promise.all([
      School.countDocuments({}),
      School.countDocuments({ isActive: true }),
      School.countDocuments({ createdAt: { $gte: day30ago } }),
      Student.countDocuments({}),
      Teacher.countDocuments({}),
      Parent.countDocuments({}),
      Student.countDocuments({ createdAt: { $gte: day30ago } }),
      Student.countDocuments({ createdAt: { $gte: day7ago } }),
    ]);

    return res.json({
      success: true,
      data: {
        category:   'platform',
        asOf:       now.toISOString(),
        schools: {
          total:      totalSchools,
          active:     activeSchools,
          inactive:   totalSchools - activeSchools,
          new30d:     newSchools30d,
        },
        users: {
          students:   totalStudents,
          teachers:   totalTeachers,
          parents:    totalParents,
          total:      totalStudents + totalTeachers + totalParents,
          new30d:     newStudents30d,
          new7d:      newStudents7d,
        },
      },
    });
  } catch (err) {
    logger.error('[kpi] getPlatformKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching platform KPIs.' });
  }
};

/**
 * GET /api/kpi/learning
 * Learning outcome KPIs — SPI, challenge performance, competency mastery.
 */
exports.getLearningKPIs = async (req, res) => {
  try {
    const day30ago = since(30);

    const [
      spiStats,
      challengeStats,
      challengeEvaluated,
      bayesianAgg,
    ] = await Promise.all([
      // Average SPI across most recent record per student
      SPIRecord.aggregate([
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: '$studentId', latestSPI: { $first: '$spi' } } },
        { $group: { _id: null, avgSPI: { $avg: '$latestSPI' }, count: { $sum: 1 } } },
      ]),

      // Challenge counts + pass rate (30d)
      Challenge.aggregate([
        { $match: { createdAt: { $gte: day30ago } } },
        {
          $group: {
            _id: null,
            total:   { $sum: 1 },
            passed:  { $sum: { $cond: ['$results.passed', 1, 0] } },
            avgScore: { $avg: '$results.totalScore' },
            evaluated: { $sum: { $cond: [{ $eq: ['$status', 'evaluated'] }, 1, 0] } },
          },
        },
      ]),

      // Total evaluated challenges ever
      Challenge.countDocuments({ status: 'evaluated' }),

      // Average Bayesian competency belief across all students
      BayesianNetwork.aggregate([
        { $project: { beliefs: { $objectToArray: '$beliefs' } } },
        { $unwind: '$beliefs' },
        { $group: { _id: '$beliefs.k', avgMastery: { $avg: '$beliefs.v' } } },
        { $sort: { avgMastery: -1 } },
      ]),
    ]);

    const spi  = spiStats[0]  || { avgSPI: null, count: 0 };
    const chal = challengeStats[0] || { total: 0, passed: 0, avgScore: 0, evaluated: 0 };

    return res.json({
      success: true,
      data: {
        category: 'learning',
        asOf:     new Date().toISOString(),
        spi: {
          platformAverage:  spi.avgSPI !== null ? round2(spi.avgSPI) : null,
          studentsWithSPI:  spi.count,
        },
        challenges: {
          total30d:         chal.total,
          evaluated30d:     chal.evaluated,
          completionRate30d: pct(chal.evaluated, chal.total),
          passRate30d:      pct(chal.passed, chal.evaluated),
          avgScore30d:      round2(chal.avgScore),
          totalEvaluatedAllTime: challengeEvaluated,
        },
        competencyMastery: bayesianAgg.map(b => ({
          competency:   b._id,
          avgMastery:   round2(b.avgMastery),
        })),
      },
    });
  } catch (err) {
    logger.error('[kpi] getLearningKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching learning KPIs.' });
  }
};

/**
 * GET /api/kpi/engagement
 * DAU, WAU, MAU, challenge activity heatmap.
 */
exports.getEngagementKPIs = async (req, res) => {
  try {
    const now       = new Date();
    const day1ago   = since(1);
    const day7ago   = since(7);
    const day30ago  = since(30);

    const [
      dau, wau, mau,
      challengesDAU, challengesWAU, challengesMAU,
      sessionTimeAgg, sessionTimeAgg30d,
      loginStats,
    ] = await Promise.all([
      // Active students: submitted a challenge in window
      Challenge.distinct('studentId', { createdAt: { $gte: day1ago } }),
      Challenge.distinct('studentId', { createdAt: { $gte: day7ago } }),
      Challenge.distinct('studentId', { createdAt: { $gte: day30ago } }),
      Challenge.countDocuments({ createdAt: { $gte: day1ago } }),
      Challenge.countDocuments({ createdAt: { $gte: day7ago } }),
      Challenge.countDocuments({ createdAt: { $gte: day30ago } }),

      // Average simulation session time (all completed sessions, seconds)
      SimulationSession.aggregate([
        { $match: { status: 'completed', timeTaken: { $gt: 0 } } },
        { $group: { _id: null, avgSecs: { $avg: '$timeTaken' }, total: { $sum: 1 } } },
      ]),

      // Average simulation session time last 30 days
      SimulationSession.aggregate([
        { $match: { status: 'completed', timeTaken: { $gt: 0 }, completedAt: { $gte: day30ago } } },
        { $group: { _id: null, avgSecs: { $avg: '$timeTaken' }, total: { $sum: 1 } } },
      ]),

      // Login counts (24h / 7d / 30d) from Activity model
      Activity.aggregate([
        { $match: { activityType: 'login', timestamp: { $gte: day30ago } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalStudents = await Student.countDocuments({});

    // Daily challenge counts for last 7 days (heatmap data)
    const heatmap = await Challenge.aggregate([
      { $match: { createdAt: { $gte: day7ago } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const sessAll  = sessionTimeAgg[0]  || { avgSecs: 0, total: 0 };
    const sess30d  = sessionTimeAgg30d[0] || { avgSecs: 0, total: 0 };

    // Compute login counts for sub-windows from the daily aggregation
    const now30dStr = day30ago.toISOString().slice(0, 10);
    const now7dStr  = day7ago.toISOString().slice(0, 10);
    const now1dStr  = day1ago.toISOString().slice(0, 10);
    let logins30d = 0, logins7d = 0, logins24h = 0;
    loginStats.forEach(({ _id: date, count }) => {
      if (date >= now30dStr) logins30d += count;
      if (date >= now7dStr)  logins7d  += count;
      if (date >= now1dStr)  logins24h += count;
    });

    return res.json({
      success: true,
      data: {
        category: 'engagement',
        asOf:     now.toISOString(),
        activeStudents: {
          dau:         dau.length,
          wau:         wau.length,
          mau:         mau.length,
          dauRate:     pct(dau.length, totalStudents),
          mauRate:     pct(mau.length, totalStudents),
          dauMauRatio: mau.length ? round2(dau.length / mau.length) : 0,
        },
        challenges: {
          last24h: challengesDAU,
          last7d:  challengesWAU,
          last30d: challengesMAU,
        },
        sessionTime: {
          avgSecsAllTime: round2(sessAll.avgSecs),
          avgMinsAllTime: round2(sessAll.avgSecs / 60),
          avgSecs30d:     round2(sess30d.avgSecs),
          avgMins30d:     round2(sess30d.avgSecs / 60),
          totalSessions:  sessAll.total,
        },
        logins: {
          last24h: logins24h,
          last7d:  logins7d,
          last30d: logins30d,
          dailyTrend: loginStats.map(l => ({ date: l._id, count: l.count })),
        },
        activityHeatmap: heatmap.map(h => ({ date: h._id, challenges: h.count })),
      },
    });
  } catch (err) {
    logger.error('[kpi] getEngagementKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching engagement KPIs.' });
  }
};

/**
 * GET /api/kpi/revenue
 * Subscription plan distribution, estimated MRR, ARPU.
 */
exports.getRevenueKPIs = async (req, res) => {
  try {
    // Count active schools per plan
    const planAgg = await School.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
    ]);

    // Build distribution object
    const distribution = {};
    PLAN_ORDER.forEach(tier => { distribution[tier] = 0; });
    planAgg.forEach(p => { distribution[p._id || 'free'] = p.count; });

    const mrrINR  = estimateMRR(distribution);
    const paidSchools = distribution.basic + distribution.premium; // enterprise excluded from MRR
    const arpu    = paidSchools ? round2(mrrINR / paidSchools) : 0;

    // Conversion: free → any paid
    const totalActive = planAgg.reduce((s, p) => s + p.count, 0);
    const paidTotal   = totalActive - (distribution.free || 0);

    return res.json({
      success: true,
      data: {
        category: 'revenue',
        asOf:     new Date().toISOString(),
        currency: 'INR',
        planDistribution: distribution,
        schools: {
          total:     totalActive,
          paid:      paidTotal,
          free:      distribution.free,
          conversionRate: pct(paidTotal, totalActive),
        },
        revenue: {
          estimatedMRR:  mrrINR,
          estimatedARR:  mrrINR * 12,
          arpu,
          note: 'Enterprise plans use custom pricing and are excluded from MRR.',
        },
        planPricing: PLAN_ORDER.reduce((acc, tier) => {
          acc[tier] = plans[tier].priceMonthly !== null
            ? `₹${plans[tier].priceMonthly}/mo`
            : 'Custom';
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    logger.error('[kpi] getRevenueKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching revenue KPIs.' });
  }
};

/**
 * GET /api/kpi/ai
 * AI operations, token consumption, and cost tracking.
 */
exports.getAIKPIs = async (req, res) => {
  try {
    const day30ago = since(30);
    const day7ago  = since(7);

    const [monthly, weekly, byOperation] = await Promise.all([
      AILog.aggregate([
        { $match: { createdAt: { $gte: day30ago } } },
        {
          $group: {
            _id:         null,
            operations:  { $sum: 1 },
            tokens:      { $sum: '$tokensUsed' },
            costUSD:     { $sum: '$cost' },
          },
        },
      ]),
      AILog.aggregate([
        { $match: { createdAt: { $gte: day7ago } } },
        {
          $group: {
            _id:        null,
            operations: { $sum: 1 },
            tokens:     { $sum: '$tokensUsed' },
            costUSD:    { $sum: '$cost' },
          },
        },
      ]),
      AILog.aggregate([
        { $match: { createdAt: { $gte: day30ago } } },
        {
          $group: {
            _id:        '$operation',
            count:      { $sum: 1 },
            tokens:     { $sum: '$tokensUsed' },
            costUSD:    { $sum: '$cost' },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const m = monthly[0] || { operations: 0, tokens: 0, costUSD: 0 };
    const w = weekly[0]  || { operations: 0, tokens: 0, costUSD: 0 };

    return res.json({
      success: true,
      data: {
        category: 'ai',
        asOf:     new Date().toISOString(),
        last30d: {
          operations:    m.operations,
          tokensUsed:    m.tokens,
          estimatedCost: round2(m.costUSD),
          avgCostPerOp:  m.operations ? round2(m.costUSD / m.operations) : 0,
        },
        last7d: {
          operations:    w.operations,
          tokensUsed:    w.tokens,
          estimatedCost: round2(w.costUSD),
        },
        projectedMonthly: {
          estimatedCost: round2(w.costUSD * (30 / 7)),
          currency:      'USD',
        },
        byOperation: byOperation.map(b => ({
          operation:  b._id || 'unknown',
          count:      b.count,
          tokens:     b.tokens,
          costUSD:    round2(b.costUSD),
        })),
      },
    });
  } catch (err) {
    logger.error('[kpi] getAIKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching AI KPIs.' });
  }
};

/**
 * GET /api/kpi/reports
 * NEP report generation and verification KPIs.
 */
exports.getReportKPIs = async (req, res) => {
  try {
    const day30ago = since(30);

    const [totalReports, reports30d, statusDist, verifiedCount] = await Promise.all([
      NEPReport.countDocuments({}),
      NEPReport.countDocuments({ createdAt: { $gte: day30ago } }),
      NEPReport.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      NEPReport.countDocuments({ verified: true }),
    ]);

    const byStatus = {};
    statusDist.forEach(s => { byStatus[s._id || 'unknown'] = s.count; });

    return res.json({
      success: true,
      data: {
        category: 'reports',
        asOf:     new Date().toISOString(),
        totals: {
          allTime:     totalReports,
          last30d:     reports30d,
          verified:    verifiedCount,
          verifyRate:  pct(verifiedCount, totalReports),
        },
        byStatus,
      },
    });
  } catch (err) {
    logger.error('[kpi] getReportKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching report KPIs.' });
  }
};

/**
 * GET /api/kpi/traffic
 * Web traffic metrics: API calls, unique IPs, page views, logins — from Activity log.
 */
exports.getTrafficKPIs = async (req, res) => {
  try {
    const day1ago  = since(1);
    const day7ago  = since(7);
    const day30ago = since(30);

    const [
      apiCalls30d,
      apiCalls7d,
      apiCalls24h,
      // Unique IPs
      uniqueIPs30d,
      uniqueIPs24h,
      // Login events
      logins30d,
      logins7d,
      logins24h,
      // Daily traffic trend (30d)
      dailyTrend,
      // Top routes
      topRoutes,
      // Error rate (5xx)
      errors30d,
    ] = await Promise.all([
      Activity.countDocuments({ activityType: 'api_call', timestamp: { $gte: day30ago } }),
      Activity.countDocuments({ activityType: 'api_call', timestamp: { $gte: day7ago  } }),
      Activity.countDocuments({ activityType: 'api_call', timestamp: { $gte: day1ago  } }),

      Activity.distinct('ipAddress', { activityType: 'api_call', timestamp: { $gte: day30ago } }),
      Activity.distinct('ipAddress', { activityType: 'api_call', timestamp: { $gte: day1ago  } }),

      Activity.countDocuments({ activityType: 'login', timestamp: { $gte: day30ago } }),
      Activity.countDocuments({ activityType: 'login', timestamp: { $gte: day7ago  } }),
      Activity.countDocuments({ activityType: 'login', timestamp: { $gte: day1ago  } }),

      // Daily API call counts for last 30 days
      Activity.aggregate([
        { $match: { activityType: 'api_call', timestamp: { $gte: day30ago } } },
        {
          $group: {
            _id:   { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            calls: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 10 API paths by request count (30d)
      Activity.aggregate([
        { $match: { activityType: 'api_call', timestamp: { $gte: day30ago } } },
        { $group: { _id: '$path', count: { $sum: 1 }, avgMs: { $avg: '$responseTimeMs' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // 5xx errors in last 30d
      Activity.countDocuments({
        activityType: 'api_call',
        timestamp: { $gte: day30ago },
        statusCode:  { $gte: 500 },
      }),
    ]);

    const errorRate30d = apiCalls30d ? pct(errors30d, apiCalls30d) : 0;

    return res.json({
      success: true,
      data: {
        category: 'traffic',
        asOf:     new Date().toISOString(),
        apiCalls: {
          last24h: apiCalls24h,
          last7d:  apiCalls7d,
          last30d: apiCalls30d,
        },
        uniqueVisitors: {
          last24h: uniqueIPs24h.length,
          last30d: uniqueIPs30d.length,
        },
        logins: {
          last24h: logins24h,
          last7d:  logins7d,
          last30d: logins30d,
        },
        errors: {
          count30d:    errors30d,
          errorRate30d,
        },
        dailyTrend: dailyTrend.map(d => ({ date: d._id, calls: d.calls })),
        topRoutes:  topRoutes.map(r => ({
          path:    r._id || 'unknown',
          count:   r.count,
          avgMs:   round2(r.avgMs),
        })),
      },
    });
  } catch (err) {
    logger.error('[kpi] getTrafficKPIs error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching traffic KPIs.' });
  }
};

/**
 * GET /api/kpi/summary
 * All KPI categories in a single call — for the platform dashboard widget.
 * Uses parallel queries for performance.
 */
exports.getKPISummary = async (req, res) => {
  try {
    const day30ago = since(30);
    const day7ago  = since(7);
    const day1ago  = since(1);

    const [
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      newStudents30d,
      // Engagement
      dauArr,
      mauArr,
      challengesMAU,
      // Learning
      spiAgg,
      challengeAgg,
      // Revenue
      planAgg,
      // AI
      aiMonthly,
      // Reports
      totalReports,
      reports30d,
    ] = await Promise.all([
      School.countDocuments({}),
      School.countDocuments({ isActive: true }),
      Student.countDocuments({}),
      Teacher.countDocuments({}),
      Student.countDocuments({ createdAt: { $gte: day30ago } }),

      Challenge.distinct('studentId', { createdAt: { $gte: day1ago } }),
      Challenge.distinct('studentId', { createdAt: { $gte: day30ago } }),
      Challenge.countDocuments({ createdAt: { $gte: day30ago } }),

      SPIRecord.aggregate([
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: '$studentId', spi: { $first: '$spi' } } },
        { $group: { _id: null, avg: { $avg: '$spi' } } },
      ]),

      Challenge.aggregate([
        { $match: { createdAt: { $gte: day30ago } } },
        {
          $group: {
            _id: null,
            total:    { $sum: 1 },
            passed:   { $sum: { $cond: ['$results.passed', 1, 0] } },
            avgScore: { $avg: '$results.totalScore' },
          },
        },
      ]),

      School.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
      ]),

      AILog.aggregate([
        { $match: { createdAt: { $gte: day30ago } } },
        { $group: { _id: null, ops: { $sum: 1 }, cost: { $sum: '$cost' } } },
      ]),

      NEPReport.countDocuments({}),
      NEPReport.countDocuments({ createdAt: { $gte: day30ago } }),
    ]);

    // Revenue
    const planDist = {};
    PLAN_ORDER.forEach(t => { planDist[t] = 0; });
    planAgg.forEach(p => { planDist[p._id || 'free'] = p.count; });
    const mrrINR = estimateMRR(planDist);
    const paidSchools = activeSchools - (planDist.free || 0);

    // AI
    const ai = aiMonthly[0] || { ops: 0, cost: 0 };

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),

        platform: {
          activeSchools,
          totalStudents,
          totalTeachers,
          newStudents30d,
        },

        engagement: {
          dau:       dauArr.length,
          mau:       mauArr.length,
          dauRate:   pct(dauArr.length, totalStudents),
          mauRate:   pct(mauArr.length, totalStudents),
          challenges30d: challengesMAU,
        },

        learning: {
          avgSPI:         spiAgg[0] ? round2(spiAgg[0].avg) : null,
          challenges30d:  challengeAgg[0]?.total || 0,
          passRate30d:    challengeAgg[0]
            ? pct(challengeAgg[0].passed, challengeAgg[0].total)
            : 0,
          avgScore30d:    challengeAgg[0] ? round2(challengeAgg[0].avgScore) : 0,
        },

        revenue: {
          planDistribution: planDist,
          paidSchools,
          conversionRate: pct(paidSchools, activeSchools),
          estimatedMRR:   mrrINR,
          currency:       'INR',
        },

        ai: {
          operations30d:    ai.ops,
          estimatedCost30d: round2(ai.cost),
          currency:         'USD',
        },

        reports: {
          totalAllTime: totalReports,
          generated30d: reports30d,
        },
      },
    });
  } catch (err) {
    logger.error('[kpi] getKPISummary error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching KPI summary.' });
  }
};
