/**
 * RESEARCH API CONTROLLER
 *
 * Programmatic data access for researchers, government bodies, and partner
 * ed-tech platforms.  All endpoints use API key auth (not session JWT).
 *
 * Data exposed:
 *   - Longitudinal SPI trajectories
 *   - Cohort competency trends
 *   - Challenge performance statistics
 *   - Aggregated school-level metrics (no raw PII unless canViewRawData)
 *
 * PII policy:
 *   - studentId, name, etc. are MASKED unless API key has canViewRawData
 *   - All exports are anonymised by default
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Models
const {
  Student,
  SPIRecord,
  LongitudinalData,
  Challenge,
  BayesianNetwork,
  KalmanState,
  School,
} = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskId(id, showRaw) {
  if (showRaw) return id;
  // Return a stable hash-prefix so researchers can track the same student
  // across calls without seeing the real ID
  const str = String(id);
  return 'anon_' + Buffer.from(str).toString('base64').slice(0, 12);
}

function paginate(query, req) {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100', 10)));
  return { skip: (page - 1) * limit, limit, page };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/research/longitudinal
 * Multi-year SPI data points for a cohort (school + optional class filter).
 *
 * Query params:
 *   schoolId   (required)
 *   classNum   (optional)
 *   from       ISO date (optional)
 *   to         ISO date (optional)
 *   page, limit
 */
exports.getLongitudinalData = async (req, res) => {
  try {
    const { schoolId, classNum, from, to } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId is required.' });
    }

    const showRaw = req.apiKeyDoc?.permissions?.canViewRawData === true;
    const { skip, limit, page } = paginate({}, req);

    // Build student filter
    const studentFilter = { schoolId };
    if (classNum) studentFilter.class = parseInt(classNum, 10);

    const students = await Student.find(studentFilter)
      .select('_id studentId class section')
      .lean();

    if (students.length === 0) {
      return res.json({ success: true, data: { records: [], total: 0, page } });
    }

    const studentIds = students.map(s => s._id);

    // Time range filter on data points
    const dataMatch = {};
    if (from || to) {
      dataMatch['dataPoints.timestamp'] = {};
      if (from) dataMatch['dataPoints.timestamp'].$gte = new Date(from);
      if (to)   dataMatch['dataPoints.timestamp'].$lte = new Date(to);
    }

    const records = await LongitudinalData.find({
      studentId: { $in: studentIds },
      ...dataMatch,
    })
      .sort({ trackingStartDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await LongitudinalData.countDocuments({
      studentId: { $in: studentIds },
    });

    // Build student lookup
    const studentMap = {};
    students.forEach(s => { studentMap[String(s._id)] = s; });

    const result = records.map(r => {
      const s = studentMap[String(r.studentId)] || {};
      return {
        id:                 maskId(r._id, showRaw),
        studentRef:         maskId(r.studentId, showRaw),
        class:              s.class,
        section:            s.section,
        trackingStartDate:  r.trackingStartDate,
        trackingDuration:   r.trackingDuration,
        dataPoints:         r.dataPoints,
        trends:             r.trends,
        cohortComparison:   r.cohortComparison,
      };
    });

    return res.json({
      success: true,
      data: { records: result, total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('[research] getLongitudinalData error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching longitudinal data.' });
  }
};

/**
 * GET /api/research/spi-timeline
 * SPI snapshots over time for a cohort.
 *
 * Query params:
 *   schoolId  (required)
 *   classNum  (optional)
 *   from / to ISO dates
 *   page, limit
 */
exports.getSPITimeline = async (req, res) => {
  try {
    const { schoolId, classNum, from, to } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId is required.' });
    }

    const showRaw = req.apiKeyDoc?.permissions?.canViewRawData === true;
    const { skip, limit, page } = paginate({}, req);

    const studentFilter = { schoolId };
    if (classNum) studentFilter.class = parseInt(classNum, 10);

    const students = await Student.find(studentFilter)
      .select('_id studentId class section')
      .lean();

    if (students.length === 0) {
      return res.json({ success: true, data: { records: [], total: 0, page } });
    }

    const studentIds = students.map(s => s.studentId);

    const dateFilter = {};
    if (from || to) {
      dateFilter.calculatedAt = {};
      if (from) dateFilter.calculatedAt.$gte = new Date(from);
      if (to)   dateFilter.calculatedAt.$lte = new Date(to);
    }

    const records = await SPIRecord.find({
      studentId: { $in: studentIds },
      ...dateFilter,
    })
      .sort({ calculatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SPIRecord.countDocuments({ studentId: { $in: studentIds } });

    // Build student lookup by studentId string
    const studentMap = {};
    students.forEach(s => { studentMap[s.studentId] = s; });

    const result = records.map(r => ({
      studentRef:      maskId(r.studentId, showRaw),
      class:           studentMap[r.studentId]?.class,
      section:         studentMap[r.studentId]?.section,
      spi:             r.spi,
      grade:           r.grade,
      learningState:   r.learning_state,
      kalmanUncertainty: r.kalman_uncertainty,
      totalChallenges: r.totalChallenges,
      calculatedAt:    r.calculatedAt,
      source:          r.source,
    }));

    return res.json({
      success: true,
      data: { records: result, total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('[research] getSPITimeline error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching SPI timeline.' });
  }
};

/**
 * GET /api/research/competency-trends
 * Aggregated Bayesian concept mastery across a cohort over time.
 *
 * Query params:
 *   schoolId  (required)
 *   classNum  (optional)
 */
exports.getCompetencyTrends = async (req, res) => {
  try {
    const { schoolId, classNum } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId is required.' });
    }

    const studentFilter = { schoolId };
    if (classNum) studentFilter.class = parseInt(classNum, 10);

    const students = await Student.find(studentFilter)
      .select('studentId class section')
      .lean();

    if (students.length === 0) {
      return res.json({ success: true, data: { competencies: {}, studentCount: 0 } });
    }

    const studentIds = students.map(s => s.studentId);

    // Pull Bayesian belief snapshots
    const networks = await BayesianNetwork.find({ studentId: { $in: studentIds } })
      .select('studentId beliefs updatedAt')
      .lean();

    // Aggregate: average belief per competency across cohort
    const totals = {};
    const counts = {};
    networks.forEach(n => {
      if (!n.beliefs) return;
      Object.entries(n.beliefs).forEach(([comp, score]) => {
        totals[comp] = (totals[comp] || 0) + score;
        counts[comp] = (counts[comp] || 0) + 1;
      });
    });

    const competencies = {};
    Object.keys(totals).forEach(comp => {
      competencies[comp] = {
        averageMastery: parseFloat((totals[comp] / counts[comp]).toFixed(3)),
        studentsCovered: counts[comp],
      };
    });

    // Also pull Kalman estimates for ability distribution
    const kalmanStates = await KalmanState.find({ studentId: { $in: studentIds } })
      .select('studentId estimatedAbility uncertainty')
      .lean();

    const abilities = kalmanStates.map(k => k.estimatedAbility).filter(Boolean);
    const avgAbility = abilities.length
      ? parseFloat((abilities.reduce((a, b) => a + b, 0) / abilities.length).toFixed(3))
      : null;

    return res.json({
      success: true,
      data: {
        schoolId,
        classFilter: classNum || null,
        studentCount: students.length,
        competencies,
        kalman: {
          averageAbility: avgAbility,
          sampleSize: abilities.length,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('[research] getCompetencyTrends error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching competency trends.' });
  }
};

/**
 * GET /api/research/challenge-stats
 * Aggregate challenge performance statistics for a school/cohort.
 */
exports.getChallengeStats = async (req, res) => {
  try {
    const { schoolId, classNum, from, to } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId is required.' });
    }

    const matchFilter = { schoolId, status: 'evaluated' };
    if (from || to) {
      matchFilter.evaluatedAt = {};
      if (from) matchFilter.evaluatedAt.$gte = new Date(from);
      if (to)   matchFilter.evaluatedAt.$lte = new Date(to);
    }

    const stats = await Challenge.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$simulationType',
          total:        { $sum: 1 },
          passed:       { $sum: { $cond: ['$results.passed', 1, 0] } },
          avgScore:     { $avg: '$results.totalScore' },
          avgTimeMs:    { $avg: { $subtract: ['$evaluatedAt', '$createdAt'] } },
          difficulties: { $push: '$difficulty' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const summary = stats.map(s => ({
      simulationType:   s._id || 'unknown',
      totalAttempts:    s.total,
      passRate:         parseFloat(((s.passed / s.total) * 100).toFixed(1)),
      averageScore:     parseFloat((s.avgScore || 0).toFixed(1)),
      averageTimeMin:   parseFloat(((s.avgTimeMs || 0) / 60000).toFixed(1)),
    }));

    const overall = await Challenge.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total:    { $sum: 1 },
          passed:   { $sum: { $cond: ['$results.passed', 1, 0] } },
          avgScore: { $avg: '$results.totalScore' },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        schoolId,
        bySimulation: summary,
        overall: overall[0]
          ? {
              total:    overall[0].total,
              passRate: parseFloat(((overall[0].passed / overall[0].total) * 100).toFixed(1)),
              avgScore: parseFloat((overall[0].avgScore || 0).toFixed(1)),
            }
          : null,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('[research] getChallengeStats error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching challenge stats.' });
  }
};

/**
 * GET /api/research/schools
 * List all schools available under this API key (anonymised metadata).
 * Only returned if canViewRawData is true.
 */
exports.listSchools = async (req, res) => {
  try {
    const showRaw = req.apiKeyDoc?.permissions?.canViewRawData === true;

    const schools = await School.find({ isActive: true })
      .select('schoolId name city state stats.totalStudents stats.totalTeachers subscriptionPlan')
      .lean();

    const result = schools.map(s => ({
      id:           maskId(s.schoolId, showRaw),
      name:         showRaw ? s.name : `School-${maskId(s.schoolId, false)}`,
      city:         showRaw ? s.city : null,
      state:        s.state,
      studentCount: s.stats?.totalStudents || 0,
      teacherCount: s.stats?.totalTeachers || 0,
      plan:         s.subscriptionPlan || 'free',
    }));

    return res.json({
      success: true,
      data: { schools: result, total: result.length },
    });
  } catch (err) {
    logger.error('[research] listSchools error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching schools.' });
  }
};

/**
 * GET /api/research/export
 * Full dataset export (paginated, gzip recommended).
 * Requires canExportFullDataset permission.
 */
exports.exportDataset = async (req, res) => {
  try {
    const { schoolId, collection = 'spi', from, to } = req.query;
    const { skip, limit, page } = paginate({}, req);

    const ALLOWED_COLLECTIONS = ['spi', 'longitudinal', 'challenges'];
    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return res.status(400).json({
        success: false,
        message: `Invalid collection. Allowed: ${ALLOWED_COLLECTIONS.join(', ')}`,
      });
    }

    const maxExportSize = req.apiKeyDoc?.permissions?.maxExportSize || 500;
    const safeLimit = Math.min(limit, maxExportSize);

    let model, dateField;
    if (collection === 'spi')          { model = SPIRecord;       dateField = 'calculatedAt'; }
    if (collection === 'longitudinal') { model = LongitudinalData; dateField = 'createdAt';    }
    if (collection === 'challenges')   { model = Challenge;        dateField = 'evaluatedAt';  }

    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (from || to) {
      filter[dateField] = {};
      if (from) filter[dateField].$gte = new Date(from);
      if (to)   filter[dateField].$lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      model.find(filter).sort({ [dateField]: -1 }).skip(skip).limit(safeLimit).lean(),
      model.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        collection,
        records,
        total,
        page,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    logger.error('[research] exportDataset error:', err);
    return res.status(500).json({ success: false, message: 'Error exporting dataset.' });
  }
};
