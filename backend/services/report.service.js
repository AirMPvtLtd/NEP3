// services/report.service.js
/**
 * Progress Report Service
 * ----------------------------------
 * Non-ledger, non-NEP analytics only
 * Read-only computations
 */

const Challenge = require('../models/Challenge');

async function generateProgressReportService({ studentId, period }) {
  const { start, end } = period;

  // ---------------------------------------------------
  // 1. Fetch challenges in period
  // ---------------------------------------------------
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated',
    submittedAt: {
      $gte: new Date(start),
      $lte: new Date(end)
    }
  }).lean();

  if (!challenges.length) {
    return {
      summary: {
        totalChallenges: 0,
        averageScore: null
      },
      trends: [],
      message: 'No evaluated challenges in this period'
    };
  }

  // ---------------------------------------------------
  // 2. Basic aggregates
  // ---------------------------------------------------
  const scores = challenges.map(c => c.results?.totalScore || 0);
  const averageScore =
    scores.reduce((a, b) => a + b, 0) / scores.length;

  // ---------------------------------------------------
  // 3. Time-series trend (for charts)
  // ---------------------------------------------------
  const trends = challenges.map(c => ({
    challengeId: c.challengeId,
    date: c.submittedAt,
    score: c.results?.totalScore || 0,
    passed: c.results?.passed || false
  }));

  // ---------------------------------------------------
  // 4. Improvement (first vs last)
  // ---------------------------------------------------
  const improvement =
    scores.length > 1
      ? Number((scores[scores.length - 1] - scores[0]).toFixed(2))
      : 0;

  // ---------------------------------------------------
  // 5. Consistency metric
  // ---------------------------------------------------
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) /
    scores.length;

  const consistencyIndex = Number(
    (1 / (1 + Math.sqrt(variance))).toFixed(3)
  );

  // ---------------------------------------------------
  // 6. Final Progress Payload
  // ---------------------------------------------------
  return {
    summary: {
      totalChallenges: challenges.length,
      averageScore: Number(averageScore.toFixed(2)),
      improvement,
      consistencyIndex
    },
    trends,
    meta: {
      periodStart: start,
      periodEnd: end
    }
  };
}



module.exports = {
  generateProgressReportService
};

const NEPReport = require('../models/NEPReport');

/**
 * Build institutional analytics from NEP reports
 */
exports.buildInstitutionalReport = async ({
  schoolId,
  periodStart,
  periodEnd
}) => {
  const match = {
    schoolId,
    generatedAt: { $gte: periodStart, $lte: periodEnd }
  };

  // 1. Fetch reports
  const reports = await NEPReport.find(match).lean();
  if (!reports.length) return null;

  // 2. Aggregate metrics
  const totalReports = reports.length;

  const cpiValues = reports
    .map(r => r.performanceMetrics?.cpi)
    .filter(v => typeof v === 'number');

  const avgCPI =
    cpiValues.reduce((a, b) => a + b, 0) / Math.max(1, cpiValues.length);

  // 3. Competency distribution
  const competencyMap = {};
  for (const report of reports) {
    for (const c of report.competencies || []) {
      if (!competencyMap[c.name]) {
        competencyMap[c.name] = { total: 0, count: 0 };
      }
      competencyMap[c.name].total += c.score;
      competencyMap[c.name].count += 1;
    }
  }

  const competencyAverages = Object.entries(competencyMap).map(
    ([name, v]) => ({
      name,
      averageScore: Number((v.total / v.count).toFixed(2))
    })
  );

  return {
    totalReports,
    avgCPI: Number(avgCPI.toFixed(2)),
    competencyAverages
  };
};
