// routes/analytics.routes.js
/**
 * ANALYTICS ROUTES
 * Analytics, reports, and statistics
 * 
 * @module routes/analytics
 */

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// ============================================================================
// STUDENT ANALYTICS
// ============================================================================

/**
 * @route   GET /api/analytics/student/:studentId/overview
 * @desc    Get student analytics overview
 * @access  Private (Student/Teacher/Parent)
 */
router.get('/student/:studentId/overview', analyticsController.getStudentAnalytics); // Fixed: getStudentOverview -> getStudentAnalytics

/**
 * @route   GET /api/analytics/student/:studentId/performance
 * @desc    Get student performance analytics
 * @access  Private
 */
router.get('/student/:studentId/trend', analyticsController.getStudentPerformanceTrend); // Fixed: changed route and controller

/**
 * @route   GET /api/analytics/student/:studentId/competencies
 * @desc    Get NEP competency analytics
 * @access  Private
 */
router.get('/student/:studentId/competencies', analyticsController.getStudentCompetencyAnalysis); // Fixed: getStudentCompetencies -> getStudentCompetencyAnalysis

/**
 * @route   GET /api/analytics/student/:studentId/compare
 * @desc    Compare student with class
 * @access  Private
 */
router.get('/student/:studentId/compare', analyticsController.compareStudentWithClass); // Fixed: added new route

// ============================================================================
// CLASS ANALYTICS
// ============================================================================

/**
 * @route   GET /api/analytics/class/:classNum/:section/overview
 * @desc    Get class analytics overview
 * @access  Private (Teacher)
 */
router.get(
  '/class/:classNum/:section',
  authorize('teacher', 'admin'),
  analyticsController.getClassAnalytics // Fixed: getClassOverview -> getClassAnalytics
);

/**
 * @route   GET /api/analytics/class/:classNum/:section/trend
 * @desc    Get class performance trend
 * @access  Private (Teacher)
 */
router.get(
  '/class/:classNum/:section/trend',
  authorize('teacher', 'admin'),
  analyticsController.getClassPerformanceTrend // Fixed: new route
);

/**
 * @route   GET /api/analytics/class/compare
 * @desc    Compare multiple classes
 * @access  Private (Admin)
 */
router.get(
  '/class/compare',
  authorize('admin'),
  analyticsController.compareClasses // Fixed: compareClasses (already exists)
);

// ============================================================================
// SCHOOL ANALYTICS
// ============================================================================

/**
 * @route   GET /api/analytics/school/:schoolId/overview
 * @desc    Get school-wide analytics overview
 * @access  Private (Admin)
 */
router.get(
  '/school/:schoolId/overview',
  authorize('admin'),
  analyticsController.getSchoolAnalytics // Fixed: getSchoolOverview -> getSchoolAnalytics
);

/**
 * @route   GET /api/analytics/school/:schoolId/trend
 * @desc    Get school performance trend
 * @access  Private (Admin)
 */
router.get(
  '/school/:schoolId/trend',
  authorize('admin'),
  analyticsController.getSchoolPerformanceTrend // Fixed: getSchoolTrends -> getSchoolPerformanceTrend
);

/**
 * @route   GET /api/analytics/school/:schoolId/competencies
 * @desc    Get school-wide competency analytics
 * @access  Private (Admin)
 */
router.get(
  '/school/:schoolId/competencies',
  authorize('admin'),
  analyticsController.getSchoolCompetencyAnalysis // Fixed: getSchoolCompetencies -> getSchoolCompetencyAnalysis
);

/**
 * @route   GET /api/analytics/school/:schoolId/engagement
 * @desc    Get engagement metrics
 * @access  Private (Admin)
 */
router.get(
  '/school/:schoolId/engagement',
  authorize('admin'),
  analyticsController.getEngagementMetrics // Fixed: new route
);

// ============================================================================
// SIMULATION ANALYTICS
// ============================================================================

/**
 * @route   GET /api/analytics/simulations
 * @desc    Get simulation analytics
 * @access  Private
 */
router.get('/simulations', analyticsController.getSimulationAnalytics); // Fixed: new route

/**
 * @route   GET /api/analytics/simulations/difficulty
 * @desc    Get simulation performance by difficulty
 * @access  Private
 */
router.get('/simulations/difficulty', analyticsController.getSimulationPerformanceByDifficulty); // Fixed: new route

// ============================================================================
// AI USAGE ANALYTICS
// ============================================================================

/**
 * @route   GET /api/analytics/ai-usage
 * @desc    Get AI usage statistics
 * @access  Private (Admin)
 */
router.get(
  '/ai-usage',
  authorize('admin'),
  analyticsController.getAIUsageStatistics // Fixed: getAIUsageStats -> getAIUsageStatistics
);

/**
 * @route   GET /api/analytics/ai-usage/projection
 * @desc    Get AI cost projection
 * @access  Private (Admin)
 */
router.get(
  '/ai-usage/projection',
  authorize('admin'),
  analyticsController.getAICostProjection // Fixed: new route
);

// ============================================================================
// REPORTS
// ============================================================================

/**
 * @route   POST /api/analytics/custom-report
 * @desc    Generate custom report
 * @access  Private (Admin)
 */
router.post(
  '/custom-report',
  authorize('admin'),
  analyticsController.getCustomReport // Fixed: generateReport -> getCustomReport
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics to CSV
 * @access  Private (Admin)
 */
router.get(
  '/export',
  authorize('admin'),
  analyticsController.exportAnalytics // Fixed: exportData -> exportAnalytics
);

// ============================================================================
// REMOVED OR NOT YET IMPLEMENTED ROUTES
// ============================================================================

/*
 * The following routes from the original file either:
 * 1. Don't have corresponding controller functions in analytics.controller.js
 * 2. Need different route structures
 * 
 * Removed routes (commented out for reference):
 * 
 * router.get('/student/:studentId/progress', analyticsController.getStudentProgress);
 * router.get('/student/:studentId/challenges', analyticsController.getStudentChallengeAnalytics);
 * router.get('/student/:studentId/trends', analyticsController.getStudentTrends);
 * router.get('/class/:classSectionId/performance', analyticsController.getClassPerformance);
 * router.get('/class/:classSectionId/competencies', analyticsController.getClassCompetencies);
 * router.get('/class/:classSectionId/top-performers', analyticsController.getClassTopPerformers);
 * router.get('/class/:classSectionId/struggling', analyticsController.getStrugglingStudents);
 * router.get('/school/performance', analyticsController.getSchoolPerformance);
 * router.get('/school/trends', analyticsController.getSchoolTrends);
 * router.get('/school/by-class', analyticsController.getAnalyticsByClass);
 * router.get('/reports/nep/:reportId', analyticsController.getNEPReport);
 * router.get('/reports/institutional/:reportId', analyticsController.getInstitutionalReport);
 * router.get('/reports/list', analyticsController.getReportsList);
 * router.delete('/reports/:reportId', analyticsController.deleteReport);
 * router.get('/ai/performance', analyticsController.getAIPerformanceMetrics);
 * router.get('/ai/cost', analyticsController.getAICostAnalysis);
 * router.get('/activity/overview', analyticsController.getActivityOverview);
 * router.get('/activity/trends', analyticsController.getActivityTrends);
 * router.get('/activity/daily', analyticsController.getDailyActivityStats);
 * router.get('/compare/students', analyticsController.compareStudents);
 * router.get('/benchmarks', analyticsController.getBenchmarks);
 * router.get('/export/:exportId', analyticsController.downloadExport);
 */

module.exports = router;